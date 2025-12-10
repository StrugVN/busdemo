from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse
from django.db import connection
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import math
from .models import TuyenBus, TramDung
from collections import defaultdict
import heapq


def wkt_to_latlng_list(wkt: str):
    """
    Convert LINESTRING or MULTILINESTRING WKT to
    a list of {lat, lng} objects for Google Maps.
    """
    s = wkt.strip()
    if s.upper().startswith("LINESTRING"):
        inner = s[s.find("(") + 1 : s.rfind(")")]
    elif s.upper().startswith("MULTILINESTRING"):
        inner = s[s.find("(") + 1 : s.rfind(")")]
        inner = inner.replace("(", "").replace(")", "")
    else:
        raise ValueError(f"Unsupported WKT: {s[:30]}")

    coords = []
    for pair in inner.split(","):
        parts = pair.strip().split()
        if len(parts) != 2:
            continue
        x, y = parts
        coords.append({"lat": float(y), "lng": float(x)})
    return coords


def map_view(request):
    # 1) Load ALL stops (for markers)
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT d.MaTram,
                d.TenTram,
                d.ViDo,
                d.KinhDo,
                d.MaLoai,
                d.DiaChi,
                d.MaXa,
                x.TenXa
            FROM tram_dung d
            LEFT JOIN xa_phuong x ON d.MaXa = x.MaXa
        """)
        rows = cursor.fetchall()

    stops = []
    for r in rows:
        stops.append({
            "MaTram": r[0],
            "TenTram": r[1],
            "lat": r[2],        # ViDo
            "lng": r[3],        # KinhDo
            "MaLoai": r[4],     # 1 = Station, 2 = Stop
            "DiaChi": r[5],
            "MaXa": r[6],
            "TenXa": r[7],
        })


    # 2) Load routes WITH full info
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                MaTuyen,
                TenTuyen,
                DoDai,
                GiaVe,
                ThoiGianToanTuyen,
                GioBatDay,
                GioKetThuc,
                ThoiGianGiua2Tuyen,
                SoChuyen
            FROM tuyen_bus
        """)
        rows = cursor.fetchall()

    routes = []
    for r in rows:
        gio_bat_day = r[5]
        gio_ket_thuc = r[6]

        def fmt_time(t):
            return t.strftime("%H:%M") if t else None
    
        routes.append({
            "MaTuyen": r[0],
            "TenTuyen": r[1],
            "DoDai": r[2],
            "GiaVe": r[3],
            "ThoiGianToanTuyen": r[4],
            "GioBatDay": fmt_time(gio_bat_day),
            "GioKetThuc": fmt_time(gio_ket_thuc),
            "ThoiGianGiua2Tuyen": r[7],
            "SoChuyen": r[8],
        })

    # Load xa_phuong table
    with connection.cursor() as cursor:
        cursor.execute("SELECT MaXa, TenXa FROM xa_phuong")
        rows = cursor.fetchall()

    xa_list = [{"MaXa": r[0], "TenXa": r[1]} for r in rows]

    # 3) Send everything to template
    context = {
        "routes": routes,
        "routes_json": json.dumps(routes),
        "stops_json": json.dumps(stops),
        "xa_json": json.dumps(xa_list),  # <-- add this
        "GG_API_KEY": settings.GG_API_KEY,
    }

    return render(request, "map.html", context)



def route_path_view(request):
    ma_tuyen = request.GET.get("MaTuyen")
    chieu = request.GET.get("Chieu", "0")  # default 0 = chiều đi

    if not ma_tuyen:
        return JsonResponse({"error": "MaTuyen is required"}, status=400)

    field = "Path" if chieu == "0" else "Path_Nguoc"

    with connection.cursor() as cursor:
        cursor.execute(f"SELECT AsText({field}) FROM tuyen_bus WHERE MaTuyen = %s", [ma_tuyen])
        row = cursor.fetchone()

    if not row or row[0] is None:
        return JsonResponse({"error": "Route/geometry not found"}, status=404)

    wkt = row[0]
    path = wkt_to_latlng_list(wkt)

    return JsonResponse({"path": path})

@csrf_exempt
@require_POST
def update_stop_location(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tram = data["MaTram"]
        lat = float(data["lat"])
        lng = float(data["lng"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return JsonResponse({"success": False, "error": "Invalid payload"}, status=400)

    # Update tram_dung table
    updated = TramDung.objects.filter(MaTram=ma_tram).update(
        ViDo=lat,
        KinhDo=lng,
    )

    if updated == 0:
        return JsonResponse({"success": False, "error": "Stop not found"}, status=404)

    return JsonResponse({"success": True})

@csrf_exempt
@require_POST
def update_route_geometry(request):
    """
    Update Path or Path_Nguoc from an ordered list of {lat, lng} points.
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tuyen = data["MaTuyen"]
        chieu = int(data["Chieu"])  # 0: Path, 1: Path_Nguoc
        path = data["path"]
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    if not isinstance(path, list) or len(path) < 2:
        return JsonResponse({"success": False, "error": "Path must have at least 2 points"}, status=400)

    # Build LINESTRING WKT: "lng lat, lng lat, ..."
    coord_strings = []
    for pt in path:
        try:
            lat = float(pt["lat"])
            lng = float(pt["lng"])
        except (KeyError, ValueError, TypeError):
            return JsonResponse({"success": False, "error": "Invalid coordinate in path"}, status=400)
        coord_strings.append(f"{lng} {lat}")

    wkt = "LINESTRING(" + ", ".join(coord_strings) + ")"
    field = "Path" if chieu == 0 else "Path_Nguoc"

    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE tuyen_bus SET {field} = ST_GeomFromText(%s) WHERE MaTuyen = %s",
            [wkt, ma_tuyen],
        )
        affected = cursor.rowcount

    if affected == 0:
        return JsonResponse({"success": False, "error": "Route not found"}, status=404)

    return JsonResponse({"success": True})

def haversine_meters(lon1, lat1, lon2, lat2):
    R = 6371000.0  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def route_stops_view(request):
    ma_tuyen = request.GET.get("MaTuyen")
    chieu = request.GET.get("Chieu", "0")

    if not ma_tuyen:
        return JsonResponse({"error": "MaTuyen is required"}, status=400)

    try:
        chieu_int = int(chieu)
    except ValueError:
        return JsonResponse({"error": "Invalid Chieu"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT t.MaTram, t.STT, t.KhoangCachDenTramTiepTheo,
                   d.TenTram, d.KinhDo, d.ViDo, d.MaLoai
            FROM tuyen_tram t
            LEFT JOIN tram_dung d ON t.MaTram = d.MaTram
            WHERE t.MaTuyen = %s AND t.Chieu = %s
            ORDER BY t.STT
            """,
            [ma_tuyen, chieu_int],
        )
        rows = cursor.fetchall()

    stops = []
    for r in rows:
        stops.append(
            {
                "MaTram": r[0],
                "STT": r[1],
                "KhoangCachDenTramTiepTheo": r[2],
                "TenTram": r[3],
                "KinhDo": r[4],
                "ViDo": r[5],
                "MaLoai": r[6],
            }
        )

    return JsonResponse({"stops": stops})

@csrf_exempt
@require_POST
def add_route_stop_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tuyen = data["MaTuyen"]
        chieu = int(data["Chieu"])
        lat = float(data["lat"])
        lng = float(data["lng"])

        existing_ma_tram = data.get("ExistingMaTram") or None
        ten_tram = data.get("TenTram")
        ma_loai = data.get("MaLoai")
        dia_chi = data.get("DiaChi") or None

        insert_after_stt = data.get("InsertAfterSTT")
        insert_after_stt = int(insert_after_stt) if insert_after_stt is not None else None

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    if not ma_tuyen:
        return JsonResponse({"success": False, "error": "MaTuyen is required"}, status=400)

    with connection.cursor() as cursor:

        # ---------------------------------------------------------------------
        # 1) Determine MaTram (reuse OR create)
        # ---------------------------------------------------------------------
        if existing_ma_tram:
            ma_tram = existing_ma_tram
        else:
            if not ten_tram or not ma_loai:
                return JsonResponse({
                    "success": False,
                    "error": "TenTram and MaLoai required for new stop"
                }, status=400)

            cursor.execute(
                "SELECT MaTram FROM tram_dung WHERE MaTram LIKE %s ORDER BY MaTram DESC LIMIT 1",
                (ma_tuyen + "_%",),
            )
            row = cursor.fetchone()

            if row:
                last = row[0]
                try:
                    suffix = int(last.split("_")[1])
                except:
                    suffix = 0
            else:
                suffix = 0

            next_idx = suffix + 1
            ma_tram = f"{ma_tuyen}_{next_idx:03d}"

            # Create new stop
            cursor.execute(
                """
                INSERT INTO tram_dung (MaTram, MaLoai, MaXa, TenTram, KinhDo, ViDo, DiaChi)
                VALUES (%s, %s, NULL, %s, %s, %s, %s)
                """,
                [ma_tram, ma_loai, ten_tram, lng, lat, dia_chi],
            )

        # ---------------------------------------------------------------------
        # 2) Insert position: INSERT_AFTER_STT logic
        # ---------------------------------------------------------------------
        # If route has no stops yet:
        cursor.execute(
            "SELECT COUNT(*) FROM tuyen_tram WHERE MaTuyen=%s AND Chieu=%s",
            [ma_tuyen, chieu]
        )
        count = cursor.fetchone()[0]

        if count == 0:
            # Insert as first stop
            new_stt = 1
        else:
            if insert_after_stt is None:
                # fallback: insert at end
                cursor.execute(
                    "SELECT MAX(STT) FROM tuyen_tram WHERE MaTuyen=%s AND Chieu=%s",
                    [ma_tuyen, chieu],
                )
                last_stt = cursor.fetchone()[0] or 0
                new_stt = last_stt + 1
            else:
                # Shift all later STT
                cursor.execute(
                    """
                    UPDATE tuyen_tram
                    SET STT = STT + 1
                    WHERE MaTuyen=%s AND Chieu=%s AND STT > %s
                    """,
                    [ma_tuyen, chieu, insert_after_stt]
                )
                new_stt = insert_after_stt + 1

        # Insert the new (route,stop)
        cursor.execute(
            """
            INSERT INTO tuyen_tram (MaTuyen, MaTram, STT, KhoangCachDenTramTiepTheo, Chieu)
            VALUES (%s, %s, %s, NULL, %s)
            """,
            [ma_tuyen, ma_tram, new_stt, chieu],
        )

        # ---------------------------------------------------------------------
        # 3) Recompute all distances (true route distance, not straight line)
        # ---------------------------------------------------------------------
        # Load route geometry
        path_field = "Path" if chieu == 0 else "Path_Nguoc"
        cursor.execute(
            f"SELECT AsText({path_field}) FROM tuyen_bus WHERE MaTuyen=%s",
            [ma_tuyen]
        )
        row = cursor.fetchone()

        if not row or not row[0]:
            route_coords = None
        else:
            route_coords = wkt_to_latlng_list(row[0])  # list of lat/lng dicts

        # Helper: find distance along route between two stops
        def route_distance(m1, m2):
            if not route_coords:
                return 0.0

            # find nearest point index on path for each stop
            def nearest_index(lat_s, lng_s):
                best_idx = 0
                best_d = float("inf")
                for i, pt in enumerate(route_coords):
                    d = (pt["lat"] - lat_s)**2 + (pt["lng"] - lng_s)**2
                    if d < best_d:
                        best_d = d
                        best_idx = i
                return best_idx

            cursor.execute("SELECT ViDo, KinhDo FROM tram_dung WHERE MaTram=%s", [m1])
            r1 = cursor.fetchone()
            cursor.execute("SELECT ViDo, KinhDo FROM tram_dung WHERE MaTram=%s", [m2])
            r2 = cursor.fetchone()

            if not r1 or not r2:
                return 0.0

            lat1, lng1 = r1[0], r1[1]
            lat2, lng2 = r2[0], r2[1]

            i1 = nearest_index(lat1, lng1)
            i2 = nearest_index(lat2, lng2)

            if i1 == i2:
                return 0.0

            if i1 > i2:
                i1, i2 = i2, i1

            # sum haversine along route segments
            total = 0.0
            for i in range(i1, i2):
                p1 = route_coords[i]
                p2 = route_coords[i+1]
                total += haversine_meters(p1["lng"], p1["lat"], p2["lng"], p2["lat"])

            return total

        # Load all stops on this route+direction in STT order
        cursor.execute(
            """
            SELECT MaTram, STT FROM tuyen_tram
            WHERE MaTuyen=%s AND Chieu=%s
            ORDER BY STT
            """,
            [ma_tuyen, chieu]
        )
        route_stops = cursor.fetchall()

        # Update distance for each stop → next stop
        for i in range(len(route_stops)-1):
            ma1, stt1 = route_stops[i]
            ma2, stt2 = route_stops[i+1]

            dist = route_distance(ma1, ma2)

            cursor.execute(
                """
                UPDATE tuyen_tram
                SET KhoangCachDenTramTiepTheo = %s
                WHERE MaTuyen=%s AND MaTram=%s AND Chieu=%s
                """,
                [float(dist), ma_tuyen, ma1, chieu]
            )

        # Last stop has no next stop → set NULL
        if route_stops:
            last_ma = route_stops[-1][0]
            cursor.execute(
                """
                UPDATE tuyen_tram
                SET KhoangCachDenTramTiepTheo = NULL
                WHERE MaTuyen=%s AND MaTram=%s AND Chieu=%s
                """,
                [ma_tuyen, last_ma, chieu]
            )

    # -------------------------------------------------------------------------
    # Return created stop
    # -------------------------------------------------------------------------
    return JsonResponse({
        "success": True,
        "stop": {
            "MaTram": ma_tram,
            "TenTram": ten_tram,
            "MaLoai": ma_loai,
            "lat": lat,
            "lng": lng,
            "DiaChi": dia_chi,
        }
    })

@csrf_exempt
@require_POST
def delete_route_stop_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tuyen = data["MaTuyen"]
        chieu = int(data["Chieu"])
        ma_tram = data["MaTram"]
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    with connection.cursor() as cursor:
        # 1) Find STT + distance of the stop being removed
        cursor.execute(
            """
            SELECT STT, KhoangCachDenTramTiepTheo
            FROM tuyen_tram
            WHERE MaTuyen=%s AND Chieu=%s AND MaTram=%s
            """,
            [ma_tuyen, chieu, ma_tram],
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({"success": False, "error": "Stop not on this route"}, status=404)

        stt_removed = row[0]
        dist_removed = row[1]  # distance from this stop to its next stop (may be NULL)

        # 2) If there is a previous stop, update its distance
        if stt_removed > 1:
            # previous stop (STT - 1)
            cursor.execute(
                """
                SELECT MaTram, KhoangCachDenTramTiepTheo
                FROM tuyen_tram
                WHERE MaTuyen=%s AND Chieu=%s AND STT=%s
                """,
                [ma_tuyen, chieu, stt_removed - 1],
            )
            prev_row = cursor.fetchone()

            if prev_row:
                prev_ma_tram, prev_dist = prev_row[0], prev_row[1]

                # If the removed stop had a next distance:
                if dist_removed is not None:
                    # default prev_dist to 0 if NULL
                    base = prev_dist or 0.0
                    new_prev_dist = base + float(dist_removed)
                else:
                    # removed stop was the last one → previous now has no "next"
                    new_prev_dist = None

                cursor.execute(
                    """
                    UPDATE tuyen_tram
                    SET KhoangCachDenTramTiepTheo = %s
                    WHERE MaTuyen=%s AND Chieu=%s AND MaTram=%s
                    """,
                    [new_prev_dist, ma_tuyen, chieu, prev_ma_tram],
                )

        # 3) Delete the row for this stop
        cursor.execute(
            """
            DELETE FROM tuyen_tram
            WHERE MaTuyen=%s AND Chieu=%s AND MaTram=%s
            """,
            [ma_tuyen, chieu, ma_tram],
        )

        # 4) Shift STT of all later stops down by 1
        cursor.execute(
            """
            UPDATE tuyen_tram
            SET STT = STT - 1
            WHERE MaTuyen=%s AND Chieu=%s AND STT > %s
            """,
            [ma_tuyen, chieu, stt_removed],
        )

    return JsonResponse({"success": True})

@csrf_exempt
@require_POST
def update_stop_info_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tram = data["MaTram"]
        ten_tram = data.get("TenTram")
        dia_chi = data.get("DiaChi")
        ma_loai = data.get("MaLoai")
        ma_xa = data.get("MaXa")
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE tram_dung
            SET TenTram=%s, DiaChi=%s, MaLoai=%s, MaXa=%s
            WHERE MaTram=%s
            """,
            [ten_tram, dia_chi, ma_loai, ma_xa, ma_tram]
        )

    return JsonResponse({"success": True})

def shortest_path_view(request):
    start = request.GET.get("start")
    end = request.GET.get("end")

    if not start or not end:
        return JsonResponse(
            {"success": False, "error": "start and end are required"},
            status=400,
        )

    # ---------- Helpers ----------

    def haversine_meters(lon1, lat1, lon2, lat2):
        """Simple haversine in meters."""
        R = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def build_route_graph():
        """
        Build directed graph from tuyen_tram.

        Node: MaTram
        Edge: MaTram(i) -> MaTram(i+1) for each (MaTuyen, Chieu),
              weight = KhoangCachDenTramTiepTheo (meters) or haversine fallback.

        Returns:
          graph:  {MaTram: [edge, ...]}
          node_info: {MaTram: {...}}
        """
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    tt.MaTuyen,
                    tt.Chieu,
                    tt.STT,
                    tt.MaTram,
                    tt.KhoangCachDenTramTiepTheo,
                    d.TenTram,
                    d.ViDo,
                    d.KinhDo,
                    d.MaLoai
                FROM tuyen_tram tt
                JOIN tram_dung d ON tt.MaTram = d.MaTram
                ORDER BY tt.MaTuyen, tt.Chieu, tt.STT
                """
            )
            rows = cursor.fetchall()

        routes = defaultdict(list)
        for (
            ma_tuyen,
            chieu,
            stt,
            ma_tram,
            kc_next,
            ten_tram,
            lat,
            lng,
            ma_loai,
        ) in rows:
            routes[(ma_tuyen, chieu)].append(
                {
                    "MaTuyen": ma_tuyen,
                    "Chieu": int(chieu),
                    "STT": stt,
                    "MaTram": ma_tram,
                    "KhoangCachDenTramTiepTheo": kc_next,
                    "TenTram": ten_tram,
                    "lat": float(lat),
                    "lng": float(lng),
                    "MaLoai": ma_loai,
                }
            )

        graph = defaultdict(list)
        node_info = {}

        for stop_list in routes.values():
            stop_list.sort(key=lambda s: s["STT"])

            for s in stop_list:
                if s["MaTram"] not in node_info:
                    node_info[s["MaTram"]] = {
                        "MaTram": s["MaTram"],
                        "TenTram": s["TenTram"],
                        "lat": s["lat"],
                        "lng": s["lng"],
                        "MaLoai": s["MaLoai"],
                    }

            for i in range(len(stop_list) - 1):
                a = stop_list[i]
                b = stop_list[i + 1]

                weight = a["KhoangCachDenTramTiepTheo"]
                if weight is None:
                    weight = haversine_meters(
                        a["lng"],
                        a["lat"],
                        b["lng"],
                        b["lat"],
                    )

                edge = {
                    "from": a["MaTram"],
                    "to": b["MaTram"],
                    "weight": float(weight),
                    "MaTuyen": a["MaTuyen"],
                    "Chieu": a["Chieu"],
                    "from_STT": a["STT"],
                    "to_STT": b["STT"],
                }
                graph[a["MaTram"]].append(edge)

        return graph, node_info

    def enumerate_all_paths(graph, start_node, end_node, max_paths=1000, max_len=300):
        """
        DFS over the directed graph, collecting all simple paths from start_node to end_node.
        - No node is visited twice in the same path -> no cycle.
        - max_paths / max_len are safety caps.
        """
        paths = []

        def dfs(node, nodes, edges):
            if len(paths) >= max_paths:
                return
            if len(nodes) > max_len:
                return

            if node == end_node:
                total = sum(e["weight"] for e in edges)
                paths.append(
                    {"total_distance": total, "nodes": list(nodes), "edges": list(edges)}
                )
                return

            for edge in graph.get(node, []):
                v = edge["to"]
                if v in nodes:  # avoid cycles
                    continue
                nodes.append(v)
                edges.append(edge)
                dfs(v, nodes, edges)
                edges.pop()
                nodes.pop()

        dfs(start_node, [start_node], [])
        return paths

    def load_route_geometry(ma_tuyen, chieu):
        """
        Load full geometry for route+direction as list[{lat,lng}],
        using Path (chieu=0) or Path_Nguoc (chieu=1).
        """
        field = "Path" if chieu == 0 else "Path_Nguoc"
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT AsText({field}) FROM tuyen_bus WHERE MaTuyen = %s",
                [ma_tuyen],
            )
            row = cursor.fetchone()
        if not row or row[0] is None:
            return []
        # uses existing helper in this file
        return wkt_to_latlng_list(row[0])

    def closest_index_on_path(path_coords, lat, lng):
        """Index of vertex in path_coords closest to (lat, lng)."""
        best_idx = 0
        best_d2 = float("inf")
        for i, p in enumerate(path_coords):
            dx = p["lng"] - lng
            dy = p["lat"] - lat
            d2 = dx * dx + dy * dy
            if d2 < best_d2:
                best_d2 = d2
                best_idx = i
        return best_idx

    # ---------- Build graph & enumerate all simple paths ----------

    graph, node_info = build_route_graph()

    if start not in node_info:
        return JsonResponse(
            {"success": False, "error": f"Unknown start stop: {start}"},
            status=404,
        )
    if end not in node_info:
        return JsonResponse(
            {"success": False, "error": f"Unknown end stop: {end}"},
            status=404,
        )

    raw_paths = enumerate_all_paths(graph, start, end)
    if not raw_paths:
        return JsonResponse(
            {"success": False, "error": "No path found"},
            status=404,
        )

    # sort by total distance and pick index 0 as "shortest"
    raw_paths.sort(key=lambda p: p["total_distance"])
    best_index = 0

    # ---------- Build geometry & payload for each path ----------

    route_geom_cache = {}

    def get_geom(ma_tuyen, chieu):
        key = (ma_tuyen, chieu)
        if key not in route_geom_cache:
            route_geom_cache[key] = load_route_geometry(ma_tuyen, chieu)
        return route_geom_cache[key]

    paths_payload = []

    for p in raw_paths:
        nodes = p["nodes"]
        edges = p["edges"]
        stops = [node_info[n] for n in nodes]

        combined_polyline = []
        segments = []
        current_segment = None
        edges_json = []

        for edge in edges:
            ma_tuyen = edge["MaTuyen"]
            chieu = edge["Chieu"]
            from_id = edge["from"]
            to_id = edge["to"]

            geom = get_geom(ma_tuyen, chieu)
            if not geom:
                a = node_info[from_id]
                b = node_info[to_id]
                seg_coords = [
                    {"lat": a["lat"], "lng": a["lng"]},
                    {"lat": b["lat"], "lng": b["lng"]},
                ]
            else:
                a = node_info[from_id]
                b = node_info[to_id]
                i_start = closest_index_on_path(geom, a["lat"], a["lng"])
                i_end = closest_index_on_path(geom, b["lat"], b["lng"])
                if i_start <= i_end:
                    seg_coords = geom[i_start : i_end + 1]
                else:
                    seg_coords = list(reversed(geom[i_end : i_start + 1]))

            # grow full polyline
            if not combined_polyline:
                combined_polyline.extend(seg_coords)
            else:
                combined_polyline.extend(seg_coords[1:])

            # group into segments by (MaTuyen, Chieu)
            if (
                current_segment is None
                or current_segment["MaTuyen"] != ma_tuyen
                or current_segment["Chieu"] != chieu
            ):
                if current_segment is not None:
                    segments.append(current_segment)
                current_segment = {
                    "MaTuyen": ma_tuyen,
                    "Chieu": chieu,
                    "from": from_id,
                    "to": to_id,
                    "distance": edge["weight"],
                    "coords": list(seg_coords),
                }
            else:
                current_segment["to"] = to_id
                current_segment["distance"] += edge["weight"]
                current_segment["coords"].extend(seg_coords[1:])

            # per-edge coords for frontend dedupe
            edges_json.append(
                {
                    "from": from_id,
                    "to": to_id,
                    "MaTuyen": ma_tuyen,
                    "Chieu": chieu,
                    "from_STT": edge["from_STT"],
                    "to_STT": edge["to_STT"],
                    "distance": edge["weight"],
                    "coords": list(seg_coords),
                }
            )

        if current_segment is not None:
            segments.append(current_segment)

        paths_payload.append(
            {
                "total_distance": p["total_distance"],
                "nodes": nodes,
                "stops": stops,
                "edges": edges_json,
                "polyline": combined_polyline,
                "segments": segments,
            }
        )

    return JsonResponse(
        {
            "success": True,
            "paths": paths_payload,   # ALL non-circular paths
            "best_index": best_index, # index of shortest
        }
    )


def enumerate_bounded_paths(graph, start, end, best_distance, max_factor=1.5, max_paths=10):
    if best_distance <= 0:
        return []

    dist_limit = best_distance * max_factor
    paths = []
    visited = set()

    def dfs(node, dist_so_far, nodes, edges):
        if len(paths) >= max_paths:
            return
        if dist_so_far > dist_limit:
            return
        if node == end and len(nodes) > 1:
            paths.append({
                "total_distance": dist_so_far,
                "nodes": list(nodes),
                "edges": list(edges),
            })
            return

        for edge in graph.get(node, []):
            v = edge["to"]
            if v in nodes:  # avoid cycles
                continue
            nd = dist_so_far + edge["weight"]
            if nd > dist_limit:
                continue
            nodes.append(v)
            edges.append(edge)
            dfs(v, nd, nodes, edges)
            edges.pop()
            nodes.pop()

    dfs(start, 0.0, [start], [])

    # sort by distance and clip
    paths.sort(key=lambda p: p["total_distance"])
    return paths[:max_paths]

@csrf_exempt
@require_POST
def update_route_info_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tuyen = data["MaTuyen"]

        ten_tuyen = data.get("TenTuyen")
        do_dai = data.get("DoDai")
        gia_ve = data.get("GiaVe")
        thoi_gian_toan_tuyen = data.get("ThoiGianToanTuyen")
        gio_bat_day = data.get("GioBatDay")       # expect 'HH:MM' or full timestamp string
        gio_ket_thuc = data.get("GioKetThuc")
        thoi_gian_giua2tuyen = data.get("ThoiGianGiua2Tuyen")
        so_chuyen = data.get("SoChuyen")

        # Coerce numeric fields if present
        do_dai = float(do_dai) if do_dai not in (None, "",) else None
        gia_ve = int(gia_ve) if gia_ve not in (None, "",) else None
        thoi_gian_toan_tuyen = int(thoi_gian_toan_tuyen) if thoi_gian_toan_tuyen not in (None, "",) else None
        thoi_gian_giua2tuyen = int(thoi_gian_giua2tuyen) if thoi_gian_giua2tuyen not in (None, "",) else None
        so_chuyen = int(so_chuyen) if so_chuyen not in (None, "",) else None

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE tuyen_bus
            SET TenTuyen=%s,
                DoDai=%s,
                GiaVe=%s,
                ThoiGianToanTuyen=%s,
                GioBatDay=%s,
                GioKetThuc=%s,
                ThoiGianGiua2Tuyen=%s,
                SoChuyen=%s
            WHERE MaTuyen=%s
            """,
            [
                ten_tuyen,
                do_dai,
                gia_ve,
                thoi_gian_toan_tuyen,
                gio_bat_day,
                gio_ket_thuc,
                thoi_gian_giua2tuyen,
                so_chuyen,
                ma_tuyen,
            ],
        )

    return JsonResponse({"success": True})

def stop_routes_view(request):
    ma_tram = request.GET.get("MaTram")
    if not ma_tram:
        return JsonResponse({"success": False, "error": "Missing MaTram"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT tt.MaTuyen,
                   tt.Chieu,
                   tb.TenTuyen
            FROM tuyen_tram tt
            JOIN tuyen_bus tb ON tb.MaTuyen = tt.MaTuyen
            WHERE tt.MaTram = %s
            GROUP BY tt.MaTuyen, tt.Chieu, tb.TenTuyen
            ORDER BY tt.MaTuyen, tt.Chieu
        """, [ma_tram])
        rows = cursor.fetchall()

    routes = [
        {
            "MaTuyen": r[0],
            "Chieu": r[1],
            "TenTuyen": r[2],
        }
        for r in rows
    ]
    return JsonResponse({"success": True, "routes": routes})


@csrf_exempt
@require_POST
def new_route_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        ma_tuyen = (data.get("MaTuyen") or "").strip()
        ten_tuyen = (data.get("TenTuyen") or "").strip() or None
        vertices = data.get("Vertices") or []
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    if not ma_tuyen:
        return JsonResponse({"success": False, "error": "MaTuyen is required"}, status=400)
    if len(vertices) < 2:
        return JsonResponse({"success": False, "error": "At least 2 vertices required"}, status=400)

    def build_linestring(points):
        coords = []
        for p in points:
            lat = float(p["lat"])
            lng = float(p["lng"])
            coords.append(f"{lng} {lat}")  # WKT = lon lat
        return "LINESTRING(" + ", ".join(coords) + ")"

    wkt = build_linestring(vertices)
    wkt_rev = build_linestring(list(reversed(vertices)))  # Path_Nguoc = flipped order

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tuyen_bus
                    (MaTuyen, TenTuyen, Path, Path_Nguoc)
                VALUES
                    (%s, %s, ST_GeomFromText(%s, 4326), ST_GeomFromText(%s, 4326))
                """,
                [ma_tuyen, ten_tuyen, wkt, wkt_rev],
            )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": True})