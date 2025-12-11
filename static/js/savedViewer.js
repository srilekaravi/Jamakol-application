/* savedViewer.js — Updated
   - SEARCH: Global filter.
   - WINDOW: Draggable & Resizable.
   - PREVIEW: Compact table with "Star - Pada".
   - MOBILE: Optimized layout.
*/

(function () {
    // --- TAMIL DICTIONARY ---
    const TAMIL_MAP = {
        "sun": "சூரியன்", "moon": "சந்திரன்", "mars": "செவ்வாய்", "mercury": "புதன்",
        "jupiter": "குரு", "venus": "சுக்கிரன்", "saturn": "சனி", "rahu": "ராகு", "ketu": "கேது",
        "ascendant": "லக்னம்", "lagna": "லக்னம்",
        "aries": "மேஷம்", "taurus": "ரிஷபம்", "gemini": "மிதுனம்", "cancer": "கடகம்",
        "leo": "சிம்மம்", "virgo": "கன்னி", "libra": "துலாம்", "scorpio": "விருச்சிகம்",
        "sagittarius": "தனுசு", "capricorn": "மகரம்", "aquarius": "கும்பம்", "pisces": "மீனம்",
        "ashwini": "அஸ்வினி", "bharani": "பரணி", "krittika": "கிருத்திகை", "rohini": "ரோகிணி", "mrigashirsha": "மிருகசீரிஷம்", "ardra": "திருவாதிரை",
        "punarvasu": "புனர்பூசம்", "pushya": "பூசம்", "ashlesha": "ஆயில்யம்", "magha": "மகம்", "purva phalguni": "பூரம்", "uttara phalguni": "உத்திரம்",
        "hasta": "ஹஸ்தம்", "chitra": "சித்திரை", "swati": "சுவாதி", "vishakha": "விசாகம்", "anuradha": "அனுஷம்", "jyeshtha": "கேட்டை",
        "mula": "மூலம்", "purva ashadha": "பூராடம்", "uttara ashadha": "உத்திராடம்", "shravana": "திருவோணம்", "dhanishta": "அவிட்டம்",
        "shatabhisha": "சதயம்", "purva bhadrapada": "பூரட்டாதி", "uttara bhadrapada": "உத்திரட்டாதி", "revati": "ரேவதி"
    };

    function toTamil(text) {
        if (!text) return "";
        const lower = text.toString().toLowerCase().trim();
        if (TAMIL_MAP[lower]) return TAMIL_MAP[lower];
        for (const [key, val] of Object.entries(TAMIL_MAP)) {
            if (lower.startsWith(key)) return val;
        }
        return text;
    }

    // --- HELPERS ---
    function $id(id) { return document.getElementById(id); }
    function el(tag, props, style) {
        const e = document.createElement(tag);
        if (props) Object.keys(props).forEach(k => e.setAttribute(k, props[k]));
        if (style) e.style.cssText = style;
        return e;
    }
    function safeNum(v, d = 0) {
        if (v === null || v === undefined) return d;
        if (typeof v === "number") return v;
        const n = Number(v);
        return isNaN(n) ? d : n;
    }
    function escapeHtml(s) {
        if (s === null || s === undefined) return "";
        return ("" + s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
    }

    // --- 1. DRAGGABLE & RESIZABLE WINDOW ---
    function createDraggableWindow(winId, title, contentHtml, width = "95%") {
        let win = $id(winId);
        if (win) {
            const body = win.querySelector(".sv-win-body");
            if (body) body.innerHTML = contentHtml;
            win.style.display = "flex";
            // Bring to front
            const highestZ = Math.max(...Array.from(document.querySelectorAll('.sv-floating-win')).map(el => parseFloat(window.getComputedStyle(el).zIndex) || 1000), 1000);
            win.style.zIndex = highestZ + 1;
            return win;
        }

        // Added resize:both and overflow:hidden for adjustability
        win = el("div", { id: winId, class: "sv-floating-win" },
            `position:fixed;top:20px;left:50%;transform:translateX(-50%);
             width:${width};max-width:1200px;max-height:90vh;
             background:#fff;box-shadow:0 10px 40px rgba(0,0,0,0.5);
             border-radius:8px;display:flex;flex-direction:column;
             z-index:10000;font-family:sans-serif;
             resize:both;overflow:hidden;min-width:320px;min-height:300px;`);

        const header = el("div", {},
            `background:#fdf2d3;padding:12px;border-bottom:1px solid #ddd;
             border-radius:8px 8px 0 0;cursor:move;display:flex;justify-content:space-between;align-items:center;user-select:none;touch-action:none;flex-shrink:0;`);

        // Header Title + Actions
        const titleSpan = el("span", {}, "font-weight:bold;font-size:16px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;");
        titleSpan.innerHTML = `<span>${title}</span>`;

        if (winId === "sv_main_win") {
            const btnStyle = "font-size:11px;padding:4px 8px;cursor:pointer;border-radius:4px;border:1px solid #999;background:#fff;margin-left:5px;font-weight:bold;color:#333;";

            const jsonBtn = el("button", {}, btnStyle);
            jsonBtn.innerText = "⬇ JSON";
            jsonBtn.onclick = (e) => { e.stopPropagation(); window.savedViewer.downloadJSON(); };

            const csvBtn = el("button", {}, btnStyle);
            csvBtn.innerText = "⬇ CSV";
            csvBtn.onclick = (e) => { e.stopPropagation(); window.savedViewer.downloadCSV(); };

            const restBtn = el("button", {}, btnStyle + "background:#e6f7ff;border-color:#1890ff;color:#1890ff;");
            restBtn.innerText = "⬆ Restore";
            restBtn.onclick = (e) => { e.stopPropagation(); window.savedViewer.triggerRestore(); };

            titleSpan.appendChild(jsonBtn);
            titleSpan.appendChild(csvBtn);
            titleSpan.appendChild(restBtn);
        }

        header.appendChild(titleSpan);

        const closeBtn = el("button", {},
            `background:#ff5f5f;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-weight:bold;font-size:14px;margin-left:auto;`);
        closeBtn.innerText = "X";
        closeBtn.onclick = () => { win.style.display = "none"; };
        header.appendChild(closeBtn);

        const body = el("div", { class: "sv-win-body" }, "flex:1;overflow-y:auto;padding:0;background:#fff;");
        body.innerHTML = contentHtml;

        const footer = el("div", {}, "padding:5px 10px;background:#f9f9f9;border-top:1px solid #eee;text-align:right;font-size:11px;color:#777;border-radius:0 0 8px 8px;flex-shrink:0;cursor:ns-resize;");
        footer.innerText = "⇲ Drag edge to resize | Drag header to move";

        win.appendChild(header);
        win.appendChild(body);
        win.appendChild(footer);
        document.body.appendChild(win);

        // Drag Logic
        let isDragging = false, startX, startY, initLeft, initTop;
        const startDrag = (e) => {
            if (e.target === closeBtn || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX; startY = clientY;
            const rect = win.getBoundingClientRect();
            initLeft = rect.left; initTop = rect.top;

            // Remove center transform to allow absolute positioning
            win.style.transform = "none";
            win.style.left = initLeft + "px"; win.style.top = initTop + "px";
        };
        const doDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            win.style.left = (initLeft + (clientX - startX)) + "px";
            win.style.top = (initTop + (clientY - startY)) + "px";
        };
        const stopDrag = () => { isDragging = false; };

        header.addEventListener("mousedown", startDrag);
        window.addEventListener("mousemove", doDrag);
        window.addEventListener("mouseup", stopDrag);
        header.addEventListener("touchstart", startDrag, { passive: false });
        window.addEventListener("touchmove", doDrag, { passive: false });
        window.addEventListener("touchend", stopDrag);

        return win;
    }

    // --- 2. MAIN SAVED LIST ---
    let savedCache = [];
    let sortState = { field: 'saved', dir: 'desc' };

    async function openSavedModal() {
        createDraggableWindow("sv_main_win", "📂 சேமிக்கப்பட்ட ஜாதகங்கள்", "<div style='padding:20px;text-align:center'>Loading...</div>");
        await loadSavedCache();
        renderSavedList();
    }

    async function loadSavedCache() {
        try {
            const res = await fetch("/list_charts");
            const j = await res.json();
            savedCache = (j && j.status === "ok" && Array.isArray(j.charts)) ? j.charts : [];
        } catch (e) { console.error(e); savedCache = []; }
    }

    function handleSort(field) {
        if (sortState.field === field) {
            sortState.dir = (sortState.dir === 'asc') ? 'desc' : 'asc';
        } else {
            sortState.field = field;
            sortState.dir = 'asc';
        }
        renderSavedList();
    }

    function renderSavedList() {
        const searchVal = ($id("sv_search_input") && $id("sv_search_input").value.trim().toLowerCase()) || "";

        let displayList = savedCache.filter(item => {
            let city = "";
            if (item.place_json) {
                if (typeof item.place_json === 'string') { try { item.place_json = JSON.parse(item.place_json); } catch (e) { } }
                city = item.place_json.city || item.place_json.city_name || "";
            }
            const text = [item.name, item.date, city, item.id, item.gender, item.tag, item.comment].join(" ").toLowerCase();
            return !searchVal || text.indexOf(searchVal) !== -1;
        });

        // SORTING
        displayList.sort((a, b) => {
            let valA, valB;
            switch (sortState.field) {
                case 'name': valA = (a.name || "").toLowerCase(); valB = (b.name || "").toLowerCase(); break;
                case 'dob': valA = (a.date + a.time); valB = (b.date + b.time); break;
                case 'place':
                    valA = (a.place_json && (a.place_json.city || a.place_json.city_name)) || "";
                    valB = (b.place_json && (b.place_json.city || b.place_json.city_name)) || "";
                    break;
                case 'gender': valA = (a.gender || "").toLowerCase(); valB = (b.gender || "").toLowerCase(); break;
                case 'tag': valA = (a.tag || "").toLowerCase(); valB = (b.tag || "").toLowerCase(); break;
                case 'saved':
                    valA = a.saved_on || a.updated_at || a.saved_at || a.created_at || a.id;
                    valB = b.saved_on || b.updated_at || b.saved_at || b.created_at || b.id;
                    break;
                default: valA = a.id; valB = b.id; break;
            }
            if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
            return 0;
        });

        // HTML Header
        let html = `
            <div style="padding:10px;background:#fff;position:sticky;top:0;border-bottom:1px solid #eee;display:flex;gap:10px;z-index:5;align-items:center;">
                <input type="text" id="sv_search_input" placeholder="🔍 Search Name, City, Tag..." value="${escapeHtml(searchVal)}" 
                       style="flex:1;padding:10px;border:1px solid #ccc;border-radius:4px;font-size:16px;">
                
                <button onclick="window.savedViewer.refresh()" 
                        style="padding:10px 15px;cursor:pointer;background:#007bff;color:white;border:none;border-radius:4px;font-weight:bold;font-size:14px;white-space:nowrap;">
                    🔄 Refresh
                </button>
            </div>
            
            <div style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px;">
                    <thead style="background:#fdebb0;position:sticky;top:0;z-index:4;">
                        <tr>
                            ${renderTh('#', 'id')}
                            ${renderTh('Name', 'name')}
                            ${renderTh('Gender', 'gender')}
                            ${renderTh('DOB / TOB', 'dob')}
                            ${renderTh('Place', 'place')}
                            ${renderTh('Tag', 'tag')}
                            ${renderTh('Notes', 'notes')}
                            ${renderTh('Saved On', 'saved')}
                            <th style="padding:10px;text-align:center;border-bottom:2px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (displayList.length === 0) {
            html += `<tr><td colspan="9" style="padding:20px;text-align:center;color:#666">No charts found.</td></tr>`;
        } else {
            displayList.forEach(item => {
                let city = (item.place_json && (item.place_json.city || item.place_json.city_name)) || "";

                // --- TIMESTAMP LOGIC ---
                let rawDate = item.saved_on || item.saved_at || item.updated_at || item.timestamp || "";
                let displayDate = "";

                if (rawDate && rawDate !== "-") {
                    try {
                        let localStr = String(rawDate).split(".")[0].replace(" ", "T");
                        let d = new Date(localStr);
                        if (!isNaN(d)) {
                            displayDate = d.toLocaleString('en-GB', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                            }).toLowerCase();
                        } else { displayDate = rawDate; }
                    } catch (e) { displayDate = rawDate; }
                } else {
                    displayDate = `<span style="color:#ccc;">-</span>`;
                }

                html += `
                    <tr style="border-bottom:1px solid #eee;background:#fff;">
                        <td style="padding:8px;">${item.id}</td>
                        <td style="padding:8px;font-weight:bold;color:#333">${escapeHtml(item.name)}</td>
                        <td style="padding:8px;color:#555">${escapeHtml(item.gender)}</td>
                        <td style="padding:8px;color:#555;white-space:nowrap">${escapeHtml(item.date)}<br><small>${escapeHtml(item.time)}</small></td>
                        <td style="padding:8px;color:#555">${escapeHtml(city)}</td>
                        <td style="padding:8px;"><span style="background:#eef;padding:2px 6px;border-radius:4px;font-size:11px">${escapeHtml(item.tag)}</span></td>
                        <td style="padding:8px;color:#777;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(item.comment)}">${escapeHtml(item.comment)}</td>
                        <td style="padding:8px;color:#222;font-size:12px;white-space:nowrap;font-weight:500;">${displayDate}</td>
                        <td style="padding:8px;text-align:center;white-space:nowrap;">
                            <button onclick="window.savedViewer.load(${item.id})" class="sv-btn load">Load</button>
                            <button onclick="window.savedViewer.preview(${item.id})" class="sv-btn preview">View</button>
                            <button onclick="window.savedViewer.delete(${item.id})" class="sv-btn delete">Del</button>
                        </td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table></div>`;
        html += `<style>.sv-btn{cursor:pointer;border:none;background:none;text-decoration:underline;margin:0 5px;font-size:14px;padding:5px} .sv-btn.load{color:#007bff} .sv-btn.preview{color:#28a745} .sv-btn.delete{color:#dc3545}</style>`;

        const win = createDraggableWindow("sv_main_win", "📂 சேமிக்கப்பட்ட ஜாதகங்கள்", html);

        // Setup Search
        const input = win.querySelector("#sv_search_input");
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
            input.oninput = () => renderSavedList();
        }
    }

    function renderTh(label, field) {
        let arrow = "";
        if (sortState.field === field) arrow = sortState.dir === 'asc' ? " 🔼" : " 🔽";
        return `<th onclick="window.savedViewer.sort('${field}')" style="padding:10px;text-align:left;cursor:pointer;border-bottom:2px solid #ddd;white-space:nowrap;min-width:80px" title="Sort by ${label}">${label}${arrow}</th>`;
    }

    // --- 3. EXPORT / IMPORT (Unchanged Logic) ---
    function downloadJSON() {
        if (!savedCache.length) { alert("No charts to backup."); return; }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedCache, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", "charts_backup.json");
        document.body.appendChild(dlAnchor); dlAnchor.click(); dlAnchor.remove();
    }

    function downloadCSV() {
        if (!savedCache.length) { alert("No charts to export."); return; }
        const headers = ["ID", "Name", "Gender", "Date", "Time", "City", "Lat", "Lon", "Tag", "Notes", "Saved_On"];
        const rows = savedCache.map(c => {
            let pj = {};
            if (c.place_json) {
                if (typeof c.place_json === 'string') { try { pj = JSON.parse(c.place_json); } catch (e) { } }
                else pj = c.place_json;
            }
            const esc = (t) => {
                if (t === null || t === undefined) return "";
                let str = String(t).replace(/"/g, '""');
                if (str.includes(",") || str.includes("\n")) str = `"${str}"`;
                return str;
            };
            return [
                c.id, esc(c.name), esc(c.gender), esc(c.date), esc(c.time),
                esc(pj.city || pj.city_name), esc(pj.lat), esc(pj.lon),
                esc(c.tag), esc(c.comment), esc(c.saved_at || c.updated_at)
            ].join(",");
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", encodeURI(csvContent));
        dlAnchor.setAttribute("download", "charts_export.csv");
        document.body.appendChild(dlAnchor); dlAnchor.click(); dlAnchor.remove();
    }

    function triggerRestore() {
        let input = $id("sv_restore_input");
        if (!input) {
            input = document.createElement("input");
            input.type = "file";
            input.id = "sv_restore_input";
            input.accept = ".json";
            input.style.display = "none";
            input.onchange = handleRestoreFile;
            document.body.appendChild(input);
        }
        input.value = ""; input.click();
    }

    function handleRestoreFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".json")) { alert("Only .json files are allowed."); return; }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const charts = JSON.parse(e.target.result);
                if (!Array.isArray(charts)) throw new Error("Invalid format.");
                if (!confirm(`Restore ${charts.length} charts?`)) return;

                let successCount = 0;
                for (const c of charts) {
                    const payload = {
                        name: c.name, date: c.date, time: c.time,
                        place: (typeof c.place_json === 'object') ? JSON.stringify(c.place_json) : c.place_json,
                        gender: c.gender || "male", tag: c.tag || "", comment: c.comment || "",
                        saved_at: c.saved_at || c.updated_at
                    };
                    try {
                        await fetch("/save_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                        successCount++;
                    } catch (err) { }
                }
                alert(`Restored ${successCount} charts.`);
                loadSavedCache().then(renderSavedList);
            } catch (err) { alert("Error reading file."); }
        };
        reader.readAsText(file);
    }

    // --- 4. PREVIEW & LOAD LOGIC ---
    async function loadSavedChart(cid) {
        try {
            const { rows, chart } = await getChartRowsOrCompute(cid);
            if ($id("name")) $id("name").value = chart.name || "";
            if ($id("date")) $id("date").value = chart.date || "";
            if ($id("time")) $id("time").value = chart.time || "";
            if ($id("gender")) $id("gender").value = chart.gender || "male";
            if ($id("tag")) $id("tag").value = chart.tag || "";
            if ($id("comment")) $id("comment").value = chart.comment || "";

            let pj = chart.place_json || {};
            if (typeof pj === "string") { try { pj = JSON.parse(pj); } catch (e) { } }
            const placeField = $id("placeSearch") || $id("place");
            if (placeField) {
                placeField.value = pj.city || pj.city_name || pj.label || "";
                placeField.dataset.lat = safeNum(pj.lat, 13.0827);
                placeField.dataset.lon = safeNum(pj.lon, 80.2707);
                placeField.dataset.tz = safeNum(pj.tz, 5.5);
            }
            window.currentEditingId = chart.id;
            window.currentChartId = chart.id;
            $id("sv_main_win").style.display = "none";
            setTimeout(() => {
                if (typeof generateChart === "function") generateChart();
                else if (typeof updateChart === "function") updateChart();
            }, 50);
        } catch (e) { alert("Failed to load: " + e.message); }
    }

    async function deleteSavedChart(cid) {
        if (!confirm(`Delete chart #${cid}?`)) return;
        try {
            await fetch(`/delete_chart/${cid}`, { method: "POST" });
            await loadSavedCache();
            renderSavedList();
        } catch (e) { alert("Delete failed"); }
    }

    async function getChartRowsOrCompute(cid) {
        const res = await fetch(`/get_chart/${cid}`);
        const j = await res.json();
        if (!j || !j.chart) throw new Error("Chart not found");
        const chart = j.chart;
        let data = chart.data_json || {};
        if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { } }
        let rows = (Array.isArray(data.rows) && data.rows.length) ? data.rows : null;
        if (!rows) {
            let pj = chart.place_json || {};
            if (typeof pj === "string") { try { pj = JSON.parse(pj); } catch (e) { } }
            const payload = {
                date: chart.date, time: chart.time,
                lat: safeNum(pj.lat, 13.0827), lon: safeNum(pj.lon, 80.2707), tz: safeNum(pj.tz, 5.5),
                ayanamsa: chart.ayanamsa || "lahiri", chartType: "rasi"
            };
            const gres = await fetch("/generate_chart", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const gj = await gres.json();
            if (gj && gj.rows) rows = gj.rows;
        }
        return { rows, chart };
    }

    // --- PREVIEW WINDOW (Optimized for Mobile + Compact Table) ---
    async function previewSavedChart(cid) {
        try {
            createDraggableWindow("sv_preview_win", "Previewing...", "<div style='padding:20px'>Loading...</div>", "95%");
            const { rows, chart } = await getChartRowsOrCompute(cid);
            if (!rows) throw new Error("Could not generate chart data.");
            const navRows = calculateNavamsaLocally(rows);

            const html = `
                <div style="display:flex;gap:20px;padding:15px;flex-wrap:wrap;background:#fff;justify-content:center;">
                    
                    <div style="flex:1 1 300px; max-width:320px; width:100%;">
                        <h4 style="margin:0 0 5px 0;color:#c33;text-align:center;">ராசி (RASI)</h4>
                        ${buildVisualChartHtml(rows, "ராசி")}
                    </div>

                    <div style="flex:1 1 300px; max-width:320px; width:100%;">
                        <h4 style="margin:0 0 5px 0;color:#c33;text-align:center;">நவாம்சம் (NAVAMSA)</h4>
                        ${buildVisualChartHtml(navRows, "நவாம்சம்")}
                    </div>

                    <div style="flex:1 1 100%;max-height:400px;overflow-y:auto;border-top:1px solid #eee;margin-top:10px;padding-top:10px;">
                        <h4 style="margin:0 0 10px 0;font-size:14px;">கிரக விவரங்கள் (Planet Details)</h4>
                        ${buildCompactPlanetTable(rows)}
                    </div>
                </div>
            `;
            createDraggableWindow("sv_preview_win", `Preview: ${chart.name}`, html, "95%");

        } catch (e) {
            console.error(e);
            alert("Preview Error: " + e.message);
            $id("sv_preview_win").style.display = "none";
        }
    }

    // --- 5. VISUAL HELPERS ---
    function getSignIndex(signName) {
        if (!signName) return 0;
        const s = signName.toLowerCase().trim();
        const map = {
            "aries": 0, "mesham": 0, "மேஷம்": 0, "taurus": 1, "rishabam": 1, "ரிஷபம்": 1, "gemini": 2, "mithunam": 2, "மிதுனம்": 2, "cancer": 3, "katakam": 3, "கடகம்": 3, "leo": 4, "simham": 4, "சிம்மம்": 4, "virgo": 5, "kanni": 5, "கன்னி": 5, "libra": 6, "thulam": 6, "துலாம்": 6, "scorpio": 7, "vrichikam": 7, "விருச்சிகம்": 7, "sagittarius": 8, "dhanusu": 8, "தனுசு": 8, "capricorn": 9, "makaram": 9, "மகரம்": 9, "aquarius": 10, "kumbam": 10, "கும்பம்": 10, "pisces": 11, "meenam": 11, "மீனம்": 11
        };
        return (map[s] !== undefined) ? map[s] : 0;
    }
    function parseDmsToDecimal(dmsStr) {
        if (typeof dmsStr === "number") return dmsStr;
        if (!dmsStr) return 0;
        const parts = dmsStr.match(/(\d+)[°:]\s*(\d+)/);
        if (parts && parts.length >= 3) return parseFloat(parts[1]) + (parseFloat(parts[2]) / 60);
        return parseFloat(dmsStr) || 0;
    }
    function calculateNavamsaLocally(rasiRows) {
        const signs = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"];
        return rasiRows.map(row => {
            const rasiIdx = getSignIndex(row.rasi || row.sign);
            const deg = parseDmsToDecimal(row.dms);
            const absDeg = (rasiIdx * 30) + deg;
            const navamsaAbs = Math.floor(absDeg / (40 / 12));
            const navamsaSignIdx = navamsaAbs % 12;
            return {
                grid_label: row.grid_label || row.name || row.planet,
                dms: row.dms,
                rasi: signs[navamsaSignIdx]
            };
        });
    }

    function buildVisualChartHtml(rows, centerText) {
        const grid = [[12, 1, 2, 3], [11, 0, 0, 4], [10, 0, 0, 5], [9, 8, 7, 6]];
        const boxes = {}; for (let i = 1; i <= 12; i++) boxes[i] = [];
        rows.forEach(p => {
            let rasiIdx = getSignIndex(p.rasi || p.sign);
            let house = rasiIdx + 1;
            let pName = p.grid_label || p.name || p.planet;
            let tamilName = toTamil(pName);
            let txt = `<b>${tamilName}</b>`;
            if (p.dms) txt += `<br><span style="font-size:9px;color:#555">${p.dms}</span>`;
            boxes[house].push(`<div style="margin-bottom:2px;">${txt}</div>`);
        });

        let html = `<table style="width:100%;aspect-ratio:1/1;table-layout:fixed;border-collapse:collapse;border:2px solid #b85c5c;">`;
        for (let r = 0; r < 4; r++) {
            html += "<tr>";
            for (let c = 0; c < 4; c++) {
                let h = grid[r][c];
                if (h === 0) {
                    if (r === 1 && c === 1) html += `<td rowspan="2" colspan="2" style="text-align:center;font-weight:bold;color:#b85c5c;background:#fff8e5;border:1px solid #b85c5c;font-size:14px">${centerText}</td>`;
                } else {
                    html += `<td style="width:25%;height:25%;vertical-align:top;padding:2px;border:1px solid #b85c5c;font-size:9px;background:#fff;overflow:hidden;word-wrap:break-word;line-height:1.1;">${boxes[h].join("")}</td>`;
                }
            }
            html += "</tr>";
        }
        html += "</table>";
        return html;
    }

    // --- COMPACT TABLE WITH PADA ---
    function buildCompactPlanetTable(rows) {
        let html = `<table style="width:100%;font-size:12px;border-collapse:collapse;border:1px solid #ccc;">
                    <thead style="background:#f0f0f0;">
                        <tr style="text-align:left;">
                            <th style="padding:4px;border:1px solid #ccc;">கிரகம்</th>
                            <th style="padding:4px;border:1px solid #ccc;">பாகை</th>
                            <th style="padding:4px;border:1px solid #ccc;">ராசி</th>
                            <th style="padding:4px;border:1px solid #ccc;">நட்சத்திரம் - பாதம்</th>
                        </tr>
                    </thead>
                    <tbody>`;
        rows.forEach(r => {
            let tPlanet = toTamil(r.grid_label || r.name);
            let tRasi = toTamil(r.rasi || "");
            let tNak = toTamil(r.nak || r.nakshatra || "");
            // COMBINE NAKSHATRA + PADA (e.g., மூலம் - 4)
            if (r.pada) {
                tNak += ` - ${r.pada}`;
            }

            html += `<tr>
                <td style="padding:4px;border:1px solid #ccc;">${tPlanet}</td>
                <td style="padding:4px;border:1px solid #ccc;">${r.dms || ""}</td>
                <td style="padding:4px;border:1px solid #ccc;">${tRasi}</td>
                <td style="padding:4px;border:1px solid #ccc;">${tNak}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    // --- INIT ---
    function init() {
        const btn = $id("VIEW_SAVED_BTN") || $id("viewSavedBtn") || document.querySelector(".view-saved");
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener("click", (e) => { e.preventDefault(); openSavedModal(); });
        }
    }

    window.savedViewer = {
        load: loadSavedChart,
        preview: previewSavedChart,
        delete: deleteSavedChart,
        sort: handleSort,
        refresh: () => { loadSavedCache().then(renderSavedList); },
        downloadJSON: downloadJSON,
        downloadCSV: downloadCSV,
        triggerRestore: triggerRestore
    };

    document.addEventListener("DOMContentLoaded", init);
})();