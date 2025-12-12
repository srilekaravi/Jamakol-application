/**
 * comparison.js - FIXED: Compact Print Layout (A4 Fit) + External Search
 * 1. FIX: Print CSS tuned to fit everything on one A4 page.
 * 2. FIX: "Planet Relationship" table now fits by reducing cell padding.
 * 3. KEEPS: Chart Grid size remains unchanged (as requested).
 */

let SAVED_CHARTS = [];
const SHORT_NAMES = { "சூரியன்": "சூரி", "சந்திரன்": "சந்", "செவ்வாய்": "செவ்", "புதன்": "புத", "குரு": "குரு", "சுக்கிரன்": "சுக்", "சனி": "சனி", "ராகு": "ராகு", "கேது": "கேது", "லக்னம்": "லக்", "மாந்தி": "மா" };

// --- Dasha Constants & Tamil Mapping ---
const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS = { "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17 };

const DASHA_INPUT_MAP = {
    "கேது": "Ketu", "ketu": "Ketu", "Ke": "Ketu",
    "சுக்கிரன்": "Venus", "venus": "Venus", "சுக்": "Venus", "சுக்கிர": "Venus", "Suk": "Venus", "Su": "Venus",
    "சூரியன்": "Sun", "sun": "Sun", "சூரி": "Sun", "Surya": "Sun", "Sy": "Sun",
    "சந்திரன்": "Moon", "moon": "Moon", "சந்": "Moon", "சந்திர": "Moon", "Mo": "Moon",
    "செவ்வாய்": "Mars", "mars": "Mars", "செவ்": "Mars", "Chevvai": "Mars", "Ma": "Mars",
    "ராகு": "Rahu", "rahu": "Rahu", "Ragu": "Rahu", "Ra": "Rahu",
    "குரு": "Jupiter", "jupiter": "Jupiter", "Guru": "Jupiter", "Gu": "Jupiter",
    "சனி": "Saturn", "saturn": "Saturn", "Sani": "Saturn", "Sa": "Saturn",
    "புதன்": "Mercury", "mercury": "Mercury", "புத": "Mercury", "Budhan": "Mercury", "Me": "Mercury"
};

const ENG_TO_TAMIL_SHORT = {
    "Sun": "சூரி", "Moon": "சந்", "Mars": "செவ்", "Mercury": "புத",
    "Jupiter": "குரு", "Venus": "சுக்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது"
};

// Default Settings - OPTIMIZED FOR A4 PRINT
let UI_SETTINGS = {
    fontSize: 13,
    chartSize: 450,
    screen: { width: 100, padding: 6, font: 13 },
    print: {
        width: 100,
        padding: 2, // Reduced default padding for compact print
        font: 11,   // Slightly smaller font for tables
        chartSize: 320,
        headerSize: 22,
        footerLogoSize: 30,
        footerTextSize: 10,
        isBold: false, isBnW: false
    }
};

document.addEventListener("DOMContentLoaded", function () {
    fetch('/list_charts').then(r => r.json()).then(res => {
        if (res.status === "ok") { SAVED_CHARTS = res.charts; populateCompNameList(); }
    });
    const formBar = document.getElementById("formbar");
    if (formBar) {
        const oldBtn = document.getElementById("compareBtn");
        if (oldBtn) oldBtn.remove();
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
        <div id="compWrapper" style="--base-font:${UI_SETTINGS.fontSize}px; --chart-dim:${UI_SETTINGS.chartSize}px; --tbl-width:${UI_SETTINGS.screen.width}%; --tbl-pad:${UI_SETTINGS.screen.padding}px; --tbl-font:${UI_SETTINGS.screen.font}px;">
            
            <div style="background:white; margin:20px auto; max-width:1400px; border-radius:8px; overflow:hidden; position:relative;">
                
                <div class="comp-header-bar" style="background:#000080; color:white; padding:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <h3 style="margin:0;">💑 ஜாதகப் பொருத்தம் Comparison</h3>
                    
                    <div style="display:flex; gap:5px; align-items:center; background:rgba(255,255,255,0.2); padding:5px; border-radius:4px;">
                        <span style="font-size:12px; font-weight:bold;">Global:</span>
                        <button onclick="adjustSettings('font', 1)" style="cursor:pointer; padding:2px 8px;">A+</button>
                        <button onclick="adjustSettings('font', -1)" style="cursor:pointer; padding:2px 8px;">A-</button>
                        <span style="border-left:1px solid #aaa; margin:0 5px;"></span>
                        <button onclick="adjustSettings('chart', 20)" style="cursor:pointer; padding:2px 8px;">Grid+</button>
                        <button onclick="adjustSettings('chart', -20)" style="cursor:pointer; padding:2px 8px;">Grid-</button>
                        <span style="border-left:1px solid #aaa; margin:0 5px;"></span>
                        <button onclick="togglePanel('screenPanel')" style="cursor:pointer; padding:2px 8px; background:#fff; color:#000; font-weight:bold;">⚙️ Screen Size</button>
                    </div>

                    <div style="display:flex; align-items:flex-end; flex-direction:column; gap:5px;">
                        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content: flex-end;">
                            <button onclick="toggleNotepad()" style="background:#FF9800; border:none; color:white; padding:5px 15px; cursor:pointer; font-weight:bold;">📝 Notes</button>
                            <button onclick="togglePanel('printPanel')" style="background:#607d8b; border:none; color:white; padding:5px 10px; cursor:pointer; font-weight:bold; font-size:14px;">⚙️ Print Setup</button>
                            <button onclick="printComparison()" style="background:#4CAF50; border:none; color:white; padding:5px 20px; cursor:pointer; font-weight:bold; font-size:14px;">🖨 Print (A4)</button>
                            <button onclick="document.getElementById('comparisonModal').style.display='none'" style="background:#ff4d4d; border:none; color:white; padding:5px 15px; cursor:pointer; font-weight:bold;">Close X</button>
                        </div>
                        <label style="color:#fff; font-size:12px; cursor:pointer; display:flex; align-items:center;">
                            <input type="checkbox" id="fitToPageCheck" style="margin-right:5px; width:14px; height:14px;"> Fit to Single Page (Zoom)
                        </label>
                    </div>
                </div>

                <div id="screenPanel" class="draggable-modal" style="display:none; top:70px; left:40%; width:300px; z-index:2001;">
                    <div class="notepad-header" style="background:#000080;">🖥️ Screen Table Size <span style="float:right; cursor:pointer;" onclick="togglePanel('screenPanel')">X</span></div>
                    <div style="padding:15px; font-size:13px; color:#333;">
                        <div style="margin-bottom:10px;">
                            <label>Screen Width (%): <span id="lblSW">100%</span></label>
                            <input type="range" min="30" max="100" value="100" style="width:100%" oninput="adjustScreen(this.value, 'width')">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label>Row Padding: <span id="lblSP">6px</span></label>
                            <input type="range" min="1" max="25" value="6" style="width:100%" oninput="adjustScreen(this.value, 'padding')">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label>Font Size: <span id="lblSF">13px</span></label>
                            <input type="range" min="8" max="24" value="13" style="width:100%" oninput="adjustScreen(this.value, 'font')">
                        </div>
                    </div>
                </div>

                <div id="printPanel" class="draggable-modal" style="display:none; top:70px; left:60%; width:320px; z-index:2002; border-color:#4CAF50;">
                    <div class="notepad-header" style="background:#4CAF50;">🖨️ Print Output Setup <span style="float:right; cursor:pointer;" onclick="togglePanel('printPanel')">X</span></div>
                    <div style="padding:15px; font-size:13px; color:#333;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                            <label style="cursor:pointer;"><input type="checkbox" onchange="adjustPrint(this.checked, 'bold')"> <b>Bold Text</b></label>
                            <label style="cursor:pointer;"><input type="checkbox" onchange="adjustPrint(this.checked, 'bnw')"> ⚫ Black & White</label>
                        </div>
                        
                        <div style="margin-bottom:10px;">
                            <label>Chart Grid Size: <span id="lblPChart">320px</span></label>
                            <input type="range" min="200" max="500" value="320" style="width:100%" oninput="adjustPrint(this.value, 'chartSize')">
                        </div>

                        <div style="margin-bottom:10px;">
                            <label>Print Width (%): <span id="lblPW">100%</span></label>
                            <input type="range" min="30" max="100" value="100" style="width:100%" oninput="adjustPrint(this.value, 'width')">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label>Table Padding: <span id="lblPP">4px</span></label>
                            <input type="range" min="1" max="20" value="4" style="width:100%" oninput="adjustPrint(this.value, 'padding')">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label>Content Font: <span id="lblPF">12px</span></label>
                            <input type="range" min="8" max="20" value="12" style="width:100%" oninput="adjustPrint(this.value, 'font')">
                        </div>
                        
                        <div style="border-top:1px solid #eee; padding-top:10px; margin-top:5px;">
                            <div style="margin-bottom:10px;">
                                <label>Header (Title) Size: <span id="lblPH">24px</span></label>
                                <input type="range" min="0" max="40" value="24" style="width:100%" oninput="adjustPrint(this.value, 'headerSize')">
                            </div>
                            
                            <div style="display:flex; gap:10px; margin-bottom:5px;">
                                <div style="flex:1;">
                                    <label>Logo Height: <span id="lblPFootLogo">30px</span></label>
                                    <input type="range" min="0" max="100" value="30" style="width:100%" oninput="adjustPrint(this.value, 'footerLogoSize')">
                                </div>
                                <div style="flex:1;">
                                    <label>Text Size: <span id="lblPFootText">10px</span></label>
                                    <input type="range" min="0" max="20" value="10" style="width:100%" oninput="adjustPrint(this.value, 'footerTextSize')">
                                </div>
                            </div>
                        </div>
                        <button onclick="printComparison()" style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; cursor:pointer; font-weight:bold; margin-top:5px;">Test Print / PDF</button>
                    </div>
                </div>

                <div class="input-section" style="padding:15px; background:#e0e0e0; display:flex; gap:20px; justify-content:center; align-items:start; flex-wrap:wrap;">
                    <div class="input-card" style="border-top: 4px solid #000080;">
                        <div class="card-header">
                            <strong style="color:#000080;">ஆண் (Boy):</strong>
                            <div class="history-badge" id="boyBadge" onclick="toggleHistory('Boy')">👁️ Checked: 0 <div id="boyHistoryList" class="history-dropdown"></div></div>
                        </div>
                        <label>பெயர்:</label><input id="cBoyName" list="compSavedList" placeholder="Select Saved Name" onchange="autoFill('Boy')">
                        <div style="display:flex; gap:5px; margin:8px 0;"><input type="date" id="cBoyDate" style="flex:1;"><input type="time" id="cBoyTime" style="flex:1;" step="1"></div>
                        <label>பிறந்த இடம்:</label><input id="cBoyPlace" list="placesList" placeholder="Type City (e.g. Chennai)" onkeyup="searchCity(this)">
                    </div>
                    <div class="input-card" style="border-top: 4px solid #E91E63;">
                        <div class="card-header">
                            <strong style="color:#E91E63;">பெண் (Girl):</strong>
                            <div class="history-badge" id="girlBadge" onclick="toggleHistory('Girl')">👁️ Checked: 0 <div id="girlHistoryList" class="history-dropdown"></div></div>
                        </div>
                        <label>பெயர்:</label><input id="cGirlName" list="compSavedList" placeholder="Select Saved Name" onchange="autoFill('Girl')">
                        <div style="display:flex; gap:5px; margin:8px 0;"><input type="date" id="cGirlDate" style="flex:1;"><input type="time" id="cGirlTime" style="flex:1;" step="1"></div>
                        <label>பிறந்த இடம்:</label><input id="cGirlPlace" list="placesList" placeholder="Type City (e.g. Madurai)" onkeyup="searchCity(this)">
                    </div>
                    <div class="action-buttons" style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                        <button onclick="runComparison()" style="background:#000080; color:white; border:none; padding:12px 30px; font-weight:bold; cursor:pointer; font-size:16px; border-radius:4px;">பொருத்தம் பார்</button>
                        <label style="font-size:13px; cursor:pointer; user-select:none;"><input type="checkbox" id="showDoshaCheck" checked onchange="toggleDoshaVisibility()"> தோஷ சாம்யம் (Show Dosha)</label>
                    </div>
                </div>
                <datalist id="compSavedList"></datalist>
                <datalist id="placesList"></datalist>

                <div id="compResults" style="display:none; padding:20px; background:#eef;">
                    <div class="charts-flex-container">
                        <div class="chart-block">
                            <div class="panchang-box" id="boyPanchang"></div>
                            <div class="chart-wrapper">
                                <div class="chart-container">
                                    <div id="boyChartGrid" class="si-grid"></div>
                                    <div class="center-info" id="boyCenterInfo"></div>
                                </div>
                            </div>
                        </div>
                        <div class="chart-block">
                            <div class="panchang-box" id="girlPanchang"></div>
                            <div class="chart-wrapper">
                                <div class="chart-container">
                                    <div id="girlChartGrid" class="si-grid"></div>
                                    <div class="center-info" id="girlCenterInfo"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="results-grid" style="margin-top:20px; background:white; padding:15px; border:1px solid #ccc; display:flex; gap:20px; flex-wrap:wrap;">
                        <div class="left-panel" style="flex:1.5; min-width:300px;">
                            <div style="background:#000080; color:white; padding:8px; font-weight:bold; display:flex; justify-content:space-between;"><span>பொருத்த விவரம் (Score: <span id="finalScore"></span>)</span></div>
                            <div class="table-columns" style="display:flex; gap:8px; margin-top:3px;">
                                <table class="resize-target" id="matchTableLeft"></table>
                                <table class="resize-target" id="matchTableRight"></table>
                            </div>
                            
                            <div style="margin-top:12px; background:#000080; color:white; padding:5px; font-weight:bold;">கிரகப் பொருத்தம் (Planet Rel)</div>
                            <table class="resize-target" id="planetRelTable"></table>
                        </div>
                        <div class="right-panel" style="flex:1; min-width:300px; border-left:1px solid #ddd; padding-left:10px;">
                            <div id="doshaContainer">
                                <div style="background:#E91E63; color:white; padding:8px; font-weight:bold;">தோஷ சாம்யம்</div>
                                <table class="resize-target">
                                    <tr style="background:#f9f9f9;"><td style="border:1px solid #ccc;">ஆண் (Boy)</td><td style="border:1px solid #ccc; font-weight:bold;" id="boyDoshaVal">-</td></tr>
                                    <tr style="background:#fff;"><td style="border:1px solid #ccc;">பெண் (Girl)</td><td style="border:1px solid #ccc; font-weight:bold;" id="girlDoshaVal">-</td></tr>
                                    <tr style="background:#e0f7fa;"><td style="border:1px solid #ccc;">முடிவு</td><td style="border:1px solid #ccc; font-weight:bold; color:#00695c;" id="doshaStatus">-</td></tr>
                                </table>
                            </div>
                            <div style="margin-top:10px; background:#000080; color:white; padding:8px; font-weight:bold;">நட்சத்திரப் பொருத்தம்</div>
                            <div style="border:1px solid #ccc; padding:10px; background:#fff; font-size:var(--base-font);" id="starMatchSummary"></div>

                            <div id="dasaSandhiContainer" style="margin-top:15px;"></div>
                        </div>
                    </div>
                </div>

                <div id="matchNotepad" class="draggable-modal" style="display:none;">
                    <div class="notepad-header" id="notepadHeader">📝 Match Notes <span style="float:right; cursor:pointer;" onclick="toggleNotepad()">X</span></div>
                    <div style="padding:10px;">
                        <textarea id="matchNoteText" style="width:100%; height:150px; border:1px solid #ccc; padding:5px; box-sizing: border-box;" placeholder="Type observations here..."></textarea>
                        <div style="margin-top:10px; text-align:right;">
                            <button onclick="saveMatchNote()" style="background:#4CAF50; color:white; border:none; padding:5px 15px; cursor:pointer;">💾 Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <style>
        /* BASE STYLES */
        .input-card { background:white; padding:15px; border:1px solid #999; width: 320px; max-width: 100%; position:relative; }
        .input-card input { width:100%; padding:5px; margin-bottom:5px; box-sizing:border-box; }
        .card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; width: 100%; }
        .history-badge { font-size:11px; background:#eee; padding:3px 8px; border-radius:10px; cursor:pointer; border:1px solid #ccc; position: relative; display: none; margin-left: auto; }
        .history-badge:hover { background:#ddd; }
        .history-dropdown { display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #aaa; width: 200px; max-height: 200px; overflow-y: auto; z-index: 1000; text-align: left; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
        .history-item { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; color:#333; } .history-item:hover { background: #f0f8ff; }
        
        .draggable-modal { position: absolute; top: 60px; right: 20px; width: 300px; background: #fff; border: 2px solid #444; box-shadow: 4px 4px 12px rgba(0,0,0,0.3); z-index: 2000; }
        .notepad-header { padding: 10px; cursor: move; background: #FF9800; color: #fff; font-weight: bold; }
        
        .charts-flex-container { display:flex; gap:20px; justify-content:center; flex-wrap:wrap; } 
        .chart-block { flex:1; min-width:400px; max-width:500px; }
        
        .panchang-box { border: 1px solid #ccc; padding: 5px; margin-bottom: 5px; background: #ffffe0 !important; font-size: calc(var(--base-font) + 1px); min-height:160px; display:flex; flex-direction:column; justify-content:center; }
        .panchang-table { width: 100%; border-collapse: collapse; table-layout: fixed; } 
        .panchang-table td { border: 1px solid #ccc; padding: 4px; color: #000080; font-weight: bold; height:26px; white-space:nowrap; width: 50%; overflow:hidden; }
        
        .chart-wrapper { display: flex; justify-content: center; } 
        .chart-container { position: relative; border: 2px solid #000080; background: #fff; width: var(--chart-dim); height: var(--chart-dim); box-sizing: border-box; } 
        .si-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: 0; width: 100%; height: 100%; } 
        .si-box { background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: calc(var(--base-font) + 2px); font-weight: bold; text-align: center; border: 1px solid #000080; overflow: hidden; } 
        .center-info { position: absolute; top: 25%; left: 25%; width: 50%; height: 50%; background: #ffffff; color: #000; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-size: calc(var(--base-font) + 2px); z-index: 10; border: 2px solid #000080; box-sizing: border-box; padding: 5px; } 
        
        table.resize-target { width: var(--tbl-width) !important; font-size: var(--tbl-font) !important; border-collapse: collapse; margin: 5px 0; transition: all 0.2s ease; }
        table.resize-target th, table.resize-target td { padding-top: var(--tbl-pad) !important; padding-bottom: var(--tbl-pad) !important; padding-left: 8px; padding-right: 8px; }

        /* --- MEDIA QUERIES FOR MOBILE & TABLET --- */
        @media screen and (max-width: 1024px) {
            .chart-block { min-width: 100%; margin-bottom: 20px; }
            .charts-flex-container { flex-direction: column; align-items: center; }
            .input-section { flex-direction: column; align-items: center; }
            .input-card { width: 100%; }
        }

        @media screen and (max-width: 768px) {
            /* Full Width Header */
            .comp-header-bar { flex-direction: column; text-align: center; }
            
            /* Responsive Chart (Square based on Viewport Width) */
            .chart-container {
                width: 90vw !important;
                height: 90vw !important;
                margin: 0 auto;
            }
            .center-info { font-size: 0.8em; }
            .si-box { font-size: 0.7em; }
            
            /* Stacked Results */
            .results-grid { flex-direction: column; }
            .left-panel, .right-panel { width: 100%; border-left: none; padding-left: 0; }
            .table-columns { flex-direction: column; }
            
            /* Fix Draggable Modals to Center */
            .draggable-modal {
                top: 10% !important;
                left: 5% !important;
                width: 90% !important;
            }
            
            /* Full width tables */
            table.resize-target { width: 100% !important; }
        }
    </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    dragElement(document.getElementById("matchNotepad"));
    dragElement(document.getElementById("screenPanel"));
    dragElement(document.getElementById("printPanel"));
}

function adjustSettings(type, delta) {
    if (type === 'font') {
        UI_SETTINGS.fontSize += delta;
        if (UI_SETTINGS.fontSize < 8) UI_SETTINGS.fontSize = 8;
        if (UI_SETTINGS.fontSize > 24) UI_SETTINGS.fontSize = 24;
    } else if (type === 'chart') {
        UI_SETTINGS.chartSize += delta;
        if (UI_SETTINGS.chartSize < 250) UI_SETTINGS.chartSize = 250;
        if (UI_SETTINGS.chartSize > 800) UI_SETTINGS.chartSize = 800;
    }
    const wrapper = document.getElementById("compWrapper");
    if (wrapper) {
        wrapper.style.setProperty('--base-font', UI_SETTINGS.fontSize + "px");
        wrapper.style.setProperty('--chart-dim', UI_SETTINGS.chartSize + "px");
    }
}

function togglePanel(id) {
    const panel = document.getElementById(id);
    if (id === 'screenPanel') document.getElementById('printPanel').style.display = "none";
    if (id === 'printPanel') document.getElementById('screenPanel').style.display = "none";
    panel.style.display = (panel.style.display === "none") ? "block" : "none";
}

function adjustScreen(val, type) {
    UI_SETTINGS.screen[type] = val;
    if (type === 'width') document.getElementById('lblSW').innerText = val + "%";
    if (type === 'padding') document.getElementById('lblSP').innerText = val + "px";
    if (type === 'font') document.getElementById('lblSF').innerText = val + "px";
    const wrapper = document.getElementById("compWrapper");
    if (wrapper) {
        wrapper.style.setProperty('--tbl-width', UI_SETTINGS.screen.width + "%");
        wrapper.style.setProperty('--tbl-pad', UI_SETTINGS.screen.padding + "px");
        wrapper.style.setProperty('--tbl-font', UI_SETTINGS.screen.font + "px");
    }
}

function adjustPrint(val, type) {
    UI_SETTINGS.print[type] = val;
    if (type === 'width') document.getElementById('lblPW').innerText = val + "%";
    if (type === 'padding') document.getElementById('lblPP').innerText = val + "px";
    if (type === 'font') document.getElementById('lblPF').innerText = val + "px";
    if (type === 'chartSize') document.getElementById('lblPChart').innerText = val + "px";
    if (type === 'headerSize') document.getElementById('lblPH').innerText = val + "px";
    if (type === 'footerLogoSize') document.getElementById('lblPFootLogo').innerText = val + "px";
    if (type === 'footerTextSize') document.getElementById('lblPFootText').innerText = val + "px";
}

function toggleDoshaVisibility() {
    const show = document.getElementById("showDoshaCheck").checked;
    const cont = document.getElementById("doshaContainer");
    if (cont) cont.style.display = show ? "block" : "none";
}

function populateCompNameList() { const dl = document.getElementById("compSavedList"); if (!dl) return; dl.innerHTML = ""; SAVED_CHARTS.forEach(c => { const opt = document.createElement("option"); opt.value = c.name; dl.appendChild(opt); }); }

// --- FIXED AUTOFILL: NOW STORES COORDS DIRECTLY ON INPUT ---
function autoFill(gender) {
    const nameVal = document.getElementById('c' + gender + 'Name').value;
    const chart = SAVED_CHARTS.find(c => c.name === nameVal);
    if (chart) {
        document.getElementById('c' + gender + 'Date').value = chart.date;
        document.getElementById('c' + gender + 'Time').value = chart.time;
        const pInput = document.getElementById('c' + gender + 'Place');
        if (chart.place_json && chart.place_json.city) {
            pInput.value = chart.place_json.city;
            // Store coordinates directly on the element (Crucial Fix)
            pInput.setAttribute("data-lat", chart.place_json.lat);
            pInput.setAttribute("data-lon", chart.place_json.lon);
            pInput.setAttribute("data-tz", chart.place_json.tz || 5.5);
        }
        updateMatchCount(nameVal, gender);
    }
}

let HISTORY_DATA = { Boy: [], Girl: [] };
function updateMatchCount(name, gender) {
    const badge = document.getElementById(gender === "Boy" ? "boyBadge" : "girlBadge");
    const listDiv = document.getElementById(gender === "Boy" ? "boyHistoryList" : "girlHistoryList");
    fetch('/get_match_count', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name }) }).then(r => r.json()).then(res => {
        if (res.status === "ok") {
            badge.style.display = "block";
            let txtSpan = badge.querySelector("span");
            if (!txtSpan) { txtSpan = document.createElement("span"); badge.insertBefore(txtSpan, listDiv); }
            txtSpan.innerText = `👁️ Checked: ${res.count} Profiles `;
            HISTORY_DATA[gender] = res.recent; let html = "";
            if (res.recent.length === 0) html = "<div class='history-item'>No matches yet</div>";
            else res.recent.forEach(r => { html += `<div class='history-item' onclick="loadHistoryPartner('${r.partner}', '${gender}')">${r.partner} <span class='history-score'>${r.score}</span><br><small style='color:#777'>${r.date}</small></div>`; });
            listDiv.innerHTML = html;
        }
    });
}
function toggleHistory(gender) { const id = gender === "Boy" ? "boyHistoryList" : "girlHistoryList"; const list = document.getElementById(id); const isVisible = list.style.display === "block"; document.getElementById("boyHistoryList").style.display = "none"; document.getElementById("girlHistoryList").style.display = "none"; if (!isVisible) list.style.display = "block"; event.stopPropagation(); }
window.onclick = function (event) { if (!event.target.matches('.history-badge') && !event.target.closest('.history-badge')) { const dropdowns = document.getElementsByClassName("history-dropdown"); for (let i = 0; i < dropdowns.length; i++) { dropdowns[i].style.display = "none"; } } }

function toggleNotepad() {
    const pad = document.getElementById("matchNotepad");
    if (pad.style.display === "none") { pad.style.display = "block"; loadMatchNote(); } else { pad.style.display = "none"; }
}
function saveMatchNote() {
    const bName = document.getElementById("cBoyName").value;
    const gName = document.getElementById("cGirlName").value;
    const note = document.getElementById("matchNoteText").value;
    if (!bName || !gName) { alert("Select profiles first"); return; }
    fetch('/save_match_note', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boy: bName, girl: gName, note: note }) }).then(r => r.json()).then(d => { if (d.status === "ok") alert("Note Saved!"); });
}
function loadMatchNote() {
    const bName = document.getElementById("cBoyName").value;
    const gName = document.getElementById("cGirlName").value;
    if (!bName || !gName) return;
    fetch('/get_match_note', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boy: bName, girl: gName }) }).then(r => r.json()).then(d => { document.getElementById("matchNoteText").value = d.note || ""; });
}
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = elmnt.querySelector(".notepad-header");
    if (header) { header.onmousedown = dragMouseDown; } else { elmnt.onmousedown = dragMouseDown; }
    function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
    function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}

function loadHistoryPartner(partnerName, currentGender) { const targetGender = currentGender === "Boy" ? "Girl" : "Boy"; const chart = SAVED_CHARTS.find(c => c.name === partnerName); if (chart) { document.getElementById('c' + targetGender + 'Name').value = chart.name; document.getElementById('c' + targetGender + 'Date').value = chart.date; document.getElementById('c' + targetGender + 'Time').value = chart.time; if (chart.place_json && chart.place_json.city) { document.getElementById('c' + targetGender + 'Place').value = chart.place_json.city; } updateMatchCount(partnerName, targetGender); runComparison(); } else { alert(`Details for '${partnerName}' not found.`); } }
function openCompModal() { document.getElementById("comparisonModal").style.display = "block"; }

// --- FIXED: getPlaceCoords Checks Input Data First, then Datalist, then Default ---
function getPlaceCoords(inputElem) {
    let coords = { lat: 13.08, lon: 80.27, tz: 5.5 }; // Default (Chennai)

    if (!inputElem) return coords;

    // 1. PRIORITY: Check if Coords are stored directly on the input (from AutoFill)
    if (inputElem.hasAttribute("data-lat")) {
        coords.lat = parseFloat(inputElem.getAttribute("data-lat"));
        coords.lon = parseFloat(inputElem.getAttribute("data-lon"));
        coords.tz = parseFloat(inputElem.getAttribute("data-tz"));
        return coords;
    }

    const placeStr = inputElem.value.trim();
    if (!placeStr) return coords;

    // 2. SECONDARY: Check Datalist Options (from Manual Search)
    const placesList = document.getElementById("placesList");
    if (placesList) {
        for (let i = 0; i < placesList.options.length; i++) {
            // Case-insensitive match
            if (placesList.options[i].value.toLowerCase() === placeStr.toLowerCase()) {
                coords.lat = parseFloat(placesList.options[i].getAttribute('data-lat'));
                coords.lon = parseFloat(placesList.options[i].getAttribute('data-lon'));
                coords.tz = parseFloat(placesList.options[i].getAttribute('data-tz'));
                return coords;
            }
        }
    }
    return coords;
}

// --- FIXED: Calculate Current Dasha Purely from DOB + Balance (Trusting Chart Text) ---
function getCurrentDashaDetails(dobStr, balanceStr, chainStr) {
    let result = { name: "?", end: null, sandhi: false, next: "?" };
    if (!dobStr || !balanceStr) return result;

    const currentDate = new Date();
    const birthDate = new Date(dobStr);

    // 1. GET STARTING PLANET (From Balance Text or Chain Text)
    let birthPlanet = null;

    // Check Balance String first (e.g. "Jupiter 10y 4m")
    let foundKey = Object.keys(DASHA_INPUT_MAP).find(k => balanceStr.toLowerCase().includes(k.toLowerCase()));
    if (foundKey) {
        birthPlanet = DASHA_INPUT_MAP[foundKey];
    }

    // Fallback: Check Chain String (e.g. "Jupiter/Saturn") if Balance has no planet name
    if (!birthPlanet && chainStr) {
        let firstPart = chainStr.split(/[/\s-]/)[0]; // Get first word
        let chainKey = Object.keys(DASHA_INPUT_MAP).find(k => firstPart.toLowerCase().includes(k.toLowerCase()));
        if (chainKey) birthPlanet = DASHA_INPUT_MAP[chainKey];
    }

    if (!birthPlanet) return result;

    // 2. PARSE BALANCE TIME (Years, Months, Days)
    let balY = 0, balM = 0, balD = 0;
    // Extract numbers: 1st=Years, 2nd=Months, 3rd=Days
    let nums = balanceStr.match(/\d+/g);
    if (nums) {
        if (nums.length >= 1) balY = parseInt(nums[0]);
        if (nums.length >= 2) balM = parseInt(nums[1]);
        if (nums.length >= 3) balD = parseInt(nums[2]);
    }

    // 3. CALCULATE END DATE OF FIRST DASHA (Birth Date + Balance)
    let runningDate = new Date(birthDate);
    runningDate.setFullYear(runningDate.getFullYear() + balY);
    runningDate.setMonth(runningDate.getMonth() + balM);
    runningDate.setDate(runningDate.getDate() + balD);

    // 4. CYCLE FORWARD TO PRESENT DAY
    let currentIndex = DASHA_ORDER.indexOf(birthPlanet);

    // While the "End Date" is in the past, move to the next planet
    while (runningDate < currentDate) {
        currentIndex = (currentIndex + 1) % 9; // Move to next planet
        let nextPlanet = DASHA_ORDER[currentIndex];

        // Add full cycle years for the next planet
        runningDate.setFullYear(runningDate.getFullYear() + DASHA_YEARS[nextPlanet]);
    }

    // Now 'runningDate' is the actual End Date of the CURRENT period
    let currentDashaName = DASHA_ORDER[currentIndex];

    // Identify Next Dasha
    let nextIndex = (currentIndex + 1) % 9;
    let nextDashaName = DASHA_ORDER[nextIndex];

    // 5. CALCULATE SANDHI (+/- 6 Months from End Date)
    let sandhiStart = new Date(runningDate);
    sandhiStart.setMonth(sandhiStart.getMonth() - 6);

    let sandhiEnd = new Date(runningDate);
    sandhiEnd.setMonth(sandhiEnd.getMonth() + 6);

    // Check if Today is inside this 1-year window
    let isSandhi = (currentDate >= sandhiStart && currentDate <= sandhiEnd);

    return {
        current: currentDashaName,
        next: nextDashaName,
        endDate: runningDate,
        isSandhi: isSandhi,
        sandhiRange: `${sandhiStart.toLocaleDateString()} to ${sandhiEnd.toLocaleDateString()}`
    };
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

    if (!bD || !gD) { alert("Please select dates."); return; }

    // Pass the actual Input Elements so we can read data-lat
    const bCoords = getPlaceCoords(document.getElementById("cBoyPlace"));
    const gCoords = getPlaceCoords(document.getElementById("cGirlPlace"));

    const bSplit = bD.split("-");
    const bTSplit = bT.split(":");
    const gSplit = gD.split("-");
    const gTSplit = gT.split(":");

    fetch("/compare_charts_view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            boy: { name: bName, place_name: bP, year: bSplit[0], month: bSplit[1], day: bSplit[2], hour: bTSplit[0], minute: bTSplit[1], lat: bCoords.lat, lon: bCoords.lon, tz: bCoords.tz },
            girl: { name: gName, place_name: gP, year: gSplit[0], month: gSplit[1], day: gSplit[2], hour: gTSplit[0], minute: gTSplit[1], lat: gCoords.lat, lon: gCoords.lon, tz: gCoords.tz }
        })
    }).then(r => r.json()).then(res => {
        if (res.status === "ok") {
            const d = res.data;
            const totalScore = d.match_report.total_score + " / 10";
            if (bName && gName) {
                fetch('/log_match', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boy_name: bName, girl_name: gName, score: totalScore }) });
                updateMatchCount(bName, "Boy");
                updateMatchCount(gName, "Girl");
                loadMatchNote();
            }
            document.getElementById("compResults").style.display = "block";
            renderComparisonChart("boyChartGrid", "boyCenterInfo", d.boy, bName);
            renderComparisonChart("girlChartGrid", "girlCenterInfo", d.girl, gName);
            renderComparisonPanchang("boyPanchang", "ஆண்", d.boy, bName);
            renderComparisonPanchang("girlPanchang", "பெண்", d.girl, gName);

            const showDosha = document.getElementById("showDoshaCheck").checked;
            const doshaCont = document.getElementById("doshaContainer");
            if (doshaCont) doshaCont.style.display = showDosha ? "block" : "none";
            if (showDosha) {
                document.getElementById("boyDoshaVal").innerText = d.boy.dosha_points || 0;
                document.getElementById("girlDoshaVal").innerText = d.girl.dosha_points || 0;
                const bDosh = d.boy.dosha_points || 0;
                const gDosh = d.girl.dosha_points || 0;
                let dStatus = "சமம் (Equal)";
                if (bDosh > gDosh) dStatus = "ஆண் அதிகம்";
                if (gDosh > bDosh) dStatus = "பெண் அதிகம்";
                document.getElementById("doshaStatus").innerText = dStatus;
            }
            document.getElementById("starMatchSummary").innerHTML = `<b>ஆண்:</b> ${d.boy.panchangam.nakshatra}<br><b>பெண்:</b> ${d.girl.panchangam.nakshatra}`;
            document.getElementById("finalScore").innerText = totalScore;

            let matches = d.match_report.matches;
            let mid = Math.ceil(matches.length / 2);
            let leftRows = matches.slice(0, mid);
            let rightRows = matches.slice(mid);

            function genTable(rows) {
                return rows.map(m => {
                    let cls = "status-good"; let icon = "✅";
                    if (m.status.includes("இல்லை") || m.status.includes("தோஷம்") || m.status.includes("Bad")) { cls = "status-bad"; icon = "❌"; }
                    else if (m.status.includes("மத்திமம்")) { cls = "status-avg"; icon = "⚠️"; }
                    return `<tr><td style="border:1px solid #ccc; background:#f9f9f9;">${m.name}</td><td style="border:1px solid #ccc;" class="${cls}">${icon} ${m.status}</td></tr>`;
                }).join("");
            }
            document.getElementById("matchTableLeft").innerHTML = genTable(leftRows);
            document.getElementById("matchTableRight").innerHTML = genTable(rightRows);

            let pRelHtml = `<tr style="background:#eee;"><th>கிரகம்</th><th>ஆண்</th><th>பெண்</th><th>தொடர்பு</th></tr>`;
            if (d.match_report.planet_relations) {
                d.match_report.planet_relations.forEach(pr => {
                    pRelHtml += `<tr><td style="border:1px solid #ccc;">${pr.planet}</td><td style="border:1px solid #ccc;">${pr.boy_rasi}</td><td style="border:1px solid #ccc;">${pr.girl_rasi}</td><td style="border:1px solid #ccc; color:${pr.color}; font-weight:bold;">${pr.relation} <br><small style="color:#555">${pr.status_text}</small></td></tr>`;
                });
                document.getElementById("planetRelTable").innerHTML = pRelHtml;
            }

            // --- EXECUTE DASA SANDHI LOGIC ---
            const boySandhiCalc = getCurrentDashaDetails(bD, d.boy.panchangam.dasha_balance, d.boy.panchangam.dasha_chain);
            const girlSandhiCalc = getCurrentDashaDetails(gD, d.girl.panchangam.dasha_balance, d.girl.panchangam.dasha_chain);

            const boySandhiData = {
                currentDasha: boySandhiCalc.current,
                nextDasha: boySandhiCalc.next,
                isInSandhi: boySandhiCalc.isSandhi,
                sandhiStart: boySandhiCalc.sandhiRange.split(" to ")[0],
                sandhiEnd: boySandhiCalc.sandhiRange.split(" to ")[1],
                friendOrEnemy: "Neutral"
            };

            const girlSandhiData = {
                currentDasha: girlSandhiCalc.current,
                nextDasha: girlSandhiCalc.next,
                isInSandhi: girlSandhiCalc.isSandhi,
                sandhiStart: girlSandhiCalc.sandhiRange.split(" to ")[0],
                sandhiEnd: girlSandhiCalc.sandhiRange.split(" to ")[1],
                friendOrEnemy: "Neutral"
            };

            renderDasaSandhiTable("dasaSandhiContainer", boySandhiData, girlSandhiData);
            // -----------------------------------

        } else {
            alert("Error: " + res.message);
        }
    });
}

function renderComparisonPanchang(divId, title, data, name) { const p = data.panchangam || {}; const html = `<div style="text-align:center; font-weight:bold; color:#000080; border-bottom:1px solid #aaa; margin-bottom:5px;">${title} ஜாதகம் - ${name || '-'} (${data.place}) - ${p.tamil_date}</div><table class="panchang-table"><tr><td><span class="panchang-label">நட்சத்திரம்:</span> ${p.nakshatra}</td><td><span class="panchang-label">சூரிய உதயம்:</span> ${p.sunrise}</td></tr><tr><td><span class="panchang-label">திதி:</span> ${p.thithi}</td><td><span class="panchang-label">சூரிய அஸ்தமனம்:</span> ${p.sunset}</td></tr><tr><td><span class="panchang-label">யோகம்:</span> ${p.yogam}</td><td><span class="panchang-label">அயனாம்சம்:</span> ${p.ayanamsa}</td></tr><tr><td><span class="panchang-label">கரணம்:</span> ${p.karanam}</td><td><span class="panchang-label">செவ் தோஷம்:</span> ${data.manglik}</td></tr></table>`; document.getElementById(divId).innerHTML = html; }

function renderComparisonChart(gridId, centerId, data, nameOverride) {
    const order = ["மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்", "கும்பம்", null, null, "கடகம்", "மகரம்", null, null, "சிம்மம்", "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"]; const map = {}; let lagna = "";
    data.planets.forEach(p => {
        if (!map[p.rasi]) map[p.rasi] = [];
        let c = "black"; if (["சூரியன்", "செவ்வாய்"].includes(p.name)) c = "red"; else if (["குரு", "புதன்"].includes(p.name)) c = "green"; else if (p.name === "லக்னம்") { c = "green"; lagna = p.rasi; }
        let shortName = SHORT_NAMES[p.name] || p.name; if (p.is_retro) shortName = `(${shortName})`;
        map[p.rasi].push(`<div class="planet-txt" style="color:${c}">${shortName} <span class="planet-deg">${p.short_deg || ""}</span></div>`);
    });
    const el = document.getElementById(gridId); el.innerHTML = "";
    order.forEach(r => {
        if (!r) el.innerHTML += `<div style="background:transparent; border:none;"></div>`;
        else el.innerHTML += `<div class="si-box">${(map[r] || []).join("")}</div>`;
    });
    const dBal = data.panchangam.dasha_balance || "-"; const dChain = data.panchangam.dasha_chain || "-";
    document.getElementById(centerId).innerHTML = `<div style="margin-bottom:4px;"><b>${nameOverride || "ராசி"}</b></div><div style="font-size:0.9em;">${data.dob} / ${data.time}</div><div style="color:green; font-size:0.9em; margin-bottom:4px;">Lagna: ${lagna}</div><div style="border-top:1px solid #ccc; width:100%; padding-top:4px;"><div style="font-size:0.8em; color:#555; white-space:nowrap;">${dBal}</div><div style="font-size:0.8em; color:#000080; margin-top:2px; font-weight:bold; white-space:nowrap;">${dChain}</div></div>`;
}

function printComparison() {
    let content = document.getElementById("compResults").innerHTML;
    // Fit to page logic (Zoom factor)
    const fitToPage = document.getElementById("fitToPageCheck").checked;
    const printZoom = fitToPage ? 0.75 : 1.0;

    // Explicit Chart Size from Slider
    const printChartSize = UI_SETTINGS.print.chartSize;
    const printFontSize = 11; // Base font calculation

    const fontWeight = UI_SETTINGS.print.isBold ? 'bold' : 'normal';
    const filter = UI_SETTINGS.print.isBnW ? 'grayscale(100%) contrast(150%)' : 'none';
    const headerDisplay = UI_SETTINGS.print.headerSize === '0' ? 'none' : 'block';
    const footerLogoDisplay = UI_SETTINGS.print.footerLogoSize == 0 ? 'none' : 'inline-block';
    const footerTextDisplay = UI_SETTINGS.print.footerTextSize == 0 ? 'none' : 'block';

    const win = window.open('', '', 'width=800,height=1100');

    win.document.write(`
<html>
<head>
<title>Jathagam Report</title>
<style>
    @page { size: A4 portrait; margin: 6mm; }
    
    :root {
        --print-chart-dim: ${printChartSize}px;
        --print-font-size: ${printFontSize}px;
        
        /* PRINT SETTINGS */
        --tbl-width: ${UI_SETTINGS.print.width}%;
        --tbl-pad: ${UI_SETTINGS.print.padding}px; /* Default for print */
        --tbl-font: ${UI_SETTINGS.print.font}px;
        
        /* HEADER & FOOTER */
        --header-size: ${UI_SETTINGS.print.headerSize}px;
        --footer-logo-height: ${UI_SETTINGS.print.footerLogoSize}px;
        --footer-text-size: ${UI_SETTINGS.print.footerTextSize}px;
        --print-weight: ${fontWeight};
    }

    body { 
        font-family: 'Noto Sans Tamil', sans-serif; 
        -webkit-print-color-adjust: exact; 
        font-size: var(--print-font-size); 
        padding: 0; margin: 0;
        filter: ${filter}; 
        /* FIT TO PAGE LOGIC: ZOOM */
        zoom: ${printZoom};
    }

    .charts-flex-container { display: flex; justify-content: space-between; flex-wrap: nowrap; gap: 10px; margin-bottom: 5px; }
    .chart-block { flex: 0 0 48%; max-width: 48%; }
    .panchang-box { border: 1px solid #999; background: #ffffe0 !important; padding: 2px; margin-bottom: 2px; font-size: var(--print-font-size); font-weight: var(--print-weight); min-height: 0 !important; }
    .panchang-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .panchang-table td { border: 1px solid #444; padding: 1px 3px; font-size: var(--print-font-size); white-space: nowrap; overflow: hidden; font-weight: var(--print-weight); height: auto !important; }
    .chart-wrapper { display: flex; justify-content: center; }

    .chart-container { border: 2px solid #000080; width: var(--print-chart-dim) !important; height: var(--print-chart-dim) !important; position: relative; background: #fff; }
    .si-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); width: 100%; height: 100%; }
    .si-box { border: 1px solid #000080; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; padding: 2px; font-size: var(--print-font-size); font-weight: bold; overflow: visible !important; }
    .planet-txt { font-size: var(--print-font-size); margin: 0; white-space: nowrap; font-weight: var(--print-weight); }
    .planet-deg { font-size: calc(var(--print-font-size) - 2px); }
    .center-info { position: absolute; width: 48%; height: 48%; top: 26%; left: 26%; border: 2px solid #000080; background: #fff; padding: 2px; text-align: center; z-index: 100; display: flex; flex-direction: column; justify-content: center; font-size: var(--print-font-size); font-weight: var(--print-weight); }
    
    h3 { 
        font-size: var(--header-size); 
        text-align: center; 
        color: #000080; 
        margin: 4px 0 2px 0; 
        display: ${headerDisplay};
    }
    
    /* --- COMPACT TABLE STYLES FOR PRINT --- */
    .results-grid { margin-top: 5px !important; padding: 0 !important; border: none !important; }
    .left-panel, .right-panel { padding: 0 !important; margin: 0 !important; border: none !important; }
    
    table.resize-target { width: var(--tbl-width) !important; font-size: var(--tbl-font) !important; border-collapse: collapse; margin: 2px 0 !important; }
    table.resize-target th, table.resize-target td { 
        padding-top: 1px !important;    /* FORCE TIGHT PADDING */
        padding-bottom: 1px !important; /* FORCE TIGHT PADDING */
        padding-left: 3px !important;
        padding-right: 3px !important;
        border: 1px solid #999; 
        font-weight: var(--print-weight);
        line-height: 1.2;
    }

    #planetRelTable td, .sandhi-table td { font-size: 10px !important; }

    @media print {
        .print-footer { 
            position: fixed; bottom: 3mm; left: 0; right: 0; text-align: center; 
            color: #444; opacity: 0.95; z-index: 9999; 
        }
        .print-footer img { 
            height: var(--footer-logo-height); 
            margin-bottom: 2px;
            display: ${footerLogoDisplay};
        }
        .print-footer div {
            font-size: var(--footer-text-size) !important; 
            display: ${footerTextDisplay};
        }
    }
</style>
</head>
<body>
    <h3>திருமணப் பொருத்தம் அறிக்கை</h3>
    ${content}
    <div class="print-footer">
        <img src="/static/smv_logo.png">
        <div>This application is developed by <b>www.smvastro.com</b></div>
    </div>
    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
</body>
</html>
`);
    win.document.close();
}

/**
 * Renders the Dasa Sandhi Table using Tamil Short names (Sun -> சூரி).
 */
function renderDasaSandhiTable(containerId, boyData, girlData) {
    let combinedStatus = "";
    let combinedClass = "";
    let analysisText = "";

    if (boyData.isInSandhi && girlData.isInSandhi) {
        combinedStatus = "HIGH INSTABILITY";
        combinedClass = "status-critical";
        analysisText = "Both partners are in transition. Previous planets are weak, next are unstable. <strong>High emotional instability predicted.</strong>";
    } else if (boyData.isInSandhi || girlData.isInSandhi) {
        combinedStatus = "MANAGEABLE";
        combinedClass = "status-warning";
        const whoIsStable = boyData.isInSandhi ? "Girl" : "Boy";
        analysisText = `One partner is stable (${whoIsStable}). The stable partner must support the one adjusting to new planetary energy.`;
    } else {
        combinedStatus = "STABLE";
        combinedClass = "status-good";
        analysisText = "Both partners are in stable Dasha periods. No immediate transition effects.";
    }

    if (boyData.isInSandhi && boyData.friendOrEnemy === 'Enemy') {
        analysisText += "<br><small>Note: Boy's planets are inimical. Expect more challenges.</small>";
    }
    if (girlData.isInSandhi && girlData.friendOrEnemy === 'Enemy') {
        analysisText += "<br><small>Note: Girl's planets are inimical. Expect more challenges.</small>";
    }

    // Convert to Tamil Short names
    const bCurr = ENG_TO_TAMIL_SHORT[boyData.currentDasha] || boyData.currentDasha;
    const bNext = ENG_TO_TAMIL_SHORT[boyData.nextDasha] || boyData.nextDasha;
    const gCurr = ENG_TO_TAMIL_SHORT[girlData.currentDasha] || girlData.currentDasha;
    const gNext = ENG_TO_TAMIL_SHORT[girlData.nextDasha] || girlData.nextDasha;

    const tableHTML = `
        <style>
            .sandhi-table {
                width: 100%;
                border-collapse: collapse;
                font-family: 'Segoe UI', sans-serif;
                margin-top: 10px;
                border: 1px solid #ddd;
            }
            .sandhi-table th {
                background-color: #f4f4f4;
                color: #333;
                padding: 8px;
                text-align: left;
                font-size: 13px;
                border-bottom: 2px solid #ddd;
            }
            .sandhi-table td {
                padding: 8px;
                border-bottom: 1px solid #eee;
                font-size: 13px;
                color: #555;
            }
            .status-critical { background-color: #ffe6e6; color: #d9534f; font-weight: bold; }
            .status-warning { background-color: #fff3cd; color: #856404; font-weight: bold; }
            .status-good { background-color: #d4edda; color: #155724; font-weight: bold; }
            .highlight-row { background-color: #f9f9f9; }
        </style>

        <h3 style="font-size: 15px; color: #444; margin-bottom: 5px; border-left: 4px solid #9C27B0; padding-left: 8px;">Dasa Sandhi Analysis (Planetary Transition)</h3>
        <table class="sandhi-table resize-target">
            <thead>
                <tr>
                    <th>Profile</th>
                    <th>Transition</th>
                    <th>Sandhi Period</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Boy</strong></td>
                    <td>${bCurr} &#8594; ${bNext}</td>
                    <td>${boyData.sandhiStart} to ${boyData.sandhiEnd}</td>
                    <td>${boyData.isInSandhi ? '<span style="color:red">Transitioning</span>' : '<span style="color:green">Stable</span>'}</td>
                </tr>
                <tr class="highlight-row">
                    <td><strong>Girl</strong></td>
                    <td>${gCurr} &#8594; ${gNext}</td>
                    <td>${girlData.sandhiStart} to ${girlData.sandhiEnd}</td>
                    <td>${girlData.isInSandhi ? '<span style="color:red">Transitioning</span>' : '<span style="color:green">Stable</span>'}</td>
                </tr>
                <tr>
                    <td colspan="4" style="padding: 12px; border-top: 2px solid #ddd; background:#fafafa;">
                        <strong>Combined Prediction: </strong>
                        <span class="${combinedClass}" style="padding: 2px 6px; border-radius: 4px; font-size:12px;">${combinedStatus}</span>
                        <p style="margin-top: 5px; line-height: 1.4; color:#333;">
                            ${analysisText}
                        </p>
                    </td>
                </tr>
            </tbody>
        </table>
    `;

    document.getElementById(containerId).innerHTML = tableHTML;
}

// --- FIXED: Use PUBLIC API for Place Search (No Backend Required) ---
function searchCity(input) {
    // Clear old coords so we don't rely on stale data
    input.removeAttribute("data-lat");
    input.removeAttribute("data-lon");
    input.removeAttribute("data-tz");

    const val = input.value;
    if (val.length < 3) return;

    // USE OPEN-METEO API (Free, No Key, No Backend Required)
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`;

    fetch(url)
        .then(r => r.json())
        .then(data => {
            const dl = document.getElementById("placesList");
            dl.innerHTML = "";
            if (data.results) {
                data.results.forEach(city => {
                    const opt = document.createElement("option");
                    // Format Label: "Chennai, Tamil Nadu, India"
                    const country = city.country || "";
                    const region = city.admin1 || "";
                    let displayName = `${city.name}`;
                    if (region) displayName += `, ${region}`;
                    if (country) displayName += `, ${country}`;

                    opt.value = displayName; // This is what users see in the list

                    // Store coords for our calculation
                    opt.setAttribute("data-lat", city.latitude);
                    opt.setAttribute("data-lon", city.longitude);
                    opt.setAttribute("data-tz", 5.5); // Default to India Standard Time (Safe fallback)

                    dl.appendChild(opt);
                });
            }
        })
        .catch(e => console.error("Place search failed", e));
}
