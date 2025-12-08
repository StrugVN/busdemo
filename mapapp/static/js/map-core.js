// Global state
let map;
let currentPolyline = null;
let stopMarkers = [];

// stop editing
let selectedStop = null;
let isChangingLocation = false;

// route editing
let editMode = false;
let selectedVertexIndex = null;
let awaitingAddNodeClick = false;
let currentRouteMaTuyen = null;
let currentRouteChieu = "0";   // "0" đi, "1" về
let polylinePath = null;       // google.maps.MVCArray
let routeInfoWindow = null;
let vertexInfoWindow = null;

let messageTimeoutId = null;

let originalRouteBackup = null;

let pendingStopLatLng = null;
let routeStopsCache = [];

let selectionRect = null;
let rectSelecting = false;
let rectStartPixel = null;
let mapOverlay = null;
let selectedVertexIndices = new Set();  // indices marked for deletion
let previousMapDraggable = true;

let pendingRightClickStop = null;

let geocoder;  // for reverse geocoding


//
// TYPE 2 (Điểm dừng)  — triangles
//
const iconTriangleRed = {
  path: "M 0,6 L -5,-3 L 5,-3 z",
  fillColor: "#d32f2f",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.4,
};

const iconTriangleGreen = {
  path: "M 0,6 L -5,-3 L 5,-3 z",
  fillColor: "#4CAF50",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.4,
};

//
// TYPE 1 (Bến xe) — hexagons
//
const iconHexagonRed = {
  path: "M -5,0 L -2.5,-4.3 L 2.5,-4.3 L 5,0 L 2.5,4.3 L -2.5,4.3 z",
  fillColor: "#d32f2f",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.2,
};

const iconHexagonBlue = {
  path: "M -5,0 L -2.5,-4.3 L 2.5,-4.3 L 5,0 L 2.5,4.3 L -2.5,4.3 z",
  fillColor: "#2196F3",  // BLUE
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.25,
};

const iconHexagonGreen = {
  path: "M -5,0 L -2.5,-4.3 L 2.5,-4.3 L 5,0 L 2.5,4.3 L -2.5,4.3 z",
  fillColor: "#4CAF50",  // GREEN
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.25,
};

const iconHexagonOrange = {
  path: "M -5,0 L -2.5,-4.3 L 2.5,-4.3 L 5,0 L 2.5,4.3 L -2.5,4.3 z",
  fillColor: "#ff9800",  // ORANGE
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1,
  scale: 1.25,
};

// Toast helper
function showMessage(text, timeout = 3000) {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.style.display = "block";

  if (messageTimeoutId) clearTimeout(messageTimeoutId);
  messageTimeoutId = setTimeout(() => {
    box.style.display = "none";
  }, timeout);
}

// initMap – full logic: overlay, markers, click handlers
function initMap() {
  const center = { lat: 10.776, lng: 106.700 }; // adjust to your city
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: center,
  });

  geocoder = new google.maps.Geocoder();

  // Overlay for rectangle selection
  mapOverlay = new google.maps.OverlayView();
  mapOverlay.onAdd = function () { };
  mapOverlay.onRemove = function () { };
  mapOverlay.draw = function () { };
  mapOverlay.setMap(map);

  // Middle–mouse rectangle selection (defined in map-selection.js)
  setupRectangleSelection();

  // Create stop markers (defined in map-stops.js)
  STOPS.forEach(stop => {
    createStopMarker(stop);
  });

  // Map click: add node / move stop
  map.addListener("click", (event) => {
    const newLatLng = event.latLng;

    // 1) route Add node (highest priority)
    if (editMode && awaitingAddNodeClick && selectedVertexIndex !== null && polylinePath) {
      const insertIndex = selectedVertexIndex; // insert before selected
      polylinePath.insertAt(insertIndex, newLatLng);
      awaitingAddNodeClick = false;
      selectedVertexIndex = null;
      showMessage("Node added.", 2000);
      return;
    }

    // 2) stop location change
    if (isChangingLocation && selectedStop) {
      selectedStop.setPosition(newLatLng);
      selectedStop.stopData.lat = newLatLng.lat();
      selectedStop.stopData.lng = newLatLng.lng();
      isChangingLocation = false;

      showMessage("Saving new stop location...");

      fetch("/update-stop-location/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          MaTram: selectedStop.stopData.MaTram,
          lat: newLatLng.lat(),
          lng: newLatLng.lng(),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) {
            showMessage("Stop moved, but DB update failed: " + data.error, 5000);
          } else {
            showMessage("Stop location updated.", 2500);
          }
        })
        .catch((err) => {
          console.error(err);
          showMessage("Stop moved, but error updating DB.", 5000);
        });

      return;
    }
  });

  // Map right-click: add stop to route
  map.addListener("rightclick", async (event) => {
    if (!currentRouteMaTuyen) {
      showMessage("Select a route and direction first.", 3000);
      return;
    }

    pendingStopLatLng = event.latLng;
    await openAddStopPanel();  // defined in map-stops.js
  });
}
