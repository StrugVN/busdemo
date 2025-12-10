from django.urls import path
from . import views

urlpatterns = [
    path("", views.map_view, name="map"),
    path("route-path/", views.route_path_view, name="route_path"),
    path("route-stops/", views.route_stops_view, name="route_stops"),
    path("update-stop-location/", views.update_stop_location, name="update_stop_location"),
    path("update-route-geometry/", views.update_route_geometry, name="update_route_geometry"),
    path("add-route-stop/", views.add_route_stop_view, name="add_route_stop"),
    path("delete-route-stop/", views.delete_route_stop_view, name="delete_route_stop"),
    path("update-stop-info/", views.update_stop_info_view, name="update_stop_info"),

    # NEW:
    path("shortest-path/", views.shortest_path_view, name="shortest_path"),
    path("update-route-info/", views.update_route_info_view, name="update_route_info"),
]
