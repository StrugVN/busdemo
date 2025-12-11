// ----- GLOBALS -----
let allRoutesPolylines = [];

let newRouteDrawingMode = false;
let newRouteTempPolyline = null;
let newRouteTempPath = null;
let newRouteClickListener = null;

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
                clickable: true,      // now selectable
                editable: false
            });

            // Click on a preview route → select it + load single-route view
            poly.addListener("click", () => {
                const routeSelect = document.getElementById("routeSelect");
                if (routeSelect) {
                    routeSelect.value = r.MaTuyen;   // pick this route
                }
                // uses current directionSelect value, clears previews, draws main route
                loadAndDrawRoute();
            });

            allRoutesPolylines.push(poly);
            path.forEach(pt => bounds.extend(pt));

        } catch (err) {
            console.error("Route load error", r.MaTuyen, err);
        }
    }

    if (!bounds.isEmpty()) {
        map.setCenter({ lat: 9.602097, lng: 105.973469 });
        map.setZoom(11);
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
            <button id="delNodeBtn" type="button"
                    style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:6px;">
              Xóa nút
            </button>
            <button id="delNodeBeyondBtn" type="button"
                    style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:6px;">
              Xóa toàn bộ từ đây
            </button>
          </div>
        `;
                vertexInfoWindow.setContent(content);
                vertexInfoWindow.setPosition(e.latLng);
                vertexInfoWindow.open(map);

                google.maps.event.addListenerOnce(vertexInfoWindow, "domready", () => {
                    const delBtn = document.getElementById("delNodeBtn");
                    const delBeyondBtn = document.getElementById("delNodeBeyondBtn");

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
        <div style="min-width:250px;">
            <b>Tuyến ${currentRouteMaTuyen} — ${r.TenTuyen}</b><br/>
            Chiều: ${currentRouteChieu === "0" ? "Đi" : "Về"}<br/><br/>

            <table style="font-size:12px;">
            <tr><td><b>Độ dài:</b></td><td>${r.DoDai ?? '-'} km</td></tr>
            <tr><td><b>Giá vé:</b></td><td>${r.GiaVe ?? '-'} đ</td></tr>
            <tr><td><b>Thời gian toàn tuyến:</b></td><td>${r.ThoiGianToanTuyen ?? '-'} phút</td></tr>
            <tr><td><b>Bắt đầu:</b></td><td>${r.GioBatDay ?? '-'}</td></tr>
            <tr><td><b>Kết thúc:</b></td><td>${r.GioKetThuc ?? '-'}</td></tr>
            <tr><td><b>Giữa 2 chuyến:</b></td><td>${r.ThoiGianGiua2Tuyen ?? '-'} phút</td></tr>
            <tr><td><b>Số chuyến:</b></td><td>${r.SoChuyen ?? '-'}</td></tr>
            </table>

            <div style="display:flex; gap:6px; margin-top:6px;">
            <button id="editRouteBtn" type="button"
                    style="flex:1;background:#2196F3;color:white;border:none;
                            padding:5px 10px;border-radius:4px;cursor:pointer;">
                Sửa hành trình
            </button>

            <button id="editRouteInfoBtn" type="button"
                    style="flex:1;background:#2196F3;color:white;border:none;
                            padding:5px 10px;border-radius:4px;cursor:pointer;">
                Sửa thông tin
            </button>
            </div>
        </div>
        `;


        routeInfoWindow.setContent(content);
        routeInfoWindow.setPosition(e.latLng);
        routeInfoWindow.open(map);

        google.maps.event.addListenerOnce(routeInfoWindow, "domready", () => {
            const editRouteBtn = document.getElementById("editRouteBtn");
            const editRouteInfoBtn = document.getElementById("editRouteInfoBtn");

            if (editRouteBtn) {
                editRouteBtn.onclick = () => {
                    // existing behavior
                    enterRouteEditMode();
                    routeInfoWindow.close();
                };
            }

            if (editRouteInfoBtn) {
                editRouteInfoBtn.onclick = () => {
                    openEditRouteInfoPanel();
                    routeInfoWindow.close();
                };
            }
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

    showMessage("Chế độ chỉnh sửa hành trình: Kéo/thả nút. Bấm vào các điểm để chọn thêm hoặc xóa nút.");

    const applyBtn = document.getElementById("applyRouteChangesBtn");
    applyBtn.style.display = "block";
    applyBtn.textContent = `Lưu hành trình mới - Tuyến ${currentRouteMaTuyen}`;

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

    showMessage("Hủy thay đổi.", 2500);

    exitRouteEditMode();
}

function htmlEscape(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function openEditRouteInfoPanel() {
    if (!currentRouteMaTuyen) {
        showMessage("Chọn 1 tuyến trước.", 2500);
        return;
    }

    const panel = document.getElementById("addStopPanel");
    if (!panel) return;

    const r = ROUTE_INFO[currentRouteMaTuyen] || {};

    panel.style.display = "block";

    panel.innerHTML = `
      <div>
        <h3 style="margin-top:0;margin-bottom:8px;">
          Sửa thông tin tuyến - ${currentRouteMaTuyen}
        </h3>

        <label style="font-size:12px;">Tên tuyến:</label><br/>
        <input id="ri_TenTuyen" type="text"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.TenTuyen ?? ""}"/>

        <label style="font-size:12px;">Độ dài (km):</label><br/>
        <input id="ri_DoDai" type="number" step="0.01"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.DoDai ?? ""}"/>

        <label style="font-size:12px;">Giá vé (đ):</label><br/>
        <input id="ri_GiaVe" type="number" step="1"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.GiaVe ?? ""}"/>

        <label style="font-size:12px;">Thời gian toàn tuyến (phút):</label><br/>
        <input id="ri_ThoiGianToanTuyen" type="number" step="1"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.ThoiGianToanTuyen ?? ""}"/>

        <label style="font-size:12px;">Giờ bắt đầu (HH:MM):</label><br/>
        <input id="ri_GioBatDay" type="text" placeholder="06:00"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.GioBatDay ?? ""}"/>

        <label style="font-size:12px;">Giờ kết thúc (HH:MM):</label><br/>
        <input id="ri_GioKetThuc" type="text" placeholder="18:00"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.GioKetThuc ?? ""}"/>

        <label style="font-size:12px;">Thời gian giữa 2 chuyến (phút):</label><br/>
        <input id="ri_ThoiGianGiua2Tuyen" type="number" step="1"
               style="width:100%;margin-bottom:6px;padding:3px 4px;"
               value="${r.ThoiGianGiua2Tuyen ?? ""}"/>

        <label style="font-size:12px;">Số chuyến / ngày:</label><br/>
        <input id="ri_SoChuyen" type="number" step="1"
               style="width:100%;margin-bottom:10px;padding:3px 4px;"
               value="${r.SoChuyen ?? ""}"/>

        <div style="display:flex;gap:6px;justify-content:flex-end;">
          <button id="ri_cancelBtn"
                  style="padding:4px 8px;border-radius:4px;border:1px solid #ddd;
                         background:#fafafa;cursor:pointer;">
            Cancel
          </button>
          <button id="ri_saveBtn"
                  style="padding:4px 10px;border-radius:4px;border:none;
                         background:#2196F3;color:white;cursor:pointer;">
            Save
          </button>
        </div>
      </div>
    `;

    const cancelBtn = panel.querySelector("#ri_cancelBtn");
    const saveBtn = panel.querySelector("#ri_saveBtn");

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            panel.style.display = "none";
        };
    }

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const payload = {
                MaTuyen: currentRouteMaTuyen,
                TenTuyen: panel.querySelector("#ri_TenTuyen").value.trim(),
                DoDai: panel.querySelector("#ri_DoDai").value.trim(),
                GiaVe: panel.querySelector("#ri_GiaVe").value.trim(),
                ThoiGianToanTuyen: panel.querySelector("#ri_ThoiGianToanTuyen").value.trim(),
                GioBatDay: panel.querySelector("#ri_GioBatDay").value.trim() || null,
                GioKetThuc: panel.querySelector("#ri_GioKetThuc").value.trim() || null,
                ThoiGianGiua2Tuyen: panel.querySelector("#ri_ThoiGianGiua2Tuyen").value.trim(),
                SoChuyen: panel.querySelector("#ri_SoChuyen").value.trim(),
            };

            try {
                const res = await fetch(UPDATE_ROUTE_INFO_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();

                if (!data.success) {
                    showMessage("Failed to save route info", 4000);
                    return;
                }

                // update local cache
                const ri = ROUTE_INFO[currentRouteMaTuyen] || {};
                ri.TenTuyen = payload.TenTuyen || null;
                ri.DoDai = payload.DoDai ? parseFloat(payload.DoDai) : null;
                ri.GiaVe = payload.GiaVe ? parseInt(payload.GiaVe, 10) : null;
                ri.ThoiGianToanTuyen = payload.ThoiGianToanTuyen ? parseInt(payload.ThoiGianToanTuyen, 10) : null;
                ri.GioBatDay = payload.GioBatDay;
                ri.GioKetThuc = payload.GioKetThuc;
                ri.ThoiGianGiua2Tuyen = payload.ThoiGianGiua2Tuyen ? parseInt(payload.ThoiGianGiua2Tuyen, 10) : null;
                ri.SoChuyen = payload.SoChuyen ? parseInt(payload.SoChuyen, 10) : null;
                ROUTE_INFO[currentRouteMaTuyen] = ri;

                panel.style.display = "none";
                showMessage("Route info updated.", 2500);
            } catch (e) {
                console.error(e);
                showMessage("Error saving route info.", 4000);
            }
        };
    }
}

function computeRouteLengthKm(polyline) {
    if (!polyline) return 0;

    const path = polyline.getPath();
    let total = 0;

    for (let i = 0; i < path.getLength() - 1; i++) {
        const p1 = path.getAt(i);
        const p2 = path.getAt(i + 1);
        total += google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    return total / 1000; // convert meters → km
}

function cleanupNewRouteDrawing() {
    newRouteDrawingMode = false;

    if (newRouteClickListener) {
        google.maps.event.removeListener(newRouteClickListener);
        newRouteClickListener = null;
    }
    if (newRouteTempPolyline) {
        newRouteTempPolyline.setMap(null);
        newRouteTempPolyline = null;
    }
    newRouteTempPath = null;

    // reset button label if present
    const newRouteBtn = document.getElementById("newRouteBtn");
    if (newRouteBtn) {
        newRouteBtn.textContent = "Thêm tuyến";
    }
}


function beginNewRouteDrawing() {
    if (newRouteDrawingMode) {
        cleanupNewRouteDrawing();
    }

    if (editMode) {
        exitRouteEditMode();
    }

    const routeSelect = document.getElementById("routeSelect");
    if (routeSelect) {
        routeSelect.value = "";
    }
    currentRouteMaTuyen = null;

    if (currentPolyline) {
        currentPolyline.setMap(null);
        currentPolyline = null;
    }
    clearAllRoutesPolylines();
    if (typeof updateStopIconsForCurrentRoute === "function") {
        updateStopIconsForCurrentRoute();
    }

    newRouteDrawingMode = true;

    newRouteTempPath = new google.maps.MVCArray();
    newRouteTempPolyline = new google.maps.Polyline({
        map: map,
        path: newRouteTempPath,
        strokeColor: "#0d47a1",
        strokeWeight: 2,
        editable: true
    });

    showMessage("Bấm để thêm đường, bấm 'Xong' để lưu.", 12000);

    // only single-click adds vertices
    newRouteClickListener = map.addListener("click", (e) => {
        if (!newRouteDrawingMode || !newRouteTempPath) return;
        newRouteTempPath.push(e.latLng);
    });
}


function finishNewRouteDrawing() {
    if (!newRouteDrawingMode || !newRouteTempPath) return;

    if (newRouteTempPath.getLength() < 2) {
        showMessage("Route needs at least 2 points.", 4000);
        return;
    }

    const vertices = [];
    for (let i = 0; i < newRouteTempPath.getLength(); i++) {
        const p = newRouteTempPath.getAt(i);
        vertices.push({ lat: p.lat(), lng: p.lng() });
    }

    const content = `
      <div>
        <h3 style="margin-top:0;margin-bottom:8px;">New route</h3>

        <label style="font-size:12px;">Route code (MaTuyen):</label><br/>
        <input id="newRouteCode" type="text"
               style="width:100%;margin-bottom:6px;padding:3px 4px;" />

        <label style="font-size:12px;">Route name (TenTuyen):</label><br/>
        <input id="newRouteName" type="text"
               style="width:100%;margin-bottom:10px;padding:3px 4px;" />

        <div style="text-align:right;">
          <button id="newRouteCancelBtn"
                  style="margin-right:6px;padding:4px 8px;border-radius:4px;
                         border:1px solid #ddd;background:#fafafa;cursor:pointer;">
            Cancel
          </button>
          <button id="newRouteSaveBtn"
                  style="padding:4px 10px;border-radius:4px;border:none;
                         background:#2196F3;color:white;cursor:pointer;">
            Save
          </button>
        </div>
      </div>
    `;

    openDialog(content);

    const dlg = document.getElementById("dialogPanel");
    const cancelBtn = dlg.querySelector("#newRouteCancelBtn");
    const saveBtn = dlg.querySelector("#newRouteSaveBtn");

    cancelBtn.onclick = () => {
        closeDialog();
        cleanupNewRouteDrawing();
    };

    saveBtn.onclick = async () => {
        const code = dlg.querySelector("#newRouteCode").value.trim();
        const name = dlg.querySelector("#newRouteName").value.trim();

        if (!code) {
            showMessage("Please enter MaTuyen.", 3000);
            return;
        }

        try {
            showMessage("Creating route...");

            const res = await fetch(NEW_ROUTE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    MaTuyen: code,
                    TenTuyen: name,
                    Vertices: vertices
                })
            });
            const data = await res.json();

            if (!data.success) {
                showMessage("Failed to create route: " + (data.error || ""), 5000);
                return;
            }

            // Update local list
            const newRoute = {
                MaTuyen: code,
                TenTuyen: name,
                DoDai: null,
                GiaVe: null,
                ThoiGianToanTuyen: null,
                GioBatDay: null,
                GioKetThuc: null,
                ThoiGianGiua2Tuyen: null,
                SoChuyen: null
            };
            ROUTES.push(newRoute);
            ROUTE_INFO[code] = newRoute;

            // Add to dropdown
            const sel = document.getElementById("routeSelect");
            if (sel) {
                const opt = document.createElement("option");
                opt.value = code;
                opt.textContent = `${code} - ${name}`;
                sel.appendChild(opt);
                sel.value = code;
            }

            // Default direction = 0 (Chiều đi)
            const dirSel = document.getElementById("directionSelect");
            if (dirSel) {
                dirSel.value = "0";
            }

            closeDialog();
            cleanupNewRouteDrawing();

            // Load from backend so Path / Path_Nguoc are used like normal
            await loadAndDrawRoute();
        } catch (err) {
            console.error(err);
            showMessage("Error creating route.", 5000);
        }
    };
}
