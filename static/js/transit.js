// static/js/transit.js — FINAL FIXED VERSION (Body Append + Explicit Natchatra Keys)
(function () {
    const BTN_ID = "toggleTransitBtn";
    const CONTAINER_ID = "transitContainer";
    const BOX_ID = "transitBox";
    const HISTORY_ID = "transitHistoryBox";
    const DEFAULT_PLACE = { lat: 13.0827, lon: 80.2707, tz: 5.5 };

    const tamilRasis = [
        "மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
        "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"
    ];

    const rasiOwners = {
        "மேஷம்": "செவ்வாய்", "Aries": "செவ்வாய்",
        "ரிஷபம்": "சுக்கிரன்", "Taurus": "சுக்கிரன்",
        "மிதுனம்": "புதன்", "Gemini": "புதன்",
        "கடகம்": "சந்திரன்", "Cancer": "சந்திரன்",
        "சிம்மம்": "சூரியன்", "Leo": "சூரியன்",
        "கன்னி": "புதன்", "Virgo": "புதன்",
        "துலாம்": "சுக்கிரன்", "Libra": "சுக்கிரன்",
        "விருச்சிகம்": "செவ்வாய்", "Scorpio": "செவ்வாய்",
        "தனுசு": "குரு", "Sagittarius": "குரு",
        "மகரம்": "சனி", "Capricorn": "சனி",
        "கும்பம்": "சனி", "Aquarius": "சனி",
        "மீனம்": "குரு", "Pisces": "குரு"
    };

    const planetColors = {
        "சூரியன்": "#e67e22", "சந்திரன்": "#3498db", "செவ்வாய்": "#ff4d4d", "புதன்": "#27ae60", "குரு": "#f1c40f",
        "சுக்கிரன்": "#f78fb3", "சனி": "#2c3e50", "ராகு": "#8e44ad", "கேது": "#95a5a6", "மாந்தி": "#34495e", "லக்னம்": "#ff7f00"
    };

    function getShortName(name) {
        if (!name) return "";
        const map = {
            "சூரியன்": "சூரி", "சந்திரன்": "சந்", "செவ்வாய்": "செவ்", "புதன்": "புத",
            "குரு": "குரு", "சுக்கிரன்": "சுக்", "சனி": "சனி", "ராகு": "ராகு", "கேது": "கேது",
            "Sun": "சூரி", "Moon": "சந்", "Mars": "செவ்", "Mercury": "புத",
            "Jupiter": "குரு", "Venus": "சுக்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது"
        };
        return map[name] || (name.length > 3 ? name.substring(0, 3) : name);
    }

    const css = `
  #${CONTAINER_ID}{position:absolute;left:0;top:620px;display:none;gap:8px;z-index:9999;align-items:flex-start;}
  #${BOX_ID}{width:520px;background:#fffef8;border:2px solid #ccc;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.15);}
  #transitHeader{background:#fdf4d0;padding:8px 10px;font-weight:600;display:flex;justify-content:space-between;align-items:center;cursor:grab;border-bottom:1px solid #ddd;border-radius:10px 10px 0 0; user-select:none;}
  #transitHeader .close-btn {cursor:pointer; font-size:16px; color:#555; padding:0 4px;}
  #transitHeader .close-btn:hover {color:#d00;}
  #${HISTORY_ID}{width:520px;max-height:520px;overflow:auto;background:#f7fbff;border:2px solid #cfe2ff;border-radius:10px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,0.08);}
  #${HISTORY_ID} table{width:100%;border-collapse:collapse;font-size:12px;}
  #${HISTORY_ID} th,#${HISTORY_ID} td{border:1px solid #ccc;padding:4px;text-align:left;vertical-align:middle;}
  #${HISTORY_ID} input[type="text"],#${HISTORY_ID} input[type="datetime-local"],#${HISTORY_ID} textarea{width:100%;font-size:12px;padding:4px;box-sizing:border-box;border:1px solid #bbb;border-radius:3px;}
  #${HISTORY_ID} button{padding:4px 6px;font-size:12px;border-radius:4px;cursor:pointer;}
  #${HISTORY_ID} .view-link{color:#0b63d6;cursor:pointer;text-decoration:underline;background:none;border:none;padding:0;}
  .transit-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:2px;position:relative;}
  .transit-cell{border:1px solid #999;border-radius:6px;background:#fff;min-height:110px;font-size:11px;text-align:center;padding:2px; position:relative;}
  .transit-highlight{border-color:#ff9800;background:#fff8e1;}
  #transit-center-label{grid-column:2/4;grid-row:2/4;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#b35400;position:absolute;inset:0;pointer-events:none;}
  .preview-panel{position:absolute;width:420px;background:#fff;border:2px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:10001;padding:6px;overflow:auto;}
  .preview-header{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid #eee;font-weight:600;}
  .preview-close{cursor:pointer;padding:4px 6px;border-radius:6px;background:#f5f5f5;}
  .notes-panel{position:absolute;width:360px;background:#fff;border:2px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:10002;padding:8px;overflow:auto;}
  .notes-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;}
  .tiny-btn{padding:4px 6px;font-size:12px;border-radius:6px;cursor:pointer;}
  @media (max-width: 600px) {
    #${CONTAINER_ID} { top: 10% !important; left: 50% !important; transform: translateX(-50%); width: 95%; max-width: 95%; flex-direction: column; }
    #${BOX_ID}, #${HISTORY_ID} { width: 100%; max-width: 100%; }
    .transit-cell { min-height: 80px; font-size: 10px; }
    #transit-center-label { font-size: 14px; }
  }
  `;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    const btn = document.getElementById(BTN_ID);
    if (!btn) return console.warn("toggleTransitBtn not found");

    let container, box, historyBox, header;

    btn.addEventListener("click", async () => {
        if (!container) {
            container = createContainer();
            // FIX: Append to document.body to prevent relative positioning "jump" issues
            document.body.appendChild(container);
        }
        if (!container.style.display || container.style.display === "none") {
            container.style.display = "flex";
            historyBox.innerHTML = `<h4>Transit History</h4><div>Loading...</div>`;
            await renderHistory();
            await renderTransit();
        } else container.style.display = "none";
    });

    function createContainer() {
        const wrap = document.createElement("div"); wrap.id = CONTAINER_ID;
        box = document.createElement("div"); box.id = BOX_ID;
        
        header = document.createElement("div"); header.id = "transitHeader"; 
        header.innerHTML = `<span>🪐 கோட்சாரம் (Drag here)</span><span class="close-btn" title="Close">✕</span>`;
        box.appendChild(header);

        header.querySelector(".close-btn").addEventListener("pointerdown", (e) => {
             e.stopPropagation(); 
             wrap.style.display = "none";
        });

        const body = document.createElement("div"); body.id = "transitBody"; body.style.padding = "8px"; box.appendChild(body);
        historyBox = document.createElement("div"); historyBox.id = HISTORY_ID;
        wrap.appendChild(box);
        
        enableDrag(wrap, header);
        return wrap;
    }

    // --- DRAG FIX: Uses pageX/Y + Shift Calculation ---
    function enableDrag(el, handle) {
        let isDragging = false;
        let shiftX = 0;
        let shiftY = 0;

        handle.addEventListener("pointerdown", e => {
            if (e.target.classList.contains('close-btn')) return; 
            if (e.button !== 0) return;
            
            e.preventDefault(); // CRITICAL: Prevents text selection which causes lag/jump
            isDragging = true;
            
            // Calculate offset from the top-left of the window
            const rect = el.getBoundingClientRect();
            shiftX = e.clientX - rect.left;
            shiftY = e.clientY - rect.top;
            
            try { el.setPointerCapture(e.pointerId); } catch { }
            handle.style.cursor = "grabbing";
        });

        window.addEventListener("pointermove", e => {
            if (!isDragging) return;
            // Absolute position relative to body
            el.style.left = (e.pageX - shiftX) + "px";
            el.style.top = (e.pageY - shiftY) + "px";
        });

        window.addEventListener("pointerup", e => {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = "grab";
                try { el.releasePointerCapture(e.pointerId); } catch { }
            }
        });
    }

    function buildPayload(extra = {}) {
        const now = extra.timestamp ? new Date(extra.timestamp) : new Date();
        const [y, m, d] = now.toISOString().slice(0, 10).split("-").map(Number);
        const [h, mi] = now.toTimeString().slice(0, 5).split(":").map(Number);
        const s = now.getSeconds();
        const ay = document.getElementById("ayanamsa")?.value || "lahiri";
        let lat = DEFAULT_PLACE.lat, lon = DEFAULT_PLACE.lon, tz = DEFAULT_PLACE.tz;
        const pl = document.getElementById("placeSearch") || document.getElementById("place");
        if (pl) { lat = parseFloat(pl.getAttribute("data-lat")) || lat; lon = parseFloat(pl.getAttribute("data-lon")) || lon; tz = parseFloat(pl.getAttribute("data-tz")) || tz; }
        return { year: y, month: m, day: d, hour: h, minute: mi, second: s, lat, lon, tz, ayanamsa: ay, chartType: "rasi" };
    }

    async function renderTransit(opts = {}) {
        const b = document.getElementById("transitBody");
        if (!b) return;
        const payload = buildPayload(opts);
        try {
            const res = await fetch("/generate_chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!data || data.status !== "ok") throw new Error("Bad response");
            window.lastTransitData = data.rows || [];
            b.innerHTML = buildGrid(window.lastTransitData);
        } catch (e) {
            console.error("renderTransit error:", e);
            b.innerHTML = `<div style="color:#b22222;font-weight:600;">❌ Transit load failed</div>`;
        }
    }

    function buildGrid(rows) {
        const grid = {}; tamilRasis.forEach(r => grid[r] = []);
        let lagna = null;
        (rows || []).forEach(r => {
            const name = r.name || r.graha_ta || "";
            const short = r.short || name;
            const rasi = r.rasi || r.rasi_ta || "";
            if (!rasi) return;
            if (name === "லக்னம்") lagna = rasi;
            const dms = r.dms || r.degree || "";
            const retro = (r.retro_flag === "வ");
            const color = planetColors[name] || "#000";

            // --- DATA EXTRACTION ---
            
            // 1. Rasi Lord
            const rasiLordFull = rasiOwners[rasi] || rasiOwners[r.rasi] || "";
            const rasiLordShort = getShortName(rasiLordFull);

            // 2. Natchatra (Star) - Checking 'natchatra' specifically + others
            const natchatraFull = r.natchatra || r.natchatra_ta || r.nakshatra || r.nakshatra_ta || r.star || r.star_ta || "";
            
            // 3. Natchatra Lord (Star Lord) - Checking 'natchatra_lord' specifically + others
            const natchatraLordFull = r.natchatra_lord || r.natchatra_lord_ta || r.nakshatra_lord || r.starlord || r.star_lord || r.sl || "";
            const natchatraLordShort = getShortName(natchatraLordFull);
            
            // Format: "RasiLord / StarLord" -> "சந்/சனி"
            let tooltipTitle = name; 
            if (rasiLordShort || natchatraLordShort) {
                tooltipTitle = `${rasiLordShort || "?"} / ${natchatraLordShort || "?"}`;
            } 
            
            // Uncomment to debug if still missing:
            // console.log("Planet:", name, "Star:", natchatraFull, "Lord:", natchatraLordFull, "Row:", r);

            const label = `<span title="${tooltipTitle}" style="color:${color};font-weight:600;cursor:help;">
                             ${retro ? `(${short})` : short}
                           </span>
                           <small>${dms ? " " + dms : ""}</small>`;
            
            grid[rasi].push(label);
        });
        const order = ["மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்", "கும்பம்", null, null, "கடகம்", "மகரம்", null, null, "சிம்மம்", "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"];
        let html = `<div class="transit-grid"><div id="transit-center-label">🪐 கோட்சாரம்</div>`;
        order.forEach(r => {
            if (!r) html += "<div></div>";
            else {
                const cls = (r === lagna) ? "transit-cell transit-highlight" : "transit-cell";
                html += `<div class="${cls}">${grid[r].join("<br>")}</div>`;
            }
        });
        html += `</div>`;
        return html;
    }

    async function renderHistory() {
        const hb = document.getElementById(HISTORY_ID);
        if (!hb) return;
        const chartId = parseInt(window.currentChartId) || 0;
        try {
            const res = await fetch(`/transit_history/${chartId}`);
            const j = await res.json();
            const rows = (j && j.status === "ok" && Array.isArray(j.history)) ? j.history.reverse() : [];
            hb.innerHTML = `
        <h4>Transit History — ${rows.length} entries</h4>
        <input id="transitSearch" type="text" placeholder="🔍 Search notes or date..." style="width:100%;padding:6px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;">
        <div id="historyTableWrap"></div>
        <div style="text-align:right;margin-top:8px;">
          <button id="refreshBtn">🔄 Refresh</button>
          <button id="saveBtn">💾 Save Snapshot</button>
        </div>
      `;
            const wrap = hb.querySelector("#historyTableWrap");
            wrap.innerHTML = buildHistoryTable(rows);
            document.getElementById("transitSearch").addEventListener("input", e => {
                const q = e.target.value.toLowerCase();
                const filtered = rows.filter(r => (r.note || "").toLowerCase().includes(q) || (r.timestamp || "").toLowerCase().includes(q) || (r.location || "").toLowerCase().includes(q));
                wrap.innerHTML = buildHistoryTable(filtered);
                attachHistoryListeners(filtered, chartId);
            });
            document.getElementById("refreshBtn").onclick = () => renderHistory();
            document.getElementById("saveBtn").onclick = async () => { const ok = await saveNewSnapshot(chartId, ""); alert(ok ? "✅ Snapshot saved" : "❌ Save failed"); await renderHistory(); };
            attachHistoryListeners(rows, chartId);
        } catch (e) {
            console.error("renderHistory error:", e);
            hb.innerHTML = `<h4>Transit History</h4><div style="color:#b22222">Error loading history</div>`;
        }
    }

    function buildHistoryTable(rows) {
        let html = `<table><thead><tr><th>Version</th><th>Timestamp</th><th>Notes</th><th>Action</th></tr></thead><tbody>`;
        (rows || []).forEach((r, idx) => {
            const dt = new Date(r.timestamp || new Date().toISOString());
            const local = dt.toISOString().slice(0, 16);
            const note = r.note || "";
            html += `<tr>
        <td>Version ${idx + 1}<br><button id="notes-${r.id}" class="tiny-btn" style="margin-top:4px;">Add Notes</button></td>
        <td><input type="datetime-local" id="ts-${r.id}" value="${local}"></td>
        <td><input id="note-${r.id}" type="text" value="${note}" placeholder="Short note"></td>
        <td style="white-space:nowrap;">
          <span id="view-${r.id}" class="view-link">View</span>
          &nbsp;<button id="save-${r.id}" class="tiny-btn">💾</button>
          &nbsp;<button id="del-${r.id}" class="tiny-btn" style="background:#fee;border:1px solid #f99;">🗑️</button>
        </td>
      </tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    function attachHistoryListeners(rows, chartId) {
        (rows || []).forEach(r => {
            const tsEl = document.getElementById(`ts-${r.id}`);
            const noteEl = document.getElementById(`note-${r.id}`);
            const saveEl = document.getElementById(`save-${r.id}`);
            const delEl = document.getElementById(`del-${r.id}`);
            const viewEl = document.getElementById(`view-${r.id}`);
            const notesBtn = document.getElementById(`notes-${r.id}`);

            if (tsEl) tsEl.addEventListener("change", async () => {
                await renderTransit({ timestamp: new Date(tsEl.value).toISOString() });
            });

            if (saveEl) saveEl.onclick = async () => {
                let iso = new Date(tsEl.value).toISOString();
                const note = noteEl.value.trim();
                const payload = { id: r.id, chart_id: chartId, timestamp: iso, note };
                const res = await fetch("/update_transit_note", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const j = await res.json();
                if (j.status === "ok") { alert("✅ Saved"); renderHistory(); }
                else alert("❌ Save failed");
            };

            if (delEl) delEl.onclick = async () => {
                if (!confirm("Delete this version?")) return;
                await fetch(`/delete_transit_snapshot/${r.id}`, { method: "POST" });
                renderHistory();
            };

            if (viewEl) viewEl.onclick = async () => {
                const pid = `preview-${r.id}`;
                const exist = document.getElementById(pid);
                if (exist) return exist.remove();
                const containerEl = document.getElementById(CONTAINER_ID);
                const panel = document.createElement("div");
                panel.id = pid; panel.className = "preview-panel";
                panel.style.left = (historyBox.offsetLeft + historyBox.offsetWidth + 12) + "px";
                panel.style.top = historyBox.offsetTop + "px";
                panel.innerHTML = `<div class="preview-header">Transit — ${tsEl.value}<div class="preview-close">✕</div></div><div style="padding:8px;text-align:center;">Loading...</div>`;
                containerEl.appendChild(panel);
                panel.querySelector(".preview-close").onclick = () => panel.remove();
                const res = await fetch("/generate_chart", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload({ timestamp: new Date(tsEl.value).toISOString() }))
                });
                const data = await res.json();
                panel.lastChild.innerHTML = data.status === "ok" ? buildGrid(data.rows) : "Error loading transit";
            };

            if (notesBtn) notesBtn.onclick = () => {
                const existing = document.querySelector(".notes-panel");
                if (existing) existing.remove();
                const containerEl = document.getElementById(CONTAINER_ID);
                const panel = document.createElement("div");
                panel.className = "notes-panel";
                panel.style.left = (historyBox.offsetLeft + historyBox.offsetWidth + 12) + "px";
                panel.style.top = historyBox.offsetTop + "px";
                panel.innerHTML = `
          <div class="preview-header">Add Notes <span class="preview-close">✕</span></div>
          <textarea rows="8">${r.note || ""}</textarea>
          <div class="notes-actions"><button id="nsave" class="tiny-btn">💾 Save</button></div>
        `;
                containerEl.appendChild(panel);
                panel.querySelector(".preview-close").onclick = () => panel.remove();
                panel.querySelector("#nsave").onclick = async () => {
                    const newNote = panel.querySelector("textarea").value;
                    await fetch("/update_transit_note", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: r.id, chart_id: chartId, timestamp: new Date(tsEl.value).toISOString(), note: newNote })
                    });
                    panel.remove(); renderHistory();
                };
            };
        });
    }

    async function saveNewSnapshot(chartId, note) {
        try {
            const currentId = parseInt(window.currentChartId || chartId || 0);
            if (!currentId) {
                alert("⚠️ Please save or load a chart first before saving transit history.");
                return false;
            }

            if (!window.lastTransitData || !Array.isArray(window.lastTransitData) || window.lastTransitData.length === 0) {
                await renderTransit({ chartId: currentId });
            }

            const payload = {
                chart_id: currentId,  
                transit_data: window.lastTransitData,
                location: document.getElementById("placeSearch")?.value || "Chennai",
                note
            };

            const res = await fetch("/save_transit_snapshot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const j = await res.json();
            if (j.status === "ok") {
                await renderHistory();
                return true;
            }
            return false;
        } catch (err) {
            console.error("saveNewSnapshot error:", err);
            return false;
        }
    }

})();
