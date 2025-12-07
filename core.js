/* static/js/core.js — Final Fixed Version */

function qs(id) { return document.getElementById(id); }

// ✅ FIXED: Debounce now uses a standard function to preserve 'this'
function debounce(fn, delay = 500) {
    let timer;
    return function(...args) {
        const context = this;
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(context, args), delay);
    };
}

// Helper: Planet Name to Tamil
function toTamilPlanet(name) {
    const map = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது" };
    return map[name] || name;
}

// ==========================================================
// 1. ✅ PLACE SEARCH (Fixed Typing Crash)
// ==========================================================
function setupPlaceSearch() {
    const input = document.getElementById("place") || document.getElementById("placeSearch");
    
    // Auto-create datalist if missing
    let datalist = document.getElementById("placesList");
    if (!datalist && input) {
        datalist = document.createElement("datalist");
        datalist.id = "placesList";
        document.body.appendChild(datalist);
        input.setAttribute("list", "placesList");
    }

    if (!input) return;

    // Search as you type
    input.addEventListener("input", debounce(async function() {
        // ✅ FIXED: Use 'input.value' directly to be 100% safe
        const val = input.value.trim();
        if (val.length < 2) return;
        
        try {
            const res = await fetch(`/search_places?q=${encodeURIComponent(val)}`);
            const cities = await res.json();

            datalist.innerHTML = ""; 
            cities.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.label; 
                opt.setAttribute("data-lat", c.lat);
                opt.setAttribute("data-lon", c.lon);
                opt.setAttribute("data-tz", c.tz);
                datalist.appendChild(opt);
            });
        } catch (e) { console.error("Search error:", e); }
    }, 300));

    // Save coordinates when selected
    input.addEventListener("change", function() {
        const val = this.value;
        const opts = datalist.options;
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === val) {
                this.dataset.lat = opts[i].getAttribute("data-lat");
                this.dataset.lon = opts[i].getAttribute("data-lon");
                this.dataset.tz = opts[i].getAttribute("data-tz");
                if(typeof generateChart === 'function') generateChart();
                break;
            }
        }
    });
}

// ✅ Robust Metadata Lookup
function getSelectedPlaceMeta() {
    const placeInput = qs("place") || qs("placeSearch");
    if (!placeInput) return {};
    
    if (placeInput.dataset.lat) {
        return {
            lat: parseFloat(placeInput.dataset.lat),
            lon: parseFloat(placeInput.dataset.lon),
            tz: parseFloat(placeInput.dataset.tz)
        };
    }
    const val = placeInput.value;
    const datalist = document.getElementById("placesList");
    if (datalist) {
        const opts = datalist.querySelectorAll("option");
        for (let opt of opts) {
            if (opt.value === val) {
                return {
                    lat: parseFloat(opt.getAttribute("data-lat")),
                    lon: parseFloat(opt.getAttribute("data-lon")),
                    tz: parseFloat(opt.getAttribute("data-tz"))
                };
            }
        }
    }
    return { lat: 13.0827, lon: 80.2707, tz: 5.5 };
}

/* ==========================================================
   2. 🪐 TRANSIT POPUP (Fixed: Bigger Fonts, Bold Degrees, Full 5-Level Chain)
   ========================================================== */
window.showTimelineTransit = async function (date, time) {
    if (!date) return alert("Invalid date");

    // --- Helper: Short Tamil Names ---
    const getShortName = (name) => {
        if (!name) return "";
        const n = name.toLowerCase();
        if (n.includes("sun") || n.includes("surya") || n.includes("சூரி")) return "சூரி";
        if (n.includes("moon") || n.includes("chan") || n.includes("சந்") || n.includes("மதி")) return "சந்";
        if (n.includes("mars") || n.includes("chev") || n.includes("sev") || n.includes("செவ்")) return "செவ்";
        if (n.includes("mercury") || n.includes("bud") || n.includes("புத")) return "புத";
        if (n.includes("jupiter") || n.includes("guru") || n.includes("குரு")) return "குரு";
        if (n.includes("venus") || n.includes("suk") || n.includes("சுக்") || n.includes("சுக்க")) return "சுக்";
        if (n.includes("saturn") || n.includes("sani") || n.includes("சனி")) return "சனி";
        if (n.includes("rahu") || n.includes("ragu") || n.includes("ராகு")) return "ராகு";
        if (n.includes("ketu") || n.includes("kethu") || n.includes("கேது")) return "கேது";
        return name.slice(0, 3);
    };

    // --- Helper: Calculate Full Vimshottari Chain (5 Levels) ---
    const calculateChain = (moonDeg, rasiIndex) => {
        const lords = ["கேது", "சுக்கிரன்", "சூரியன்", "சந்திரன்", "செவ்வாய்", "ராகு", "குரு", "சனி", "புதன்"];
        const years = [7, 20, 6, 10, 7, 18, 16, 19, 17]; // Total 120
        
        // 1 Nakshatra = 13.3333333333 degrees
        const nakSpan = 13.3333333333;
        const totalDeg = (rasiIndex * 30) + moonDeg;
        const nakIndex = Math.floor(totalDeg / nakSpan);
        const degInNak = totalDeg % nakSpan;
        
        // Fraction passed (0.0 to 1.0)
        let fraction = degInNak / nakSpan;
        
        // Starting Lord Index (Dasa Lord)
        let currentLordIdx = nakIndex % 9;
        
        const chain = [];
        
        // Calculate 5 Levels (Dasa, Bhukti, Antara, Sookshma, Prana)
        for (let level = 0; level < 5; level++) {
            chain.push(getShortName(lords[currentLordIdx]));
            
            let subFraction = fraction;
            let foundSub = false;
            let cumulative = 0;
            
            // Sub-cycle iteration
            for (let i = 0; i < 9; i++) {
                const idx = (currentLordIdx + i) % 9;
                const weight = years[idx] / 120.0;
                
                if (subFraction < (cumulative + weight)) {
                    fraction = (subFraction - cumulative) / weight;
                    currentLordIdx = idx;
                    foundSub = true;
                    break;
                }
                cumulative += weight;
            }
            if (!foundSub) currentLordIdx = (currentLordIdx + 8) % 9; 
        }
        return chain.join(" - ");
    };

    let win = document.getElementById("timelineTransitBox");
    if (!win) {
        win = document.createElement("div");
        win.id = "timelineTransitBox";
        win.style = `position:fixed;left:50px;top:100px;width:420px;background:#fff;border:2px solid #333;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:10005;display:flex;flex-direction:column;`;
        win.innerHTML = `
            <div id="transitHeader" style="background:#fdf4d0;padding:5px;cursor:move;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;font-weight:bold;">
                <span id="transitTitle">Transit Chart</span>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="border:none;background:none;cursor:pointer;font-size:16px;color:red;">Close(✕)</button>
            </div>
            <div id="transitContent" style="padding:10px;">Loading...</div>
            <div id="transitDasha" style="padding:8px;background:#ffebee;border-top:1px solid #ffcdd2;text-align:center;font-weight:bold;color:#b71c1c;font-size:14px;"></div>`;
        document.body.appendChild(win);
        
        let isDown=false, offset=[0,0];
        const head = win.querySelector("#transitHeader");
        head.addEventListener('mousedown', (e) => { isDown=true; offset=[win.offsetLeft-e.clientX, win.offsetTop-e.clientY]; });
        document.addEventListener('mouseup', () => isDown=false);
        document.addEventListener('mousemove', (e) => { if(isDown) { win.style.left=(e.clientX+offset[0])+'px'; win.style.top=(e.clientY+offset[1])+'px'; }});
    }
    
    win.style.display = "flex";
    win.querySelector("#transitTitle").innerText = `Transit: ${date} ${time}`;
    
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const payload = { year, month, day, hour, minute, second:0, lat:13.0827, lon:80.2707, tz:5.5, ayanamsa:"lahiri", chartType:"rasi" };

    try {
        const res = await fetch("/generate_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await res.json();
        
        if (j.status === "ok") {
            const grid = {}; 
            ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"].forEach(r => grid[r] = []);

            j.rows.forEach(r => { 
                if(r.rasi) {
                    let degStr = "";
                    if (r.dms) {
                        degStr = r.dms.split(":").slice(0,2).join("°");
                    } else if (typeof r.degree === 'number') {
                        const d = Math.floor(r.degree);
                        const m = Math.floor((r.degree - d) * 60);
                        degStr = `${d}°${m}`;
                    }
                    console.log("TRANSIT ROW:", r);

                                        // --- DO NOT detect retro manually for transit ---
                    // Transit API already gives correct label including retro bracket

                    // FINAL NAME directly from API
                    let pName = r.grid_label || r.graha_ta || r.short || r.name || r.planet || "";



                    // Final HTML output
                    const html = `
                    <div style="text-align:center; margin:3px;">
                        <div style="font-size:14px;font-weight:bold;line-height:1;color:#000;">${pName}</div>
                        <div style="font-size:11px;font-weight:bold;color:#333;margin-top:1px;">${degStr}</div>
                    </div>`;

                    grid[r.rasi].push(html); 
                }
            });
            
            const order = ["மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்", "கும்பம்", null, null, "கடகம்", "மகரம்", null, null, "சிம்மம்", "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"];
            
            let html = `<div style="position:relative; width:100%;">`;
            html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;border:1px solid #000;">`;
            
            order.forEach(r => {
                if (r) {
                    html += `
                    <div style="
                        border:1px solid #ccc;
                        aspect-ratio:1;
                        padding:2px;
                        font-size:11px;
                        background:#fff8e1;
                        display:flex;
                        flex-wrap:wrap;
                        align-content:center;
                        justify-content:center;
                        gap:6px;">
                        ${grid[r].join("")}
                    </div>`;
                } else {
                    html += `<div></div>`; 
                }
            });
            html += `</div>`;
            
            // Center Box
            html += `<div id="transitCenterBox" style="
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 48%; height: 48%;
                display: flex; 
                flex-direction: column;
                justify-content: center; 
                align-items: center; 
                text-align: center;
                pointer-events: none;
                z-index: 50; 
                background: rgba(255,255,255,0.92);
                border-radius: 4px;
            "></div>`;
            html += `</div>`;

            win.querySelector("#transitContent").innerHTML = html;

            // 2. MOON LOGIC (Find & Calculate 5-Level Chain)
            const tMoon = j.rows.find(r => {
                const p = (r.planet || "").toLowerCase();
                const n = (r.name || "").toLowerCase();
                const t = (r.graha_ta || "").toLowerCase();
                const s = (r.short || "").toLowerCase();
                if (p.includes("saturn") || n.includes("saturn") || t === "சனி" || s === "சனி") return false;
                return p.includes("moon") || n.includes("moon") || t.startsWith("சந்") || t.includes("மதி") || s.startsWith("சந்");
            });
            
            const centerBox = document.getElementById("transitCenterBox");
            if(centerBox) {
                if (tMoon) {
                    let nak = tMoon.nakshatra || tMoon.nakshatra_ta;
                    
                    const rasiMap = { "aries":0, "மேஷம்":0, "taurus":1, "ரிஷபம்":1, "gemini":2, "மிதுனம்":2, "cancer":3, "கடகம்":3, "leo":4, "சிம்மம்":4, "virgo":5, "கன்னி":5, "libra":6, "துலாம்":6, "scorpio":7, "விருச்சிகம்":7, "sagittarius":8, "தனுசு":8, "capricorn":9, "மகரம்":9, "aquarius":10, "கும்பம்":10, "pisces":11, "மீனம்":11 };
                    
                    let degVal = tMoon.degree;
                    if (typeof degVal !== 'number' && tMoon.dms) {
                        const parts = tMoon.dms.split(":");
                        if(parts.length >= 2) degVal = parseInt(parts[0]) + (parseInt(parts[1])/60);
                    }
                    const rasiName = (tMoon.rasi || tMoon.sign || "").toLowerCase();
                    const rasiIdx = rasiMap[rasiName];

                    let fullChain = "";

                    if (rasiIdx !== undefined && typeof degVal === 'number') {
                        fullChain = calculateChain(degVal, rasiIdx);
                        if (!nak) {
                             const totalDeg = (rasiIdx * 30) + degVal;
                             const nakIndex = Math.floor(totalDeg / 13.33333333);
                             const nakNames = ["அசுவினி","பரணி","கிருத்திகை","ரோகிணி","மிருகசீரிஷம்","திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்","பூரம்","உத்திரம்","ஹஸ்தம்","சித்திரை","சுவாதி","விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்","உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்","பூரட்டாதி","உத்திரட்டாதி","ரேவதி"];
                             nak = nakNames[nakIndex] || "Unknown";
                        }
                    }

                    centerBox.innerHTML = `
                        <div style="font-size:19px; font-weight:bold; margin-bottom:4px;">சந்-நட்</div>
                        <div style="font-size:14px; font-weight:bold; color:#000;">${nak || "Unknown"}</div>
                        <div style="font-size:13px; font-weight:bold; color:#b71c1c; margin-top:3px; line-height:1.4;">
                             ${fullChain || "Chain Error"}
                        </div>
                    `;
                } else {
                    centerBox.innerHTML = `<div style="color:red;font-size:12px;">Moon Data<br>Not Found</div>`;
                }
            }
        }
        
        // 3. Native's Dasa (Bottom Bar)
        const chartId = window.currentChartId || 0;
        if(chartId) {
            const dRes = await fetch(`/get_dasha_chain/${chartId}?date=${encodeURIComponent(date+'T'+time)}`);
            const dData = await dRes.json();
            if(dData.status === "ok" && dData.active_dasha_chain) {
                 const chain = dData.active_dasha_chain.map(x => getShortName(toTamilPlanet(x.planet))).join(" - ");
                 win.querySelector("#transitDasha").innerHTML = `🪔 ஜாதக தசா: ${chain}`;
            }
        }
    } catch(e) { console.error("Transit Popup Error:", e); }
};


/* ==========================================================
   🌞 GENERATE CHART
   ========================================================== */
async function generateChart() {
    try {
        const name = qs("name")?.value || "";
        const date = qs("date")?.value;
        const time = qs("time")?.value;
        const seconds = qs("seconds")?.value || 0;
        const placeInput = qs("place") || qs("placeSearch");
        const place = placeInput?.value || "";
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
        
        const centerLabel = document.getElementById("center-label");
        if (chartType !== "bhava" && chartType !== "kp" && centerLabel) {
            const labels = { "rasi": "ராசி", "d9": "நவம்சம் (D9)", "d10": "தசம்சம் (D10)", "d7": "ஸப்தம்சம் (D7)" };
            centerLabel.textContent = labels[chartType] || "Chart";
            centerLabel.style.opacity = "1";
        }

        if (chartType === "bhava") {
            const res = await fetch("/bhava_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.status === "ok" && window.renderBhavaChart) {
                window.renderBhavaChart(data);
                window.lastChartData = data;
            }
            return; 
        }
        
        if (chartType === "kp") return;

        const res = await fetch("/generate_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { return; }

        if (!data || data.status !== "ok" || !data.rows) return;

        const rows = data.rows;
        window.lastChartData = data;
        window.currentChart = { birth_date: date, birth_time: time };

        if (data.html) qs("tableWrap").innerHTML = data.html;
        else qs("tableWrap").innerHTML = buildPlanetTable(rows);

        if (typeof renderChart === "function") renderChart(rows);

        const meta = data.meta || { lat: payload.lat, lon: payload.lon, tz: payload.tz };
        if (payload.date && payload.time) {
            const dt = new Date(payload.date + "T" + payload.time);
            meta.year = dt.getFullYear();
            meta.month = dt.getMonth() + 1;
            meta.day = dt.getDate();
            meta.hour = dt.getHours();
            meta.minute = dt.getMinutes();
            meta.second = parseInt(payload.seconds || dt.getSeconds(), 10);
        }

        if (typeof loadPanchangam === "function") loadPanchangam({ ...meta, lat: payload.lat, lon: payload.lon, tz: payload.tz });
        
        if (typeof loadAndRenderVimshottariCompact === "function") {
            if(window.currentChartId) meta.chart_id = window.currentChartId;
            loadAndRenderVimshottariCompact(meta);
        }
        
        if (window.lastChartId && window.loadEvents) {
            loadEvents();
        }

    } catch (err) { console.error("generateChart fetch error:", err); }
}

function buildPlanetTable(rows) {
    let html = `<table id="planet-table"><tr><th>கிரகம்</th><th>ராசி</th><th>டிகிரி</th><th>நட்சத்திரம்</th></tr>`;
    rows.forEach(r => {
        html += `<tr><td>${r.graha_ta||r.planet}</td><td>${r.rasi_ta||r.sign}</td><td>${r.degree||r.dms}</td><td>${r.nakshatra_ta||r.nakshatra}</td></tr>`;
    });
    return html + `</table>`;
}

/* ==========================================================
   💾 Saved Charts Manager
   ========================================================== */
let savedChartsCache = [];

async function loadSavedCache() {
    try { const res = await fetch("/list_charts"); return (await res.json()).charts || []; } catch { return []; }
}

function highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query})`, "gi");
    return text.replace(re, `<span style='background:yellow;'>$1</span>`);
}

// ✅ FIXED: Added 'Note' Column Header to match Rows
function buildSavedTable(list, query = "") {
    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr>
        <th>ID</th><th>Name</th><th>Gender</th><th>Date</th><th>Time</th><th>Place</th><th>Tag</th><th>Note</th><th>Action</th>
        </tr></thead><tbody id="savedTableBody">`;
    list.forEach(r => {
        const p = r.place_json || {};
        html += `<tr>
            <td>${r.id}</td><td>${r.name||""}</td><td>${r.gender||"-"}</td><td>${r.date||""}</td><td>${r.time||""}</td><td>${p.city||"-"}</td><td>${r.tag||"-"}</td><td>${r.comment||"-"}</td>
            <td>
                <button onclick="loadSavedChart(${r.id})">📄 Load</button>
                <button onclick="(window.currentChartId=${r.id}, editSavedChart(${r.id}))">✏️ Edit</button>
                <button onclick="deleteSavedChart(${r.id})">🗑️ Delete</button>
            </td>
        </tr>`;
    });
    return html + `</tbody></table>`;
}

async function openSavedCharts() {
    const list = await loadSavedCache();
     savedChartsCache = list;
    let modal = document.getElementById("savedModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "savedModal";
        modal.style = "position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;justify-content:center;align-items:center;z-index:9999;";
        modal.innerHTML = `<div style="background:#fff;padding:20px;width:80%;max-height:80vh;overflow:auto;border-radius:8px;"><h3>📁 Saved Charts</h3><input id="savedSearch" type="text" placeholder="🔍 Search..." style="width:100%;padding:8px;"><div id="savedList"></div><div style="text-align:right;"><button onclick="document.getElementById('savedModal').style.display='none'">Close</button></div></div>`;
        document.body.appendChild(modal);
    }
    const div = modal.querySelector("#savedList");
    div.innerHTML = list.length ? buildSavedTable(list) : "<p>No charts.</p>";
    const searchInput = modal.querySelector("#savedSearch");
    searchInput.oninput = e => filterSavedSearch(e.target.value);
    modal.style.display = "flex";
}

function filterSavedSearch(raw) {
    const q = (raw || "").trim().toLowerCase();
    const tbody = document.getElementById("savedTableBody");
    if (!tbody) return;
    if (!q) { tbody.innerHTML = savedChartsCache.map(r => savedRowHtml(r)).join(""); return; }
    const filtered = savedChartsCache.filter(r => JSON.stringify(r).toLowerCase().includes(q));
    tbody.innerHTML = filtered.map(r => savedRowHtml(r, q)).join("");
}

function savedRowHtml(r, query = "") {
    const p = r.place_json || {};
    // Note: This row has 9 columns. The header in buildSavedTable MUST also have 9 columns.
    return `<tr><td>${highlight(r.id.toString(), query)}</td><td>${highlight(r.name||"", query)}</td><td>${highlight(r.gender||"-", query)}</td><td>${highlight(r.date||"", query)}</td><td>${highlight(r.time||"", query)}</td><td>${highlight(p.city||"-", query)}</td><td>${highlight(r.tag||"-", query)}</td><td>${highlight(r.comment||"-", query)}</td><td><button onclick="loadSavedChart(${r.id})">📄 Load</button><button onclick="(window.currentChartId=${r.id}, editSavedChart(${r.id}))">✏️ Edit</button><button onclick="deleteSavedChart(${r.id})">🗑️ Delete</button></td></tr>`;
}

async function saveChartEdits() {
    const chartData = collectChartData();
    chartData.id = window.currentChartId || chartData.id;
    const res = await fetch("/update_chart_full", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chartData) });
    const j = await res.json();
    alert(j.status === "ok" ? "✅ Saved!" : "❌ Error: " + j.message);
}

async function deleteSavedChart(id) {
    if (!confirm(`Delete chart #${id}?`)) return;
    await fetch(`/delete_chart/${id}`, { method: "POST" });
    openSavedCharts();
}

function closeModal(id) { document.getElementById(id).style.display = "none"; }

async function loadSavedChart(id) {
    const res = await fetch(`/get_chart/${id}`);
    const j = await res.json();
    if (j.status !== "ok" || !j.chart) return;

    const c = j.chart;
    window.lastChartId = id;
    window.currentChartId = id;

    if (qs("name")) qs("name").value = c.name || "";
    if (qs("date")) qs("date").value = c.date || "";
    if (qs("time")) qs("time").value = c.time || "";
    if (qs("gender")) qs("gender").value = c.gender || "";
    if (qs("tag")) qs("tag").value = c.tag || "";
    if (qs("comment")) qs("comment").value = c.comment || "";

    const pInput = qs("place") || qs("placeSearch");
    if (pInput && c.place_json) {
        let p = typeof c.place_json === "string" ? JSON.parse(c.place_json) : c.place_json;
        pInput.value = p.city || "";
        pInput.dataset.lat = p.lat; pInput.dataset.lon = p.lon; pInput.dataset.tz = p.tz;
    }

    await generateChart();
    closeModal("savedModal");
}

async function loadNameAutoSuggest() {
    try {
        const res = await fetch("/list_charts");
        const j = await res.json();
        const charts = Array.isArray(j.charts) ? j.charts : [];
        window.nameChartCache = charts;
        const names = [...new Set(charts.map(c => c.name).filter(Boolean))];
        const dataList = document.getElementById("nameList");
        if (dataList) {
            dataList.innerHTML = "";
            names.forEach(n => {
                const opt = document.createElement("option");
                opt.value = n;
                dataList.appendChild(opt);
            });
        }
    } catch (err) {}
}

document.getElementById("name")?.addEventListener("change", async (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (!val || !window.nameChartCache) return;
    const match = window.nameChartCache.find(c => (c.name || "").toLowerCase() === val);
    if (match) loadSavedChart(match.id);
});

function collectChartData() {
    const pInput = qs("place") || qs("placeSearch");
    return {
        id: window.currentChartId || null,
        name: qs("name")?.value,
        date: qs("date")?.value,
        time: qs("time")?.value,
        place_json: {
            city: pInput?.value,
            lat: pInput?.dataset.lat || "13.0827",
            lon: pInput?.dataset.lon || "80.2707",
            tz: pInput?.dataset.tz || "5.5",
        },
        ayanamsa: qs("ayanamsa")?.value,
        chartType: qs("chartType")?.value,
        gender: qs("gender")?.value,
        tag: qs("tag")?.value,
        comment: qs("comment")?.value,
        data_json: window.lastChartData || {},
    };
}

async function saveChart() { saveChartEdits(); }
function editSavedChart(id) { loadSavedChart(id); }

// --- Initialize ---
document.addEventListener("DOMContentLoaded", () => {
    setupPlaceSearch(); 
    loadNameAutoSuggest(); 

    const now = new Date();
    if(qs("date")) qs("date").value = now.toISOString().slice(0, 10);
    if(qs("time")) qs("time").value = now.toTimeString().slice(0, 5);
    
    const pInput = qs("place") || qs("placeSearch");
    if(pInput && !pInput.value) {
        pInput.value = "Chennai / சென்னை";
        pInput.dataset.lat = "13.0827"; pInput.dataset.lon = "80.2707"; pInput.dataset.tz = "5.5";
    }
    
    const debouncedGenerate = debounce(generateChart, 600);
    ["date", "time", "seconds", "ayanamsa", "place", "placeSearch"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.type === "text" ? "input" : "change", debouncedGenerate);
    });

    const saveBtn = document.getElementById("saveChartBtn");
    if (saveBtn) saveBtn.onclick = saveChartEdits;

    const newBtn = document.getElementById("newChartBtn");
    if (newBtn) {
        newBtn.onclick = async () => {
            if (!confirm("Clear chart?")) return;
            ["name", "comment"].forEach(id => { if(qs(id)) qs(id).value = ""; });
            window.location.reload();
        };
    }
    
    document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "chartType") {
            if (typeof window.generateChart === "function") window.generateChart();
        }
    });

    generateChart();
});