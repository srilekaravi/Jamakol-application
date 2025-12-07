/* static/js/kp.js — Final: Breadcrumb Dasa Tree + Retro Sync + Layout */

(function() {
    
    // --- 1. DASA STATE (Stores Navigation History) ---
    var kpDasaState = {
        stack: [],      // Array of { lord: "Sun", children: [], levelName: "MD" }
        rootData: [],   // The initial Mahadasha list
        tz: 5.5         // Timezone
    };

    // --- 2. INJECT BUTTON ---
    function injectKPButton() {
        var header = document.querySelector(".vh-header");
        if (header && !document.getElementById("btnOpenKP")) {
            var btn = document.createElement("span");
            btn.id = "btnOpenKP";
            btn.innerHTML = "📊 KP System";
            Object.assign(btn.style, {
                marginLeft: "auto", marginRight: "15px", color: "#673AB7",
                cursor: "pointer", fontSize: "13px", fontWeight: "bold",
                textDecoration: "underline", display: "inline-block", verticalAlign: "middle"
            });
            btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); loadKPChart(); };
            var title = header.querySelector(".vh-title");
            if (title) {
                header.style.display = "flex"; header.style.alignItems = "center";
                header.style.justifyContent = "space-between"; header.appendChild(btn);
            } else header.appendChild(btn);
        }
    }
    setInterval(injectKPButton, 1000);

    // --- 3. TOOLTIP & HOOKS ---
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

    var originalGenerate = window.generateChart;
    if (originalGenerate) {
        window.generateChart = async function(...args) {
            if (originalGenerate.constructor.name === "AsyncFunction") await originalGenerate.apply(this, args);
            else originalGenerate.apply(this, args);
            var container = document.getElementById("kpTableContainer");
            if (container && container.style.display !== "none") setTimeout(loadKPChart, 300);
        };
    }

    // --- 4. HELPERS (RETRO & FORMAT) ---
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

    // --- 5. LOAD DATA ---
    async function loadKPChart() {
        var d = document.getElementById("date")?.value;
        var t = document.getElementById("time")?.value;
        var p = document.getElementById("placeSearch");
        var lat = parseFloat(p?.dataset.lat)||13.08, lon = parseFloat(p?.dataset.lon)||80.27, tz = parseFloat(p?.dataset.tz)||5.5;

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
                // Initialize Dasa
                kpDasaState.rootData = dasaJson.status === "ok" ? dasaJson.mahadashas : [];
                kpDasaState.stack = []; 
                
                renderFloatingTables(kpJson.data);
            } else {
                alert("KP Error: " + kpJson.message);
            }
        } catch (e) { console.error(e); }
    }

    // --- 6. RENDER MODAL ---
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
        } else container.style.display = "flex";

        var header = `<div id="kpTableHeader" style="flex:0 0 auto; padding:10px; background:#222; color:#fff; cursor:move; display:flex; justify-content:space-between; font-weight:bold;">
            <span>📊 KP System</span><span id="kpCloseBtn" style="cursor:pointer; color:#ff5252;">✕</span></div>`;

        var rp = data.ruling_planets || {};

        var body = `<div style="flex:1; display:flex; overflow:hidden;">
            
            <div style="flex:0 0 550px; padding:15px; border-right:2px solid #ddd; background:#f9f9f9; display:flex; flex-direction:column; align-items:center;">
                <div style="background:#444; color:#fff; padding:5px; text-align:center; font-weight:bold; margin-bottom:10px; width:100%;">KP Birth Chart</div>
                <div id="kpBirthGrid" style="width:100%; aspect-ratio:1; border:1px solid #000; background:#fff;"></div>
            </div>

            <div style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:15px;">
                
                <div style="display:flex; gap:15px;">
                    <div id="kpMiniTransitWrap" style="flex:0 0 380px; border:1px solid #999; background:#fff;">
                        <div style="background:#607D8B; color:#fff; font-size:15px; padding:8px; text-align:center; font-weight:bold;">⏱️ KP Transit</div>
                        <div style="display:flex; justify-content:center; padding:5px;">
                            <div id="kpMiniTransitGrid" style="width:400px; aspect-ratio:1; border:1px solid #ccc;"></div>
                        </div>
                    </div>
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <div style="border:1px solid #ddd; background:#fff;">
                            <div style="background:#009688; color:white; padding:5px; font-weight:bold; font-size:11px;">👑 Ruling Planets</div>
                            <table style="width:100%; font-size:11px; margin:0;">
                                <tr><td style="padding:3px;">Lagna</td><td><b>${getTamilName(rp.Lagna_Sign)}</b></td><td>${getTamilName(rp.Lagna_Star)}</td><td><b>${getTamilName(rp.Lagna_Sub)}</b></td></tr>
                                <tr><td style="padding:3px;">Moon</td><td><b>${getTamilName(rp.Moon_Sign)}</b></td><td>${getTamilName(rp.Moon_Star)}</td><td><b>${getTamilName(rp.Moon_Sub)}</b></td></tr>
                                <tr><td style="padding:3px;">Day</td><td colspan="3"><b>${getTamilName(rp.Day_Lord)}</b></td></tr>
                            </table>
                        </div>

                        <div id="kpDasaTree" style="border:1px solid #ddd; flex:1; overflow-y:auto; background:#fff; min-height:160px; display:flex; flex-direction:column;">
                        </div>
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
        document.getElementById("kpCloseBtn").onclick = () => container.style.display = "none";
        makeDraggable(container, document.getElementById("kpTableHeader"));

        renderGrid("kpBirthGrid", data, true); 
        loadMiniTransit("kpMiniTransitGrid");
        
        // Initial Dasa Render
        renderKPDasaView();
    }

    // --- 7. INTERACTIVE DASA LOGIC (BREADCRUMB) ---
    function renderKPDasaView() {
        var wrap = document.getElementById("kpDasaTree");
        if(!wrap) return;
        
        var currentLevel = kpDasaState.stack.length; // 0=All, 1=MD, 2=AD...
        var list = (currentLevel === 0) ? kpDasaState.rootData : kpDasaState.stack[currentLevel-1].children;
        
        // BREADCRUMB HEADER
        var breadcrumb = `<span style="cursor:pointer; text-decoration:underline;" onclick="window.resetKPDasa()">All</span>`;
        kpDasaState.stack.forEach((item, idx) => {
            var lvl = ["MD", "AD", "PD", "SD", "PD"][idx];
            breadcrumb += ` > <span style="cursor:pointer; text-decoration:underline;" onclick="window.jumpKPDasa(${idx})">${getTamilName(item.lord)}</span> <span style="font-size:9px; color:#eee;">(${lvl})</span>`;
        });

        var header = `<div style="background:#FF9800; color:white; padding:5px; font-weight:bold; font-size:11px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:10;">
            <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">🪔 ${breadcrumb}</div>
            ${currentLevel > 0 ? `<button onclick="window.popKPDasa()" style="border:1px solid #fff; background:transparent; color:#fff; cursor:pointer; font-size:10px; padding:1px 5px;">⬅ Back</button>` : ""}
        </div>`;

        var table = `<table style="width:100%; font-size:11px; border-collapse:collapse; text-align:center;">
            <tr style="background:#eee; font-weight:bold; position:sticky; top:24px;"><td>Lord</td><td>Start</td><td>End</td></tr>`;

        var now = new Date();
        list.forEach(m => {
            var s = new Date(m.start), e = new Date(m.end);
            var active = (now >= s && now <= e) ? "background:#FFF3E0; font-weight:bold;" : "";
            
            // Drill Down Logic (Max 5 levels)
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

    // Global Dasa Functions
    window.resetKPDasa = function() { kpDasaState.stack = []; renderKPDasaView(); };
    window.popKPDasa = function() { kpDasaState.stack.pop(); renderKPDasaView(); };
    window.jumpKPDasa = function(idx) { kpDasaState.stack = kpDasaState.stack.slice(0, idx + 1); renderKPDasaView(); };

    window.drillKPDasa = async function(lord, start, end) {
        var wrap = document.getElementById("kpDasaTree");
        // Show loading spinner
        var loading = document.createElement("div");
        loading.style = "position:absolute; inset:0; background:rgba(255,255,255,0.8); display:flex; justify-content:center; align-items:center; font-weight:bold; color:#FF9800;";
        loading.innerHTML = `Loading ${lord}...`;
        wrap.appendChild(loading);
        
        try {
            var payload = { start_jd: start, end_jd: end, tz: kpDasaState.tz, level: 1, lord: lord };
            var res = await fetch("/vimshottari_subtree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            var json = await res.json();
            if(json.status === "ok") {
                kpDasaState.stack.push({ lord: lord, children: json.subtree });
                renderKPDasaView();
            }
        } catch(e) { console.error(e); }
    };

    // --- 8. RENDER GRID & TRANSIT (Unchanged) ---
    function renderGrid(targetId, data, isBig) {
        var el = document.getElementById(targetId); if(!el) return;
        var map = {}; ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"].forEach(r => map[r] = []);
        function getKey(n) { if(!n) return null; var s=String(n).toLowerCase().trim(); if(s.includes("mesh")||s.includes("aries")) return "மேஷம்"; if(s.includes("rish")||s.includes("taur")) return "ரிஷபம்"; if(s.includes("mith")||s.includes("gem")) return "மிதுனம்"; if(s.includes("kat")||s.includes("canc")||s.includes("kad")) return "கடகம்"; if(s.includes("sim")||s.includes("leo")) return "சிம்மம்"; if(s.includes("kan")||s.includes("virg")) return "கன்னி"; if(s.includes("thul")||s.includes("tul")||s.includes("libr")) return "துலாம்"; if(s.includes("vri")||s.includes("scor")) return "விருச்சிகம்"; if(s.includes("dhan")||s.includes("sag")) return "தனுசு"; if(s.includes("mak")||s.includes("cap")) return "மகரம்"; if(s.includes("kumb")||s.includes("aqu")) return "கும்பம்"; if(s.includes("meen")||s.includes("pis")) return "மீனம்"; return null; }
        (data.cusps||[]).forEach(c => { var k = getKey(c.rasi||c.sign); if(k && map[k]) { var deg=formatLon(c.lon); var ts=getTamilName(c.star), tsub=getTamilName(c.sub); var fSize=isBig?"15px":"13px"; map[k].push(`<div onmousemove="window.showKpTooltip(event, 'Bhava ${c.house}<br>${esc(ts)}/${esc(tsub)}')" onmouseleave="window.hideKpTooltip()" style="color:#D32F2F; font-size:${fSize}; cursor:help; white-space:nowrap;"><b>${toRoman(c.house)}</b> <span style="color:#555;font-size:0.9em">${deg}</span></div>`); } });
        (data.planets||[]).forEach(p => { var k = getKey(p.rasi||p.sign); if(k && map[k]) { var isRetro=checkRetro(p); var name=getTamilName(p.name); if(isRetro) name="("+name+")"; var col=getPlanetColor(p.name); var deg=formatLon(p.lon); var ts=getTamilName(p.star), tsub=getTamilName(p.sub); var fSize=isBig?"18px":"13px"; map[k].push(`<div onmousemove="window.showKpTooltip(event, '${esc(name)}<br>${esc(ts)}/${esc(tsub)}')" onmouseleave="window.hideKpTooltip()" style="color:${col}; font-size:${fSize}; cursor:help; white-space:nowrap;"><b>${name}</b> <span style="color:#000;font-size:0.8em">${deg}</span></div>`); } });
        var html = `<div style="display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(4,1fr); background:#999; gap:1px; width:100%; height:100%;">`;
        var order = ["மீனம்","மேஷம்","ரிஷபம்","மிதுனம்","கும்பம்",null,null,"கடகம்","மகரம்",null,null,"சிம்மம்","தனுசு","விருச்சிகம்","துலாம்","கன்னி"];
        for(var i=0; i<order.length; i++) { var r = order[i]; if (i===5) { html+=`<div style="background:#fff; grid-column:span 2; grid-row:span 2;"></div>`; continue; } if (i===6 || i===9 || i===10) continue; html += `<div style="background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding:1px; line-height:1.1;">${r ? map[r].join("") : ""}</div>`; }
        html += `</div>`; el.innerHTML = html;
    }

    async function loadMiniTransit(targetId) {
        var el = document.getElementById(targetId); if(!el) return;
        var p = document.getElementById("placeSearch");
        var lat = parseFloat(p?.dataset.lat)||13.08, lon = parseFloat(p?.dataset.lon)||80.27, tz = parseFloat(p?.dataset.tz)||5.5;
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