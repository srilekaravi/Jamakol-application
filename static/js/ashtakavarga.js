/* static/js/ashtakavarga.js — Final UI & Dynamic Update Fix */

(function () {
    "use strict";

    const RASI_TAMIL = [
        "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", 
        "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்", 
        "தனுசு", "மகரம்", "கும்பம்", "மீனம்"
    ];

    const DISPLAY_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Lagna"];

    const PLANET_TAMIL = {
        "Sun": "சூரி", "Moon": "சந்", "Mars": "செவ்", "Mercury": "புத",
        "Jupiter": "குரு", "Venus": "சுக்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது",
        "Lagna": "லக்"
    };

    const POSITIONS_MAPPING = [
        { left: "25%", top: "0%", width: "25%", height: "25%" }, 
        { left: "50%", top: "0%", width: "25%", height: "25%" }, 
        { left: "75%", top: "0%", width: "25%", height: "25%" }, 
        { left: "75%", top: "25%", width: "25%", height: "25%" }, 
        { left: "75%", top: "50%", width: "25%", height: "25%" }, 
        { left: "75%", top: "75%", width: "25%", height: "25%" }, 
        { left: "50%", top: "75%", width: "25%", height: "25%" }, 
        { left: "25%", top: "75%", width: "25%", height: "25%" }, 
        { left: "0%", top: "75%", width: "25%", height: "25%" },  
        { left: "0%", top: "50%", width: "25%", height: "25%" },  
        { left: "0%", top: "25%", width: "25%", height: "25%" },  
        { left: "0%", top: "0%", width: "25%", height: "25%" }     
    ];

    let currentView = "Sarva"; 

    function buildPayload() {
        // Safe robust payload collector
        const name = document.getElementById("name")?.value || "";
        const date = document.getElementById("date")?.value;
        const time = document.getElementById("time")?.value;
        const placeInput = document.getElementById("place") || document.getElementById("placeSearch");
        
        return {
            date: date, time: time,
            lat: placeInput?.dataset.lat || "13.0827", 
            lon: placeInput?.dataset.lon || "80.2707", 
            tz: placeInput?.dataset.tz || "5.5",
            ayanamsa: document.getElementById("ayanamsa")?.value || "lahiri"
        };
    }

    async function fetchAshtakavargaData(payload) {
        try {
            const res = await fetch("/compute_ashtakavarga", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) { return {}; }
    }

    function createMainButton() {
        const dbox = document.getElementById("dashaBox") || document.body;
        if (!dbox || document.getElementById("ashtakaMainBtn")) return;

        const btn = document.createElement("button");
        btn.id = "ashtakaMainBtn";
        btn.textContent = "🍊 அஷ்டகவர்க்கம்";
        btn.style.cssText = `background:#0d6efd;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:700;cursor:pointer;margin-top:8px; width:100%;`;
        dbox.appendChild(btn);

        btn.onclick = async () => {
            const payload = buildPayload();
            const data = await fetchAshtakavargaData(payload);
            if (data.status === "ok") {
                window.__last_ashtakavarga_data = data;
                showPopup(data);
            }
        };
    }

    function makeDraggable(el, handle) {
        let x=0,y=0,dx=0,dy=0,drag=false;
        (handle||el).onmousedown=e=>{
            if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
            drag=true; dx=e.clientX-el.offsetLeft; dy=e.clientY-el.offsetTop;
            document.onmouseup=()=>drag=false;
            document.onmousemove=ev=>{ if(!drag)return; x=ev.clientX-dx; y=ev.clientY-dy; el.style.left=x+"px"; el.style.top=y+"px"; };
        };
    }

    function ensurePopup() {
        let popup = document.getElementById("ashtakaPopup");
        if (popup) return popup;

        popup = document.createElement("div");
        popup.id = "ashtakaPopup";
        popup.style.cssText = `
            position:fixed; left:100px; top:50px; width:340px; height:auto; max-height:85vh;
            background:#fff; border:2px solid #ffa726; border-radius:8px;
            box-shadow:0 10px 30px rgba(0,0,0,0.3);
            display:none; flex-direction:column; z-index:9999;
            resize:both; overflow:hidden; min-width:340px; min-height:400px;
        `;

        const header = document.createElement("div");
        header.style.cssText = "flex:0 0 auto; background:#fff3e0; padding:8px; display:flex; justify-content:space-between; align-items:center; cursor:move; border-bottom:1px solid #ccc;";
        
        const titleDiv = document.createElement("div");
        titleDiv.id = "ashtakaTitle";
        titleDiv.style.cursor = "pointer";
        titleDiv.title = "Click to Reset to Sarva";
        titleDiv.onclick = window.resetAshtakaChart;
        titleDiv.innerHTML = "<b style='color:#e65100; font-size:14px;'>🍊 அஷ்டகவர்க்கம்</b>";

        const controls = document.createElement("div");
        controls.style.display = "flex"; controls.style.gap = "5px"; controls.style.alignItems = "center";

        const lagnaBox = document.createElement("label");
        lagnaBox.style.cssText = "display:flex;align-items:center;gap:3px;font-size:11px;font-weight:bold;margin-right:5px;cursor:pointer;";
        lagnaBox.innerHTML = `<input type="checkbox" id="lagnaToggle"> லக்`;

        const btnTable = document.createElement("button");
        btnTable.textContent = "அட்டவணை";
        btnTable.style.cssText = "background:#ff9800;color:#fff;border:none;padding:3px 6px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px;";
        
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = "background:#d32f2f;color:#fff;border:none;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:14px;";

        controls.append(lagnaBox, btnTable, closeBtn);
        header.append(titleDiv, controls);
        popup.append(header);

        const content = document.createElement("div");
        content.style.cssText = "flex:1 1 auto; overflow-y:auto; padding:10px; display:flex; flex-direction:column; align-items:center; gap:10px;";

        const chartContainer = document.createElement("div");
        chartContainer.style.cssText = "width:300px; height:300px; position:relative; border:2px solid #333; background:#fafafa; flex-shrink:0; box-shadow:0 2px 5px rgba(0,0,0,0.1);";
        chartContainer.id = "ashtakaChart";

        const tableDiv = document.createElement("div");
        tableDiv.id = "ashtakaTable";
        tableDiv.style.cssText = "display:none; width:100%; overflow-x:auto; border-top:2px solid #ff9800; padding-top:10px;";

        content.append(chartContainer, tableDiv);
        popup.append(content);
        document.body.append(popup);

        closeBtn.onclick = () => (popup.style.display = "none");
        makeDraggable(popup, header);

        btnTable.onclick = () => {
            const isVisible = tableDiv.style.display === "block";
            tableDiv.style.display = isVisible ? "none" : "block";
            if (!isVisible) { 
                const d = window.__last_ashtakavarga_data;
                if (d) renderTable(d.ashtakavarga || d, tableDiv);
            }
        };

        return popup;
    }

    function showPopup(data) {
        const popup = ensurePopup();
        popup.style.display = "flex";
        
        const chk = document.getElementById("lagnaToggle");
        chk.onchange = () => {
            renderChart(data.ashtakavarga);
            const tableDiv = document.getElementById("ashtakaTable");
            if(tableDiv.style.display === "block") renderTable(data.ashtakavarga || data, tableDiv);
        };

        currentView = "Sarva";
        renderChart(data.ashtakavarga);
        
        const tableDiv = document.getElementById("ashtakaTable");
        if(tableDiv.style.display === "block") {
            renderTable(data.ashtakavarga || data, tableDiv);
        }
    }

    function renderChart(data) {
        const wrap = document.getElementById("ashtakaChart");
        const titleDiv = document.getElementById("ashtakaTitle");
        wrap.innerHTML = ""; 

        const chk = document.getElementById("lagnaToggle");
        const useLagna = chk ? chk.checked : false;

        let pointsArray = [];
        
        if (currentView === "Sarva") {
            titleDiv.innerHTML = "<b style='color:#e65100; font-size:14px;'>🍊 சர்வ அஷ்டகவர்க்கம்</b>";
            if (useLagna && data.sarva_including_lagna) {
                pointsArray = Array.isArray(data.sarva_including_lagna) ? data.sarva_including_lagna : RASI_TAMIL.map(r => data.sarva_including_lagna[r] || 0);
            } else {
                let rawSarva = data.sarva_points || {};
                pointsArray = Array.isArray(rawSarva) ? rawSarva : RASI_TAMIL.map(r => rawSarva[r] || 0);
            }
        } else {
            const pName = PLANET_TAMIL[currentView] || currentView;
            titleDiv.innerHTML = `<b style='color:#1976D2; font-size:14px;'>🔵 ${pName} - பின்னா</b>`;
            const bhinna = data.bhinna || {};
            const pData = bhinna[currentView];
            pointsArray = Array.isArray(pData) ? pData : RASI_TAMIL.map(r => pData[r] || 0);
        }

        const lagnaName = data.lagna_highlight || null;

        for (let i = 0; i < 12; i++) {
            const pos = POSITIONS_MAPPING[i];
            const box = document.createElement("div");
            box.style.cssText = `position:absolute; left:${pos.left}; top:${pos.top}; width:${pos.width}; height:${pos.height}; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid #999; background:#fff; box-sizing:border-box;`;

            if (lagnaName && RASI_TAMIL[i] === lagnaName) {
                box.style.backgroundColor = "#fffde7";
                box.style.border = "2px solid #ff9800";
            }

            const val = document.createElement("div");
            const score = pointsArray[i] || 0;
            val.textContent = score;
            const isGood = currentView === "Sarva" ? (score >= 28) : (score >= 4);
            val.style.cssText = `font-weight:900;font-size:22px;color:${isGood ? "#2e7d32" : "#c62828"};`;

            box.append(val);
            
            box.onmouseenter = (e) => showBhinnaTooltip(e, data, i);
            box.onmouseleave = () => hideBhinnaTooltip();

            wrap.append(box);
        }
        
        const centerLabel = document.createElement("div");
        centerLabel.style.cssText = `position:absolute; left:25%; top:25%; width:50%; height:50%; display:flex; align-items:center; justify-content:center; pointer-events:none;`;
        
        if(currentView === "Sarva") {
            centerLabel.innerHTML = `<span style="font-weight:bold; font-size:14px; color:#e65100; text-align:center; line-height:1.4;">சர்வ<br>அஷ்டகவர்க்கம்</span>`;
        } else {
            const pName = PLANET_TAMIL[currentView] || currentView;
            centerLabel.innerHTML = `<span style="font-weight:bold; font-size:14px; color:#1976D2; text-align:center; line-height:1.4;">${pName}<br>அஷ்டகவர்க்கம்</span>`;
        }
        wrap.append(centerLabel);
    }

    let tooltipEl = null;
    function showBhinnaTooltip(e, data, idx) {
        if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.style.cssText = "position:fixed; background:rgba(0,0,0,0.9); color:#fff; padding:8px; border-radius:4px; font-size:12px; z-index:10000; pointer-events:none;";
            document.body.appendChild(tooltipEl);
        }
        const bhinna = data.bhinna || {};
        let html = `<b style='color:#ff9800'>${RASI_TAMIL[idx]}</b><br>`;
        DISPLAY_ORDER.forEach(p => {
            if (bhinna[p]) {
                let val = Array.isArray(bhinna[p]) ? bhinna[p][idx] : (bhinna[p][RASI_TAMIL[idx]] || 0);
                let tName = PLANET_TAMIL[p] || p.substring(0,3);
                html += `${tName}: <b>${val}</b><br>`;
            }
        });
        tooltipEl.innerHTML = html;
        tooltipEl.style.display = "block";
        tooltipEl.style.left = (e.clientX + 15) + "px";
        tooltipEl.style.top = (e.clientY + 15) + "px";
    }

    function hideBhinnaTooltip() {
        if (tooltipEl) tooltipEl.style.display = "none";
    }

    function renderTable(data, container) {
        const bhinna = data.bhinna || {};
        
        const chk = document.getElementById("lagnaToggle");
        const useLagna = chk ? chk.checked : false;
        
        let sarvaPoints = [];
        if (useLagna && data.sarva_including_lagna) {
            sarvaPoints = data.sarva_including_lagna;
        } else {
            sarvaPoints = data.sarva_points || [];
        }
        
        const sarvaArray = Array.isArray(sarvaPoints) ? sarvaPoints : RASI_TAMIL.map(r => sarvaPoints[r] || 0);
        const totalSarva = sarvaArray.reduce((a,b)=>a+b, 0);

        let html = `<table style='width:100%; border-collapse:collapse; font-size:11px; text-align:center; cursor:default;'>
            <tr style='background:#eee; font-weight:bold;'>
                <td style='padding:4px; text-align:left;'>கிரகம்</td>
                ${RASI_TAMIL.map(r => `<td>${r.substring(0,2)}</td>`).join('')}
                <td>Total</td>
            </tr>`;

        DISPLAY_ORDER.forEach(p => {
            if (!bhinna[p]) return;
            let rowTotal = 0;
            let tName = PLANET_TAMIL[p] || p;
            
            html += `<tr class="planet-row" data-planet="${p}" style="cursor:pointer; transition:background 0.2s;">
                        <td style='font-weight:bold; text-align:left; padding:4px; color:#1976D2;'>${tName}</td>`;
            
            for(let i=0; i<12; i++) {
                let val = Array.isArray(bhinna[p]) ? bhinna[p][i] : (bhinna[p][RASI_TAMIL[i]] || 0);
                rowTotal += val;
                html += `<td style='border:1px solid #eee;'>${val}</td>`;
            }
            html += `<td style='font-weight:bold; background:#f9f9f9;'>${rowTotal}</td></tr>`;
        });

        html += `<tr class="planet-row" data-planet="Sarva" style="background:#fff3e0; font-weight:bold; cursor:pointer;">
                    <td style='text-align:left; padding:4px; color:#e65100;'>SAV (சர்வ)</td>`;
        sarvaArray.forEach(v => html += `<td style='border:1px solid #ffe0b2;'>${v}</td>`);
        html += `<td style='background:#ffe0b2;'>${totalSarva}</td></tr>`;

        html += "</table>";
        container.innerHTML = html;

        container.querySelectorAll(".planet-row").forEach(row => {
            row.onclick = () => {
                const p = row.getAttribute("data-planet");
                currentView = p;
                renderChart(data); 
                container.querySelectorAll("tr").forEach(r => r.style.backgroundColor = "");
                if (p !== "Sarva") row.style.backgroundColor = "#e3f2fd";
                else row.style.backgroundColor = "#fff3e0";
            };
        });
    }

    window.resetAshtakaChart = function() {
        currentView = "Sarva";
        const d = window.__last_ashtakavarga_data;
        if(d) renderChart(d.ashtakavarga || d);
        const rows = document.querySelectorAll(".planet-row");
        rows.forEach(r => r.style.backgroundColor = "");
        const savRow = document.querySelector('.planet-row[data-planet="Sarva"]');
        if(savRow) savRow.style.backgroundColor = "#fff3e0";
    };

    // ✅ AUTO-UPDATE HOOK (Replaces Watcher)
    document.addEventListener("DOMContentLoaded", () => {
        createMainButton();
        ensurePopup();
        
        // Hook into main generate function safely
        const originalGenerate = window.generateChart;
        if (typeof originalGenerate === 'function') {
            window.generateChart = async function(...args) {
                // Call original first
                if (originalGenerate.constructor.name === "AsyncFunction") await originalGenerate.apply(this, args);
                else originalGenerate.apply(this, args);
                
                // Then update Ashtakavarga if visible
                const popup = document.getElementById("ashtakaPopup");
                if (popup && popup.style.display !== "none") {
                    document.getElementById("ashtakaMainBtn").click();
                }
            };
        }
    });

})();
