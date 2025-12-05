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

    # 3) Send everything to template
    context = {
        "routes": routes,                         # for the <select> dropdown
        "routes_json": json.dumps(routes),        # for JS ROUTE_INFO lookup
        "stops_json": json.dumps(stops),          # for JS STOPS / markers
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
        ma_loai = data.get("MaLoai")  # "1" or "2"
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        return JsonResponse({"success": False, "error": f"Invalid payload: {e}"}, status=400)

    if not ma_tuyen:
        return JsonResponse({"success": False, "error": "MaTuyen is required"}, status=400)

    with connection.cursor() as cursor:
        # 1) Determine MaTram
        if existing_ma_tram:
            ma_tram = existing_ma_tram
        else:
            if not ten_tram or not ma_loai:
                return JsonResponse(
                    {"success": False, "error": "TenTram and MaLoai required for new stop"},
                    status=400,
                )

            # Find next index for this route's stops: pattern "11_XXX"
            cursor.execute(
                "SELECT MaTram FROM tram_dung WHERE MaTram LIKE %s ORDER BY MaTram DESC LIMIT 1",
                (ma_tuyen + "_%",),
            )
            row = cursor.fetchone()
            if row:
                last = row[0]  # e.g. "11_005"
                try:
                    suffix = int(last.split("_")[1])
                except Exception:
                    suffix = 0
            else:
                suffix = 0
            next_idx = suffix + 1
            ma_tram = f"{ma_tuyen}_{next_idx:03d}"

            # Insert into tram_dung
            cursor.execute(
                """
                INSERT INTO tram_dung (MaTram, MaLoai, MaXa, TenTram, KinhDo, ViDo, DiaChi)
                VALUES (%s, %s, NULL, %s, %s, %s, NULL)
                """,
                [ma_tram, ma_loai, ten_tram, lng, lat],
            )

        # 2) Determine new STT for this (route, direction)
        cursor.execute(
            "SELECT MAX(STT) FROM tuyen_tram WHERE MaTuyen = %s AND Chieu = %s",
            [ma_tuyen, chieu],
        )
        row = cursor.fetchone()
        prev_stt = row[0] or 0
        new_stt = prev_stt + 1

        # 3) Insert into tuyen_tram (new stop at the end)
        cursor.execute(
            """
            INSERT INTO tuyen_tram (MaTuyen, MaTram, STT, KhoangCachDenTramTiepTheo, Chieu)
            VALUES (%s, %s, %s, NULL, %s)
            """,
            [ma_tuyen, ma_tram, new_stt, chieu],
        )

        # 4) Update distance from previous stop (if any)
        if prev_stt > 0:
            cursor.execute(
                """
                SELECT MaTram FROM tuyen_tram
                WHERE MaTuyen = %s AND Chieu = %s AND STT = %s
                """,
                [ma_tuyen, chieu, prev_stt],
            )
            r2 = cursor.fetchone()
            if r2:
                prev_ma_tram = r2[0]

                cursor.execute(
                    "SELECT ViDo, KinhDo FROM tram_dung WHERE MaTram = %s", [prev_ma_tram]
                )
                prev_row = cursor.fetchone()
                cursor.execute(
                    "SELECT ViDo, KinhDo FROM tram_dung WHERE MaTram = %s", [ma_tram]
                )
                cur_row = cursor.fetchone()

                if prev_row and cur_row:
                    lat1, lng1 = prev_row[0], prev_row[1]
                    lat2, lng2 = cur_row[0], cur_row[1]
                    dist_m = haversine_meters(lng1, lat1, lng2, lat2)

                    cursor.execute(
                        """
                        UPDATE tuyen_tram
                        SET KhoangCachDenTramTiepTheo = %s
                        WHERE MaTuyen = %s AND MaTram = %s AND Chieu = %s
                        """,
                        [float(dist_m), ma_tuyen, prev_ma_tram, chieu],
                    )

    # Return info about the stop (useful for adding marker on map)
    return JsonResponse(
        {
            "success": True,
            "stop": {
                "MaTram": ma_tram,
                "TenTram": ten_tram,
                "MaLoai": ma_loai,
                "lat": lat,
                "lng": lng,
            },
        }
    )


