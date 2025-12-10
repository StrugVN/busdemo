let currentlyOpenInfoWindow = null;
let pathResultData = null;       // full response from /shortest-path
let bestPathIndex = null;        // data.best_index
let selectedPathIndex = null;    // which path is shown in "Path:"
let selectedOverlayPolylines = [];

function normalizeVN(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^\w\s]/g, " ")        // remove punctuation
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function stripPlusCode(str) {
    // Remove "XXXX+XX " style codes at the start
    return str.replace(/^[a-z0-9]{4}\+[a-z0-9]{2}\s+/i, "").trim();
}

function getWardSearchText(address) {
    // 1) remove plus code
    let s = stripPlusCode(address);

    // 2) split by comma
    let parts = s.split(",").map(p => p.trim()).filter(Boolean);
    if (!parts.length) return "";

    // 3) drop trailing "Vietnam" / "Viet Nam"
    while (parts.length) {
        const lastNorm = normalizeVN(parts[parts.length - 1]);
        if (lastNorm === "vietnam" || lastNorm === "viet nam") {
            parts.pop();
        } else {
            break;
        }
    }

    // 4) drop the remaining last part as province/city if we still have more than 1
    //    e.g. "... , Soc Trang" → drop "Soc Trang"
    if (parts.length > 1) {
        parts.pop();
    }

    // remainder is things like:
    // "Long Phu District" / "Vinh Chau" / "My Tu" / "Cai Rang, Can Tho"
    return parts.join(", ");
}

function inferMaXaFromAddress(address) {
    if (!address || !Array.isArray(XA_LIST)) return "";

    const searchText = getWardSearchText(address);
    const normSearch = normalizeVN(searchText);
    if (!normSearch) return "";

    let matchMaXa = "";

    for (const xa of XA_LIST) {
        if (!xa || !xa.TenXa) continue;

        const full = normalizeVN(xa.TenXa);               // "phuong cai khe" / "xa long phu" / "xa soc trang"
        const bare = full.replace(/^(xa|phuong|thi tran)\s+/, "");  // "cai khe" / "long phu" / "soc trang"

        if (!bare) continue;

        // Only look inside the *pre-trimmed* part (no province/country)
        if (normSearch.includes(full) || normSearch.includes(bare)) {
            matchMaXa = xa.MaXa;
            break;
        }
    }

    return matchMaXa;
}

function getMarkerForStop(maTram) {
    if (!maTram) return null;
    return stopMarkers.find(m => m.stopData && m.stopData.MaTram === maTram) || null;
}


function formatDistanceLabel(m) {
    if (m == null) return "";
    const value = Number(m);
    if (isNaN(value)) return "";

    if (value >= 1000) {
        const km = value / 1000;
        let s = km.toFixed(2);         // up to 2 decimals
        s = s.replace(/\.?0+$/, "");   // strip .00 / .10
        return s + " km";
    } else {
        // meters, integer
        return Math.round(value) + " m";
    }
}

function renderRouteStopsPanel(stops) {
    const panel = document.getElementById("routeStopsPanel");
    if (!panel) return;

    if (!currentRouteMaTuyen || !stops || stops.length === 0) {
        panel.style.display = "none";
        panel.innerHTML = "";
        return;
    }

    let html = `
    <div>
      <b>Route ${currentRouteMaTuyen}</b>
    </div>
    <div style="margin-top:6px;">
  `;

    stops.forEach((s, idx) => {
        const name = s.TenTram || s.MaTram;
        const dist = formatDistanceLabel(s.KhoangCachDenTramTiepTheo);
        const isLast = idx === stops.length - 1;
        const rowId = `routeStopRow_${s.MaTram}`;

        html += `
      <div id="${rowId}" data-matram="${s.MaTram}"
           style="padding:2px 0; cursor:pointer;">
        <div>
          ${s.STT}. ${name}
        </div>

        ${!isLast
                ? `
        <div style="display:flex; justify-content:space-between; align-items:center;">

          <span style="
            font-size:14px;
            opacity:0.5;
            margin-left:10px;">↓</span>

          <span style="
            font-size:10px;
            opacity:0.65;">
            ${dist}
          </span>

        </div>
        `
                : ``
            }
      </div>
    `;
    });

    html += `</div>`;
    panel.innerHTML = html;
    panel.style.display = "block";

    // Attach click handlers to each row
    stops.forEach((s) => {
        const row = document.getElementById(`routeStopRow_${s.MaTram}`);
        if (!row) return;

        row.onclick = () => {
            const marker = getMarkerForStop(s.MaTram);
            if (!marker) return;

            const pos = marker.getPosition();
            if (!pos) return;

            // Zoom toward this stop
            const targetZoom = 16; // adjust if you want
            if (map.getZoom() < targetZoom) {
                map.setZoom(targetZoom);
            }
            map.panTo(pos);

            if (currentlyOpenInfoWindow) {
                currentlyOpenInfoWindow.close();
            }
            // Optional: also open the marker info window
            google.maps.event.trigger(marker, "click");
        };
    });
}

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

        // For "add stop" dialog
        const diaChiInputAdd = document.getElementById("diaChiInput");
        const nameInputAdd = document.getElementById("newStopName");

        // For "edit stop" dialog
        const diaChiInputEdit = document.getElementById("editAddress");
        const nameInputEdit = document.getElementById("editName");

        // Fill address where empty
        [diaChiInputAdd, diaChiInputEdit].forEach(input => {
            if (input && !input.value) {
                input.value = address;
            }
        });

        // Optionally auto-name if name is empty
        [nameInputAdd, nameInputEdit].forEach(input => {
            if (input && !input.value) {
                input.value = buildShortNameFromAddress(address);
            }
        });

        const wardSelect = document.getElementById("newStopMaXa");
        if (wardSelect && !wardSelect.value) {
            const inferred = inferMaXaFromAddress(address);
            if (inferred) {
                wardSelect.value = inferred;
            }
        }
    });
}



async function openAddStopPanel(fromStop = false) {
    const panel = document.getElementById("addStopPanel");
    if (!pendingStopLatLng || !currentRouteMaTuyen) return;

    // 1) Fetch existing stops ON THIS ROUTE+DIRECTION for position list only
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

    // 2) Dropdown for ALL stops in system (for "Use existing stop")
    let existingOptions = `<option value="">-- Điểm dừng mới --</option>`;
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
            positionOptions += `<option value="${s.STT}"${selectedAttr}>Sau "${label}"</option>`;
        });
    } else {
        positionOptions = `<option value="0" selected>Sau khi bắt đầu</option>`;
    }

    const lat = pendingStopLatLng.lat().toFixed(6);
    const lng = pendingStopLatLng.lng().toFixed(6);

    const xaOptions = (XA_LIST || [])
        .map(x => `<option value="${x.MaXa}">${x.TenXa}</option>`)
        .join("");


    panel.innerHTML = `
    <div>
      <b>Thêm điểm dừng</b><br/>
      Route ${currentRouteMaTuyen} (${currentRouteChieu === "0" ? "Chiều đi" : "Chiều về"})<br/>
      <small>Clicked at: ${lat}, ${lng}</small>

      <div style="margin-top:6px;">
        <label style="font-size:12px;">Dùng điểm dừng có sẵn:</label><br/>
        <select id="existingStopSelect" style="width:100%;padding:3px 4px;">
          ${existingOptions}
        </select>
      </div>

      <div style="margin-top:6px;">
        <label style="font-size:12px;">Vị trí:</label><br/>
        <select id="insertAfterSelect" style="width:100%;padding:3px 4px;">
          ${positionOptions}
        </select>
        <small style="font-size:11px;color:#555;">
          Điểm dừng mới sẽ được thêm vào sau điểm dừng được chọn ở trên.
        </small>
      </div>

      <div id="newStopFields" style="margin-top:6px;">
        <label style="font-size:12px;">Tên điểm dừng:</label><br/>
        <input id="newStopName" type="text" style="width:100%;padding:3px 4px;margin-bottom:4px;" />

        <label style="font-size:12px;">Địa chỉ:</label><br/>
        <input id="diaChiInput" type="text"
                style="width:100%;padding:3px 4px;margin-bottom:4px;"
                placeholder="Fetching address..." />

        <!-- NEW: Ward dropdown -->
        <label style="font-size:12px;">Xã:</label><br/>
        <select id="newStopMaXa" style="width:100%;padding:3px 4px;margin-bottom:4px;">
            <option value="">-- Ward / Commune --</option>
            ${xaOptions}
        </select>

        <label style="font-size:12px;">Loại:</label><br/>
        <select id="newStopType" style="width:100%;padding:3px 4px;">
            <option value="1">Bến</option>
            <option value="2" selected>Điểm dừng</option>
        </select>
      </div>

      <div style="margin-top:8px;text-align:right;">
        <button id="saveStopBtn" type="button"
                style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;">
          Lưu
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
            reverseGeocodeAndPrefill(pendingStopLatLng);
        }
    });

    // If right-clicking an existing stop, preselect it & position
    if (fromStop && pendingRightClickStop) {
        selectExisting.value = pendingRightClickStop.MaTram;
        newFields.style.display = "none";

        const match = routeStopsCache.find(s => s.MaTram === pendingRightClickStop.MaTram);
        if (match && insertAfterSelect) {
            insertAfterSelect.value = String(match.STT);
        }
    } else {
        // New stop by default → auto geocode on open
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
    let maXa = null;

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

        const wardSelect = document.getElementById("newStopMaXa");
        if (wardSelect) {
            maXa = wardSelect.value || null;
        }

        // If ward still empty, try to infer again from DiaChi
        if (!maXa && diaChi) {
            const inferred = inferMaXaFromAddress(diaChi);
            if (inferred) {
                maXa = inferred;
            }
        }

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
        MaXa: maXa,                        // new stop only
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
    if (typeof stopNameById !== "undefined") {
        stopNameById[stop.MaTram] = stop.TenTram || stop.MaTram;
    }

    const info = new google.maps.InfoWindow();

    marker.addListener("click", () => {
        if (currentlyOpenInfoWindow) {
            currentlyOpenInfoWindow.close();
        }
        currentlyOpenInfoWindow = info;

        const onRoute = currentRouteStopIds && currentRouteStopIds.has(stop.MaTram);

        const removeButtonHtml = onRoute
            ? `
        <button id="deleteStopBtn_${stop.MaTram}"
                style="flex:1; padding:4px 6px; border-radius:4px;
                       border:1px solid #f44336; background:#f44336; color:white; cursor:pointer;">
          Remove
        </button>`
            : "";

        // Decide which path selection buttons to show
        let pathButtonsHtml = "";

        if (!pathStartStopId && !pathEndStopId) {
            // No selection yet -> allow setting Start
            pathButtonsHtml = `
                <div style="display:flex; gap:4px; margin-top:8px;">
                  <button id="setStartBtn_${stop.MaTram}"
                          style="flex:1; padding:3px 5px; border-radius:4px;
                                  border:1px solid #4CAF50; background:#4CAF50; color:white; cursor:pointer;">
                    Start
                  </button>
                </div>
            `;
        } else if (pathStartStopId && !pathEndStopId) {
            // Start is chosen, waiting for End -> only allow End
            pathButtonsHtml = `
                <div style="display:flex; gap:4px; margin-top:8px;">
                  <button id="setEndBtn_${stop.MaTram}"
                          style="flex:1; padding:3px 5px; border-radius:4px;
                                  border:1px solid #FF9800; background:#FF9800; color:white; cursor:pointer;">
                    End
                  </button>
                </div>
            `;
        } else {
            // Both start and end already selected -> hide path buttons
            pathButtonsHtml = "";
        }

        const content = `
            <div style="min-width:230px">
                <b>${stop.TenTram || stop.MaTram}</b><br/>
                Code: ${stop.MaTram}<br/>
                Type: ${stop.MaLoai == 1 ? "Bến" : "Điểm dừng"}<br/>
                Address: ${stop.DiaChi || "N/A"}<br/>
                Ward: ${stop.TenXa || "N/A"}<br/>

                <div style="margin-top:6px;">
                <b>Tuyến đi qua:</b>
                <div id="stopRoutes_${stop.MaTram}"
                    style="max-height:120px;overflow:auto;font-size:12px;">
                    Loading...
                </div>
                </div>

                ${pathButtonsHtml}

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

        // IMPORTANT: use `info`, not `infoWindow`
        google.maps.event.addListenerOnce(info, "domready", () => {
            if (typeof loadRoutesForStop === "function") {
                loadRoutesForStop(stop.MaTram);
            }
            const startBtn = document.getElementById(`setStartBtn_${stop.MaTram}`);
            const endBtn = document.getElementById(`setEndBtn_${stop.MaTram}`);
            const editBtn = document.getElementById(`editStopBtn_${stop.MaTram}`);
            const deleteBtn = document.getElementById(`deleteStopBtn_${stop.MaTram}`);
            const moveBtn = document.getElementById(`moveStopBtn_${stop.MaTram}`);

            if (startBtn && typeof handleSetAsStart === "function") {
                startBtn.onclick = () => {
                    handleSetAsStart(stop, marker);
                    info.close();  // close after selecting Start
                };
            }

            if (endBtn && typeof handleSetAsEnd === "function") {
                endBtn.onclick = () => {
                    handleSetAsEnd(stop, marker);
                    info.close();  // close after selecting End
                };
            }

            if (moveBtn) {
                moveBtn.onclick = () => {
                    selectedStop = marker;
                    isChangingLocation = true;
                    showMessage("Click on map to choose new location.");
                };
            }

            if (editBtn) {
                editBtn.onclick = () => {
                    openEditStopDialog(marker.stopData, info);
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

        pendingStopLatLng = marker.getPosition();
        pendingRightClickStop = marker.stopData;

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
        currentRouteStopIds = new Set();
        renderRouteStopsPanel([]);
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
        currentRouteStopIds = onRouteSet;

        renderRouteStopsPanel(stops);

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

    let selectedMaXa = stop.MaXa || "";
    if ((!selectedMaXa || selectedMaXa === "0") && stop.DiaChi) {
        const inferred = inferMaXaFromAddress(stop.DiaChi);
        if (inferred) {
            selectedMaXa = inferred;
        }
    }

    const xaOptions = XA_LIST
        .map(x => `<option value="${x.MaXa}" ${selectedMaXa == x.MaXa ? "selected" : ""}>${x.TenXa}</option>`)
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

    // If address is empty/null when editing, auto-fill from marker location
    if (!stop.DiaChi || stop.DiaChi === "") {
        if (typeof google !== "undefined" && stop.lat != null && stop.lng != null) {
            const latLng = new google.maps.LatLng(stop.lat, stop.lng);
            reverseGeocodeAndPrefill(latLng);
        }
    }

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

function clearCurrentPath() {
    currentPathPolylines.forEach(line => line.setMap(null));
    currentPathPolylines = [];
}

function onStopMarkerClick(stop, marker) {
    // Existing behavior: show info window, etc...
    showStopInfo(stop, marker);  // whatever you currently do

    // New behavior: select start/end for path finding
    if (!pathStartStopId) {
        // 1st click → start stop
        pathStartStopId = stop.MaTram;
        pathStartMarker = marker;
        clearCurrentPath();
        highlightMarker(marker, "start");  // e.g. change color/icon

    } else if (!pathEndStopId && stop.MaTram !== pathStartStopId) {
        // 2nd click → end stop
        pathEndStopId = stop.MaTram;
        pathEndMarker = marker;
        highlightMarker(marker, "end");

        requestShortestPath(pathStartStopId, pathEndStopId);

    } else {
        // 3rd click → reset and treat as new start
        resetPathSelection();
        pathStartStopId = stop.MaTram;
        pathStartMarker = marker;
        highlightMarker(marker, "start");
    }
}

async function requestShortestPath(startMaTram, endMaTram) {
    if (!startMaTram || !endMaTram) return;

    try {
        const url = `/shortest-path/?start=${encodeURIComponent(startMaTram)}&end=${encodeURIComponent(endMaTram)}`;
        const res = await fetch(url);
        if (!res.ok) {
            showMessage("No path found.", 4000);
            return;
        }
        const data = await res.json();
        if (!data.success) {
            showMessage(data.error || "No path found.", 4000);
            return;
        }

        pathResultData = data;
        bestPathIndex = data.best_index || 0;
        selectedPathIndex = bestPathIndex;   // default: shortest path selected

        renderAllPaths();                    // new renderer (section 5)
        renderSelectedOverlay();
        updatePathPanel(getSelectedPath());  // selected path summary
        updatePathList();                    // list of all paths
    } catch (err) {
        console.error("Error fetching shortest path", err);
        showMessage("Error fetching shortest path.", 4000);
    }
}


function renderPathsOnMap(data) {
    clearCurrentPathLines();

    if (typeof clearAllRoutesPolylines === "function") {
        clearAllRoutesPolylines();
    }

    if (!data || !Array.isArray(data.paths) || data.paths.length === 0) {
        updatePathPanel(null);
        return;
    }

    const bestIndex = data.best_index || 0;
    const bestPath = data.paths[bestIndex];
    const bounds = new google.maps.LatLngBounds();

    // Track drawn edges: "from->to"
    const drawnEdges = new Set();

    // ---------- 1) Draw BEST path (colored segments + arrows) ----------
    const segs = bestPath.segments || [];
    const mainPalette = [
        "#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
        "#ff7f00", "#a65628", "#f781bf", "#999999",
    ];

    segs.forEach((seg, idx) => {
        const gSegPath = (seg.coords || []).map(
            p => new google.maps.LatLng(p.lat, p.lng)
        );
        if (gSegPath.length < 2) return;

        const color = mainPalette[idx % mainPalette.length];

        const lineOptions = {
            path: gSegPath,
            map: map,
            strokeColor: color,
            strokeOpacity: 0.95,
            strokeWeight: 5,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                },
                offset: "20px",
                repeat: "80px",
            }],
        };

        const polyline = new google.maps.Polyline(lineOptions);
        currentPathPolylines.push(polyline);
        gSegPath.forEach(ll => bounds.extend(ll));
    });

    // Mark BEST path edges as drawn
    (bestPath.edges || []).forEach(e => {
        drawnEdges.add(edgeKey(e));
    });

    // ---------- 2) Draw OTHER paths: only non-overlapping parts ----------
    const altPalette = [
        "#000000", "#555555", "#880000", "#006666",
        "#666600", "#660066", "#006600", "#444488",
        "#884444", "#008888"
    ];
    let altColorIndex = 0;

    data.paths.forEach((path, idx) => {
        if (idx === bestIndex) return;   // skip best, already drawn

        const edges = path.edges || [];
        if (!edges.length) return;

        const color = altPalette[altColorIndex % altPalette.length];
        altColorIndex++;

        let currentCoords = [];

        function flushSegment() {
            if (currentCoords.length < 2) return;
            const gPath = currentCoords.map(
                p => new google.maps.LatLng(p.lat, p.lng)
            );

            const lineOptions = {
                path: gPath,
                map: map,
                strokeColor: color,
                strokeOpacity: 0,      // hide solid line
                strokeWeight: 3,
                icons: [{
                    icon: {
                        path: "M 0,-1 0,1",
                        strokeOpacity: 1,
                        scale: 2,
                    },
                    offset: "0",
                    repeat: "16px",      // - . - . -
                }],
            };

            const polyline = new google.maps.Polyline(lineOptions);
            currentPathPolylines.push(polyline);
            gPath.forEach(ll => bounds.extend(ll));
            currentCoords = [];
        }

        edges.forEach(edge => {
            const key = edgeKey(edge);

            // Already drawn by best or a previous alt path -> skip
            if (drawnEdges.has(key)) {
                // End any ongoing segment
                flushSegment();
                return;
            }

            // Mark this edge as drawn so later paths don't re-draw it
            drawnEdges.add(key);

            const ec = edge.coords || [];
            if (!ec.length) return;

            if (!currentCoords.length) {
                currentCoords = ec.slice();
            } else {
                // Avoid duplicate join point
                currentCoords = currentCoords.concat(ec.slice(1));
            }
        });

        // Flush any final fragment of this path
        flushSegment();
    });

    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }

    updatePathPanel(bestPath);
}



function maybeCallShortestPath() {
    if (!pathStartStopId || !pathEndStopId) return;
    if (pathStartStopId === pathEndStopId) {
        showMessage("Start and end are the same stop.", 3000);
        return;
    }
    requestShortestPath(pathStartStopId, pathEndStopId);
}

function handleSetAsStart(stop, marker) {
    pathStartStopId = stop.MaTram;
    pathStartMarker = marker;
    updatePathPanel();

    if (pathEndStopId && pathEndStopId !== pathStartStopId) {
        requestShortestPath(pathStartStopId, pathEndStopId);
    }
}

function handleSetAsEnd(stop, marker) {
    pathEndStopId = stop.MaTram;
    pathEndMarker = marker;
    updatePathPanel();

    if (pathStartStopId && pathEndStopId !== pathStartStopId) {
        requestShortestPath(pathStartStopId, pathEndStopId);
    }
}


function edgeKey(edge) {
    return edge.from + "->" + edge.to;
}

function getSelectedPath() {
    if (!pathResultData || !Array.isArray(pathResultData.paths)) return null;
    if (selectedPathIndex == null) return null;
    return pathResultData.paths[selectedPathIndex] || null;
}

function renderAllPaths() {
    clearCurrentPathLines();
    if (typeof clearAllRoutesPolylines === "function") {
        clearAllRoutesPolylines();
    }

    if (!pathResultData || !Array.isArray(pathResultData.paths) || pathResultData.paths.length === 0) {
        updatePathPanel(null);
        return;
    }

    const paths = pathResultData.paths;
    const bestIdx = bestPathIndex ?? 0;
    const selIdx = selectedPathIndex ?? bestIdx;
    const bounds = new google.maps.LatLngBounds();

    const drawnEdges = new Set();

    // ----- 1) Draw SHORTEST path (solid, colored segments with arrows) -----
    const bestPath = paths[bestIdx];
    const segs = bestPath.segments || [];
    const mainPalette = [
        "#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
        "#ff7f00", "#a65628", "#f781bf", "#999999",
    ];

    segs.forEach((seg, idx) => {
        const coords = seg.coords || [];
        if (coords.length < 2) return;

        const gSegPath = coords.map(p => new google.maps.LatLng(p.lat, p.lng));
        const color = mainPalette[idx % mainPalette.length];

        const pl = new google.maps.Polyline({
            path: gSegPath,
            map: map,
            strokeColor: color,
            strokeOpacity: 0.95,
            strokeWeight: 5,
            icons: [{
                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                offset: "20px",
                repeat: "80px",
            }],
        });

        currentPathPolylines.push(pl);
        gSegPath.forEach(ll => bounds.extend(ll));
    });

    // mark edges of shortest path as drawn
    (bestPath.edges || []).forEach(e => {
        drawnEdges.add(edgeKey(e));
    });

    // ----- 2) Draw SELECTED path (if different) as dashed multi-color by route -----
    if (selIdx !== bestIdx) {
        const selPath = paths[selIdx];
        const edges = selPath.edges || [];
        if (edges.length) {
            const colorPalette = [
                "#0000aa", "#00aa00", "#aa00aa", "#aa5500",
                "#008888", "#5555aa", "#aa0055", "#557700",
            ];
            let currentCoords = [];
            let currentColor = colorPalette[0];
            let colorIdx = 0;
            let currentRouteKey = null; // MaTuyen|Chieu

            function flushSelSegment() {
                if (currentCoords.length < 2) return;
                const gPath = currentCoords.map(p => new google.maps.LatLng(p.lat, p.lng));

                const pl = new google.maps.Polyline({
                    path: gPath,
                    map: map,
                    strokeColor: currentColor,
                    strokeOpacity: 0,  // dashed only
                    strokeWeight: 4,
                    icons: [{
                        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
                        offset: "0",
                        repeat: "16px",
                    }],
                });

                currentPathPolylines.push(pl);
                gPath.forEach(ll => bounds.extend(ll));
                currentCoords = [];
            }

            edges.forEach(e => {
                const key = edgeKey(e);
                const coords = e.coords || [];
                const routeKey = e.MaTuyen + "|" + e.Chieu;

                if (drawnEdges.has(key) || coords.length === 0) {
                    flushSelSegment();
                    return;
                }

                // new route run -> new color, flush previous
                if (routeKey !== currentRouteKey && currentCoords.length) {
                    flushSelSegment();
                }
                if (routeKey !== currentRouteKey) {
                    currentRouteKey = routeKey;
                    currentColor = colorPalette[colorIdx % colorPalette.length];
                    colorIdx++;
                }

                drawnEdges.add(key);

                if (!currentCoords.length) {
                    currentCoords = coords.slice();
                } else {
                    currentCoords = currentCoords.concat(coords.slice(1));
                }
            });

            flushSelSegment();
        }
    }

    // ----- 3) Draw all OTHER paths (single-color dashed, only non-overlap) -----
    const altPalette = [
        "#000000", "#555555", "#880000", "#006666",
        "#666600", "#660066", "#006600", "#444488",
        "#884444", "#008888"
    ];
    let altColorIndex = 0;

    paths.forEach((p, idx) => {
        if (idx === bestIdx || idx === selIdx) return;
        const edges = p.edges || [];
        if (!edges.length) return;

        const color = altPalette[altColorIndex % altPalette.length];
        altColorIndex++;

        let coordsAccum = [];

        function flushAlt() {
            if (coordsAccum.length < 2) return;
            const gPath = coordsAccum.map(p => new google.maps.LatLng(p.lat, p.lng));

            const pl = new google.maps.Polyline({
                path: gPath,
                map: map,
                strokeColor: color,
                strokeOpacity: 0,
                strokeWeight: 3,
                icons: [{
                    icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
                    offset: "0",
                    repeat: "16px",
                }],
            });

            currentPathPolylines.push(pl);
            gPath.forEach(ll => bounds.extend(ll));
            coordsAccum = [];
        }

        edges.forEach(e => {
            const key = edgeKey(e);
            const coords = e.coords || [];
            if (drawnEdges.has(key) || coords.length === 0) {
                flushAlt();
                return;
            }
            drawnEdges.add(key);

            if (!coordsAccum.length) {
                coordsAccum = coords.slice();
            } else {
                coordsAccum = coordsAccum.concat(coords.slice(1));
            }
        });

        flushAlt();
    });

    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }

    // "Path" summary = currently selected path
    updatePathPanel(getSelectedPath());
}

function updatePathList() {
    const listEl = document.getElementById("pathList");
    if (!listEl) return;

    listEl.innerHTML = "";

    if (!pathResultData || !Array.isArray(pathResultData.paths)) {
        listEl.textContent = "(none)";
        return;
    }

    const paths = pathResultData.paths;

    paths.forEach((p, idx) => {
        const row = document.createElement("div");
        row.className = "path-list-item" + (idx === selectedPathIndex ? " selected" : "");

        const indexSpan = document.createElement("span");
        indexSpan.className = "path-list-index";
        indexSpan.textContent = (idx + 1) + (idx === bestPathIndex ? "★" : "");

        const distSpan = document.createElement("span");
        distSpan.className = "path-list-distance";
        distSpan.textContent = formatDistance(p.total_distance);

        row.appendChild(indexSpan);
        row.appendChild(distSpan);

        row.addEventListener("click", () => {
            selectedPathIndex = idx;
            renderAllPaths();                    // re-render with this as priority
            renderSelectedOverlay();
            updatePathList();                    // refresh highlighting
        });

        listEl.appendChild(row);
    });
}

function clearSelectedOverlay() {
    selectedOverlayPolylines.forEach(pl => pl.setMap(null));
    selectedOverlayPolylines = [];
}

function renderSelectedOverlay() {
    clearSelectedOverlay();

    if (!pathResultData || !Array.isArray(pathResultData.paths)) return;

    const paths = pathResultData.paths;
    const bestIdx = bestPathIndex ?? 0;
    const selIdx = selectedPathIndex ?? bestIdx;

    // If selected is the shortest path, no overlay
    if (selIdx === bestIdx) return;

    const path = paths[selIdx];
    if (!path) return;

    const segs = path.segments || [];
    const fullCoords = path.polyline || [];
    if (!segs.length || fullCoords.length < 2) return;

    // 1) Base black line for the WHOLE selected path (highlighter)
    const gFullPath = fullCoords.map(p => new google.maps.LatLng(p.lat, p.lng));
    const baseLine = new google.maps.Polyline({
        path: gFullPath,
        map: map,
        strokeColor: "#000000",
        strokeOpacity: 0.75,   // visible but not overpowering
        strokeWeight: 5,
        zIndex: 48,            // below colored segments, above other dash spam
    });
    selectedOverlayPolylines.push(baseLine);

    // 2) Colored disconnected subpaths per route on top of the black line
    const overlayPalette = [
        "#ff00ff", "#00e5ff", "#ffea00", "#ff6d00",
        "#64dd17", "#d500f9", "#00c853", "#ff1744",
    ];

    segs.forEach((seg, idx) => {
        const coords = seg.coords || [];
        if (coords.length < 2) return;

        const gPath = coords.map(p => new google.maps.LatLng(p.lat, p.lng));
        const color = overlayPalette[idx % overlayPalette.length];

        const pl = new google.maps.Polyline({
            path: gPath,
            map: map,
            strokeColor: color,
            strokeOpacity: 0,        // only dashes, no solid
            strokeWeight: 6,         // thick, very visible on top of black
            zIndex: 50,              // top-most
            icons: [{
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "14px",
            }],
        });

        selectedOverlayPolylines.push(pl);
    });
}

async function loadRoutesForStop(maTram) {
    const container = document.getElementById(`stopRoutes_${maTram}`);
    if (!container) return;

    try {
        const res = await fetch(`${STOP_ROUTES_URL}?MaTram=${encodeURIComponent(maTram)}`);
        const data = await res.json();

        if (!data.success) {
            container.textContent = "(error loading routes)";
            return;
        }

        const routes = data.routes || [];
        if (!routes.length) {
            container.textContent = "";
            return;
        }

        let html = "<ul style='padding-left:16px;margin:4px 0;'>";
        routes.forEach(r => {
            const dirLabel = (r.Chieu === 0 || r.Chieu === "0") ? "Đi" : "Về";
            const ten = r.TenTuyen ? ` - ${r.TenTuyen}` : "";
            html += `<li>${r.MaTuyen} (${dirLabel})${ten}</li>`;
        });
        html += "</ul>";

        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.textContent = "(error loading routes)";
    }
}
