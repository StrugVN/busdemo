from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse
from django.db import connection
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

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
    # Routes for dropdown
    routes = list(TuyenBus.objects.values("MaTuyen", "TenTuyen"))

    # All stops
    stops_qs = TramDung.objects.values("MaTram", "TenTram", "KinhDo", "ViDo")
    # Filter out rows without coords, just in case
    stops = [
        {
            "MaTram": s["MaTram"],
            "TenTram": s["TenTram"],
            "lat": s["ViDo"],
            "lng": s["KinhDo"],
        }
        for s in stops_qs
        if s["KinhDo"] is not None and s["ViDo"] is not None
    ]

    return render(
        request,
        "map.html",
        {
            "GG_API_KEY": settings.GG_API_KEY,
            "routes": routes,
            "stops_json": json.dumps(stops),
        },
    )



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
