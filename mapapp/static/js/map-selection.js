function setupRectangleSelection() {
    const mapDiv = map.getDiv();

    // Start selection on middle mouse down
    mapDiv.addEventListener("mousedown", (e) => {
        if (!editMode) return;
        if (e.button !== 1) return; // 1 = middle mouse
        if (!polylinePath || polylinePath.getLength() < 2) return;

        e.preventDefault();
        e.stopPropagation();

        rectSelecting = true;

        const rect = mapDiv.getBoundingClientRect();
        rectStartPixel = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        // temporarily disable map panning while selecting
        previousMapDraggable = map.get("draggable") !== false;
        map.setOptions({ draggable: false });
    });

    // Update rectangle while dragging
    document.addEventListener("mousemove", (e) => {
        if (!rectSelecting) return;
        if (!mapOverlay) return;

        const projection = mapOverlay.getProjection();
        if (!projection) return;

        const mapRect = mapDiv.getBoundingClientRect();
        const curPixel = new google.maps.Point(
            e.clientX - mapRect.left,
            e.clientY - mapRect.top
        );
        const startPixel = new google.maps.Point(
            rectStartPixel.x,
            rectStartPixel.y
        );

        const p1 = projection.fromContainerPixelToLatLng(startPixel);
        const p2 = projection.fromContainerPixelToLatLng(curPixel);

        const sw = new google.maps.LatLng(
            Math.min(p1.lat(), p2.lat()),
            Math.min(p1.lng(), p2.lng())
        );
        const ne = new google.maps.LatLng(
            Math.max(p1.lat(), p2.lat()),
            Math.max(p1.lng(), p2.lng())
        );
        const bounds = new google.maps.LatLngBounds(sw, ne);

        if (!selectionRect) {
            selectionRect = new google.maps.Rectangle({
                map: map,
                bounds,
                strokeColor: "#2196F3",
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: "#2196F3",
                fillOpacity: 0.15,
                clickable: false,
                zIndex: 999,
            });
        } else {
            selectionRect.setBounds(bounds);
        }
    });

    // Finish selection on mouseup
    document.addEventListener("mouseup", (e) => {
        if (!rectSelecting) return;
        rectSelecting = false;

        // re-enable map drag to its previous state
        map.setOptions({ draggable: previousMapDraggable });

        if (!selectionRect) return;

        const bounds = selectionRect.getBounds();
        selectionRect.setMap(null);
        selectionRect = null;

        if (!bounds) return;
        if (!polylinePath || polylinePath.getLength() < 3) return;

        markVerticesInBounds(bounds);
    });
}

function markVerticesInBounds(bounds) {
    const len = polylinePath.getLength();
    if (len < 3) {
        showMessage("Route too short to delete vertices.", 3000);
        return;
    }

    let added = 0;

    for (let i = 0; i < len; i++) {
        const p = polylinePath.getAt(i);

        // Never mark first or last vertex
        if (i === 0 || i === len - 1) continue;

        if (bounds.contains(p)) {
            if (!selectedVertexIndices.has(i)) {
                selectedVertexIndices.add(i);
                added++;
            }
        }
    }

    if (!added) {
        showMessage("No new vertices in selection.", 2000);
    } else {
        showMessage(`Selected ${added} vertices (total ${selectedVertexIndices.size}).`, 2500);
    }

    updateVertexDeletePanel();
}

function updateVertexDeletePanel() {
    const panel = document.getElementById("vertexDeletePanel");
    const count = selectedVertexIndices.size;

    if (count === 0) {
        panel.style.display = "none";
        panel.innerHTML = "";
        return;
    }

    panel.style.display = "block";
    panel.innerHTML = `
          <div>
            <b>Delete selected nodes?</b><br/>
            <span>${count} vertex${count > 1 ? "es" : ""} marked for deletion.</span>
            <div style="margin-top:8px;text-align:right;">
              <button id="confirmDeleteVerticesBtn" type="button"
                      style="background:#f44336;color:white;border:none;padding:4px 8px;
                            border-radius:3px;cursor:pointer;">
                Yes
              </button>
              <button id="cancelDeleteVerticesBtn" type="button"
                      style="background:#ccc;color:black;border:none;padding:4px 8px;
                            border-radius:3px;cursor:pointer;margin-left:6px;">
                No
              </button>
            </div>
          </div>
        `;

    document
        .getElementById("confirmDeleteVerticesBtn")
        .addEventListener("click", applyVertexDeletion);
    document
        .getElementById("cancelDeleteVerticesBtn")
        .addEventListener("click", clearVertexSelection);
}

function applyVertexDeletion() {
    if (!polylinePath || selectedVertexIndices.size === 0) return;

    const len = polylinePath.getLength();
    const deleteCount = selectedVertexIndices.size;

    if (len - deleteCount < 2) {
        showMessage("Cannot delete that many vertices; route must keep at least 2 points.", 4000);
        return;
    }

    // delete from highest index to lowest
    const indices = Array.from(selectedVertexIndices).sort((a, b) => b - a);
    indices.forEach((idx) => {
        if (idx > 0 && idx < polylinePath.getLength() - 1) {
            polylinePath.removeAt(idx);
        }
    });

    showMessage(`Deleted ${indices.length} vertices.`, 2500);

    selectedVertexIndices.clear();
    updateVertexDeletePanel();
}

function clearVertexSelection() {
    selectedVertexIndices.clear();
    updateVertexDeletePanel();
    showMessage("Selection cleared.", 2000);
}
