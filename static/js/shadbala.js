/* static/js/shadbala.js */

// Global state to hold data between views
window.shadbalaDataCache = null;

// 1. Data Loading
async function loadShadbala() {
    let payload = {};
    // Reuse global helper if available
    if (typeof collectChartData === "function") {
        payload = collectChartData();
    } else {
        const d = document.getElementById("date")?.value;
        const t = document.getElementById("time")?.value;
        const p = document.getElementById("placeSearch");
        payload = {
            date: d, time: t,
            lat: p?.getAttribute("data-lat") || 13.0827,
            lon: p?.getAttribute("data-lon") || 80.2707,
            tz: p?.getAttribute("data-tz") || 5.5
        };
    }
    
    try {
        const res = await fetch("/compute_shadbala", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if(json.status === "ok") {
            window.shadbalaDataCache = json.data;
            renderShadbalaUI(json.data);
        }
        else console.error("Shadbala Error: " + json.message);
    } catch (e) { console.error(e); }
}

// 2. UI Rendering (Resizable & Centered)
function renderShadbalaUI(data) {
    let container = document.getElementById("shadbalaContainer");
    
    // --- Create Container if Missing ---
    if (!container) {
        container = document.createElement("div");
        container.id = "shadbalaContainer";
        document.body.appendChild(container);

        // Initial Centering
        const startW = 900;
        const startH = 600;
        const startLeft = Math.max(0, (window.innerWidth - startW) / 2);
        const startTop = Math.max(0, (window.innerHeight - startH) / 2);

        container.style.width = startW + "px";
        container.style.height = startH + "px";
        container.style.left = startLeft + "px";
        container.style.top = startTop + "px";
    }

    // --- Force Styles (Resizable Flexbox) ---
    // 'resize: both' enables the drag handle in the corner
    Object.assign(container.style, {
        display: "flex", flexDirection: "column", 
        position: "fixed",
        backgroundColor: "#fff",
        border: "1px solid #ccc", borderRadius: "8px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)", zIndex: "10000",
        resize: "both",         // ✅ Enables Manual Resizing
        overflow: "hidden",     // Required for resize to work properly
        minWidth: "600px",
        minHeight: "400px",
        maxWidth: "100vw",
        maxHeight: "100vh"
    });

    // --- Ensure Tooltip Exists ---
    let tooltip = document.getElementById("shadbalaTooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "shadbalaTooltip";
        Object.assign(tooltip.style, {
            position: "fixed", display: "none", background: "rgba(0, 0, 0, 0.95)",
            color: "#fff", padding: "10px", borderRadius: "6px", fontSize: "13px",
            zIndex: "99999", pointerEvents: "none", boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            border: "1px solid #777", minWidth: "150px"
        });
        document.body.appendChild(tooltip);
    }

    // --- Header ---
    let html = `
    <div id="shadbalaHeader" style="
        flex: 0 0 auto;
        padding: 12px 15px; cursor: move; background: #673AB7; color: #fff; 
        border-radius: 8px 8px 0 0; font-weight: bold; display: flex; 
        justify-content: space-between; align-items: center; user-select: none;">
        <span style="font-size:16px;">💪 Shadbala Strength (ஷட்பலம்)</span>
        <span id="shadCloseBtn" style="cursor: pointer; font-size: 24px; line-height: 1; font-weight: bold;" title="Close">&times;</span>
    </div>
    
    <div id="shadbalaContent" style="
        flex: 1 1 auto; 
        padding: 20px; 
        overflow-y: auto; 
        position: relative;">
    </div>`;

    container.innerHTML = html;

    // Attach Close Event
    document.getElementById("shadCloseBtn").onclick = () => {
        window.hideShadTooltip();
        container.style.display = 'none';
    };

    // Render Content
    renderMainGraph(data);
    
    makeDraggable(container);
}

// 3. Main Graph View
function renderMainGraph(data) {
    const content = document.getElementById("shadbalaContent");
    const tamilMap = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Merc": "புதன்", "Jup": "குரு", "Ven": "சுக்கிரன்", "Sat": "சனி" };

    let html = `<div style="display:flex; align-items:flex-end; height:220px; gap:20px; margin-bottom:30px; border-bottom:1px solid #ccc; padding-bottom:10px;">`;
    
    data.forEach((p, index) => {
        const h = Math.min((p.rupa / 9) * 100, 100);
        const col = p.ratio >= 1.0 ? "#4CAF50" : "#F44336";
        const tName = tamilMap[p.planet] || p.planet; 
        
        // Tooltip Content
        const tipContent = `
            <div style='color:#FFEB3B; font-weight:bold; font-size:14px; margin-bottom:5px; border-bottom:1px solid #555;'>${tName}</div>
            <table style='width:100%; color:#eee;'>
                <tr><td>Sthana:</td><td style='text-align:right; color:#fff;'>${p.sthana}</td></tr>
                <tr><td>Dig:</td><td style='text-align:right; color:#fff;'>${p.dig}</td></tr>
                <tr><td>Kala:</td><td style='text-align:right; color:#fff;'>${p.kala}</td></tr>
                <tr><td>Chesta:</td><td style='text-align:right; color:#fff;'>${p.chesta}</td></tr>
                <tr><td>Naisargika:</td><td style='text-align:right; color:#fff;'>${p.naisargika}</td></tr>
                <tr><td>Drishti:</td><td style='text-align:right; color:#fff;'>${p.drik}</td></tr>
                <tr style='border-top:1px solid #555;'>
                    <td style='padding-top:3px;'>Total:</td>
                    <td style='text-align:right; font-weight:bold; color:#4CAF50; padding-top:3px;'>${p.total}</td>
                </tr>
            </table>
        `.replace(/"/g, '&quot;');

        html += `
        <div class="shad-bar-wrap"
             data-index="${index}"
             data-tip-html="${tipContent}"
             style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
            
            <div style="font-size:14px; font-weight:bold; margin-bottom:5px;">${p.rupa}</div>
            
            <div class="shad-bar" 
                 style="width:100%; background:${col}; height:${h}%; border-radius:4px 4px 0 0; cursor: pointer; transition: opacity 0.2s; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);"
                 onmouseover="this.style.opacity=0.8"
                 onmouseout="this.style.opacity=1">
            </div>
            
            <div style="margin-top:8px; font-size:14px; font-weight:bold;">${tName}</div>
        </div>`;
    });
    html += `</div>`;
    
    // Table Section
    html += `<table style="width:100%; border-collapse:collapse; font-size:14px; text-align:center;">
             <tr style="background:#f5f5f5; height:40px; border-bottom:2px solid #ddd;">
                <th style="padding:10px; text-align:left;">Graha</th>
                <th>Sthana</th><th>Dig</th><th>Kala</th>
                <th>Chesta</th><th>Nais</th><th>Drishti</th>
                <th style="background:#e3f2fd;">Total</th>
                <th>Rupa</th><th>Ratio</th>
             </tr>`;
             
    data.forEach(p => {
        const tName = tamilMap[p.planet] || p.planet;
        html += `<tr style="height:35px; border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:8px; text-align:left;">${tName}</td>
                    <td>${p.sthana}</td><td>${p.dig}</td><td>${p.kala}</td>
                    <td>${p.chesta}</td><td>${p.naisargika}</td><td>${p.drik}</td>
                    <td style="background:#e3f2fd; font-weight:bold;">${p.total}</td>
                    <td style="color:#1976D2; font-weight:bold;">${p.rupa}</td>
                    <td>${p.ratio}</td>
                 </tr>`;
    });
    html += `</table>`;

    content.innerHTML = html;

    const wrappers = content.querySelectorAll(".shad-bar-wrap");
    wrappers.forEach(wrap => {
        wrap.onmousemove = (e) => window.handleShadTooltip(e, wrap);
        wrap.onmouseleave = () => window.hideShadTooltip();
        
        wrap.onclick = () => {
            window.hideShadTooltip();
            const idx = wrap.getAttribute("data-index");
            renderDetailView(data[idx]);
        };
    });
}

// 4. Detailed View (Drill-down)
function renderDetailView(pData) {
    const content = document.getElementById("shadbalaContent");
    window.hideShadTooltip();

    const tamilMap = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Merc": "புதன்", "Jup": "குரு", "Ven": "சுக்கிரன்", "Sat": "சனி" };
    const tName = tamilMap[pData.planet] || pData.planet;

    const components = [
        { name: "Sthana (Positional)", val: pData.sthana, max: 200, col: "#2196F3" },
        { name: "Dig (Directional)", val: pData.dig, max: 60, col: "#9C27B0" },
        { name: "Kala (Time)", val: pData.kala, max: 120, col: "#FF9800" },
        { name: "Chesta (Motion)", val: pData.chesta, max: 60, col: "#009688" },
        { name: "Nais (Natural)", val: pData.naisargika, max: 60, col: "#795548" },
        { name: "Drishti (Aspect)", val: pData.drik, max: 60, col: "#607D8B" }
    ];

    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <button id="shadBackBtn" style="
            padding: 8px 15px; cursor: pointer; background: #333; 
            color: #fff; border: none; border-radius: 4px; 
            font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            ⬅ Back
        </button>
        
        <h3 style="margin:0; color:#333;">${tName} - Detailed Strength (Virupas)</h3>
        <div style="width:60px;"></div>
    </div>
    
    <div style="display:flex; align-items:flex-end; height:300px; gap:30px; border-bottom:2px solid #333; padding-bottom:10px; margin-top:30px;">`;

    components.forEach(c => {
        const h = Math.min((Math.abs(c.val) / c.max) * 100, 100); 
        html += `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
            <div style="font-size:14px; font-weight:bold; margin-bottom:5px;">${c.val}</div>
            <div style="width:100%; background:${c.col}; height:${h}%; border-radius:4px 4px 0 0; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);"></div>
            <div style="margin-top:10px; font-size:13px; font-weight:bold; text-align:center;">${c.name}</div>
        </div>`;
    });

    html += `</div>
    <div style="margin-top:40px; padding:15px; background:#e3f2fd; border-radius:8px; text-align:center; display:flex; justify-content:space-around;">
        <span style="font-size:16px;">Total (Virupas): <b>${pData.total}</b></span>
        <span style="font-size:16px;">Total (Rupas): <b>${pData.rupa}</b></span>
        <span style="font-size:16px;">Ratio: <b style="color:${pData.ratio>=1?'green':'red'}">${pData.ratio}</b></span>
    </div>`;

    content.innerHTML = html;

    document.getElementById("shadBackBtn").onclick = () => {
        window.hideShadTooltip();
        renderMainGraph(window.shadbalaDataCache);
    };
}

// 5. Tooltip Functions
window.handleShadTooltip = function(e, element) {
    const tip = document.getElementById("shadbalaTooltip");
    const content = element.getAttribute("data-tip-html");
    
    if(tip && content) {
        tip.innerHTML = content;
        tip.style.display = "block";
        tip.style.left = (e.clientX + 15) + "px";
        tip.style.top = (e.clientY + 15) + "px";
    }
};

window.hideShadTooltip = function() {
    const tip = document.getElementById("shadbalaTooltip");
    if(tip) tip.style.display = "none";
};

// 6. Drag Logic (Supports Resizing)
function makeDraggable(elmnt) {
    const header = document.getElementById("shadbalaHeader");
    if (!header) return;
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(e.target.id === "shadCloseBtn" || e.target.tagName === "SPAN") {
            if(e.target.title === "Close") return;
        }
        e = e || window.event;
        e.preventDefault();
        
        const rect = elmnt.getBoundingClientRect();
        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;

        document.onmouseup = closeDragElement;
        document.onmousemove = function(e) {
            elementDrag(e, shiftX, shiftY);
        };
    }

    function elementDrag(e, shiftX, shiftY) {
        e = e || window.event;
        e.preventDefault();
        elmnt.style.left = (e.clientX - shiftX) + "px";
        elmnt.style.top = (e.clientY - shiftY) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 7. Injection (Button Only)
(function() {
    function injectShadbalaElements() {
        if (document.getElementById("btnShadbala")) return;

        const btn = document.createElement("button");
        btn.id = "btnShadbala";
        btn.innerText = "💪 Shadbala";
        btn.onclick = loadShadbala;
        
        btn.style.marginLeft = "5px"; 
        btn.style.padding = "6px 10px";
        btn.style.background = "#673AB7"; 
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";

        const formbar = document.getElementById("formbar");
        const ashtakavargaBtn = document.getElementById("toggleAshtakavargaBtn");
        if (formbar) {
            if (ashtakavargaBtn && formbar.contains(ashtakavargaBtn)) {
                ashtakavargaBtn.insertAdjacentElement('afterend', btn);
            } else {
                formbar.appendChild(btn);
            }
        }
        
        const originalGenerate = window.generateChart;
        if (originalGenerate) {
            window.generateChart = async function(...args) {
                if (originalGenerate.constructor.name === "AsyncFunction") {
                    await originalGenerate.apply(this, args);
                } else {
                    originalGenerate.apply(this, args);
                }
                const container = document.getElementById("shadbalaContainer");
                if (container && container.style.display !== "none") {
                    loadShadbala();
                }
            };
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectShadbalaElements);
    } else {
        injectShadbalaElements();
    }
})();
