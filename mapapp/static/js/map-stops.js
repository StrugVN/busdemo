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
                DiaChi: s.DiaChi,
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
    // default icon based on stop type (off-route)
    let baseIcon = stop.MaLoai == 1 ? iconHexagonRed : iconTriangleRed;

    const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: map,
        title: stop.TenTram || stop.MaTram,
        icon: baseIcon,
    });

    marker.stopData = stop;

    const stopType = String(stop.MaLoai) === "1" ? "Bến xe" : "Điểm dừng";

    const btnId = `change-location-${stop.MaTram}`;
    const info = new google.maps.InfoWindow({
        content: `
        <div style="min-width:220px">
            <b>${stop.TenTram || stop.MaTram}</b><br/>
            Code: ${stop.MaTram}<br/>
            Type: ${stop.MaLoai == 1 ? "Station" : "Stop"}<br/>
            Address: ${stop.DiaChi || "N/A"}<br/>
            Ward: ${stop.TenXa || "N/A"}<br/><br/>

            <button id="editStopBtn_${stop.MaTram}" style="margin-bottom:4px;width:100%;">Edit info</button>
            <button id="deleteStopBtn_${stop.MaTram}" style="background:#f44336;color:white;margin-bottom:4px;width:100%;">Remove from route</button>
            <button id="moveStopBtn_${stop.MaTram}" style="background:#2196F3;color:white;width:100%;">Change location</button>
        </div>
        `

    });

    marker.addListener("click", () => {
        info.open(map, marker);
        google.maps.event.addListenerOnce(info, "domready", () => {
            document.getElementById(`moveStopBtn_${stop.MaTram}`).onclick = () => {
                selectedStop = marker;
                isChangingLocation = true;
                showMessage("Click on map to choose new location.");
            };

            document.getElementById(`editStopBtn_${stop.MaTram}`).onclick = () => {
                openEditStopDialog(stop);
            };

            document.getElementById(`deleteStopBtn_${stop.MaTram}`).onclick = () => {
                openDeleteStopConfirm(stop);
            };
        });

    });

    marker.addListener("rightclick", () => {
        if (!currentRouteMaTuyen) {
            showMessage("Select a route + direction first.", 3000);
            return;
        }

        // load stop into pending
        pendingStopLatLng = marker.getPosition();
        pendingRightClickStop = stop;

        openAddStopPanel(true);
    });

    stopMarkers.push(marker);
}

async function updateStopIconsForCurrentRoute() {
    // No route selected → everything off-route
    if (!currentRouteMaTuyen) {
        stopMarkers.forEach(marker => {
            if (marker.stopData.MaLoai == 1) {
                marker.setIcon(iconHexagonOrange);  // OFF-ROUTE STATION = ORANGE
            } else {
                marker.setIcon(iconTriangleRed);    // OFF-ROUTE STOP = RED
            }
        });
        return;
    }

    // Load stops for this route/direction
    let stops = [];
    try {
        const res = await fetch(
            `/route-stops/?MaTuyen=${encodeURIComponent(currentRouteMaTuyen)}&Chieu=${encodeURIComponent(currentRouteChieu)}`
        );
        if (res.ok) {
            const data = await res.json();
            stops = data.stops || [];
        }
    } catch (err) {
        console.error("Error updating stop icons:", err);
        return;
    }

    const onRoute = new Set(stops.map(s => s.MaTram));

    // Identify FIRST and LAST STATION in the list
    let firstStation = null;
    let lastStation = null;

    if (stops.length > 0) {
        firstStation = stops[0].MaTram;
        lastStation = stops[stops.length - 1].MaTram;
    }

    stopMarkers.forEach(marker => {
        const s = marker.stopData;
        const maTram = s.MaTram;

        if (!onRoute.has(maTram)) {
            // OFF-ROUTE
            if (s.MaLoai == 1) {
                marker.setIcon(iconHexagonOrange);  // station off-route
            } else {
                marker.setIcon(iconTriangleRed);
            }
            return;
        }

        // ON-ROUTE
        if (s.MaLoai == 1) {
            // Station type
            if (maTram === firstStation) {
                marker.setIcon(iconHexagonBlue);   // START
            } else if (maTram === lastStation) {
                marker.setIcon(iconHexagonGreen);  // END
            } else {
                marker.setIcon(iconHexagonGreen);  // Middle stations? Keep green or define another color
            }
        } else {
            // normal stops
            marker.setIcon(iconTriangleGreen);
        }
    });
}

function openEditStopDialog(stop) {
    const panel = document.getElementById("addStopPanel");

    const xaOptions = XA_LIST
        .map(x => `<option value="${x.MaXa}" ${stop.MaXa == x.MaXa ? "selected" : ""}>${x.TenXa}</option>`)
        .join("");

    panel.innerHTML = `
      <div>
        <h3>Edit Stop</h3>
        <label>Name:</label>
        <input id="editName" value="${stop.TenTram || ""}" style="width:100%;margin-bottom:6px;" />

        <label>Address:</label>
        <input id="editAddress" value="${stop.DiaChi || ""}" style="width:100%;margin-bottom:6px;" />

        <label>Type:</label>
        <select id="editType" style="width:100%;margin-bottom:6px;">
          <option value="1" ${stop.MaLoai == 1 ? "selected" : ""}>Station</option>
          <option value="2" ${stop.MaLoai == 2 ? "selected" : ""}>Stop</option>
        </select>

        <label>Ward:</label>
        <select id="editMaXa" style="width:100%;margin-bottom:6px;">
          ${xaOptions}
        </select>

        <button id="saveEditStopBtn" style="background:#2196F3;color:white;width:100%;margin-top:6px;">Save</button>
        <button id="cancelEditStopBtn" style="width:100%;margin-top:6px;">Cancel</button>
      </div>
    `;
    panel.style.display = "block";

    document.getElementById("cancelEditStopBtn").onclick = () => {
        panel.style.display = "none";
    };

    document.getElementById("saveEditStopBtn").onclick = async () => {
        const body = {
            MaTram: stop.MaTram,
            TenTram: document.getElementById("editName").value,
            DiaChi: document.getElementById("editAddress").value,
            MaLoai: document.getElementById("editType").value,
            MaXa: document.getElementById("editMaXa").value,
        };

        const res = await fetch("/update-stop-info/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!data.success) {
            showMessage("Error updating stop");
            return;
        }

        showMessage("Stop updated");
        panel.style.display = "none";

        // update local STOPS array
        Object.assign(stop, body);

        // update marker icon if needed
        updateStopIconsForCurrentRoute();
    };
}

function openDeleteStopConfirm(stop) {
    if (!currentRouteMaTuyen) {
        showMessage("Select a route first.");
        return;
    }

    if (!confirm(`Remove ${stop.TenTram} from route ${currentRouteMaTuyen}?`))
        return;

    fetch("/delete-route-stop/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            MaTram: stop.MaTram,
            MaTuyen: currentRouteMaTuyen,
            Chieu: currentRouteChieu,
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showMessage("Failed to remove stop.");
                return;
            }
            showMessage("Stop removed.");
            updateStopIconsForCurrentRoute();
        });
}
