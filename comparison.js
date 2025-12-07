/**
 * comparison.js - Final Fixes
 */

let SAVED_CHARTS = [];
// Short Names Map
const SHORT_NAMES = {
    "சூரியன்": "சூரி", "சந்திரன்": "சந்", "செவ்வாய்": "செவ்", "புதன்": "புத",
    "குரு": "குரு", "சுக்கிரன்": "சுக்", "சனி": "சனி", "ராகு": "ராகு", "கேது": "கேது",
    "லக்னம்": "லக்", "மாந்தி": "மா"
};

document.addEventListener("DOMContentLoaded", function() {
    fetch('/list_charts').then(r => r.json()).then(res => {
        if(res.status === "ok") { SAVED_CHARTS = res.charts; populateCompNameList(); }
    });

    const formBar = document.getElementById("formbar");
    if (formBar) {
        const oldBtn = document.getElementById("compareBtn");
        if(oldBtn) oldBtn.remove();
        const btn = document.createElement("button");
        btn.id = "compareBtn";
        btn.innerHTML = "💑 திருமணப் பொருத்தம்"; 
        btn.style.background = "#E91E63"; btn.style.color = "white";
        btn.style.marginLeft = "10px"; btn.style.cursor = "pointer";
        btn.onclick = openCompModal;
        formBar.appendChild(btn); 
    }
    injectCompModal();
});

function injectCompModal() {
    const modalHTML = `
    <div id="comparisonModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; font-family:'Noto Sans Tamil', sans-serif;">
        <div style="background:white; margin:20px auto; max-width:1400px; border-radius:8px; overflow:hidden;">
            <div style="background:#000080; color:white; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">💑 ஜாதகப் பொருத்தம் Comparison</h3>
                <button onclick="document.getElementById('comparisonModal').style.display='none'" style="background:#ff4d4d; border:none; color:white; padding:5px 15px; cursor:pointer;">மூடு X</button>
            </div>

            <div style="padding:15px; background:#e0e0e0; display:flex; gap:20px; justify-content:center; align-items:start; flex-wrap:wrap;">
                <div style="background:white; padding:15px; border:1px solid #999; border-top: 4px solid #000080; width: 320px;">
                    <strong style="color:#000080; display:block; margin-bottom:10px;">ஆண் (Boy):</strong>
                    <label style="font-size:12px;">பெயர் (Name):</label>
                    <input id="cBoyName" list="compSavedList" placeholder="Select Saved Name" style="width:100%; padding:5px; margin-bottom:8px;" onchange="autoFill('Boy')">
                    <div style="display:flex; gap:5px; margin-bottom:8px;">
                        <input type="date" id="cBoyDate" style="flex:1; padding:5px;">
                        <input type="time" id="cBoyTime" style="flex:1; padding:5px;" step="1">
                    </div>
                    <label style="font-size:12px;">பிறந்த இடம் (Place):</label>
                    <input id="cBoyPlace" list="placesList" placeholder="City" style="width:100%; padding:5px;">
                </div>
                <div style="background:white; padding:15px; border:1px solid #999; border-top: 4px solid #E91E63; width: 320px;">
                    <strong style="color:#E91E63; display:block; margin-bottom:10px;">பெண் (Girl):</strong>
                    <label style="font-size:12px;">பெயர் (Name):</label>
                    <input id="cGirlName" list="compSavedList" placeholder="Select Saved Name" style="width:100%; padding:5px; margin-bottom:8px;" onchange="autoFill('Girl')">
                    <div style="display:flex; gap:5px; margin-bottom:8px;">
                        <input type="date" id="cGirlDate" style="flex:1; padding:5px;">
                        <input type="time" id="cGirlTime" style="flex:1; padding:5px;" step="1">
                    </div>
                    <label style="font-size:12px;">பிறந்த இடம் (Place):</label>
                    <input id="cGirlPlace" list="placesList" placeholder="City" style="width:100%; padding:5px;">
                </div>
                <button onclick="runComparison()" style="background:#000080; color:white; border:none; padding:15px 30px; font-weight:bold; cursor:pointer; align-self:center; font-size:16px; border-radius:4px;">பொருத்தம் பார்</button>
            </div>
            <datalist id="compSavedList"></datalist>

            <div id="compResults" style="display:none; padding:20px; background:#eef;">
                <div style="display:flex; gap:30px; justify-content:center; flex-wrap:wrap;">
                    <div style="flex:1; min-width:500px; max-width:600px;">
                        <div class="panchang-box" id="boyPanchang"></div>
                        <div class="chart-wrapper">
                            <div class="chart-container">
                                <div id="boyChartGrid" class="si-grid"></div>
                                <div class="center-info" id="boyCenterInfo"></div>
                            </div>
                        </div>
                    </div>
                    <div style="flex:1; min-width:500px; max-width:600px;">
                        <div class="panchang-box" id="girlPanchang"></div>
                        <div class="chart-wrapper">
                            <div class="chart-container">
                                <div id="girlChartGrid" class="si-grid"></div>
                                <div class="center-info" id="girlCenterInfo"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:20px; background:white; padding:15px; border:1px solid #ccc;">
                    <h3 style="margin-top:0; border-bottom:2px solid #E91E63; display:inline-block;">பொருத்த அறிக்கை</h3>
                    <span id="finalScore" style="float:right; font-size:20px; font-weight:bold; color:#000080;"></span>
                    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                        <thead><tr style="background:#ddd;"><th style="padding:8px; border:1px solid #999;">பொருத்தம்</th><th style="padding:8px; border:1px solid #999;">நிலை</th></tr></thead>
                        <tbody id="matchTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <style>
        .panchang-box { background: #ffffe0; border: 1px solid #888; padding: 5px; margin-bottom: 5px; font-size: 14px; }
        .panchang-table { width: 100%; border-collapse: collapse; }
        .panchang-table td { border: 1px solid #ccc; padding: 5px; color: #000080; font-weight: bold; }
        .panchang-label { color: #555; font-weight: normal; }

        .chart-wrapper { display: flex; justify-content: center; }
        /* 500PX CHART */
        .chart-container { 
            position: relative; 
            border: 2px solid #000080; 
            background: #fff; 
            width: 500px; 
            height: 500px; 
        }
        .si-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 0; width: 100%; height: 100%;
        }
        .si-box {
            background: #fff; 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-size: 16px; /* LARGER FONT */
            font-weight: bold; text-align: center; 
            border: 1px solid #000080; 
            overflow: hidden;
        }
        .center-info {
            position: absolute; top: 25%; left: 25%; width: 50%; height: 50%;
            background: #ffffff; color: #000;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            text-align: center; 
            font-size: 16px; /* LARGER CENTER FONT */
            z-index: 10;
            border: 2px solid #000080;
            box-sizing: border-box;
            padding: 5px;
        }
        .planet-txt { margin: 2px 0; white-space: nowrap; font-size: 15px; }
        .planet-deg { font-size: 11px; color: #555; font-weight: normal; }
        .status-good { color: green; font-weight: bold; } .status-bad { color: red; font-weight: bold; } .status-avg { color: orange; font-weight: bold; }
    </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function populateCompNameList() {
    const dl = document.getElementById("compSavedList");
    if(!dl) return; dl.innerHTML = "";
    SAVED_CHARTS.forEach(c => { const opt = document.createElement("option"); opt.value = c.name; dl.appendChild(opt); });
}

function autoFill(gender) {
    const nameVal = document.getElementById('c'+gender+'Name').value;
    const chart = SAVED_CHARTS.find(c => c.name === nameVal);
    if(chart) {
        document.getElementById('c'+gender+'Date').value = chart.date;
        document.getElementById('c'+gender+'Time').value = chart.time;
        const pInput = document.getElementById('c'+gender+'Place');
        if(chart.place_json && chart.place_json.city) pInput.value = chart.place_json.city;
    }
}

function openCompModal() { document.getElementById("comparisonModal").style.display = "block"; }

function getPlaceCoords(placeStr) {
    let coords = { lat: 13.08, lon: 80.27, tz: 5.5 }; 
    if(!placeStr) return coords;
    const placesList = document.getElementById("placesList");
    if(placesList) {
        for (let i = 0; i < placesList.options.length; i++) {
            if (placesList.options[i].value === placeStr) {
                coords.lat = parseFloat(placesList.options[i].getAttribute('data-lat'));
                coords.lon = parseFloat(placesList.options[i].getAttribute('data-lon'));
                coords.tz = parseFloat(placesList.options[i].getAttribute('data-tz'));
                break;
            }
        }
    }
    return coords;
}

function runComparison() {
    const bName = document.getElementById("cBoyName").value;
    const bD = document.getElementById("cBoyDate").value;
    const bT = document.getElementById("cBoyTime").value;
    const bP = document.getElementById("cBoyPlace").value;
    const gName = document.getElementById("cGirlName").value;
    const gD = document.getElementById("cGirlDate").value;
    const gT = document.getElementById("cGirlTime").value;
    const gP = document.getElementById("cGirlPlace").value;

    if(!bD || !gD) { alert("Please select dates."); return; }
    const bCoords = getPlaceCoords(bP);
    const gCoords = getPlaceCoords(gP);
    const bSplit = bD.split("-"); const bTSplit = bT.split(":");
    const gSplit = gD.split("-"); const gTSplit = gT.split(":");

    fetch("/compare_charts_view", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            boy: { name: bName, place_name: bP, year: bSplit[0], month: bSplit[1], day: bSplit[2], hour: bTSplit[0], minute: bTSplit[1], lat: bCoords.lat, lon: bCoords.lon, tz: bCoords.tz },
            girl: { name: gName, place_name: gP, year: gSplit[0], month: gSplit[1], day: gSplit[2], hour: gTSplit[0], minute: gTSplit[1], lat: gCoords.lat, lon: gCoords.lon, tz: gCoords.tz }
        })
    })
    .then(r => r.json())
    .then(res => {
        if(res.status === "ok") {
            const d = res.data;
            document.getElementById("compResults").style.display = "block";
            renderComparisonChart("boyChartGrid", "boyCenterInfo", d.boy, bName);
            renderComparisonChart("girlChartGrid", "girlCenterInfo", d.girl, gName);
            renderComparisonPanchang("boyPanchang", "ஆண்", d.boy);
            renderComparisonPanchang("girlPanchang", "பெண்", d.girl);
            
            document.getElementById("finalScore").innerText = "மதிப்பெண்: " + d.match_report.total_score + " / 10";
            let html = "";
            d.match_report.matches.forEach(m => {
                let cls = "status-good"; let icon = "✅";
                if(m.status.includes("இல்லை") || m.status.includes("தோஷம்") || m.status.includes("Bad")) { cls = "status-bad"; icon = "❌"; }
                else if(m.status.includes("மத்திமம்")) { cls = "status-avg"; icon = "⚠️"; }
                html += `<tr><td style="border:1px solid #999; padding:5px;">${m.name}</td><td style="border:1px solid #999; padding:5px;" class="${cls}">${icon} ${m.status}</td></tr>`;
            });
            document.getElementById("matchTableBody").innerHTML = html;
        } else { alert("Error: " + res.message); }
    });
}

function renderComparisonPanchang(divId, title, data) {
    const p = data.panchangam || {};
    const html = `
        <div style="text-align:center; font-weight:bold; color:#000080; border-bottom:1px solid #aaa; margin-bottom:5px;">
            ${title} ஜாதகம் (${data.place}) - ${p.tamil_date}
        </div>
        <table class="panchang-table">
            <tr>
                <td><span class="panchang-label">நட்சத்திரம்:</span> ${p.nakshatra}</td>
                <td><span class="panchang-label">சூரிய உதயம்:</span> ${p.sunrise}</td>
            </tr>
            <tr>
                <td><span class="panchang-label">திதி:</span> ${p.thithi}</td>
                <td><span class="panchang-label">சூரிய அஸ்தமனம்:</span> ${p.sunset}</td>
            </tr>
            <tr>
                <td><span class="panchang-label">யோகம்:</span> ${p.yogam}</td>
                <td><span class="panchang-label">அயனாம்சம்:</span> ${p.ayanamsa}</td>
            </tr>
            <tr>
                <td><span class="panchang-label">கரணம்:</span> ${p.karanam}</td>
                <td><span class="panchang-label">மங்களிக் தோஷம்:</span> ${data.manglik}</td>
            </tr>
        </table>
    `;
    document.getElementById(divId).innerHTML = html;
}

function renderComparisonChart(gridId, centerId, data, nameOverride) {
    const order = ["மீனம்","மேஷம்","ரிஷபம்","மிதுனம்","கும்பம்",null,null,"கடகம்","மகரம்",null,null,"சிம்மம்","தனுசு","விருச்சிகம்","துலாம்","கன்னி"];
    const map = {}; let lagna = "";
    
    data.planets.forEach(p => { 
        if(!map[p.rasi]) map[p.rasi]=[]; 
        let c = "black";
        if(["சூரியன்","செவ்வாய்"].includes(p.name)) c = "red";
        else if(["குரு","புதன்"].includes(p.name)) c = "green";
        else if(p.name === "லக்னம்") { c = "green"; lagna = p.rasi; }
        
        let shortName = SHORT_NAMES[p.name] || p.name;
        if(p.is_retro) shortName = `(${shortName})`;
        
        map[p.rasi].push(`
            <div class="planet-txt" style="color:${c}">
                ${shortName} <span class="planet-deg">${p.short_deg || ""}</span>
            </div>
        `);
    });

    const el = document.getElementById(gridId); el.innerHTML = "";
    order.forEach(r => {
        if(!r) el.innerHTML += `<div style="background:transparent; border:none;"></div>`;
        else el.innerHTML += `<div class="si-box">${(map[r]||[]).join("")}</div>`;
    });

    const displayName = nameOverride || "ராசி";
    const p = data.panchangam || {};
    
    document.getElementById(centerId).innerHTML = `
        <b>${displayName}</b><br>${data.dob} / ${data.time}<br>
        <small style="color:green">Lagna: ${lagna}</small>
        <div style="border-top:1px solid #ccc; margin-top:4px; padding-top:2px;">
            <div style="font-size:13px; color:#555;">${p.dasha_balance}</div>
            <div style="font-size:14px; color:#000080; margin-top:2px; font-weight:bold;">${p.dasha_chain}</div>
        </div>
    `;
}