// rasiChart.js — FINAL FIX (Maandhi degree always shows)
// ------------------------------------------------------------
// ✅ Displays degree first ("07°54′55″ மா")
// ✅ Works even if backend key is named dms / DMS / degree
// ✅ Keeps other planets, layout, and style unchanged

function renderRasiChart(rows) {
    const boxes = document.querySelectorAll(".rasi-box");
    boxes.forEach((box) => (box.innerHTML = "")); // clear chart boxes

    if (!rows || !Array.isArray(rows)) return;

    rows.forEach((row) => {
        const rasiName = row.rasi || row.Rasi;
        const planet = row.short || row.Short || row.name || row.Name || "";
        if (!rasiName || !planet) return;

        const idx = getRasiIndex(rasiName);
        if (idx === -1 || !boxes[idx]) return;

        let label = planet;

        // 🔍 Try to read degree from multiple possible fields
        const degree =
            row.dms || row.DMS || row.degree || row.Degree || row.deg || "";

        // ✅ If this is Maandhi, show degree first
        if (planet === "மா" || row.short === "மா" || row.name === "மாந்தி") {
            if (degree && degree.trim() !== "") {
                label = `${degree} ${planet}`; // degree first
            }
            label = `<span class="maandhi-label">${label}</span>`;
        }

        boxes[idx].innerHTML += `
            <div class="rasi-planet" style="font-size:14px;line-height:1.3;">
                ${label}
            </div>`;
    });
}

// ✅ Map Rasi names to correct chart box positions
function getRasiIndex(rasiName) {
    const order = [
        "மேஷம்",
        "ரிஷபம்",
        "மிதுனம்",
        "கடகம்",
        "சிம்மம்",
        "கன்னி",
        "துலாம்",
        "விருச்சிகம்",
        "தனுசு",
        "மகரம்",
        "கும்பம்",
        "மீனம்",
    ];
    return order.indexOf(rasiName);
}
window.renderRasiChart = renderRasiChart;
