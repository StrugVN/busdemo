function openDialog(htmlContent) {
    const dlg = document.getElementById("dialogPanel");
    dlg.innerHTML = htmlContent;
    dlg.style.display = "block";
}

function closeDialog() {
    const dlg = document.getElementById("dialogPanel");
    dlg.style.display = "none";
}

function buildShortNameFromAddress(address) {
    if (!address) return "";

    const parts = address.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return address;

    if (parts.length >= 2) {
        return parts[0] + ", " + parts[1];
    }
    return parts[0];
}

function reverseGeocodeAndPrefill(latLng) {
    if (!latLng) {
        console.warn("reverseGeocodeAndPrefill: no latLng");
        return;
    }
    if (!geocoder) {
        console.warn("reverseGeocodeAndPrefill: geocoder not initialized");
        return;
    }

    geocoder.geocode({ location: latLng }, (results, status) => {
        console.log("Geocoder status:", status, results);
        if (status !== "OK" || !results || !results.length) {
            console.warn("Geocoder no results:", status);
            return;
        }

        const address = results[0].formatted_address;

        const diaChiInput = document.getElementById("diaChiInput");
        const nameInput = document.getElementById("newStopName");

        if (diaChiInput && !diaChiInput.value) {
            diaChiInput.value = address;
        }

        if (nameInput && !nameInput.value) {
            nameInput.value = buildShortNameFromAddress(address);
        }
    });
}


async function openAddStopPanel(fromStop = false) {
    const panel = document.getElementById("addStopPanel");
    if (!pendingStopLatLng || !currentRouteMaTuyen) return;

    // 1) Fetch existing stops on this route+direction (for info + position)
    let pathStops = [];
    try {
        const res = await fetch(
            `/route-stops/?MaTuyen=${encodeURIComponent(currentRouteMaTuyen)}&Chieu=${encodeURIComponent(currentRouteChieu)}`
        );
        if (res.ok) {
            const data = await res.json();
            pathStops = data.stops || [];
        }
    } catch (e) {
        console.error(e);
    }
    routeStopsCache = pathStops;

    const stopsHtml =
        pathStops.length === 0
            ? "<i>No stops on this route yet.</i>"
            : pathStops
                .map(
                    (s) =>
                        `${s.STT}. ${s.TenTram || s.MaTram}`
                )
                .join("<br/>");

    // 2) Dropdown for ALL stops in system (for "Use existing stop")
    let existingOptions = `<option value="">-- New stop point --</option>`;
    const allStopsSorted = STOPS.slice().sort((a, b) => {
        const na = (a.TenTram || a.MaTram || "").toLowerCase();
        const nb = (b.TenTram || b.MaTram || "").toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
    });
    allStopsSorted.forEach((s) => {
        const label = s.TenTram || s.MaTram;
        existingOptions += `<option value="${s.MaTram}">${label}</option>`;
    });

    // 3) Position dropdown: "After {stop}", default = last stop on path
    let positionOptions = "";
    if (pathStops.length > 0) {
        pathStops.forEach((s, idx) => {
            const label = `${s.STT}. ${s.TenTram || s.MaTram}`;
            const selectedAttr = idx === pathStops.length - 1 ? " selected" : "";
            positionOptions += `<option value="${s.STT}"${selectedAttr}>After "${label}"</option>`;
        });
    } else {
        positionOptions = `<option value="0" selected>After start</option>`;
    }

    const lat = pendingStopLatLng.lat().toFixed(6);
    const lng = pendingStopLatLng.lng().toFixed(6);

    panel.innerHTML = `
    <div>
      <b>Add stop</b><br/>
      Route ${currentRouteMaTuyen} (${currentRouteChieu === "0" ? "Outbound" : "Inbound"})<br/>
      <small>Clicked at: ${lat}, ${lng}</small>

      <div style="margin-top:6px;max-height:80px;overflow:auto;border:1px solid #eee;padding:4px;">
        <b>Existing stops on this route:</b><br/>
        ${stopsHtml}
      </div>

      <div style="margin-top:6px;">
        <label style="font-size:12px;">Use existing stop:</label><br/>
        <select id="existingStopSelect" style="width:100%;padding:3px 4px;">
          ${existingOptions}
        </select>
      </div>

      <div style="margin-top:6px;">
        <label style="font-size:12px;">Insert position:</label><br/>
        <select id="insertAfterSelect" style="width:100%;padding:3px 4px;">
          ${positionOptions}
        </select>
        <small style="font-size:11px;color:#555;">
          New stop will be inserted after the selected stop.
        </small>
      </div>

      <div id="newStopFields" style="margin-top:6px;">
        <label style="font-size:12px;">New stop name:</label><br/>
        <input id="newStopName" type="text" style="width:100%;padding:3px 4px;margin-bottom:4px;" />

        <label style="font-size:12px;">Address (auto from Google):</label><br/>
        <input id="diaChiInput" type="text"
               style="width:100%;padding:3px 4px;margin-bottom:4px;"
               placeholder="Fetching address..." />

        <label style="font-size:12px;">Type:</label><br/>
        <select id="newStopType" style="width:100%;padding:3px 4px;">
          <option value="1">Station</option>
          <option value="2" selected>Stop</option>
        </select>
      </div>

      <div style="margin-top:8px;text-align:right;">
        <button id="saveStopBtn" type="button"
                style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;">
          Save stop
        </button>
        <button id="cancelStopBtn" type="button"
                style="background:#ccc;color:black;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:6px;">
          Cancel
        </button>
      </div>
    </div>
  `;
    panel.style.display = "block";

    const selectExisting = document.getElementById("existingStopSelect");
    const newFields = document.getElementById("newStopFields");
    const insertAfterSelect = document.getElementById("insertAfterSelect");

    // Show/hide "New stop" fields based on existing selection
    selectExisting.addEventListener("change", () => {
        if (selectExisting.value) {
            newFields.style.display = "none";
        } else {
            newFields.style.display = "block";
            reverseGeocodeAndPrefill(pendingStopLatLng);   // <--- trigger geocoding
        }
    });

    // If right-clicking on an existing stop
    if (fromStop && pendingRightClickStop) {
        selectExisting.value = pendingRightClickStop.MaTram;
        newFields.style.display = "none";

        const match = routeStopsCache.find(s => s.MaTram === pendingRightClickStop.MaTram);
        if (match && insertAfterSelect) {
            insertAfterSelect.value = String(match.STT);
        }
    } else {
        // New stop by default -> auto geocode on open
        if (!selectExisting.value) {
            reverseGeocodeAndPrefill(pendingStopLatLng);
        }
    }

    document.getElementById("cancelStopBtn").onclick = () => {
        panel.style.display = "none";
        pendingStopLatLng = null;
        pendingRightClickStop = null;
    };

    document.getElementById("saveStopBtn").onclick = saveStopFromPanel;
}

async function saveStopFromPanel() {
    const panel = document.getElementById("addStopPanel");
    if (!pendingStopLatLng || !currentRouteMaTuyen) return;

    const existingMaTram = document.getElementById("existingStopSelect").value || null;
    const insertAfterValue = document.getElementById("insertAfterSelect").value || null;

    let name = null;
    let type = null;
    let diaChi = null;

    if (!existingMaTram) {
        name = document.getElementById("newStopName").value.trim();
        type = document.getElementById("newStopType").value;
        diaChi = (document.getElementById("diaChiInput").value || "").trim();

        if (!name) {
            showMessage("Please enter a name for the new stop.", 3000);
            return;
        }
    }

    const insertAfterSTT = insertAfterValue ? parseInt(insertAfterValue, 10) : null;

    const body = {
        MaTuyen: currentRouteMaTuyen,
        Chieu: currentRouteChieu,
        lat: pendingStopLatLng.lat(),
        lng: pendingStopLatLng.lng(),
        ExistingMaTram: existingMaTram,    // null -> create new stop
        TenTram: name,                     // new stop only
        MaLoai: type,                      // new stop only
        DiaChi: diaChi,                    // new stop only
        InsertAfterSTT: insertAfterSTT,    // route position
        // KhoangCachDenTramTiepTheo: NOT sent; backend computes it
    };

    try {
        const res = await fetch("/add-route-stop/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
            showMessage("Failed to add stop: " + data.error, 5000);
            return;
        }

        // If new stop created, add marker
        if (data.stop && !existingMaTram) {
            const s = data.stop;
            const stopObj = {
                MaTram: s.MaTram,
                TenTram: s.TenTram,
                lat: s.lat,
                lng: s.lng,
                MaLoai: s.MaLoai,
                DiaChi: s.DiaChi || null,
                MaXa: s.MaXa || null,
                TenXa: s.TenXa || null,
            };
            STOPS.push(stopObj);
            createStopMarker(stopObj);
        }


        showMessage("Stop added to route.", 3000);
        panel.style.display = "none";
        pendingStopLatLng = null;
        pendingRightClickStop = null;

        updateStopIconsForCurrentRoute();
    } catch (err) {
        console.error(err);
        showMessage("Error adding stop.", 5000);
    }
}


function createStopMarker(stop) {
    let baseIcon = stop.MaLoai == 1 ? iconHexagonOrange : iconTriangleRed;

    const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: map,
        title: stop.TenTram || stop.MaTram,
        icon: baseIcon,
    });

    marker.stopData = stop;

    const info = new google.maps.InfoWindow();

    marker.addListener("click", () => {
        const onRoute = currentRouteStopIds && currentRouteStopIds.has(stop.MaTram);

        const removeButtonHtml = onRoute
            ? `
        <button id="deleteStopBtn_${stop.MaTram}"
                style="flex:1; padding:4px 6px; border-radius:4px;
                       border:1px solid #f44336; background:#f44336; color:white; cursor:pointer;">
          Remove
        </button>`
            : "";

        const content = `
      <div style="min-width:230px">
        <b>${stop.TenTram || stop.MaTram}</b><br/>
        Code: ${stop.MaTram}<br/>
        Type: ${stop.MaLoai == 1 ? "Station" : "Stop"}<br/>
        Address: ${stop.DiaChi || "N/A"}<br/>
        Ward: ${stop.TenXa || "N/A"}<br/>

        <div style="display:flex; gap:4px; margin-top:8px;">
          <button id="editStopBtn_${stop.MaTram}"
                  style="flex:1; padding:4px 6px; border-radius:4px;
                         border:1px solid #ddd; background:#fafafa; cursor:pointer;">
            Edit
          </button>

          ${removeButtonHtml}

          <button id="moveStopBtn_${stop.MaTram}"
                  style="flex:1; padding:4px 6px; border-radius:4px;
                         border:1px solid #2196F3; background:#2196F3; color:white; cursor:pointer;">
            Move
          </button>
        </div>
      </div>
    `;

        info.setContent(content);
        info.open(map, marker);

        google.maps.event.addListenerOnce(info, "domready", () => {
            const editBtn = document.getElementById(`editStopBtn_${stop.MaTram}`);
            const deleteBtn = document.getElementById(`deleteStopBtn_${stop.MaTram}`);
            const moveBtn = document.getElementById(`moveStopBtn_${stop.MaTram}`);

            if (moveBtn) {
                moveBtn.onclick = () => {
                    selectedStop = marker;
                    isChangingLocation = true;
                    showMessage("Click on map to choose new location.");
                };
            }

            if (editBtn) {
                editBtn.onclick = () => {
                    openEditStopDialog(marker.stopData, info); // pass info window too
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    openDeleteStopConfirm(marker.stopData, info);
                };
            }
        });
    });

    // Right-click on a stop to add it into the current route at some position
    marker.addListener("rightclick", () => {
        if (!currentRouteMaTuyen) {
            showMessage("Select a route and direction first.");
            return;
        }

        // Use this stop's position as the click location
        pendingStopLatLng = marker.getPosition();
        // Remember which stop was right-clicked so the panel can preselect it
        pendingRightClickStop = marker.stopData;

        // Open the "Add stop" panel in "fromStop=true" mode
        openAddStopPanel(true);
    });


    stopMarkers.push(marker);
}


async function updateStopIconsForCurrentRoute() {
    if (!currentRouteMaTuyen) {
        currentRouteStopIds = new Set();
        // no route selected -> all stops off-route
        stopMarkers.forEach(marker => {
            if (marker.stopData.MaLoai == 1) {
                marker.setIcon(iconHexagonOrange);
            } else {
                marker.setIcon(iconTriangleRed);
            }
        });
        return;
    }

    try {
        const res = await fetch(
            `/route-stops/?MaTuyen=${encodeURIComponent(currentRouteMaTuyen)}&Chieu=${encodeURIComponent(currentRouteChieu)}`
        );
        if (!res.ok) {
            console.error("Failed to load route stops", await res.text());
            return;
        }
        const data = await res.json();
        const stops = data.stops || [];

        const onRouteSet = new Set(stops.map(s => s.MaTram));
        currentRouteStopIds = onRouteSet;  // <-- add this

        stopMarkers.forEach(marker => {
            const maTram = marker.stopData?.MaTram;
            const onRoute = maTram && onRouteSet.has(maTram);

            if (onRoute) {
                if (marker.stopData.MaLoai == 1) {
                    marker.setIcon(iconHexagonGreen);
                } else {
                    marker.setIcon(iconTriangleGreen);
                }
            } else {
                if (marker.stopData.MaLoai == 1) {
                    marker.setIcon(iconHexagonOrange);
                } else {
                    marker.setIcon(iconTriangleRed);
                }
            }
        });
    } catch (err) {
        console.error("Error updating stop icons:", err);
    }
}

function openEditStopDialog(stop, infoWindow) {
    const panel = document.getElementById("addStopPanel");

    const xaOptions = XA_LIST
        .map(x => `<option value="${x.MaXa}" ${stop.MaXa == x.MaXa ? "selected" : ""}>${x.TenXa}</option>`)
        .join("");

    panel.innerHTML = `
    <div>
      <h3>Edit Stop</h3>

      <label>Name:</label>
      <input id="editName" value="${stop.TenTram || ""}" 
             style="width:100%;margin-bottom:6px;" />

      <label>Address:</label>
      <input id="editAddress" value="${stop.DiaChi || ""}" 
             style="width:100%;margin-bottom:6px;" />

      <label>Type:</label>
      <select id="editType" style="width:100%;margin-bottom:6px;">
        <option value="1" ${String(stop.MaLoai) === "1" ? "selected" : ""}>Station</option>
        <option value="2" ${String(stop.MaLoai) === "2" ? "selected" : ""}>Stop</option>
      </select>

      <label>Ward:</label>
      <select id="editMaXa" style="width:100%;margin-bottom:6px;">
        ${xaOptions}
      </select>

      <button id="saveEditStopBtn"
              style="background:#2196F3;color:white;width:100%;margin-top:6px;
                     border:none;padding:6px;border-radius:4px;">
        Save
      </button>
      <button id="cancelEditStopBtn"
              style="width:100%;margin-top:6px;
                     border:1px solid #ccc;padding:6px;border-radius:4px;">
        Cancel
      </button>
    </div>
  `;
    panel.style.display = "block";

    document.getElementById("cancelEditStopBtn").onclick = () => {
        panel.style.display = "none";
        if (infoWindow) infoWindow.close();
    };

    document.getElementById("saveEditStopBtn").onclick = async () => {
        const body = {
            MaTram: stop.MaTram,
            TenTram: document.getElementById("editName").value.trim(),
            DiaChi: document.getElementById("editAddress").value.trim(),
            MaLoai: document.getElementById("editType").value,
            MaXa: document.getElementById("editMaXa").value,
        };

        try {
            const res = await fetch(UPDATE_STOP_INFO_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.success) {
                showMessage("Error updating stop");
                return;
            }

            // Update local object so future dialogs show new info
            stop.TenTram = body.TenTram;
            stop.DiaChi = body.DiaChi;
            stop.MaLoai = body.MaLoai;
            stop.MaXa = body.MaXa;

            showMessage("Stop updated");
            panel.style.display = "none";
            if (infoWindow) infoWindow.close();

            // Icons might change if type changed
            updateStopIconsForCurrentRoute();
        } catch (e) {
            console.error(e);
            showMessage("Error updating stop");
        }
    };
}


function openDeleteStopConfirm(stop, infoWindow) {
    if (!currentRouteMaTuyen) {
        showMessage("Select a route first.");
        return;
    }

    openDialog(`
        <div style="text-align:center;">
            <b>Remove Stop</b><br><br>
            Remove <b>${stop.TenTram || stop.MaTram}</b> from route <b>${currentRouteMaTuyen}</b>?<br><br>
            <button id="dlgDeleteYes" 
                style="background:#f44336;color:white;border:none;padding:6px 10px;
                       border-radius:4px;width:100%;margin-bottom:6px;">
                Remove
            </button>
            <button id="dlgDeleteNo" 
                style="background:#ccc;color:black;border:none;padding:6px 10px;
                       border-radius:4px;width:100%;">
                Cancel
            </button>
        </div>
    `);

    document.getElementById("dlgDeleteNo").onclick = closeDialog;

    document.getElementById("dlgDeleteYes").onclick = async () => {
        const res = await fetch(DELETE_ROUTE_STOP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                MaTram: stop.MaTram,
                MaTuyen: currentRouteMaTuyen,
                Chieu: currentRouteChieu,
            }),
        });

        const data = await res.json();
        if (!data.success) {
            showMessage("Failed to remove stop.");
            closeDialog();
            return;
        }

        showMessage("Stop removed from route.");
        closeDialog();

        // 🔹 Close the stop info bubble as well
        if (infoWindow) {
            infoWindow.close();
        }

        updateStopIconsForCurrentRoute();
    };
}

