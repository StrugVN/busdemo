async function openAddStopPanel(fromStop = false) {
    const panel = document.getElementById("addStopPanel");
    if (!pendingStopLatLng || !currentRouteMaTuyen) return;

    // Fetch existing stops on this route+direction
    let stops = [];
    try {
        const res = await fetch(
            `/route-stops/?MaTuyen=${encodeURIComponent(currentRouteMaTuyen)}&Chieu=${encodeURIComponent(currentRouteChieu)}`
        );
        if (res.ok) {
            const data = await res.json();
            stops = data.stops || [];
        }
    } catch (e) {
        console.error(e);
    }
    routeStopsCache = stops;

    const stopsHtml =
        stops.length === 0
            ? "<i>None yet (only start station)</i>"
            : stops
                .map(
                    (s) =>
                        `${s.STT}. ${s.TenTram || s.MaTram}`
                )
                .join("<br/>");

    let existingOptions = `<option value="">-- New stop point --</option>`;
    stops.forEach((s) => {
        existingOptions += `<option value="${s.MaTram}">${s.STT}. ${s.TenTram || s.MaTram}</option>`;
    });

    const lat = pendingStopLatLng.lat().toFixed(6);
    const lng = pendingStopLatLng.lng().toFixed(6);

    panel.innerHTML = `
        <div>
          <b>Add stop</b><br/>
          Route ${currentRouteMaTuyen} (${currentRouteChieu === "0" ? "Chiều đi" : "Chiều về"})<br/>
          <small>Click at: ${lat}, ${lng}</small>
          <div style="margin-top:6px;max-height:80px;overflow:auto;border:1px solid #eee;padding:4px;">
            <b>Existing stops on this path:</b><br/>
            ${stopsHtml}
          </div>
          <div style="margin-top:6px;">
            <label style="font-size:12px;">Use existing stop:</label><br/>
            <select id="existingStopSelect" style="width:100%;padding:3px 4px;">
              ${existingOptions}
            </select>
          </div>
          <div id="newStopFields" style="margin-top:6px;">
            <label style="font-size:12px;">New stop name:</label><br/>
            <input id="newStopName" type="text" style="width:100%;padding:3px 4px;margin-bottom:4px;" />
            <label style="font-size:12px;">Type:</label><br/>
            <select id="newStopType" style="width:100%;padding:3px 4px;">
              <option value="1">Bến xe</option>
              <option value="2" selected>Điểm dừng</option>
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

    const select = document.getElementById("existingStopSelect");
    const newFields = document.getElementById("newStopFields");

    // Hide/show new fields when selecting existing stop
    select.addEventListener("change", () => {
        newFields.style.display = select.value ? "none" : "block";
    });

    // If right-clicking an existing stop → auto-select it
    if (fromStop && pendingRightClickStop) {
        select.value = pendingRightClickStop.MaTram;
        newFields.style.display = "none";
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
    let name = null;
    let type = null;

    if (!existingMaTram) {
        name = document.getElementById("newStopName").value.trim();
        type = document.getElementById("newStopType").value;
        if (!name) {
            showMessage("Please enter a name for the new stop.", 3000);
            return;
        }
    }

    const body = {
        MaTuyen: currentRouteMaTuyen,
        Chieu: currentRouteChieu,
        lat: pendingStopLatLng.lat(),
        lng: pendingStopLatLng.lng(),
        ExistingMaTram: existingMaTram,
        TenTram: name,
        MaLoai: type,
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
            };
            STOPS.push(stopObj);
            createStopMarker(stopObj);
            updateStopIconsForCurrentRoute();
        }

        showMessage("Stop added to route.", 3000);
        panel.style.display = "none";
        pendingStopLatLng = null;

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
            <div>
              <b>${stop.TenTram || stop.MaTram}</b><br/>
              Mã trạm: ${stop.MaTram}<br/>
              Loại: <b>${stopType}</b><br/>
              <button id="${btnId}" type="button"
                      style="background:#2196F3;color:white;border:none;padding:4px 8px;
                            border-radius:4px;margin-top:5px;cursor:pointer;">
                Change location
              </button>
            </div>
          `,
    });

    marker.addListener("click", () => {
        info.open(map, marker);
        google.maps.event.addListenerOnce(info, "domready", () => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.onclick = () => {
                selectedStop = marker;
                isChangingLocation = true;
                showMessage("Click a new location on the map to move this stop.");
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
    // FIX: remove stopIconOffRoute reference
    if (!currentRouteMaTuyen) {
        // no route selected -> all stops off-route (red)
        stopMarkers.forEach(marker => {
            if (marker.stopData.MaLoai == 1) {
                marker.setIcon(iconHexagonRed);
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

        stopMarkers.forEach(marker => {
            const maTram = marker.stopData?.MaTram;
            if (maTram && onRouteSet.has(maTram)) {
                // on-route
                if (marker.stopData.MaLoai == 1) {
                    marker.setIcon(iconHexagonGreen);   // station
                } else {
                    marker.setIcon(iconTriangleGreen);  // normal stop
                }
            } else {
                // off-route
                if (marker.stopData.MaLoai == 1) {
                    marker.setIcon(iconHexagonRed);
                } else {
                    marker.setIcon(iconTriangleRed);
                }
            }
        });
    } catch (err) {
        console.error("Error updating stop icons:", err);
    }
}
