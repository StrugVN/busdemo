window.onload = function () {
    initMap();

    // No route selected at startup → show all routes
    loadAndDrawRoute({ recenter: true });

    document.getElementById("routeSelect").addEventListener("change", () => loadAndDrawRoute({ recenter: false }));
    document.getElementById("directionSelect").addEventListener("change", () => loadAndDrawRoute({ recenter: false }));

    document.getElementById("applyRouteChangesBtn").addEventListener("click", applyRouteChanges);
    document.getElementById("cancelRouteChangesBtn").addEventListener("click", cancelRouteChanges);

    const clearPathBtn = document.getElementById("clearPathBtn");
    if (clearPathBtn) {
        clearPathBtn.addEventListener("click", () => {
            resetPathSelection();
            if (typeof loadAndDrawRoute === "function") {
                loadAndDrawRoute({ recenter: true });
            } else if (typeof loadAllRoutesForCurrentDirection === "function") {
                loadAllRoutesForCurrentDirection();
            }
        });
    }

    const newRouteBtn = document.getElementById("newRouteBtn");
    if (newRouteBtn) {
        newRouteBtn.addEventListener("click", () => {
            if (!newRouteDrawingMode) {
                // start drawing
                beginNewRouteDrawing();
                newRouteBtn.textContent = "Xong";
            } else {
                // finish drawing
                finishNewRouteDrawing();
                newRouteBtn.textContent = "Thêm tuyến";
            }
        });
    }


    if (typeof updatePathPanel === "function") {
        updatePathPanel(null);
    }
};
