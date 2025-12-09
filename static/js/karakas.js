/* static/js/karakas.js */

(function() {
    // 1. Global State
    let karakaCache = null; 
    let lastChartRows = []; 
    
    const tamilPlanetMap = { 
        "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", 
        "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", 
        "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது"
    };

    // 2. Inject Checkbox
    function injectKarakaCheckbox() {
        if (document.getElementById("chkKarakasContainer")) return;

        const container = document.createElement("div");
        container.id = "chkKarakasContainer";
        Object.assign(container.style, {
            display: "inline-flex", alignItems: "center", marginLeft: "10px"
        });

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = "chkKarakas";
        chk.style.cursor = "pointer";
        chk.onchange = handleKarakaToggle;

        const label = document.createElement("label");
        label.htmlFor = "chkKarakas";
        label.innerText = " Jaimini Karakas";
        Object.assign(label.style, {
            marginLeft: "5px", cursor: "pointer", fontWeight: "bold", color: "#673AB7"
        });

        container.appendChild(chk);
        container.appendChild(label);

        const formbar = document.getElementById("formbar");
        if (formbar) formbar.appendChild(container);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectKarakaCheckbox);
    else injectKarakaCheckbox();

    // 3. Toggle Logic
    async function handleKarakaToggle() {
        const isChecked = document.getElementById("chkKarakas").checked;
        if (isChecked && !karakaCache) {
            await fetchAndStoreKarakas();
        }
        if (window.renderChart && lastChartRows.length > 0) {
            window.renderChart(lastChartRows);
        }
    }

    async function fetchAndStoreKarakas() {
        let payload = {};
        if (typeof collectChartData === "function") payload = collectChartData();
        else {
            const d = document.getElementById("date")?.value;
            const t = document.getElementById("time")?.value;
            payload = { date: d, time: t, tz: 5.5 };
        }

        try {
            document.body.style.cursor = "wait";
            const res = await fetch("/compute_karakas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if(json.status === "ok") {
                karakaCache = {};
                json.data.forEach(item => {
                    const tamilName = tamilPlanetMap[item.planet];
                    if (tamilName) karakaCache[tamilName] = item.karaka_code;
                });
            }
        } catch (e) { console.error("Error fetching Karakas:", e); } 
        finally { document.body.style.cursor = "default"; }
    }

    // ============================================================
    // 🚀 FIXED RENDERER: USES FLEX-ROW TO FORCE SIDE-BY-SIDE
    // ============================================================
    window.renderChart = function(rows) {
        lastChartRows = rows; 

        const isKarakasEnabled = document.getElementById("chkKarakas")?.checked;
        const tamilRasis = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"];
        const grid = {}; 
        tamilRasis.forEach(r => grid[r] = []);
        let lagnaRasi = null;

        const planetColors = {
            "சூரியன்": "#e67e22", "சந்திரன்": "#3498db", "செவ்வாய்": "#ff4d4d",
            "புதன்": "#27ae60", "குரு": "#f1c40f", "சுக்கிரன்": "#f78fb3",
            "சனி": "#2c3e50", "ராகு": "#8e44ad", "கேது": "#95a5a6",
            "லக்னம்": "#ff7f00", "மாந்தி": "#34495e"
        };

        rows.forEach(r => {
            if (!r.name || r.name === "ராசி") return;
            const rasi = r.rasi || "";
            if (!rasi || !grid.hasOwnProperty(rasi)) return;

            const color = planetColors[r.name] || "#000";
            if (r.name === "லக்னம்" || r.name === "Lagna") lagnaRasi = rasi;
            
            // 1. Prepare Name HTML
            const nameHtml = `<span style='color:${color}; font-weight:bold;'>${r.grid_label || r.name}</span>`;
            
            // 2. Prepare Karaka HTML
            let karakaHtml = "";
            if (isKarakasEnabled && karakaCache && karakaCache[r.name]) {
                karakaHtml = `<span style="font-size:0.85em; font-weight:normal; color:#555; margin-left:4px;">(${karakaCache[r.name]})</span>`;
            }

            // 3. Prepare Degree HTML
            let degreeHtml = "";
            if (r.dms) {
                let match = r.dms.match(/(\d+)[°:] ?(\d+)/);
                if (match) {
                    degreeHtml = `<div style="font-size:11px; color:#666; margin-top:0px;">${match[1]}°${match[2]}'</div>`;
                } else if (typeof r.dms === "string") {
                    degreeHtml = `<div style="font-size:11px; color:#666; margin-top:0px;">${r.dms.replace(/[^\d°′]/g, "").slice(0, 6)}</div>`;
                }
            }

            // 4. Combine into Layout
            // We use 'display: flex; flex-direction: row' on the wrapper to FORCE them onto the same line.
            const rowContent = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:3px;">
                    <div style="display:flex; flex-direction:row; align-items:center; justify-content:center; white-space:nowrap; width:100%;">
                        ${nameHtml}
                        ${karakaHtml}
                    </div>
                    ${degreeHtml}
                </div>
            `;

            grid[rasi].push(rowContent);
        });

        // Render Grid
        const order = ["மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்", "கும்பம்", null, null, "கடகம்", "மகரம்", null, null, "சிம்மம்", "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"];
        const chart = document.getElementById("chart");
        if(chart) {
            chart.innerHTML = "";
            order.forEach(r => {
                if (r === null) chart.innerHTML += "<div></div>";
                else {
                    const hl = (r === lagnaRasi);
                    chart.innerHTML += `<div class='chart-box' style='background:${hl ? "#fff8e1" : "#fff"}; border-color:${hl ? "#ff9800" : "#000"}; display:flex; flex-direction:column; justify-content:center; align-items:center;'>
                        ${grid[r].join("")} 
                    </div>`;
                }
            });
        }
    };

})();
