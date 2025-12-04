from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse
from django.db import connection

from .models import TuyenBus


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
    # Load all routes for dropdown
    routes = list(TuyenBus.objects.values("MaTuyen", "TenTuyen"))

    return render(
        request,
        "map.html",
        {
            "GG_API_KEY": settings.GG_API_KEY,
            "routes": routes,
        },
    )


def route_path_view(request):
    ma_tuyen = request.GET.get("MaTuyen")
    if not ma_tuyen:
        return JsonResponse({"error": "MaTuyen is required"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT AsText(Path) FROM tuyen_bus WHERE MaTuyen = %s",
            [ma_tuyen],
        )
        row = cursor.fetchone()

    if not row or row[0] is None:
        return JsonResponse({"error": "Route not found"}, status=404)

    wkt = row[0]
    path = wkt_to_latlng_list(wkt)
    return JsonResponse({"path": path})
