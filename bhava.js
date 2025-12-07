/* static/js/bhava.js */

(function () {
    window.renderBhavaChart = function (data) {
        const bhavas = data.bhavas || [];
        const planets = data.planets || [];
        const lagnaRasiName = data.lagna_rasi; 
        
        const chartContainer = document.getElementById("chart");
        const centerLabel = document.getElementById("center-label");
        const tableWrap = document.getElementById("tableWrap");

        if (centerLabel) {
            centerLabel.innerText = "ஸ்ரீபதி பாவம்";
            centerLabel.style.opacity = "1";
        }

        if (chartContainer) chartContainer.innerHTML = "";

        const gridOrder = [
            "மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்",
            "கும்பம்", null, null, "கடகம்",
            "மகரம்", null, null, "சிம்மம்",
            "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"
        ];

        gridOrder.forEach(rasiName => {
            if (rasiName === null) {
                chartContainer.innerHTML += `<div></div>`;
                return;
            }

            const box = document.createElement("div");
            box.className = "chart-box";

            // Highlight Lagna Box
            if (rasiName === lagnaRasiName) {
                box.style.backgroundColor = "#fff8e1"; 
                box.style.borderColor = "#ff9800";
            } else {
                box.style.backgroundColor = "#fff";
                box.style.borderColor = "#000";
            }

            // --- Content Editable Box ---
            let boxContent = `<div contenteditable="true" style="width:100%; height:100%; outline:none;">`;

            const planetsInBox = planets.filter(p => p.rasi === rasiName);
            planetsInBox.forEach(p => {
                const color = getPlanetColor(p.name);
                boxContent += `
                    <div style="color:${color}; font-weight:bold; font-size:13px; line-height:1.4;">
                        ${p.name} 
                        <span style="color:#555; font-size:11px; font-weight:normal;">
                            (${p.bhava_no})
                        </span>
                    </div>`;
            });

            if (rasiName === lagnaRasiName) {
                boxContent += `<div style="font-size:10px; color:red; margin-top:2px;">[Lagna]</div>`;
            }
            
            boxContent += `</div>`;
            box.innerHTML = boxContent;

            chartContainer.appendChild(box);
        });

        if (tableWrap) {
            tableWrap.innerHTML = buildBhavaTable(bhavas, planets);
        }
    };

    function buildBhavaTable(bhavas, planets) {
        const shortNames = {
            "சூரியன்": "சூரி", "சந்திரன்": "சந்", "செவ்வாய்": "செவ்",
            "புதன்": "புத", "குரு": "குரு", "சுக்கிரன்": "சுக்",
            "சனி": "சனி", "ராகு": "ராகு", "கேது": "கேது",
            "லக்னம்": "லக்", "மாந்தி": "மா"
        };

        // --- FIXED WIDTH 600PX ---
        // We force the width here to 600px to match the chart.
        let html = `
            <div style="margin-bottom:5px; border-bottom:2px solid #ffb84d; width: 600px;">
                <h4 style="margin:5px 0;">Bhava Chalit (Sripati System)</h4>
            </div>
            <table id="planet-table" style="width: 600px; min-width: 600px; border-collapse:collapse; font-size:14px;">
                <thead>
                    <tr style="background:#ffb84d;">
                        <th style="border:1px solid #999; padding:6px; width:10%;">Bhava</th>
                        <th style="border:1px solid #999; padding:6px; width:20%;">Start (Sandhi)</th>
                        <th style="border:1px solid #999; padding:6px; width:20%;">Mid (Degree)</th>
                        <th style="border:1px solid #999; padding:6px; width:50%;">Planets</th>
                    </tr>
                </thead>
                <tbody>`;

        bhavas.sort((a,b) => a.house - b.house);

        bhavas.forEach(b => {
            const pList = planets
                .filter(p => p.bhava_no === b.house)
                .map(p => {
                    const dispName = shortNames[p.name] || p.name;
                    return `<span style="color:${getPlanetColor(p.name)}">${dispName}</span>`;
                })
                .join(", ");

            html += `
                <tr>
                    <td style="border:1px solid #ccc; padding:6px; text-align:center;">
                        <b>${b.house}</b>
                    </td>
                    <td contenteditable="true" style="border:1px solid #ccc; padding:6px; text-align:center;">
                        ${b.start_dms}
                    </td>
                    <td contenteditable="true" style="border:1px solid #ccc; padding:6px; text-align:center;">
                        ${b.mid_dms}
                    </td>
                    <td contenteditable="true" style="border:1px solid #ccc; padding:6px; text-align:center;">
                        ${pList || "-"}
                    </td>
                </tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }

    function getPlanetColor(name) {
        const colors = {
            "சூரியன்": "#e67e22", "சந்திரன்": "#3498db", "செவ்வாய்": "#ff4d4d",
            "புதன்": "#27ae60", "குரு": "#f1c40f", "சுக்கிரன்": "#f78fb3",
            "சனி": "#2c3e50", "ராகு": "#8e44ad", "கேது": "#95a5a6",
            "லக்னம்": "#ff7f00", "மாந்தி": "#34495e"
        };
        return colors[name] || "#000";
    }
})();