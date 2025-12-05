from django.urls import path

from .views import (
    map_view,
    route_path_view,
    update_stop_location,
    update_route_geometry,
    route_stops_view,
    add_route_stop_view,
)

urlpatterns = [
    path("", map_view, name="map"),
    path("route-path/", route_path_view, name="route_path"),
    path("update-stop-location/", update_stop_location, name="update_stop_location"),
    path("update-route-geometry/", update_route_geometry, name="update_route_geometry"),
    path("route-stops/", route_stops_view, name="route_stops"),
    path("add-route-stop/", add_route_stop_view, name="add_route_stop"),
]

