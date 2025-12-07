// static/js/core.js — Enhanced FINAL version ✅
// Adds working Edit, Delete, and Save with proper backend calls
// Keeps Panchangam and Search Highlight fully functional

function qs(id) { return document.getElementById(id); }
// 🧩 Debounce utility — wait before re-running a function
function debounce(fn, delay = 500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function getSelectedPlaceMeta() {
    const placeInput = qs("place");
    if (!placeInput) return {};
    const val = placeInput.value;
    const datalist = document.getElementById("placesList");
    if (!datalist) return {};
    const opts = datalist.querySelectorAll("option");
    for (let opt of opts) {
        if (opt.value === val) {
            return {
                lat: parseFloat(opt.dataset.lat) || 13.0827,
                lon: parseFloat(opt.dataset.lon) || 80.2707,
                tz: parseFloat(opt.dataset.tz) || 5.5
            };
        }
    }
    return {};
}

/* ==========================================================
   🌞 Generate Chart & Panchangam
   ========================================================== */
async function generateChart() {
    try {
        const name = qs("name")?.value || "";
        const date = qs("date")?.value;
        const time = qs("time")?.value;
        const seconds = qs("seconds")?.value || 0;
        const place = qs("place")?.value || "";
        const ayanamsa = qs("ayanamsa")?.value || "lahiri";
        const chartType = qs("chartType")?.value || "rasi";
        const gender = qs("gender")?.value || "";
        const tag = qs("tag")?.value || "";
        const comment = qs("comment")?.value || "";

        const placeMeta = getSelectedPlaceMeta();

        const payload = {
            name, date, time, seconds, place, ayanamsa, chartType, gender, tag, comment,
            lat: placeMeta.lat, lon: placeMeta.lon, tz: placeMeta.tz
        };
        // --- FIX 1: LABEL RESET LOGIC ---
        const centerLabel = document.getElementById("center-label");
        if (chartType !== "bhava") {
            const labels = {
                "rasi": "ராசி",
                "d9": "நவம்சம் (D9)",
                "d10": "தசம்சம் (D10)",
                "d7": "ஸப்தம்சம் (D7)"
            };
            // Force reset immediately before fetch
            if (centerLabel) {
                centerLabel.textContent = labels[chartType] || "Chart";
                centerLabel.style.opacity = "1";
            }
        }

        // --- BHAVA LOGIC ---
        if (chartType === "bhava") {
            console.log("Generating Bhava...");
            const res = await fetch("/bhava_chart", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === "ok") {
                if (window.renderBhavaChart) window.renderBhavaChart(data);
                window.lastChartData = data;
            }
            return; // Stop here
        }


        const res = await fetch("/generate_chart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {
            console.error("generate_chart did not return JSON:", text);
            return;
        }

        if (!data || data.status !== "ok" || !data.rows) {
            console.error("Invalid chart response:", data);
            return;
        }

        const rows = data.rows;
        window.lastChartData = data;
        // 🌟 Store chart’s birth info globally for Events module
        window.currentChart = {
            birth_date: date,
            birth_time: time
        };
        window.lastBirthDate = date;
        window.lastBirthTime = time;

        if (data.html) qs("tableWrap").innerHTML = data.html;
        else qs("tableWrap").innerHTML = buildPlanetTable(rows);

        if (typeof renderChart === "function") renderChart(rows);

        const meta = data.meta || {
            year: null, month: null, day: null, hour: null, minute: null, second: null,
            lat: payload.lat, lon: payload.lon, tz: payload.tz
        };
        if (!meta.year && payload.date && payload.time) {
            const dt = new Date(payload.date + "T" + payload.time);
            meta.year = dt.getFullYear();
            meta.month = dt.getMonth() + 1;
            meta.day = dt.getDate();
            meta.hour = dt.getHours();
            meta.minute = dt.getMinutes();
            meta.second = parseInt(payload.seconds || dt.getSeconds(), 10);
            meta.lat = payload.lat; meta.lon = payload.lon; meta.tz = payload.tz;
        }
        if (typeof loadPanchangam === "function") {
            loadPanchangam({ ...meta, lat: payload.lat, lon: payload.lon, tz: payload.tz });
        }
        // --- Vimshottari Dasha Tree ---
        if (typeof loadAndRenderVimshottariCompact === "function") {
            loadAndRenderVimshottariCompact({
                year: meta.year,
                month: meta.month,
                day: meta.day,
                hour: meta.hour,
                minute: meta.minute,
                second: meta.second,
                lat: meta.lat,
                lon: meta.lon,
                tz: meta.tz

            });
        }
        // 🌟 Auto-load events ONLY for saved charts
        if (window.lastChartId && window.loadEvents) {
            loadEvents();
        }



    } catch (err) {
        console.error("generateChart fetch error:", err);
    }
}

function buildPlanetTable(rows) {
    if (!rows || rows.length === 0) return "<p>தகவல் கிடைக்கவில்லை</p>";
    let html = `<table id="planet-table"><tr><th>கிரகம்</th><th>ராசி</th><th>டிகிரி</th><th>நட்சத்திரம்</th></tr>`;
    rows.forEach(r => {
        html += `<tr>
            <td>${r.graha_ta || r.planet || ""}</td>
            <td>${r.rasi_ta || r.sign_ta || ""}</td>
            <td>${r.degree || r.dms || ""}</td>
            <td>${r.nakshatra_ta || r.nakshatra || ""}</td>
        </tr>`;
    });
    html += `</table>`;
    return html;
}

/* ==========================================================
   💾 Saved Charts Manager (search + edit + delete)
   ========================================================== */
let savedChartsCache = [];

async function loadSavedCache() {
    try {
        const res = await fetch("/list_charts");
        const j = await res.json();
        savedChartsCache = Array.isArray(j.charts) ? j.charts : [];
        console.log(`✅ Loaded charts: ${savedChartsCache.length}`);
        return savedChartsCache;
    } catch (err) {
        console.error("❌ list_charts error:", err);
        return [];
    }
}

function highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query})`, "gi");
    return text.replace(re, `<span style='background:yellow;'>$1</span>`);
}

function buildSavedTable(list, query = "") {
    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr>
        <th>ID</th>
        <th>பெயர்</th>
        <th>பாலினம்</th>
        <th>தேதி</th>
        <th>நேரம்</th>
        <th>இடம்</th>  <!-- ✅ NEW -->
        <th>வகை</th>
        <th>குறிப்பு</th>
        <th>செயல்</th>
        </tr></thead>

        <tbody id="savedTableBody">`;
    list.forEach(r => {
        const p = r.place_json || {};
        html += `
        <tr>
            <td>${r.id}</td>
            <td>${r.name || ""}</td>
            <td>${r.gender || "-"}</td>
            <td>${r.date || ""}</td>
            <td>${r.time || ""}</td>
            <td>${p.city || "-"}</td>   <!-- 🗺️ Place of Birth -->
            <td>${r.tag || "-"}</td>
            <td>${r.comment || "-"}</td>
            <td>
                <button onclick="loadSavedChart(${r.id})">📄 Load</button>
                <button onclick="editSavedChart(${r.id})">✏️ Edit</button>
                <button onclick="deleteSavedChart(${r.id})">🗑️ Delete</button>
            </td>
        </tr>
    `;
    });

    html += `</tbody></table>`;
    return html;
}





async function openSavedCharts() {
    const list = await loadSavedCache();
    let modal = document.getElementById("savedModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "savedModal";
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.background = "rgba(0,0,0,0.4)";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
        modal.style.zIndex = "9999";
        modal.innerHTML = `
            <div style="background:#fff;padding:16px;border-radius:8px;width:90%;max-width:900px;max-height:80vh;overflow:auto;">
                <h3>📁 சேமிக்கப்பட்ட ஜாதகங்கள்</h3>
                <input id="savedSearch" type="text" placeholder="🔍 பெயர் / ID / வகை / குறிப்பு / தேதி / நேரம் மூலம் தேடு..." style="width:100%;padding:8px;margin-bottom:8px;">
                <div id="savedList"></div>
                <div style="text-align:right;margin-top:8px;"><button onclick="closeModal('savedModal')">Close</button></div>
            </div>`;
        document.body.appendChild(modal);
    }
    const div = modal.querySelector("#savedList");
    div.innerHTML = list.length ? buildSavedTable(list) : "<p>⚠️ சேமிக்கப்பட்ட ஜாதகங்கள் இல்லை.</p>";

    const searchInput = modal.querySelector("#savedSearch");
    searchInput.oninput = e => filterSavedSearch(e.target.value);
    modal.style.display = "flex";
}

function filterSavedSearch(raw) {
    const q = (raw || "").trim().toLowerCase();
    const tbody = document.getElementById("savedTableBody");
    if (!tbody) return;
    if (!q) {
        tbody.innerHTML = savedChartsCache.map(r => savedRowHtml(r)).join("");
        return;
    }
    const filtered = savedChartsCache.filter(r => JSON.stringify(r).toLowerCase().includes(q));
    tbody.innerHTML = filtered.map(r => savedRowHtml(r, q)).join("");
}

function savedRowHtml(r, query = "") {
    return `<tr>
        <td>${highlight(r.id.toString(), query)}</td>
        <td>${highlight(escapeHtml(r.name || ""), query)}</td>
        <td>${highlight(escapeHtml(r.gender || "-"), query)}</td>
        <td>${highlight(escapeHtml(r.date || ""), query)}</td>
        <td>${highlight(escapeHtml(r.time || ""), query)}</td>
        <td>${highlight(escapeHtml(r.tag || "-"), query)}</td>
        <td>${highlight(escapeHtml(r.comment || "-"), query)}</td>
        <td>
            <button onclick="loadSavedChart(${r.id})">📄 Load</button>
            <button onclick="(window.currentChartId=${r.id}, editSavedChart(${r.id}))">✏️ Edit</button>
            <button onclick="deleteSavedChart(${r.id})">🗑️ Delete</button>
        </td>

    </tr>`;
}

function escapeHtml(s) {
    return (s + "").replace(/[&<>"]'/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function saveChartEdits() {
    const chartData = collectChartData();
    chartData.id = window.currentChartId || chartData.id; // ✅ attach ID before saving
    console.log("💾 Saving chart (create/update) →", chartData);

    const res = await fetch("/update_chart_full", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chartData),
    });
}


async function deleteSavedChart(id) {
    if (!confirm(`Delete chart #${id}?`)) return;
    try {
        const res = await fetch(`/delete_chart/${id}`, { method: "POST" });
        const j = await res.json();
        if (j.status === "ok") {
            alert(`🗑️ Deleted chart #${id}`);
            openSavedCharts();
        } else alert(`❌ Delete failed: ${j.message}`);
    } catch (err) {
        console.error(err);
        alert("Delete failed (see console)");
    }
}
// ==========================================================
// 🧩 Close the "View Saved Charts" popup
// ==========================================================
function closeSavedCharts() {
    const modal = document.getElementById("savedChartsModal");
    if (modal) modal.style.display = "none";
}


function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = "none";
}
// ==========================================================
// 📄 Load a saved chart safely (Place, Gender, Tag all fixed)
// ==========================================================
async function loadSavedChart(id) {
    const res = await fetch(`/get_chart/${id}`);
    const j = await res.json();
    if (j.status !== "ok" || !j.chart) return;

    const c = j.chart;
    window.lastChartId = id;
    window.currentChartId = id;
    window.currentChart = { birth_date: c.date, birth_time: c.time };
    window.lastBirthDate = c.date;
    window.lastBirthTime = c.time;

    if (qs("name")) qs("name").value = c.name || "";
    if (qs("date")) qs("date").value = c.date || "";
    if (qs("time")) qs("time").value = c.time || "";

    // 🗺 Place
    const placeField = document.getElementById("placeSearch") || document.getElementById("place");
    if (placeField && c.place_json) {
        let p = c.place_json;
        if (typeof p === "string") {
            try { p = JSON.parse(p); } catch { p = {}; }
        }
        placeField.value = p.city || "";
        placeField.dataset.lat = p.lat || "";
        placeField.dataset.lon = p.lon || "";
        placeField.dataset.tz = p.tz || "";
    }

    // 🧑 Gender
    if (qs("gender")) qs("gender").value = c.gender || "";

    // 🏷 Tag
    if (qs("tag")) qs("tag").value = c.tag || "";

    // 💬 Comment
    if (qs("comment")) qs("comment").value = c.comment || "";

    // ⚙️ Regenerate chart view
    const keepId = id;
    await generateChart();
    window.currentChartId = keepId;
    if (window.loadEvents) loadEvents();
    closeModal("savedModal");
}




// ==========================================================
// 🧠 Name Auto-Suggest + Auto-Load Full Chart (ALL fields)
// ==========================================================
async function loadNameAutoSuggest() {
    try {
        const res = await fetch("/list_charts");
        const j = await res.json();
        const charts = Array.isArray(j.charts) ? j.charts : Array.isArray(j) ? j : [];

        // cache all chart details so we can load everything later
        window.nameChartCache = charts;

        // build datalist of unique names
        const names = [...new Set(charts.map(c => c.name).filter(Boolean))];
        const dataList = document.getElementById("nameList");
        if (!dataList) return;
        dataList.innerHTML = "";
        names.forEach(n => {
            const opt = document.createElement("option");
            opt.value = n;
            dataList.appendChild(opt);
        });

        console.log(`✅ Loaded ${names.length} name suggestions`);
    } catch (err) {
        console.error("❌ loadNameAutoSuggest error:", err);
    }
}

// 🔄 Load suggestions once on startup
document.addEventListener("DOMContentLoaded", () => {
    loadNameAutoSuggest();
});

// 🧩 When user selects or types a known name → load everything
document.getElementById("name")?.addEventListener("change", async (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (!val || !window.nameChartCache) return;

    // find the chart by name (case-insensitive)
    const match = window.nameChartCache.find(
        c => (c.name || "").toLowerCase() === val
    );

    if (match && match.id) {
        console.log(`📄 Auto-loading full chart: ${match.name} (#${match.id})`);
        await loadSavedChart(match.id);   // ✅ fills ALL fields + regenerates chart
    } else {
        console.log("⚠️ No matching chart found for", val);
    }
});

// ==========================================================
// 🧠 Debounced Auto-Refresh — prevents flicker when typing
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    const debouncedGenerate = debounce(generateChart, 600); // ⏱ wait 0.6 s

    const ay = qs("ayanamsa");
    if (ay) ay.addEventListener("change", debouncedGenerate);

    const place = qs("place");
    if (place) place.addEventListener("input", debouncedGenerate);

    const date = qs("date");
    if (date) date.addEventListener("input", debouncedGenerate);

    const time = qs("time");
    if (time) time.addEventListener("input", debouncedGenerate);

    const sec = qs("seconds");
    if (sec) sec.addEventListener("input", debouncedGenerate);
});

// ===========================================================
// 🆕 NEW CHART BUTTON — AUTO GENERATE CHART + PANCHANGAM + DASHA
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("newChartBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        if (!confirm("புதிய ஜாதகம் உருவாக்கவா? (Existing chart will be cleared)")) return;

        // 🧹 Clear output sections
        ["chart", "tableWrap", "panchangamData", "dashaTreeWrap"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });

        // 🧾 Reset form fields
        ["name", "comment"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        // 🕒 Current date/time
        const now = new Date();
        const dateField = document.getElementById("date");
        const timeField = document.getElementById("time");
        const secField = document.getElementById("seconds");

        if (dateField) dateField.value = now.toISOString().slice(0, 10);
        if (timeField) timeField.value = now.toTimeString().slice(0, 5);
        if (secField) {
            let sec = Math.floor(now.getSeconds());
            if (sec >= 60) sec = 59;
            if (sec < 0) sec = 0;
            secField.value = String(sec).padStart(2, "0");
        }

        // 🧭 Reset dropdowns
        ["ayanamsa", "chartType", "gender", "tag"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.selectedIndex = 0;
        });

        // 🗺 Default location = Chennai
        const placeInput = document.getElementById("placeSearch") || document.getElementById("place");
        if (placeInput) {
            placeInput.value = "Chennai / சென்னை";
            placeInput.setAttribute("data-lat", "13.0827");
            placeInput.setAttribute("data-lon", "80.2707");
            placeInput.setAttribute("data-tz", "5.5");
        }

        // 🪔 Reset label
        const label = document.getElementById("center-label");
        if (label) label.textContent = "ராசி";

        // 🧘 Clear globals
        window.lastChartData = null;
        window.currentChart = null;
        window.lastChartId = null;

        // ✅ Scroll to top before generation
        window.scrollTo({ top: 0, behavior: "smooth" });

        // 🪄 Auto-generate chart + Panchangam + Dasha
        try {
            if (typeof generateChart === "function") {
                console.log("🪔 Generating new chart automatically …");
                await generateChart();     // <-- your existing generator handles everything
            } else {
                console.warn("generateChart() not found; please click Generate manually.");
            }
        } catch (err) {
            console.error("⚠️ Auto-generate failed:", err);
            alert("Chart generation failed. Please click Generate manually.");
        }
    });
});
// ==========================================================
// 🧩 Collect chart data from form fields for save/update
// ==========================================================
function collectChartData() {
    const data = {
        id: window.currentChartId || null,
        name: document.getElementById("name")?.value || "",
        date: document.getElementById("date")?.value || "",
        time: document.getElementById("time")?.value || "",
        seconds: document.getElementById("seconds")?.value || "",
        place_json: {
            city: document.getElementById("place")?.value || "",
            lat: document.getElementById("place")?.dataset.lat || "13.0827",
            lon: document.getElementById("place")?.dataset.lon || "80.2707",
            tz: document.getElementById("place")?.dataset.tz || "5.5",
        },
        ayanamsa: document.getElementById("ayanamsa")?.value || "lahiri",
        chartType: document.getElementById("chartType")?.value || "rasi",
        gender: document.getElementById("gender")?.value || "",
        tag: document.getElementById("tag")?.value || "",
        comment: document.getElementById("comment")?.value || "",
        data_json: window.lastChartData || {},
    };
    return data;
}



// ==========================================================
// 💾 Unified SAVE — works for both new and existing charts
// ==========================================================
async function saveChart() {
    try {
        const get = id => document.getElementById(id)?.value?.trim() || "";
        const getData = id => document.getElementById(id)?.dataset || {};

        const chartData = {
            id: window.currentChartId || null,
            name: get("name"),
            date: get("date"),
            time: get("time"),
            seconds: get("seconds"),
            ayanamsa: get("ayanamsa"),
            chartType: get("chartType"),
            gender: get("gender"),
            tag: get("tag"),
            comment: get("comment"),
            place_json: {
                city: get("placeSearch") || get("place"),
                lat: getData("placeSearch").lat || getData("place").lat || "13.0827",
                lon: getData("placeSearch").lon || getData("place").lon || "80.2707",
                tz: getData("placeSearch").tz || getData("place").tz || "5.5",
            },
            data_json: window.lastChartData?.data_json || {}
        };

        console.log("💾 Saving chart →", chartData);

        // ✅ use the correct backend route
        const res = await fetch("/update_chart_full", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chartData)
        });

        const j = await res.json();
        if (j.status === "ok") {
            alert("✅ Chart saved/updated successfully!");
            //if (typeof openSavedCharts === "function") openSavedCharts();
        } else {
            alert("❌ Save failed: " + (j.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Unexpected saveChart error:", err);
        alert("⚠️ Save failed — check console for details.");
    }
}



// 🔗 Attach to existing Save button
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("saveChartBtn");
    if (saveBtn) saveBtn.onclick = saveChartEdits;
});



document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "chartType") {
        if (typeof window.generateChart === "function") {
            window.generateChart();
        }
    }
});







