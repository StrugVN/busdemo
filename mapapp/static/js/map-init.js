window.onload = function () {
    initMap();

    // No route selected at startup → show all routes
    loadAndDrawRoute();

    document.getElementById("routeSelect").addEventListener("change", loadAndDrawRoute);
    document.getElementById("directionSelect").addEventListener("change", loadAndDrawRoute);

    document.getElementById("applyRouteChangesBtn").addEventListener("click", applyRouteChanges);
    document.getElementById("cancelRouteChangesBtn").addEventListener("click", cancelRouteChanges);

    const clearBtn = document.getElementById("clearPathBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            resetPathSelection();
            // redraw normal routes again
            loadAndDrawRoute();
        });
    }

    if (typeof updatePathPanel === "function") {
        updatePathPanel(null);
    }
};
