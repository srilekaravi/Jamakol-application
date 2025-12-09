/* static/js/shadbala.js */

// Global state
window.shadbalaDataCache = null;

// 1. Data Loading
async function loadShadbala() {
    // Check if minimized (in taskbar)
    const taskbarItem = document.getElementById("minimized-shadbala-item");
    if (taskbarItem) {
        taskbarItem.click(); // Restore it
        return;
    }

    // Check if hidden but exists
    const container = document.getElementById("shadbalaContainer");
    if (container && container.style.display === "none") {
        container.style.display = "flex";
        // Ensure it's brought to front
        container.style.zIndex = "20000";
        return;
    }

    let payload = {};
    // Use existing data collection if available
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

// 2. UI Rendering
function renderShadbalaUI(data) {
    let container = document.getElementById("shadbalaContainer");
    
    // Create Container if Missing
    if (!container) {
        container = document.createElement("div");
        container.id = "shadbalaContainer";
        document.body.appendChild(container);

        // Default Dimensions
        const isMobile = window.innerWidth < 768;
        const startW = isMobile ? window.innerWidth * 0.95 : 900; 
        const startH = isMobile ? window.innerHeight * 0.70 : 600; 
        
        const startLeft = (window.innerWidth - startW) / 2;
        const startTop = (window.innerHeight - startH) / 2;

        container.style.width = startW + "px";
        container.style.height = startH + "px";
        container.style.left = startLeft + "px";
        container.style.top = startTop + "px";
    }

    // Reset Display & Styles
    container.style.display = "flex";
    Object.assign(container.style, {
        flexDirection: "column", 
        position: "fixed",
        backgroundColor: "#fff",
        border: "1px solid #ccc", borderRadius: "8px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)", 
        zIndex: "20000", // Very high z-index
        resize: "both",         
        overflow: "hidden",     
        minWidth: "300px", minHeight: "400px",
        maxWidth: "98vw", maxHeight: "98vh",
    });

    // Setup Tooltip
    let tooltip = document.getElementById("shadbalaTooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "shadbalaTooltip";
        Object.assign(tooltip.style, {
            position: "fixed", display: "none", background: "rgba(0, 0, 0, 0.95)",
            color: "#fff", padding: "10px", borderRadius: "6px", fontSize: "13px",
            zIndex: "20001", pointerEvents: "none", boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            border: "1px solid #777", minWidth: "150px"
        });
        document.body.appendChild(tooltip);
    }

    // Header HTML
    // Note: We use specific IDs for buttons to attach events later
    let html = `
    <div id="shadbalaHeader" style="
        flex: 0 0 auto;
        padding: 12px 15px; 
        cursor: move; 
        background: #673AB7; 
        color: #fff; 
        border-radius: 8px 8px 0 0; 
        font-weight: bold; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        user-select: none; 
        touch-action: none;"> 
        
        <span style="pointer-events: none; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 70%;">
            💪 Shadbala Strength
        </span>
        
        <div style="display: flex; align-items: center; gap: 15px;">
            <div id="shadMinimizeBtn" style="cursor: pointer; font-size: 28px; line-height: 20px; font-weight: bold; width: 30px; text-align: center;">&minus;</div>
            <div id="shadCloseBtn" style="cursor: pointer; font-size: 28px; line-height: 20px; font-weight: bold; width: 30px; text-align: center;">&times;</div>
        </div>
    </div>
    
    <div id="shadbalaContent" style="
        flex: 1 1 auto; padding: 20px; overflow-y: auto; position: relative; background: #fff;">
    </div>`;

    container.innerHTML = html;

    // Attach Content
    renderMainGraph(data);

    // --- BUTTON EVENTS ---
    // We attach these specifically to prevent drag interference
    const btnMin = document.getElementById("shadMinimizeBtn");
    const btnClose = document.getElementById("shadCloseBtn");

    const stopAndAct = (e, action) => {
        e.preventDefault(); 
        e.stopPropagation();
        action();
    };

    // Minimize Logic
    btnMin.onmousedown = (e) => stopAndAct(e, () => minimizeShadbalaWindow(container));
    btnMin.ontouchstart = (e) => stopAndAct(e, () => minimizeShadbalaWindow(container));

    // Close Logic
    btnClose.onmousedown = (e) => stopAndAct(e, () => {
        window.hideShadTooltip();
        container.style.display = 'none';
    });
    btnClose.ontouchstart = (e) => stopAndAct(e, () => {
        window.hideShadTooltip();
        container.style.display = 'none';
    });

    // Initialize Dragging
    makeDraggable(container);
}

// 3. Taskbar & Minimize
function minimizeShadbalaWindow(container) {
    window.hideShadTooltip();
    
    // Hide Main Window
    container.style.display = "none";

    // Create/Find Taskbar
    let taskbar = document.getElementById("appTaskbar");
    if (!taskbar) {
        taskbar = document.createElement("div");
        taskbar.id = "appTaskbar";
        Object.assign(taskbar.style, {
            position: "fixed", bottom: "0", left: "0", right: "0",
            height: "0", // Wrapper has 0 height to not block content
            zIndex: "20002", 
            display: "flex", justifyContent: "flex-start", alignItems: "flex-end",
            pointerEvents: "none", // Let clicks pass through empty space
            paddingLeft: "10px"
        });
        document.body.appendChild(taskbar);
    }

    // Create Taskbar Item (if not exists)
    if (document.getElementById("minimized-shadbala-item")) return;

    const item = document.createElement("div");
    item.id = "minimized-shadbala-item";
    item.innerHTML = "💪 Shadbala";
    
    Object.assign(item.style, {
        background: "#673AB7", color: "white", 
        padding: "12px 20px",
        borderRadius: "8px 8px 0 0", 
        cursor: "pointer", 
        fontWeight: "bold",
        fontSize: "14px",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.3)", 
        marginRight: "10px",
        pointerEvents: "auto", // Enable clicks on the button itself
        border: "1px solid #512DA8"
    });

    // Restore Action
    item.onclick = () => {
        container.style.display = "flex";
        item.remove();
    };

    taskbar.appendChild(item);
}

// 4. Content Renderers (Main Graph & Details)
function renderMainGraph(data) {
    const content = document.getElementById("shadbalaContent");
    const tamilMap = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Merc": "புதன்", "Jup": "குரு", "Ven": "சுக்கிரன்", "Sat": "சனி" };

    let html = `<div style="display:flex; align-items:flex-end; height:220px; gap:10px; margin-bottom:30px; border-bottom:1px solid #ccc; padding-bottom:10px; overflow-x: auto;">`;
    
    data.forEach((p, index) => {
        const h = Math.min((p.rupa / 9) * 100, 100);
        const col = p.ratio >= 1.0 ? "#4CAF50" : "#F44336";
        const tName = tamilMap[p.planet] || p.planet; 
        
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
            </table>`.replace(/"/g, '&quot;');

        html += `
        <div class="shad-bar-wrap" data-index="${index}" data-tip-html="${tipContent}"
             style="flex:1; min-width: 45px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
            <div style="font-size:12px; font-weight:bold; margin-bottom:2px;">${p.rupa}</div>
            <div class="shad-bar" style="width:100%; background:${col}; height:${h}%; border-radius:4px 4px 0 0; cursor: pointer; transition: opacity 0.2s; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);"
                 onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1"></div>
            <div style="margin-top:5px; font-size:12px; font-weight:bold; white-space:nowrap;">${tName}</div>
        </div>`;
    });
    html += `</div>`;
    
    // Table
    html += `<div style="overflow-x:auto;">
             <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center; min-width: 500px;">
             <tr style="background:#f5f5f5; height:35px; border-bottom:2px solid #ddd;">
                <th style="padding:5px; text-align:left;">Graha</th>
                <th>Sthana</th><th>Dig</th><th>Kala</th>
                <th>Chesta</th><th>Nais</th><th>Drishti</th>
                <th style="background:#e3f2fd;">Total</th>
                <th>Ratio</th>
             </tr>`;
             
    data.forEach(p => {
        const tName = tamilMap[p.planet] || p.planet;
        html += `<tr style="height:32px; border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:5px; text-align:left;">${tName}</td>
                    <td>${p.sthana}</td><td>${p.dig}</td><td>${p.kala}</td>
                    <td>${p.chesta}</td><td>${p.naisargika}</td><td>${p.drik}</td>
                    <td style="background:#e3f2fd; font-weight:bold;">${p.total}</td>
                    <td style="color:${p.ratio>=1?'green':'red'}; font-weight:bold;">${p.ratio}</td>
                 </tr>`;
    });
    html += `</table></div>`;

    content.innerHTML = html;

    const wrappers = content.querySelectorAll(".shad-bar-wrap");
    wrappers.forEach(wrap => {
        wrap.onmousemove = (e) => window.handleShadTooltip(e, wrap);
        wrap.onmouseleave = () => window.hideShadTooltip();
        wrap.onclick = () => {
            window.hideShadTooltip();
            renderDetailView(data[wrap.getAttribute("data-index")]);
        };
    });
}

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
        <button id="shadBackBtn" style="padding: 6px 12px; cursor: pointer; background: #333; color: #fff; border: none; border-radius: 4px; font-weight: bold;">⬅ Back</button>
        <h3 style="margin:0; color:#333; font-size:16px;">${tName} - Detailed</h3>
        <div style="width:60px;"></div>
    </div>
    <div style="display:flex; align-items:flex-end; height:300px; gap:10px; border-bottom:2px solid #333; padding-bottom:10px; margin-top:30px; overflow-x: auto;">`;

    components.forEach(c => {
        const h = Math.min((Math.abs(c.val) / c.max) * 100, 100); 
        html += `
        <div style="flex:1; min-width: 50px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
            <div style="font-size:13px; font-weight:bold; margin-bottom:5px;">${c.val}</div>
            <div style="width:100%; background:${c.col}; height:${h}%; border-radius:4px 4px 0 0; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);"></div>
            <div style="margin-top:10px; font-size:11px; font-weight:bold; text-align:center;">${c.name.split(" ")[0]}</div>
        </div>`;
    });

    html += `</div>
    <div style="margin-top:20px; padding:15px; background:#e3f2fd; border-radius:8px; text-align:center;">
        <span style="font-size:14px; margin:0 10px;">Total: <b>${pData.total}</b></span>
        <span style="font-size:14px; margin:0 10px;">Ratio: <b style="color:${pData.ratio>=1?'green':'red'}">${pData.ratio}</b></span>
    </div>`;

    content.innerHTML = html;

    document.getElementById("shadBackBtn").onclick = () => {
        renderMainGraph(window.shadbalaDataCache);
    };
}

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

// 5. DRAG LOGIC (Fixed for Touch & Mouse)
function makeDraggable(elmnt) {
    var header = document.getElementById("shadbalaHeader");
    if (!header) return;

    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    // --- MOUSE ---
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        // IGNORE if clicking buttons
        if(e.target.closest('#shadCloseBtn') || e.target.closest('#shadMinimizeBtn')) return;
        
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    // --- TOUCH (Mobile) ---
    // Passive: false is VITAL for preventing scrolling while dragging
    header.addEventListener('touchstart', dragTouchStart, { passive: false });

    function dragTouchStart(e) {
        if(e.target.closest('#shadCloseBtn') || e.target.closest('#shadMinimizeBtn')) return;

        e.preventDefault(); // Stop scroll
        var touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        
        // Listen on document to catch swipes outside header
        document.addEventListener('touchend', closeDragTouch, { passive: false });
        document.addEventListener('touchmove', elementDragTouch, { passive: false });
    }

    function elementDragTouch(e) {
        e.preventDefault(); // Stop scroll
        var touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragTouch() {
        document.removeEventListener('touchend', closeDragTouch);
        document.removeEventListener('touchmove', elementDragTouch);
    }
}

// 6. Injection
(function() {
    function injectShadbalaElements() {
        if (document.getElementById("btnShadbala")) return;

        const btn = document.createElement("button");
        btn.id = "btnShadbala";
        btn.innerText = "💪 Shadbala";
        btn.onclick = loadShadbala;
        
        // Button Styles
        Object.assign(btn.style, {
            marginLeft: "5px", padding: "6px 10px",
            background: "#673AB7", color: "white",
            border: "none", borderRadius: "4px",
            cursor: "pointer", fontSize: "14px"
        });

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
                // Only reload if visible
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
