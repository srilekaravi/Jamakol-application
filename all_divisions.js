document.addEventListener("DOMContentLoaded", function() {
    // 1. Inject Option into Chart Type Dropdown
    const chartSelect = document.getElementById("chartType");
    if (chartSelect && !chartSelect.querySelector("option[value='all16']")) {
        const opt = document.createElement("option");
        opt.value = "all16";
        opt.textContent = "🔢 All 16 Divisions";
        opt.style.fontWeight = "bold";
        opt.style.color = "#4527a0"; // Deep purple to stand out
        chartSelect.appendChild(opt);
    }

    // 2. Hook for functionality
    hookGenerateChart();
});

// Store state for minimize/restore
let previousState = { top: "", left: "", width: "", height: "", transform: "" };

function hookGenerateChart() {
    // Save original function
    const originalGenerateChart = window.generateChart;

    // Overwrite with our logic
    window.generateChart = function(...args) {
        const chartType = document.getElementById("chartType").value;

        // CASE 1: User selected "All 16 Divisions"
        if (chartType === "all16") {
            openAllDivisions();
            return; // STOP here. Do not refresh the background chart.
        }

        // CASE 2: Normal Chart Generation
        if (typeof originalGenerateChart === "function") {
            originalGenerateChart.apply(this, args);
        }

        // CASE 3: Update Popup if it is open (Even if minimized!)
        const modal = document.getElementById("divisionalModal");
        
        // FIX 1: Removed "!modal.classList.contains('minimized')" check
        // Now it updates even when minimized.
        if (modal && modal.style.display !== "none") {
            updateDivisionalHeader();
            fetchDivisionalData();
        }
    };
}

function openAllDivisions() {
    let modal = document.getElementById("divisionalModal");
    if (!modal) {
        createDivisionalModal();
        modal = document.getElementById("divisionalModal");
    }
    
    // Ensure it's not minimized
    modal.classList.remove("minimized");
    document.getElementById("btn-restore").style.display = "none";
    document.getElementById("btn-minimize").style.display = "inline-block";
    
    modal.style.display = "flex";
    
    // Initial Centering
    modal.style.top = "20px";
    modal.style.left = "50%";
    modal.style.transform = "translateX(-50%)";
    
    // Reset dimensions
    modal.style.height = "85vh"; 
    modal.style.width = "95vw";
    
    // Show content
    document.getElementById("divisionalContent").style.display = "grid";
    
    updateDivisionalHeader();
    fetchDivisionalData();
}

function updateDivisionalHeader() {
    const name = document.getElementById("name").value || "Unknown";
    const date = document.getElementById("date").value || "";
    const time = document.getElementById("time").value || "";
    
    const titleEl = document.getElementById("divisionalTitleInfo");
    if (titleEl) {
        titleEl.innerHTML = `
            <span style="font-weight:bold; font-size:15px;">🔢 Shodashvarga</span>
            <span style="margin-left:15px; font-weight:normal; font-size:13px; opacity:0.8; border-left:1px solid rgba(255,255,255,0.4); padding-left:10px;">
                👤 ${name} &nbsp; 📅 ${date} &nbsp; ⏰ ${time}
            </span>
        `;
    }
}

function createDivisionalModal() {
    const html = `
    <div id="divisionalModal" class="draggable-window" style="
        position: fixed; 
        top: 20px; 
        left: 50%; 
        transform: translateX(-50%);
        width: 95vw; 
        max-width: 1400px; 
        height: 85vh;
        background: #f4f4f9; 
        border: 1px solid #444; 
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        z-index: 2000; 
        display: none; 
        flex-direction: column; 
        border-radius: 6px;
        font-family: 'Noto Sans Tamil', sans-serif;
    ">
        <div class="window-header" style="
            background: #4527a0; 
            color: white; 
            padding: 8px 12px; 
            cursor: move;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            user-select: none;
            border-bottom: 2px solid #311b92;
            height: 40px; 
            box-sizing: border-box;
        ">
            <div id="divisionalTitleInfo" style="display:flex; align-items:center; overflow:hidden; white-space:nowrap;"></div>
            
            <div style="display:flex; gap:10px;">
                <button id="btn-restore" onclick="toggleMinimize()" title="Restore" style="display:none; background:transparent; border:none; color:white; font-weight:bold; cursor:pointer; font-size:16px;"> &#10064; </button>
                <button id="btn-minimize" onclick="toggleMinimize()" title="Minimize" style="background:transparent; border:none; color:white; font-weight:bold; cursor:pointer; font-size:16px; margin-top:-5px;"> _ </button>
                <button onclick="closeWindow('divisionalModal')" title="Close" style="background:#d32f2f; border:none; color:white; width:24px; height:24px; border-radius:2px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px;">&#10005;</button>
            </div>
        </div>

        <div id="divisionalContent" style="
            flex: 1; 
            overflow-y: auto; 
            padding: 15px; 
            background: #e8eaf6;
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 15px;
            align-content: start;
        ">
            <div style="text-align:center; padding:20px; color:#666;">Loading charts...</div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    makeDraggable(document.getElementById("divisionalModal"));
}

function closeWindow(id) { 
    document.getElementById(id).style.display = "none"; 
    // Reset dropdown to Rasi so user can generate normal chart again
    const select = document.getElementById("chartType");
    if(select.value === "all16") select.value = "rasi";
}

function toggleMinimize() {
    const el = document.getElementById("divisionalModal");
    const content = document.getElementById("divisionalContent");
    const btnMin = document.getElementById("btn-minimize");
    const btnRest = document.getElementById("btn-restore");

    if (el.classList.contains("minimized")) {
        // Restore
        el.classList.remove("minimized");
        content.style.display = "grid";
        
        el.style.width = previousState.width || "95vw";
        el.style.height = previousState.height || "85vh";
        el.style.top = previousState.top;
        el.style.left = previousState.left;
        el.style.transform = previousState.transform;
        
        el.style.bottom = "auto"; 
        el.style.borderRadius = "6px";
        
        btnMin.style.display = "inline-block";
        btnRest.style.display = "none";
    } else {
        // Minimize
        previousState.top = el.style.top;
        previousState.left = el.style.left;
        previousState.width = el.style.width;
        previousState.height = el.style.height;
        previousState.transform = el.style.transform;

        el.classList.add("minimized");
        content.style.display = "none"; 
        
        el.style.height = "auto";
        el.style.width = "300px";
        el.style.top = "auto";
        el.style.left = "0";
        el.style.bottom = "0";
        el.style.transform = "none"; 
        el.style.borderRadius = "0 6px 0 0";
        
        btnMin.style.display = "none";
        btnRest.style.display = "inline-block";
    }
}

function fetchDivisionalData() {
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    if (!date || !time) return;

    const place = document.getElementById("placeSearch") || document.getElementById("place");
    const payload = {
        date: date,
        time: time,
        lat: place.getAttribute("data-lat") || 13.0827,
        lon: place.getAttribute("data-lon") || 80.2707,
        tz: place.getAttribute("data-tz") || 5.5,
        ayanamsa: document.getElementById("ayanamsa").value
    };

    fetch("/get_all_divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if(data.status === "ok") {
            renderAllCharts(data.charts);
        } else {
            document.getElementById("divisionalContent").innerHTML = "<p style='color:red;'>Error: " + data.message + "</p>";
        }
    })
    .catch(err => console.error(err));
}

function renderAllCharts(charts) {
    const container = document.getElementById("divisionalContent");
    container.innerHTML = "";
    
    const order = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
    const titles = {
        1: "Rasi (D1)", 2: "Hora (D2)", 3: "Drekkana (D3)", 4: "Chaturthamsha (D4)",
        7: "Saptamsa (D7)", 9: "Navamsa (D9)", 10: "Dasamsa (D10)", 12: "Dwadasamsa (D12)",
        16: "Shodasamsa (D16)", 20: "Vimsamsa (D20)", 24: "Chaturvimsamsa (D24)",
        27: "Saptavimsamsa (D27)", 30: "Trimsamsa (D30)", 40: "Khavedamsa (D40)",
        45: "Akshavedamsa (D45)", 60: "Shastiamsa (D60)"
    };

    order.forEach(d => {
        const key = "D" + d;
        if (charts[key]) {
            container.innerHTML += generateMiniChart(titles[d], charts[key]);
        }
    });
}

function generateMiniChart(title, planetsMap) {
    const rasiOrder = [
        "மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்",
        "கும்பம்", null, null, "கடகம்",
        "மகரம்", null, null, "சிம்மம்",
        "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"
    ];

    let gridHtml = "";
    rasiOrder.forEach(rasi => {
        if (rasi === null) {
            gridHtml += `<div style="background:#ffffff;"></div>`; 
        } else {
            const planets = planetsMap[rasi] || [];
            const isLagna = planets.some(p => p.includes("லக்"));
            const bg = isLagna ? "#fff9c4" : "#ffffff"; 
            
            const pStr = planets.map(p => {
                let color = "#333";
                let weight = "400";
                if (p.includes("லக்")) { color = "#d32f2f"; weight = "700"; }
                else if (p.includes("சூரி")) color = "#e65100";
                else if (p.includes("சந்")) color = "#1565c0";
                return `<span style="display:block; font-size:11px; line-height:1.2; color:${color}; font-weight:${weight};">${p}</span>`;
            }).join("");
            
            gridHtml += `
            <div style="border:1px solid #ccc; background:${bg}; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden;">
                ${pStr}
            </div>`;
        }
    });

    return `
    <div style="background:white; border:1px solid #bbb; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.15); display:flex; flex-direction:column; height:100%;">
        <div style="text-align:center; font-weight:600; font-size:12px; padding:5px; background:#f0f0f0; border-bottom:1px solid #ccc;">${title}</div>
        <div style="flex:1; margin:5px; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(4,1fr); gap:1px; background:#999; border:1px solid #999; aspect-ratio:1/1; position:relative;">
            ${gridHtml}
            
            <div style="
                position: absolute;
                top: 25%;
                left: 25%;
                width: 50%;
                height: 50%;
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 5;
                pointer-events: none;
            ">
                <img src="/static/om.png" style="width: 25%; height: auto; opacity: 0.8;" alt="🕉️">
            </div>
        </div>
    </div>
    `;
}

// --- Smooth Drag ---
function makeDraggable(elmnt) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    const header = elmnt.querySelector(".window-header");

    if (header) {
        header.onmousedown = dragMouseDown;
        header.ontouchstart = dragTouchStart; 
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        if(elmnt.classList.contains("minimized")) return;

        startX = e.clientX;
        startY = e.clientY;

        const rect = elmnt.getBoundingClientRect();
        elmnt.style.transform = "none"; 
        elmnt.style.left = rect.left + "px";
        elmnt.style.top = rect.top + "px";
        
        initialLeft = rect.left;
        initialTop = rect.top;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        const shiftX = e.clientX - startX;
        const shiftY = e.clientY - startY;
        elmnt.style.left = (initialLeft + shiftX) + "px";
        elmnt.style.top = (initialTop + shiftY) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
    
    function dragTouchStart(e) {
        if(elmnt.classList.contains("minimized")) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        const rect = elmnt.getBoundingClientRect();
        elmnt.style.transform = "none";
        elmnt.style.left = rect.left + "px";
        elmnt.style.top = rect.top + "px";
        initialLeft = rect.left;
        initialTop = rect.top;

        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
    }
    
    function elementTouchDrag(e) {
        e.preventDefault(); 
        const touch = e.touches[0];
        const shiftX = touch.clientX - startX;
        const shiftY = touch.clientY - startY;
        elmnt.style.left = (initialLeft + shiftX) + "px";
        elmnt.style.top = (initialTop + shiftY) + "px";
    }
}