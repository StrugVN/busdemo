// ----- GLOBALS -----
let allRoutesPolylines = [];

function enforceMinZoom(minZoom = 12) {
  const listener = google.maps.event.addListener(map, "idle", function () {
    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom);
    }
    google.maps.event.removeListener(listener);
  });
}


// Generate unlimited, visually distinct colors
function generateColorForIndex(i, total) {
    const hue = (i * (360 / total)) % 360;
    return `hsl(${hue}, 85%, 45%)`;
}

// Remove all simple polylines
function clearAllRoutesPolylines() {
    allRoutesPolylines.forEach(pl => pl.setMap(null));
    allRoutesPolylines = [];
}

async function loadAllRoutesForCurrentDirection() {
    clearAllRoutesPolylines();

    const chieu = document.getElementById("directionSelect").value;
    if (!ROUTES || ROUTES.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    for (let i = 0; i < ROUTES.length; i++) {
        const r = ROUTES[i];

        try {
            const res = await fetch(
                `/route-path/?MaTuyen=${encodeURIComponent(r.MaTuyen)}&Chieu=${encodeURIComponent(chieu)}`
            );

            if (!res.ok) {
                console.error("Failed to load route", r.MaTuyen);
                continue;
            }

            const data = await res.json();
            const path = data.path || [];
            if (!path.length) continue;

            const color = generateColorForIndex(i, ROUTES.length);

            const poly = new google.maps.Polyline({
                path,
                map,
                strokeColor: color,
                strokeWeight: 2,
                clickable: false,     // simple display only
                editable: false
            });

            allRoutesPolylines.push(poly);
            path.forEach(pt => bounds.extend(pt));

        } catch (err) {
            console.error("Route load error", r.MaTuyen, err);
        }
    }

    if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
    enforceMinZoom(10);
}

}


async function loadAndDrawRoute() {
    const maTuyen = document.getElementById("routeSelect").value;
    const chieu = document.getElementById("directionSelect").value;

    currentRouteMaTuyen = maTuyen || null;
    currentRouteChieu = chieu;

    // exit edit mode if switching route/direction
    if (editMode) {
        exitRouteEditMode();
    }

    if (!maTuyen) {
        // Hide the main editing polyline
        if (currentPolyline) {
            currentPolyline.setMap(null);
            currentPolyline = null;
        }

        await loadAllRoutesForCurrentDirection();
        await updateStopIconsForCurrentRoute();   // handled as "none selected"
        return;
    }

    clearAllRoutesPolylines();
    const res = await fetch(`/route-path/?MaTuyen=${encodeURIComponent(maTuyen)}&Chieu=${encodeURIComponent(chieu)}`);
    if (!res.ok) {
        console.error("Failed to load route", await res.text());
        showMessage("Failed to load route", 4000);
        return;
    }
    const data = await res.json();
    const path = data.path || [];
    if (!path.length) {
        showMessage("Route has no path geometry.", 3000);
        return;
    }

    const routeVertices = path.slice(); // keep a copy for editing

    if (currentPolyline) {
        currentPolyline.setMap(null);
        currentPolyline = null;
    }

    const start = routeVertices[0];
    const end = routeVertices[routeVertices.length - 1];

    currentPolyline = new google.maps.Polyline({
        path: routeVertices,
        map: map,
        strokeWeight: 2,
        strokeColor: "#0d47a1",
        editable: false,
        icons: [
            // direction arrows (pixel-based spacing)
            {
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 2.5,
                    strokeOpacity: 0.9,
                },
                offset: "25px",   // first arrow after 25px of line
                repeat: "80px",   // arrow roughly every 80px on screen
            },
            // start = blue dot
            {
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 4,
                    fillColor: "#0000ff",
                    fillOpacity: 1,
                    strokeColor: "#0000ff",
                    strokeWeight: 1,
                },
                offset: "0%",
            },
            // end = red X
            {
                icon: {
                    path: "M -2,-2 L 2,2 M 2,-2 L -2,2",
                    strokeColor: "#ff0000",
                    strokeWeight: 2,
                    scale: 2.5,
                },
                offset: "100%",
            },
        ],
    });

    // get reference to the path
    polylinePath = currentPolyline.getPath();

    // single click handler, behavior depends on editMode
    if (!routeInfoWindow) routeInfoWindow = new google.maps.InfoWindow();
    if (!vertexInfoWindow) vertexInfoWindow = new google.maps.InfoWindow();

    currentPolyline.addListener("click", (e) => {
        // if in edit mode, clicking on a vertex selects that vertex
        if (editMode) {
            if (typeof e.vertex === "number") {
                selectedVertexIndex = e.vertex;
                const idx = e.vertex;
                const content = `
          <div>
            <b>Node #${idx}</b><br/>
            <button id="addNodeBtn" type="button"
                    style="background:#4CAF50;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;">
              Add node
            </button>
            <button id="delNodeBtn" type="button"
                    style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:6px;">
              Delete node
            </button>
            <button id="delNodeBeyondBtn" type="button"
                    style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:6px;">
              Delete node and beyond
            </button>
          </div>
        `;
                vertexInfoWindow.setContent(content);
                vertexInfoWindow.setPosition(e.latLng);
                vertexInfoWindow.open(map);

                google.maps.event.addListenerOnce(vertexInfoWindow, "domready", () => {
                    const addBtn = document.getElementById("addNodeBtn");
                    const delBtn = document.getElementById("delNodeBtn");
                    const delBeyondBtn = document.getElementById("delNodeBeyondBtn");

                    if (addBtn) {
                        addBtn.onclick = () => {
                            awaitingAddNodeClick = true;
                            showMessage("Click on the map to insert a new node before this one.");
                        };
                    }
                    if (delBtn) {
                        delBtn.onclick = () => {
                            if (polylinePath.getLength() <= 2) {
                                showMessage("Cannot delete, route needs at least 2 points.", 4000);
                                return;
                            }
                            polylinePath.removeAt(idx);
                            selectedVertexIndex = null;
                            vertexInfoWindow.close();
                            showMessage("Node deleted.", 2000);
                        };
                    }
                    if (delBeyondBtn) {
                        delBeyondBtn.onclick = () => {
                            if (idx === 0) {
                                showMessage("Cannot delete from first node; route would be empty.", 4000);
                                return;
                            }
                            if (polylinePath.getLength() - idx < 2) {
                                showMessage("Need at least two nodes left on the route.", 4000);
                                return;
                            }
                            for (let i = polylinePath.getLength() - 1; i >= idx; i--) {
                                polylinePath.removeAt(i);
                            }
                            selectedVertexIndex = null;
                            vertexInfoWindow.close();
                            showMessage("Node and all following nodes deleted.", 2000);
                        };
                    }
                });
            }
            return;
        }

        // NOT in edit mode → show route info + Edit button
        if (!currentRouteMaTuyen) return;

        const r = ROUTE_INFO[currentRouteMaTuyen];

        const content = `
        <div>
          <b>Route ${currentRouteMaTuyen} — ${r.TenTuyen}</b><br/>
          Direction: ${currentRouteChieu === "0" ? "Chiều đi" : "Chiều về"}<br/><br/>

          <table style="font-size:12px;">
            <tr><td><b>Độ dài:</b></td><td>${r.DoDai ?? '–'} km</td></tr>
            <tr><td><b>Giá vé:</b></td><td>${r.GiaVe ?? '–'} đ</td></tr>
            <tr><td><b>Thời gian toàn tuyến:</b></td><td>${r.ThoiGianToanTuyen ?? '–'} phút</td></tr>
            <tr><td><b>Bắt đầu:</b></td><td>${r.GioBatDay ?? '–'}</td></tr>
            <tr><td><b>Kết thúc:</b></td><td>${r.GioKetThuc ?? '–'}</td></tr>
            <tr><td><b>Giữa 2 chuyến:</b></td><td>${r.ThoiGianGiua2Tuyen ?? '–'} phút</td></tr>
            <tr><td><b>Số chuyến:</b></td><td>${r.SoChuyen ?? '–'}</td></tr>
          </table>

          <button id="editRouteBtn" type="button"
                  style="background:#2196F3;color:white;border:none;padding:5px 10px;
                        border-radius:4px;margin-top:6px;cursor:pointer;">
            Edit route
          </button>
        </div>
      `;

        routeInfoWindow.setContent(content);
        routeInfoWindow.setPosition(e.latLng);
        routeInfoWindow.open(map);

        google.maps.event.addListenerOnce(routeInfoWindow, "domready", () => {
            const btn = document.getElementById("editRouteBtn");
            if (!btn) return;
            btn.onclick = () => {
                enterRouteEditMode();
                routeInfoWindow.close();
            };
        });
    });

    const bounds = new google.maps.LatLngBounds();
    routeVertices.forEach(pt => bounds.extend(pt));

    // only recenter if route is NOT currently visible
    if (!isRouteVisible(bounds)) {
        map.fitBounds(bounds);
    }

    await updateStopIconsForCurrentRoute();
}

function isRouteVisible(bounds) {
    const mapBounds = map.getBounds();
    if (!mapBounds) return false;
    return mapBounds.intersects(bounds);
}

// ROUTE EDIT MODE
function enterRouteEditMode() {
    if (!currentPolyline || !polylinePath || !currentRouteMaTuyen) {
        showMessage("No route to edit.");
        return;
    }
    if (editMode) return;

    editMode = true;
    awaitingAddNodeClick = false;
    selectedVertexIndex = null;

    // backup original geometry
    originalRouteBackup = [];
    for (let i = 0; i < polylinePath.getLength(); i++) {
        const p = polylinePath.getAt(i);
        originalRouteBackup.push({ lat: p.lat(), lng: p.lng() });
    }

    currentPolyline.setEditable(true);

    showMessage("Route edit mode: drag vertices, click a vertex to Add/Delete.");

    const applyBtn = document.getElementById("applyRouteChangesBtn");
    applyBtn.style.display = "block";
    applyBtn.textContent = `Apply changes to route ${currentRouteMaTuyen}`;

    const cancelBtn = document.getElementById("cancelRouteChangesBtn");
    cancelBtn.style.display = "block";
}

function exitRouteEditMode() {
    editMode = false;
    awaitingAddNodeClick = false;
    selectedVertexIndex = null;

    if (currentPolyline) {
        currentPolyline.setEditable(false);
    }

    const applyBtn = document.getElementById("applyRouteChangesBtn");
    if (applyBtn) applyBtn.style.display = "none";

    const cancelBtn = document.getElementById("cancelRouteChangesBtn");
    if (cancelBtn) cancelBtn.style.display = "none";

    if (vertexInfoWindow) vertexInfoWindow.close();

    // clear backup
    originalRouteBackup = null;
}

// APPLY CHANGES TO DB
async function applyRouteChanges() {
    if (!editMode || !currentRouteMaTuyen || !polylinePath || polylinePath.getLength() < 2) {
        showMessage("Nothing to apply.", 3000);
        return;
    }
    showMessage("Saving route geometry...");

    const vertices = [];
    for (let i = 0; i < polylinePath.getLength(); i++) {
        const p = polylinePath.getAt(i);
        vertices.push({ lat: p.lat(), lng: p.lng() });
    }

    try {
        const res = await fetch("/update-route-geometry/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                MaTuyen: currentRouteMaTuyen,
                Chieu: currentRouteChieu,
                path: vertices,
            }),
        });
        const data = await res.json();
        if (!data.success) {
            showMessage("Failed to save route: " + data.error, 5000);
            return;
        }
        showMessage("Route geometry saved.", 3000);
        exitRouteEditMode();
    } catch (err) {
        console.error(err);
        showMessage("Error saving route geometry.", 5000);
    }
}

function cancelRouteChanges() {
    if (!editMode || !originalRouteBackup || !polylinePath) {
        exitRouteEditMode();
        return;
    }

    // restore original points
    polylinePath.clear();
    originalRouteBackup.forEach(pt => {
        polylinePath.push(new google.maps.LatLng(pt.lat, pt.lng));
    });

    showMessage("Changes cancelled.", 2500);

    exitRouteEditMode();
}
