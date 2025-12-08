from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse
from django.db import connection
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import math
from .models import TuyenBus, TramDung


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
            SELECT MaTram, TenTram, ViDo, KinhDo, MaLoai
            FROM tram_dung
        """)
        rows = cursor.fetchall()

    stops = []
    for r in rows:
        stops.append({
            "MaTram": r[0],
            "TenTram": r[1],
            "lat": r[2],       # ViDo
            "lng": r[3],       # KinhDo
            "MaLoai": r[4],    # 1 = Bến xe, 2 = Điểm dừng
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
        routes.append({
            "MaTuyen": r[0],
            "TenTuyen": r[1],
            "DoDai": r[2],
            "GiaVe": r[3],
            "ThoiGianToanTuyen": r[4],
            "GioBatDay": r[5],
            "GioKetThuc": r[6],
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

        # find STT of the stop being removed
        cursor.execute(
            """
            SELECT STT FROM tuyen_tram
            WHERE MaTuyen=%s AND Chieu=%s AND MaTram=%s
            """,
            [ma_tuyen, chieu, ma_tram]
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({"success": False, "error": "Stop not on route"}, status=404)

        stt_removed = row[0]

        # delete from tuyen_tram
        cursor.execute(
            """
            DELETE FROM tuyen_tram
            WHERE MaTuyen=%s AND Chieu=%s AND MaTram=%s
            """,
            [ma_tuyen, chieu, ma_tram]
        )

        # shift STT of later stops
        cursor.execute(
            """
            UPDATE tuyen_tram
            SET STT = STT - 1
            WHERE MaTuyen=%s AND Chieu=%s AND STT > %s
            """,
            [ma_tuyen, chieu, stt_removed]
        )

        # recompute all distances (reuse logic from add_route_stop_view)
        # ---------------------------------------------------------------
        # (I will bundle this into a helper function shortly)
        # ---------------------------------------------------------------

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
