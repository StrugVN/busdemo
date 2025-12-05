from django.urls import path
from .views import map_view, route_path_view, update_stop_location

urlpatterns = [
    path("", map_view, name="map"),
    path("route-path/", route_path_view, name="route_path"),
    path("update-stop-location/", update_stop_location, name="update_stop_location"),
]
