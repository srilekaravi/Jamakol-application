async function loadPlaces() {
    const res = await fetch("/list_places");
    const data = await res.json();
    const datalist = document.getElementById("placesList");
    if (!datalist) return;
    datalist.innerHTML = "";
    data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.city;
        opt.textContent = `${p.city} (${p.city_en})`;
        opt.dataset.lat = p.lat;
        opt.dataset.lon = p.lon;
        opt.dataset.tz = p.tz;
        datalist.appendChild(opt);
    });
    console.log("✅ Places loaded:", data.length);
}

// Run everything once the page is ready
(async function init() {
    try {
        await loadPlaces();
        if (!qs('date').value)
            qs('date').value = new Date().toISOString().slice(0, 10);
        if (!qs('time').value)
            qs('time').value = new Date().toTimeString().slice(0, 8);
        generateChart();
        await loadSavedCache();
    } catch (err) {
        console.error('init error', err);
    }
})();
