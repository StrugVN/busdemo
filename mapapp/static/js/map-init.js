// map-init.js
window.onload = function () {
  initMap();

  document.getElementById("routeSelect").addEventListener("change", loadAndDrawRoute);
  document.getElementById("directionSelect").addEventListener("change", loadAndDrawRoute);

  document.getElementById("applyRouteChangesBtn").addEventListener("click", applyRouteChanges);
  document.getElementById("cancelRouteChangesBtn").addEventListener("click", cancelRouteChanges);
};
