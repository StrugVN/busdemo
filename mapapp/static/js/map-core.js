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

let currentRouteStopIds = new Set();  // MaTram currently on selected route+direction


let pathStartStopId = null;
let pathEndStopId = null;

let pathStartMarker = null;
let pathEndMarker = null;

let currentPathPolylines = [];  // google.maps.Polyline[]
let stopNameById = {};


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


function clearCurrentPathLines() {
  currentPathPolylines.forEach(pl => pl.setMap(null));
  currentPathPolylines = [];
}

function updatePathStatusPanel() {
  const startLabel = document.getElementById("pathStartLabel");
  const endLabel = document.getElementById("pathEndLabel");
  if (!startLabel || !endLabel) return;

  startLabel.textContent = "Start: " + (pathStartStopId || "(none)");
  endLabel.textContent = "End: " + (pathEndStopId || "(none)");
}

function resetPathSelection() {
  pathStartStopId = null;
  pathEndStopId = null;
  pathStartMarker = null;
  pathEndMarker = null;
  clearCurrentPathLines();
  updatePathPanel(null);
}


// initMap – full logic: overlay, markers, click handlers
function initMap() {
  const center = { lat: 9.602097, lng: 105.973469 }; // adjust to your city
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
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

function buildPathSummary(path) {
  if (!path || !Array.isArray(path.stops) || path.stops.length === 0) {
    return "(none)";
  }

  const stops = path.stops;
  const edges = path.edges || [];

  if (stops.length === 1 || edges.length === 0) {
    return stops[0].TenTram || stops[0].MaTram;
  }

  // We want:
  // StartName, [last stop of each bus run] (bus XXX), ...
  const parts = [];
  const startName = stops[0].TenTram || stops[0].MaTram;
  parts.push(startName);

  let runRoute = edges[0].MaTuyen;
  let runStartIdx = 0;

  function pushRun(endEdgeIdx) {
    const stopIdx = endEdgeIdx + 1;      // edge i ends at node i+1
    const st = stops[stopIdx];
    const name = st.TenTram || st.MaTram;
    parts.push(`${name} (bus ${runRoute})`);
  }

  for (let i = 1; i < edges.length; i++) {
    if (edges[i].MaTuyen !== runRoute) {
      // close previous run at i-1
      pushRun(i - 1);
      runRoute = edges[i].MaTuyen;
      runStartIdx = i;
    }
  }

  // close last run (to final stop)
  pushRun(edges.length - 1);

  return parts.join(", ");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDistance(meters) {
  if (!meters || meters <= 0) return "0 m";
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + " km";
  }
  return Math.round(meters) + " m";
}

function buildPathSummaryHtml(path) {
  if (!path || !Array.isArray(path.segments) || path.segments.length === 0)
    return "(none)";

  const segs = path.segments;
  const stops = path.stops || [];

  const stopNameByIdLocal = {};
  stops.forEach(s => {
    stopNameByIdLocal[s.MaTram] = s.TenTram || s.MaTram;
  });

  let html = "";

  // First stop
  const firstStop = stopNameByIdLocal[segs[0].from] || segs[0].from;
  html += `<div class="path-step-stop">${escapeHtml(firstStop)}</div>`;

  // Segments
  segs.forEach(seg => {
    const routeInfo = ROUTE_INFO[seg.MaTuyen];
    const routeName = routeInfo ? (routeInfo.TenTuyen || seg.MaTuyen) : seg.MaTuyen;

    const dirText =
      seg.Chieu === 0 || seg.Chieu === "0" ? "Chiều đi" : "Chiều về";

    const distText = formatDistance(seg.distance);
    const toStopName = stopNameByIdLocal[seg.to] || seg.to;

    html += `
      <div class="path-step-row">
        <div class="path-step-arrow">↓</div>
        <div class="path-step-route">
          ${escapeHtml(routeName)} - ${escapeHtml(dirText)} - ${escapeHtml(distText)}
        </div>
      </div>

      <div class="path-step-stop">${escapeHtml(toStopName)}</div>
    `;

  });

  return html;
}


function updatePathPanel(path = null) {
  const startEl = document.getElementById("pathStartName");
  const endEl = document.getElementById("pathEndName");
  const summaryEl = document.getElementById("pathSummary");

  if (startEl) {
    startEl.textContent =
      stopNameById[pathStartStopId] || pathStartStopId || "(none)";
  }

  if (endEl) {
    endEl.textContent =
      stopNameById[pathEndStopId] || pathEndStopId || "(none)";
  }

  if (summaryEl) {
    if (path) summaryEl.innerHTML = buildPathSummaryHtml(path);  // you already have this
    else summaryEl.textContent = "(none)";
  }
}

