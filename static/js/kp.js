/* static/js/kp.js — Final: Windows Taskbar Minimize + Dasa Tree + Retro Sync
   MERGED: Adds Transit-based Ruling Planets update (no UI changes)
   FIX: Fixed place handling — option B: follow placeSearch live, but lock only when user types.
*/

(function() {
    
    // --- 1. DASA STATE ---
    var kpDasaState = { stack: [], rootData: [], tz: 5.5 };

    // --- KP place lock globals (Option B: follow edits; lock only on user typing) ---
    window.FIXED_KP_PLACE = null;
    window.KP_USER_SET_PLACE = false;

  // Robust injector that finds the purple toolbar by button text and inserts KP System
function injectKPButtonRobust() {
    const KP_ID = "btnOpenKP";

    // if already present do nothing
    if (document.getElementById(KP_ID)) return;

    // list of known toolbar button texts to look for
    const markers = ["Shadbala", "Arudha Padas", "Jaimini Karakas"];

    // helper: find an element whose visible text contains any marker
    function findMarkerElement() {
        // search possible button-like elements
        const candidates = Array.from(document.querySelectorAll("button, a, span, div"));
        for (const el of candidates) {
            if (!el.innerText) continue;
            const txt = el.innerText.trim();
            for (const m of markers) {
                if (txt.indexOf(m) !== -1) return el;
            }
        }
        return null;
    }

    // create KP button element styled like the purple ones
    function createKPBtn() {
        const btn = document.createElement("button");
        btn.id = KP_ID;
        btn.type = "button";
        btn.innerHTML = "📊 KP System";
        // styling — tweak if your site has different styles
        Object.assign(btn.style, {
            background: "#673AB7",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "6px",
            marginLeft: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap"
        });
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof loadKPChart === "function") {
                try { loadKPChart(); } catch (err) { console.warn("loadKPChart error", err); }
            } else if (document.getElementById("btnOpenKP")) {
                document.getElementById("btnOpenKP").click();
            } else {
                // fallback: find any element that looks like the purple KP and click
                const maybe = Array.from(document.querySelectorAll("button, a"))
                    .find(x => /kp|kp system/i.test(x.innerText || ""));
                if (maybe) maybe.click(); else alert("KP launcher not found");
            }
        };
        return btn;
    }

    // main attempt to insert
    function tryInsert() {
        if (document.getElementById(KP_ID)) return true;

        const markerEl = findMarkerElement();
        if (!markerEl) return false;

        // find the row container: prefer closest .btn-group, then closest parent with multiple buttons, then parentElement
        let container = markerEl.closest(".btn-group, .btn-toolbar, .vh-header, .vh-subnavbar, .toolbar, .vh-nav-buttons");
        if (!container) {
            // find nearest ancestor that contains >1 button-like child
            let el = markerEl;
            while (el && el !== document.body) {
                const btnLike = el.querySelectorAll("button, a, span");
                if (btnLike && btnLike.length >= 2) { container = el; break; }
                el = el.parentElement;
            }
        }
        if (!container) container = markerEl.parentElement || document.body;

        // ensure container uses flex so margin-left:auto works when appended
        if (getComputedStyle(container).display === "block") {
            container.style.display = container.style.display || "flex";
            container.style.alignItems = container.style.alignItems || "center";
        }

        // create and append button
        const btn = createKPBtn();
        container.appendChild(btn);

        // if container has many items, ensure btn floats to right: add margin-left:auto if last child
        // find last element before append; if there's room, set margin-left:auto on the button to push it to the right
        try {
            // if container already has other items, keep spacing; else use margin-left:auto to right-align
            const children = Array.from(container.children).filter(c => c !== btn && (c.offsetWidth > 0 || c.innerText));
            if (children.length > 0) {
                btn.style.marginLeft = "8px";
            } else {
                btn.style.marginLeft = "auto";
            }
        } catch (e) { /* ignore */ }

        return true;
    }

    // attempt immediately
    if (tryInsert()) return;

    // otherwise observe DOM for toolbar creation for up to 8 seconds
    const obs = new MutationObserver((mutations, observer) => {
        if (tryInsert()) {
            observer.disconnect();
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // safety timeout to disconnect observer
    setTimeout(() => obs.disconnect(), 8000);
}

// call it (or you can call from elsewhere)
injectKPButtonRobust();


    // --- 3. TOOLTIP ---
    var kpTooltip = document.getElementById("kpTooltip");
    if (!kpTooltip) {
        kpTooltip = document.createElement("div");
        kpTooltip.id = "kpTooltip";
        Object.assign(kpTooltip.style, {
            position: "fixed", display: "none", background: "rgba(0,0,0,0.95)", color: "#fff",
            padding: "6px 10px", borderRadius: "4px", fontSize: "12px", zIndex: "10000000",
            pointerEvents: "none", border: "1px solid #fff", whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
        });
        document.body.appendChild(kpTooltip);
    }

    // --- 4. AUTO-UPDATE HOOK ---
    var originalGenerate = window.generateChart;
    if (originalGenerate) {
        window.generateChart = async function(...args) {
            if (originalGenerate.constructor.name === "AsyncFunction") await originalGenerate.apply(this, args);
            else originalGenerate.apply(this, args);
            var container = document.getElementById("kpTableContainer");
            if (container && container.style.display !== "none" && container.dataset.isMin !== "true") {
                setTimeout(loadKPChart, 300);
            }
        };
    }

    // --- 5. HELPERS (Retrograde Sync & Format) ---
    function normalize(n) {
        var s = (n || "").toLowerCase().trim();
        if (s.includes("sun")||s.includes("sur")||s.includes("சூரி")) return "sun";
        if (s.includes("moon")||s.includes("chan")||s.includes("mat")||s.includes("சந்")) return "moon";
        if (s.includes("mar")||s.includes("chev")||s.includes("sev")||s.includes("செவ்")) return "mars";
        if (s.includes("mer")||s.includes("bud")||s.includes("புத")) return "mercury";
        if (s.includes("jup")||s.includes("gur")||s.includes("bri")||s.includes("குரு")) return "jupiter";
        if (s.includes("ven")||s.includes("suk")||s.includes("சுக்")) return "venus";
        if (s.includes("sat")||s.includes("san")||s.includes("சனி")) return "saturn";
        if (s.includes("rah")||s.includes("rag")||s.includes("ராகு")) return "rahu";
        if (s.includes("ket")||s.includes("keth")||s.includes("கேது")) return "ketu";
        return s; 
    }

    function checkRetro(p) {
        var pStd = normalize(p.name);
        if (pStd === "rahu" || pStd === "ketu") {
            if (p.speed !== undefined && parseFloat(p.speed) > 0) return false;
            return true;
        }
        if (window.lastChartData && window.lastChartData.rows) {
            var mainP = window.lastChartData.rows.find(function(r) {
                return normalize(r.planet || r.name) === pStd;
            });
            if (mainP) {
                if (mainP.is_retro === true || mainP.retro === true) return true;
                if (typeof mainP.speed === 'number' && mainP.speed < 0) return true;
                var lbl = mainP.graha_ta || mainP.planet || "";
                if (lbl.includes("(") && (lbl.includes("வ") || lbl.includes("R"))) return true;
            }
        }
        if (p.retro === true || String(p.retro) === "true") return true;
        if (typeof p.speed === 'number' && p.speed < 0) return true;
        return false;
    }

    function formatLon(val) {
        if (val == null) return "";
        var d=0, m=0;
        if (typeof val === 'number') { d=Math.floor(val%30); m=Math.floor(((val%30)-d)*60); }
        else if (typeof val === 'string') {
            var pts = val.match(/(\d+)[^0-9]+(\d+)/);
            if (pts) { d=parseInt(pts[1],10)%30; m=parseInt(pts[2],10); }
            else { var f=parseFloat(val); if(!isNaN(f)) { d=Math.floor(f%30); m=Math.floor(((f%30)-d)*60); } }
        }
        return d + "° " + (m<10?"0"+m:m) + "'";
    }

    // --- 6. LOAD DATA ---
    async function loadKPChart() {
        var d = document.getElementById("date")?.value;
        var t = document.getElementById("time")?.value;
        var FIX = getFixedKPPlace(); var lat = FIX.lat, lon = FIX.lon, tz = FIX.tz;

        var kpPayload = { date: d, time: t, lat: lat, lon: lon, tz: tz, ayanamsa: "kp" };
        var dt = new Date(d + "T" + t);
        var dasaPayload = {
            year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(),
            hour: dt.getHours(), minute: dt.getMinutes(),
            lat: lat, lon: lon, tz: tz, ayanamsa: document.getElementById("ayanamsa")?.value || "lahiri"
        };
        kpDasaState.tz = tz;

        try {
            var [kpRes, dasaRes] = await Promise.all([
                fetch("/kp_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kpPayload) }),
                fetch("/vimshottari_dasha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dasaPayload) })
            ]);
            var kpJson = await kpRes.json();
            var dasaJson = await dasaRes.json();

            if (kpJson.status === "ok") {
                kpDasaState.rootData = dasaJson.status === "ok" ? dasaJson.mahadashas : [];
                kpDasaState.stack = []; 
                renderFloatingTables(kpJson.data);
            } else {
                alert("KP Error: " + kpJson.message);
            }
        } catch (e) { console.error(e); }
    }

    // --- 7. RENDER MODAL (Modified for Min/Max) ---
    function renderFloatingTables(data) {
        var container = document.getElementById("kpTableContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "kpTableContainer";
            document.body.appendChild(container);
            var chart = document.getElementById("tableWrap") || document.getElementById("chart");
            var rect = chart ? chart.getBoundingClientRect() : { bottom: 100, left: 50 };
            Object.assign(container.style, {
                position: "absolute", top: (window.scrollY + rect.bottom - 50) + "px", left: (window.scrollX + rect.left - 50) + "px",
                width: "1350px", height: "780px", backgroundColor: "#fff", border: "2px solid #333",
                borderRadius: "8px", boxShadow: "0 10px 50px rgba(0,0,0,0.5)", zIndex: "9999",
                display: "flex", flexDirection: "column", resize: "both", overflow: "hidden", minWidth: "800px"
            });
        } else if (container.dataset.isMin !== "true") {
            container.style.display = "flex"; // Don't force flex if minimized
        }

            // Header with Buttons
        var header = `<div id="kpTableHeader" style="flex:0 0 auto; padding:10px; background:#222; color:#fff; cursor:move; display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
            <span>📊 KP System</span>
            <div style="display:flex; gap:15px;">
                <span id="kpMinBtn" title="Minimize" style="cursor:pointer; font-weight:bold; font-size:19px; line-height:1;">--</span>
                <span id="kpMaxBtn" title="Maximize" style="cursor:pointer; font-size:1px; line-height:1;">[]</span>
                <span id="kpCloseBtn" title="Close" style="cursor:pointer; color:#ff5252; font-size:16px; line-height:1;">✕</span>
            </div>
        </div>`;

        var rp = data.ruling_planets || {};

        // Main Content (Wrapped in #kpTableBody for toggling)
        var body = `<div id="kpTableBody" style="flex:1; display:flex; overflow:hidden;">
            
            <div style="flex:0 0 550px; padding:15px; border-right:2px solid #ddd; background:#f9f9f9; display:flex; flex-direction:column; align-items:center;">
                <div style="background:#444; color:#fff; padding:5px; text-align:center; font-weight:bold; margin-bottom:10px; width:100%;">KP Birth Chart</div>
                <div id="kpBirthGrid" style="width:100%; aspect-ratio:1; border:1px solid #000; background:#fff;"></div>
            </div>

            <div style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:15px;">
                
                <div style="display:flex; gap:15px; align-items:flex-start;">
                    <div id="kpMiniTransitWrap" style="flex:0 0 260px; border:1px solid #999; background:#fff;">
                        <div style="background:#607D8B; color:#fff; font-size:15px; padding:4px; text-align:center; font-weight:bold;">⏱️ KP Transit</div>
                        <div style="display:flex; justify-content:center; padding:5px;">
                            <div id="kpMiniTransitGrid" style="width:380px; aspect-ratio:1; border:1px solid #ccc;"></div>
                        </div>
                    </div>
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <div style="border:1px solid #ddd; background:#fff;">
                            <div style="background:#009688; color:white; padding:5px; font-weight:bold; font-size:11px;">👑 Ruling Planets</div>
                            <table id="kpRulingPlanetsTable" style="width:100%; font-size:11px; margin:0;">
                                <tr><td style="padding:3px;">Lagna</td><td id="rp_lagna_sign"><b>${getTamilName(rp.Lagna_Sign)}</b></td><td id="rp_lagna_star">${getTamilName(rp.Lagna_Star)}</td><td id="rp_lagna_sub"><b>${getTamilName(rp.Lagna_Sub)}</b></td></tr>
                                <tr><td style="padding:3px;">Moon</td><td id="rp_moon_sign"><b>${getTamilName(rp.Moon_Sign)}</b></td><td id="rp_moon_star">${getTamilName(rp.Moon_Star)}</td><td id="rp_moon_sub"><b>${getTamilName(rp.Moon_Sub)}</b></td></tr>
                                <tr><td style="padding:3px;">Day</td><td id="rp_daylord" colspan="3"><b>${getTamilName(rp.Day_Lord)}</b></td></tr>
                            </table>
                        </div>

                        <div id="kpDasaTree" style="border:1px solid #ddd; flex:1; overflow-y:auto; background:#fff; min-height:140px; display:flex; flex-direction:column;"></div>
                    </div>
                </div>

                <div style="display:flex; gap:15px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:300px;">
                        <div style="background:#673AB7; color:white; padding:6px; font-weight:bold;">🪐 Planets</div>
                        <table style="width:100%; font-size:12px; border-collapse:collapse; text-align:center; border:1px solid #ddd;">
                            <tr style="background:#eee;"><td>Planet</td><td>Star</td><td>Sub</td><td>Sig</td></tr>
                            ${data.planets.map(p => {
                                var isRetro = checkRetro(p);
                                return `<tr style="border-bottom:1px solid #eee;">
                                    <td style="font-weight:bold; color:${getPlanetColor(p.name)}">${isRetro ? "("+getTamilName(p.name)+")" : getTamilName(p.name)}</td>
                                    <td>${getTamilName(p.star)}</td><td style="color:#E91E63; font-weight:bold;">${getTamilName(p.sub)}</td>
                                    <td style="color:#1976D2;">${p.signifies||"-"}</td></tr>`;
                            }).join('')}
                        </table>
                    </div>
                    <div style="flex:1.2; min-width:350px;">
                        <div style="background:#FF9800; color:white; padding:6px; font-weight:bold;">🏠 Bhava Significators</div>
                        <table style="width:100%; font-size:12px; border-collapse:collapse; text-align:center; border:1px solid #ddd;">
                            <tr style="background:#eee;"><td>Bhava</td><td>L1</td><td>L2</td><td>L3</td><td>L4</td><td>Planets</td></tr>
                            ${data.significators.map(s => {
                                var all = [...new Set([...(s.L1||[]), ...(s.L2||[]), ...(s.L3||[]), ...(s.L4||[])])];
                                return `<tr style="border-bottom:1px solid #eee;">
                                    <td style="font-weight:bold; background:#fafafa;">${toRoman(s.house)}</td>
                                    <td style="color:#2E7D32;">${formatList(s.L1)}</td><td style="color:#D32F2F;">${formatList(s.L2)}</td>
                                    <td style="color:#1976D2;">${formatList(s.L3)}</td><td>${formatList(s.L4)}</td>
                                    <td style="background:#FFF3E0; font-weight:bold;">${formatList(all)}</td></tr>`;
                            }).join('')}
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

        container.innerHTML = header + body;

        // --- BUTTON LOGIC ---
        // Close
        document.getElementById("kpCloseBtn").onclick = function() { container.style.display = "none"; };

        // Minimize (Taskbar Style)
        document.getElementById("kpMinBtn").onclick = function() {
            var body = document.getElementById("kpTableBody");
            
            if (container.dataset.isMin === "true") {
                // Restore from Taskbar
                var s = JSON.parse(container.dataset.restoreState || "{}");
                Object.assign(container.style, s);
                body.style.display = "flex";
                container.dataset.isMin = "false";
                // Check if it was maximized
                if (container.dataset.isMax === "true") {
                    Object.assign(container.style, { top: "0", left: "0", width: "100%", height: "100%", borderRadius:"0" });
                }
            } else {
                // Minimize to Taskbar (Bottom Left)
                container.dataset.restoreState = JSON.stringify({
                    top: container.style.top, left: container.style.left,
                    width: container.style.width, height: container.style.height,
                    transform: container.style.transform
                });
                
                container.style.transition = "all 0.3s";
                container.style.top = "auto"; 
                container.style.bottom = "0";
                container.style.left = "0";
                container.style.width = "250px";
                container.style.height = "40px"; // Only Header Visible
                container.style.transform = "none";
                
                body.style.display = "none";
                container.dataset.isMin = "true";
                
                setTimeout(() => { container.style.transition = ""; }, 300);
            }
        };

        // Maximize
        document.getElementById("kpMaxBtn").onclick = function() {
            if (container.dataset.isMax === "true") {
                // Restore Normal
                var s = JSON.parse(container.dataset.rest || "{}");
                Object.assign(container.style, s);
                container.dataset.isMax = "false";
            } else {
                // Go Full Screen
                container.dataset.rest = JSON.stringify({
                    position: container.style.position, top: container.style.top, left: container.style.left,
                    width: container.style.width, height: container.style.height
                });
                Object.assign(container.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", borderRadius:"0" });
                container.dataset.isMax = "true";
            }
        };

        makeDraggable(container, document.getElementById("kpTableHeader"));
        renderGrid("kpBirthGrid", data, true); 
        loadMiniTransit("kpMiniTransitGrid");
        renderKPDasaView();

        // ---- NEW: update Ruling Planets from Transit (non-destructive, no UI changes) ----
        // This will attempt to fetch a transit kp_chart using current date/time/place and update the three table fields.
        updateTransitRulingPlanets(); // <-- added call
    }

 /* ---------------------------------------------------------
   RULING PLANETS – FINAL FIXED MODULE (Safe, Isolated)
   --------------------------------------------------------- */

var USE_TRANSIT_RP = false;   // Transit should control RP

/* Update the UI fields inside KP modal */
function updateRulingPlanets(rp) {
    if (!rp) return;

    const set = (id, value) => {
        var el = document.getElementById(id);
        if (el) el.innerHTML = value;
    };

    set("rp_lagna_sign", "<b>" + getTamilName(rp.Lagna_Sign) + "</b>");
    set("rp_lagna_star", getTamilName(rp.Lagna_Star));
    set("rp_lagna_sub", "<b>" + getTamilName(rp.Lagna_Sub) + "</b>");

    set("rp_moon_sign", "<b>" + getTamilName(rp.Moon_Sign) + "</b>");
    set("rp_moon_star", getTamilName(rp.Moon_Star));
    set("rp_moon_sub", "<b>" + getTamilName(rp.Moon_Sub) + "</b>");

    set("rp_daylord", "<b>" + getTamilName(rp.Day_Lord) + "</b>");
}

/* Fetch ONLY transit RP & override the KP Ruling Planets table */
async function updateTransitRulingPlanets() {
    try {
        var FIX = getFixedKPPlace();
        var lat = FIX.lat;
        var lon = FIX.lon;
        var tz  = FIX.tz;

        var now = new Date();
        var y  = now.getFullYear();
        var m  = String(now.getMonth() + 1).padStart(2, "0");
        var d  = String(now.getDate()).padStart(2, "0");
        var hh = String(now.getHours()).padStart(2, "0");
        var mm = String(now.getMinutes()).padStart(2, "0");

        var payload = {
            date: `${y}-${m}-${d}`,
            time: `${hh}:${mm}`,
            lat: lat, lon: lon, tz: tz,
            place_json: { lat, lon, tz },
            ayanamsa: "kp"
        };

        var res  = await fetch("/kp_chart", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        var json = await res.json();
        if (json.status === "ok" && json.data?.ruling_planets) {

            // Lock RP to Transit
            USE_TRANSIT_RP = true;

            // Update UI fields
            updateRulingPlanets(json.data.ruling_planets);
        }

    } catch(e) {
        console.warn("Transit RP update failed", e);
    }
}

/* Modify ONLY RP logic inside loadMiniTransit() */
async function loadMiniTransit(targetId) {
    var el = document.getElementById(targetId);
    if (!el) return;

    var FIX = getFixedKPPlace();
    var lat = FIX.lat;
    var lon = FIX.lon;
    var tz  = FIX.tz;

    var now = new Date();
    var y  = now.getFullYear();
    var m  = String(now.getMonth()+1).padStart(2,'0');
    var d  = String(now.getDate()).padStart(2,'0');
    var hh = String(now.getHours()).padStart(2,'0');
    var mm = String(now.getMinutes()).padStart(2,'0');

    var payload = {
        date: `${y}-${m}-${d}`,
        time: `${hh}:${mm}`,
        lat: lat, lon: lon, tz: tz,
        place_json: {lat, lon, tz},
        ayanamsa: "kp"
    };

    try {
        var res = await fetch("/kp_chart", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(payload)
        });

        var json = await res.json();
        if (json.status === "ok") {
            
            // Render transit chart box (UNCHANGED)
            renderGrid(targetId, json.data, false);

            // RP must follow transit
            USE_TRANSIT_RP = true;

            // Update Ruling Planets UI
            updateRulingPlanets(json.data.ruling_planets);
        }
        else el.innerHTML = "Error";

    } catch(e) {
        el.innerHTML = "Fetch Fail";
    }
}



    // --- 8. INTERACTIVE DASA LOGIC ---
    function renderKPDasaView() {
        var wrap = document.getElementById("kpDasaTree");
        if(!wrap) return;
        
        var currentLevel = kpDasaState.stack.length; 
        var list = (currentLevel === 0) ? kpDasaState.rootData : kpDasaState.stack[currentLevel-1].children;
        
        var breadcrumb = `<span style="cursor:pointer; text-decoration:underline;" onclick="window.resetKPDasa()">All</span>`;
        kpDasaState.stack.forEach((item, idx) => {
            breadcrumb += ` > <span style="cursor:pointer; text-decoration:underline;" onclick="window.jumpKPDasa(${idx})">${getTamilName(item.lord)}</span>`;
        });

        var header = `<div style="background:#FF9800; color:white; padding:5px; font-weight:bold; font-size:11px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:10;">
            <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:200px;">🪔 ${breadcrumb}</div>
            ${currentLevel > 0 ? `<button onclick="window.popKPDasa()" style="border:1px solid #fff; background:transparent; color:#fff; cursor:pointer; font-size:10px; padding:1px 5px;">⬅ Back</button>` : ""}
        </div>`;

        var table = `<table style="width:100%; font-size:11px; border-collapse:collapse; text-align:center;">
            <tr style="background:#eee; font-weight:bold; position:sticky; top:24px;"><td>Lord</td><td>Start</td><td>End</td></tr>`;

        var now = new Date();
        list.forEach(m => {
            var s = new Date(m.start), e = new Date(m.end);
            var active = (now >= s && now <= e) ? "background:#FFF3E0; font-weight:bold;" : "";
            var clickAttr = (currentLevel < 4) ? `onclick="window.drillKPDasa('${m.lord}', '${m.start_jd}', '${m.end_jd}')"` : "";
            var cursor = (currentLevel < 4) ? "pointer" : "default";
            var arrow = (currentLevel < 4) ? "▶" : "";

            table += `<tr style="${active} border-bottom:1px solid #eee; cursor:${cursor};" ${clickAttr}>
                <td style="text-align:left; padding:3px 6px; color:${currentLevel<4?'#0D47A1':'#333'};">${getTamilName(m.lord)} ${arrow}</td>
                <td>${m.start.split(" ")[0]}</td><td>${m.end.split(" ")[0]}</td>
            </tr>`;
        });
        table += `</table>`;
        wrap.innerHTML = header + table;
    }

    window.resetKPDasa = function() { kpDasaState.stack = []; renderKPDasaView(); };
    window.popKPDasa = function() { kpDasaState.stack.pop(); renderKPDasaView(); };
    window.jumpKPDasa = function(idx) { kpDasaState.stack = kpDasaState.stack.slice(0, idx + 1); renderKPDasaView(); };

    window.drillKPDasa = async function(lord, start, end) {
        var wrap = document.getElementById("kpDasaTree");
        wrap.innerHTML = `<div style="text-align:center; padding:10px; color:#666;">⏳ Loading ${lord}...</div>`;
        try {
            var payload = { start_jd: start, end_jd: end, tz: kpDasaState.tz, level: 1, lord: lord };
            var res = await fetch("/vimshottari_subtree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            var json = await res.json();
            if(json.status === "ok") { kpDasaState.stack.push({ lord: lord, children: json.subtree }); renderKPDasaView(); }
        } catch(e) { console.error(e); }
    };

    
/* -----------------------------
   Center box builder for KP grid
   (Inserted by assistant — safe, minimal)
   ----------------------------- */
function buildCenterBox(title, date, time, place) {
    // best-effort place resolution (keeps original UI unchanged)
    var placeName = place || "";
    try {
        var pEl = document.getElementById("placeSearch");
        if (pEl) {
            if (typeof pEl.value === "string" && pEl.value.trim()) placeName = pEl.value.trim();
            else if (pEl.dataset && (pEl.dataset.place || pEl.dataset.name)) placeName = pEl.dataset.place || pEl.dataset.name;
            else if (pEl.textContent && pEl.textContent.trim()) placeName = pEl.textContent.trim();
        }
    } catch (e) { /* ignore */ }
    if (!placeName) placeName = "Unknown Place";

    return `
        <div style="
            width:100%; height:100%;
            display:flex; flex-direction:column;
            justify-content:center; align-items:center;
            text-align:center; font-size:12px;
            padding:6px; line-height:1.2;
        ">
            <div style="font-weight:700; color:#1976D2; font-size:13px; margin-bottom:4px;">${title}</div>
            <div style="font-weight:600;">${date}</div>
            <div style="font-weight:600;">${time}</div>
            <div style="font-size:11px; color:#444; margin-top:4px;">${placeName}</div>
        </div>
    `;
}


/* ----------------------------------
   Extract real FULL place name safely
   ---------------------------------- */
function getRealPlaceName() {

    // If user explicitly set a place by typing, prefer that locked value
    if (window.FIXED_KP_PLACE && window.KP_USER_SET_PLACE) return window.FIXED_KP_PLACE.name || "";

    let el = document.getElementById("placeSearch") || document.getElementById("place");
    if (!el) return "";
    if (el.dataset) {
        if (el.dataset.full) return el.dataset.full;
        if (el.dataset.place) return el.dataset.place;
        if (el.dataset.name) return el.dataset.name;
        if (el.dataset.city) return el.dataset.city;
    }
    if (el.value && el.value.trim()) return el.value.trim();
    if (el.textContent && el.textContent.trim()) return el.textContent.trim();
    return "";
}

/* ---
   getFixedKPPlace()
   - returns the place object to use for all KP calculations.
   - If the user has manually typed/edited the place field (input/change), the place is locked
     and stored in window.FIXED_KP_PLACE (so saved charts or auto-defaults won't override it).
   - Otherwise it reads the current input value/dataset but does not lock it.
--- */
function getFixedKPPlace() {
    if (window.FIXED_KP_PLACE && window.KP_USER_SET_PLACE) return window.FIXED_KP_PLACE;

    var el = document.getElementById("placeSearch") || document.getElementById("place");
    var name = "Unknown Place", lat = 13.0827, lon = 80.2707, tz = 5.5;
    if (el) {
        try {
            if (el.value && el.value.trim()) name = el.value.trim();
            else if (el.dataset && (el.dataset.city || el.dataset.place || el.dataset.full || el.dataset.name)) {
                name = el.dataset.city || el.dataset.place || el.dataset.full || el.dataset.name;
            }
            lat = parseFloat(el.dataset?.lat) || lat;
            lon = parseFloat(el.dataset?.lon) || lon;
            tz  = parseFloat(el.dataset?.tz)  || tz;
        } catch (e) { /* ignore and use defaults */ }
    }
    return { name: name, lat: lat, lon: lon, tz: tz };
}

// Listen for actual user edits to lock the place (user-initiated changes only)
document.addEventListener('DOMContentLoaded', function() {
    var el = document.getElementById('placeSearch') || document.getElementById('place');
    if (!el) return;
    // If user types or changes the field interactively, mark as user-set and lock current values
    function onUserPlaceChange(e) {
        try {
            var name = el.value?.trim() || el.dataset?.city || el.dataset?.place || el.dataset?.full || 'Unknown Place';
            var lat = parseFloat(el.dataset?.lat) || 13.0827;
            var lon = parseFloat(el.dataset?.lon) || 80.2707;
            var tz  = parseFloat(el.dataset?.tz)  || 5.5;
            window.KP_USER_SET_PLACE = true;
            window.FIXED_KP_PLACE = { name: name, lat: lat, lon: lon, tz: tz };
        } catch (err) { console.warn('KP place lock failed', err); }
    }
    // Use 'input' to catch typing and 'change' to catch selection from datalist.
    el.addEventListener('input', onUserPlaceChange, { passive: true });
    el.addEventListener('change', onUserPlaceChange, { passive: true });
});


// --- 9. RENDER GRIDS ---
    function renderGrid(targetId, data, isBig) {
        var el = document.getElementById(targetId); if(!el) return;
        var map = {}; ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"].forEach(r => map[r] = []);
        function getKey(n) { if(!n) return null; var s=String(n).toLowerCase().trim(); if(s.includes("mesh")||s.includes("aries")) return "மேஷம்"; if(s.includes("rish")||s.includes("taur")) return "ரிஷபம்"; if(s.includes("mith")||s.includes("gem")) return "மிதுனம்"; if(s.includes("kat")||s.includes("canc")||s.includes("kad")) return "கடகம்"; if(s.includes("sim")||s.includes("leo")) return "சிம்மம்"; if(s.includes("kan")||s.includes("virg")) return "கன்னி"; if(s.includes("thul")||s.includes("tul")||s.includes("libr")) return "துலாம்"; if(s.includes("vri")||s.includes("scor")) return "விருச்சிகம்"; if(s.includes("dhan")||s.includes("sag")) return "தனுசு"; if(s.includes("mak")||s.includes("cap")) return "மகரம்"; if(s.includes("kumb")||s.includes("aqu")) return "கும்பம்"; if(s.includes("meen")||s.includes("pis")) return "மீனம்"; return null; }
        
        (data.cusps||[]).forEach(c => { var k=getKey(c.rasi||c.sign); if(k && map[k]) { var deg=formatLon(c.lon); var ts=getTamilName(c.star), tsub=getTamilName(c.sub); var fSize=isBig?"15px":"13px"; map[k].push(`<div onmousemove="window.showKpTooltip(event, 'Bhava ${c.house}<br>${esc(ts)}/${esc(tsub)}')" onmouseleave="window.hideKpTooltip()" style="color:#D32F2F; font-size:${fSize}; cursor:help; white-space:nowrap;"><b>${toRoman(c.house)}</b> <span style="color:#555;font-size:0.9em">${deg}</span></div>`); } });
        (data.planets||[]).forEach(p => { var k=getKey(p.rasi||p.sign); if(k && map[k]) { var isRetro=checkRetro(p); var name=getTamilName(p.name); if(isRetro) name="("+name+")"; var col=getPlanetColor(p.name); var deg=formatLon(p.lon); var ts=getTamilName(p.star), tsub=getTamilName(p.sub); var fSize=isBig?"18px":"13px"; map[k].push(`<div onmousemove="window.showKpTooltip(event, '${esc(name)}<br>${esc(ts)}/${esc(tsub)}')" onmouseleave="window.hideKpTooltip()" style="color:${col}; font-size:${fSize}; cursor:help; white-space:nowrap;"><b>${name}</b> <span style="color:#000;font-size:0.8em">${deg}</span></div>`); } });
        
        var html = `<div style="display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(4,1fr); background:#999; gap:1px; width:100%; height:100%;">`;
        var order = ["மீனம்","மேஷம்","ரிஷபம்","மிதுனம்","கும்பம்",null,null,"கடகம்","மகரம்",null,null,"சிம்மம்","தனுசு","விருச்சிகம்","துலாம்","கன்னி"];
        for(var i=0; i<order.length; i++) { var r = order[i]; for(var i=0; i<order.length; i++) { var r = order[i];
            // CENTER AREA (merged 2x2 box)
            if (i === 5) {

                let centerHtml = "";

                if (isBig) {
                    // MAIN KP BIRTH DETAILS
                    var d = document.getElementById("date")?.value || "";
                    var t = document.getElementById("time")?.value || "";
                    var p = getRealPlaceName() || "Birth Place";

                    centerHtml = buildCenterBox("🟦 Birth Details", d, t, p);

                } else {
                    // MINI TRANSIT DETAILS
                    var now = new Date();
                    var dd = String(now.getDate()).padStart(2,'0');
                    var mm = String(now.getMonth()+1).padStart(2,'0');
                    var yyyy = now.getFullYear();
                    var hh = String(now.getHours()).padStart(2,'0');
                    var mi = String(now.getMinutes()).padStart(2,'0');

                    var place = getRealPlaceName() || "Transit Place";

                    centerHtml = buildCenterBox(
                        "🟦 Transit Details",
                        `${dd}/${mm}/${yyyy}`,
                        `${hh}:${mi}`,
                        place
                    );
                }

                html += `
                    <div style="background:#fff; grid-column:span 2; grid-row:span 2;">
                        ${centerHtml}
                    </div>
                `;
                continue;
            }

            // skip the other 3 center cells (part of merged 2×2 box)
            if (i === 6 || i === 9 || i === 10) continue;

            html += `<div style="background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding:1px; line-height:1.1;">${r ? map[r].join("") : ""}</div>`; } 
        `<div style="background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding:1px; line-height:1.1;">${r ? map[r].join("") : ""}</div>`; }
        html += `</div>`; el.innerHTML = html;
    }

    async function loadMiniTransit(targetId) {
        var el = document.getElementById(targetId); if(!el) return;
        var FIX = getFixedKPPlace(); var lat = FIX.lat, lon = FIX.lon, tz = FIX.tz;
        var now = new Date();
        var y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
        var hh=String(now.getHours()).padStart(2,'0'), mm=String(now.getMinutes()).padStart(2,'0');
        var payload = { date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, lat:lat, lon:lon, tz:tz, place_json:{lat:lat, lon:lon, tz:tz}, ayanamsa:"kp" };
        try { var res = await fetch("/kp_chart", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)}); var json = await res.json(); if(json.status==="ok") renderGrid(targetId, json.data, false); else el.innerHTML = "Error"; } catch(e) { el.innerHTML = "Fetch Fail"; }
    }

    function makeDraggable(el, h) { var p1=0, p2=0, p3=0, p4=0; h.onmousedown = function(e) { if(e.target.id==="kpCloseBtn") return; e.preventDefault(); p3=e.clientX; p4=e.clientY; document.onmouseup = function() { document.onmouseup=null; document.onmousemove=null; }; document.onmousemove = function(e) { e.preventDefault(); p1=p3-e.clientX; p2=p4-e.clientY; p3=e.clientX; p4=e.clientY; el.style.top=(el.offsetTop-p2)+"px"; el.style.left=(el.offsetLeft-p1)+"px"; }; }; }
    function formatList(l) { return (l&&l.length)?l.map(n=>getTamilName(n)).join(", "):"-"; }
    function parseDMS(dms) { if(!dms) return 0; var p=dms.split('°'); var m=p[1]?parseFloat(p[1]):0; return parseFloat(p[0])+m/60; }
    function toRoman(n) { return ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n-1]||n; }
    function getTamilName(n) { if(!n) return "-"; var m={"Sun":"சூரி","Moon":"சந்","Mars":"செவ்","Mercury":"புத","Jupiter":"குரு","Venus":"சுக்","Saturn":"சனி","Rahu":"ராகு","Ketu":"கேது"}; return m[n] || m[n.charAt(0).toUpperCase()+n.slice(1)] || n.substring(0,3); }
    function getPlanetColor(n) { var c={"Sun":"#e67e22","Moon":"#3498db","Mars":"#ff4d4d","Mercury":"#27ae60","Jupiter":"#f1c40f","Venus":"#f78fb3","Saturn":"#2c3e50","Rahu":"#8e44ad","Ketu":"#95a5a6"}; return c[n]||"#000"; }
    function esc(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, "&quot;"); }
    window.showKpTooltip = function(e, text) { var tip = document.getElementById("kpTooltip"); if(tip) { tip.innerHTML = text; tip.style.display = "block"; tip.style.left = (e.clientX+10)+"px"; tip.style.top = (e.clientY-20)+"px"; } };
    window.hideKpTooltip = function() { document.getElementById("kpTooltip").style.display = "none"; };
})();
