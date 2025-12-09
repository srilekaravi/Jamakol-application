/* static/js/event_summary.js — Final Version: Mobile Responsive */

(function () {
    const PANEL_ID = "clientNotesPanel";
    
    // Helper to convert Planet Names to Tamil
    function toTamil(name) {
        if (!name) return "";
        const map = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது" };
        return map[name] || name;
    }

    // CSS Styles for the Notes Panel (Updated for Mobile)
    const css = `
      #${PANEL_ID} {
          position: fixed; 
          right: 20px; 
          top: 60px; 
          width: 520px; 
          max-height: 80vh;
          overflow: hidden; 
          background: #fff; 
          border: 2px solid #ddd; 
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15); 
          padding: 10px; 
          z-index: 99999;
          display: none; 
          flex-direction: column; 
          font-family: sans-serif;
      }

      /* 📱 MOBILE RESPONSIVE FIX */
      @media (max-width: 600px) {
          #${PANEL_ID} {
              width: 94% !important;     /* Fill the screen width */
              left: 3% !important;       /* Center horizontally */
              right: 3% !important;
              top: 50px !important;      /* Adjust top spacing */
              max-height: 85vh !important; /* Allow more height */
          }
      }

      #${PANEL_ID} h3 { margin-top:0;text-align:center;background:#f4f4f4;padding:6px;border-radius:8px; }
      .event-search-box { width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
      #notesWrap { overflow-y: auto; flex: 1; max-height: 60vh; padding-right: 5px; }
      .timeline-entry { border-left: 3px solid #0b63d6; margin: 8px 0; padding-left: 10px; font-size: 13px; line-height: 1.4; background: #fff; padding-bottom:5px; border-bottom:1px solid #eee; }
      .timeline-entry .dasha-info { color: #d35400; font-weight: bold; font-size: 11px; margin-top: 4px; background: #fff3e0; padding: 2px 5px; border-radius: 4px; display: inline-block; }
      .timeline-entry button { margin-top: 6px; margin-right: 5px; cursor: pointer; padding: 3px 8px; background:#eee; border:1px solid #ccc; border-radius:3px; }
      .timeline-entry button:hover { background:#ddd; }
      
      /* Form Input Fixes for Mobile */
      #addNoteForm input, #addNoteForm textarea { box-sizing: border-box; }
    `;
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    let editingEventId = null;
    let allTimelineItems = [];
    let currentDashaState = { dasha: "", bhukti: "", antara: "" };

    // --- 1. Panel Setup ---
    function ensurePanel() {
        let panel = document.getElementById(PANEL_ID);
        if (!panel) {
            panel = document.createElement("div");
            panel.id = PANEL_ID;
            panel.innerHTML = `
                <div id="closeNotesBtn" style="float:right;cursor:pointer;font-weight:bold;font-size:16px;padding:5px;">✕</div>
                <h3>🗒 Client Notes</h3>
                <div style="text-align:right;margin-bottom:6px;"><button id="createNoteBtn" style="background:#2196F3;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">+ Add Note</button></div>
                <input type="text" id="eventSearchBox" class="event-search-box" placeholder="🔍 Search notes...">
                
                <div id="addNoteForm" style="display:none;background:#f9f9f9;padding:10px;border:1px solid #ddd;margin-bottom:10px;border-radius:6px;">
                    <label style="display:block;margin-bottom:3px;font-weight:bold;">Date:</label>
                    <input type="date" id="noteDate" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px;">
                    
                    <label style="display:block;margin-bottom:3px;font-weight:bold;">Time:</label>
                    <input type="time" id="noteTime" step="1" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px;">
                    
                    <label style="display:block;margin-bottom:3px;font-weight:bold;">Note:</label>
                    <textarea id="noteText" rows="3" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px;"></textarea>
                    
                    <div id="liveDashaPreview" style="color:#d35400;font-weight:bold;font-size:12px;margin:5px 0;"></div>
                    
                    <div style="text-align:right; margin-top:10px;">
                        <button id="saveNoteBtn" style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;font-size:14px;">Save</button> 
                        <button id="cancelNoteBtn" style="background:#999;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;margin-left:5px;font-size:14px;">Cancel</button>
                    </div>
                </div>
                
                <div id="notesWrap"></div>
            `;
            document.body.appendChild(panel);

            // Event Listeners
            panel.querySelector("#closeNotesBtn").onclick = () => (panel.style.display = "none");
            panel.querySelector("#createNoteBtn").onclick = openCreateForm;
            panel.querySelector("#saveNoteBtn").onclick = saveNote;
            panel.querySelector("#cancelNoteBtn").onclick = () => (document.getElementById("addNoteForm").style.display="none");
            panel.querySelector("#eventSearchBox").oninput = (e) => renderFilteredList(e.target.value);

            // Dasha Preview Updates
            document.getElementById("noteDate").addEventListener("change", liveUpdateDashaPreview);
            document.getElementById("noteTime").addEventListener("change", liveUpdateDashaPreview);
        }
        return panel;
    }

    // --- 2. Toggle Panel ---
    window.toggleClientNotes = async function () {
        const panel = ensurePanel();
        if (panel.style.display === "flex") {
            panel.style.display = "none";
        } else {
            panel.style.display = "flex";
            await renderClientNotes();
        }
    };

    // --- 3. Create/Edit Form ---
    function openCreateForm() {
        if(!window.currentChartId) return alert("Please load or save a chart first.");
        
        editingEventId = null;
        const form = document.getElementById("addNoteForm");
        form.style.display = "block";
        
        const now = new Date();
        document.getElementById("noteDate").value = now.toISOString().slice(0, 10);
        
        // HH:MM:SS format
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        document.getElementById("noteTime").value = `${h}:${m}:${s}`;
        
        document.getElementById("noteText").value = "";
        document.getElementById("liveDashaPreview").innerHTML = "Loading Dasha...";
        liveUpdateDashaPreview();
    }

    // --- 4. Live Dasha Preview ---
    window.liveUpdateDashaPreview = async function() {
        const chartId = window.currentChartId;
        const preview = document.getElementById("liveDashaPreview");
        if (!chartId || !preview) return;
        
        const d = document.getElementById("noteDate").value;
        const t = document.getElementById("noteTime").value;
        if(!d || !t) return;

        try {
            const res = await fetch(`/get_dasha_chain/${chartId}?date=${encodeURIComponent(d+'T'+t)}`);
            const j = await res.json();
            if(j.status === "ok" && j.active_dasha_chain.length) {
                const chain = j.active_dasha_chain;
                currentDashaState = { dasha: chain[0]?.planet, bhukti: chain[1]?.planet, antara: chain[2]?.planet };
                const displayStr = chain.map(x => toTamil(x.planet)).join(" - ");
                preview.innerHTML = `🪔 ${displayStr}`;
            } else {
                preview.innerHTML = "";
            }
        } catch (e) { preview.innerHTML = ""; }
    };

    // --- 5. Save Note (Fixed) ---
    async function saveNote() {
        const chartId = window.currentChartId;
        if (!chartId) return alert("No Chart ID found. Please save the chart first.");

        const date = document.getElementById("noteDate").value;
        const time = document.getElementById("noteTime").value;
        const text = document.getElementById("noteText").value.trim();
        if (!date || !time || !text) return alert("Please fill Date, Time, and Note.");

        const payload = {
            id: editingEventId, 
            chart_id: chartId,
            event_name: "Client Note", 
            event_date: date, 
            event_time: time, 
            event_notes: text,
            dasha: currentDashaState.dasha || "", 
            bhukti: currentDashaState.bhukti || "", 
            antara: currentDashaState.antara || ""
        };
        
        const url = editingEventId ? "/update_event" : "/save_event";
        
        // Prevent Double Click
        const btn = document.getElementById("saveNoteBtn");
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        try {
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const json = await res.json();
            
            if (json.status === "ok") {
                document.getElementById("addNoteForm").style.display = "none";
                renderClientNotes(); // Reload list
            } else {
                alert("Error Saving: " + json.message);
            }
        } catch (e) {
            console.error(e);
            alert("Network Error: Could not save note.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    // --- 6. Render List ---
    window.renderClientNotes = async function() {
        const panel = ensurePanel();
        const wrap = panel.querySelector("#notesWrap");
        const chartId = window.currentChartId;
        
        if (!chartId) { 
            wrap.innerHTML = `<div style="padding:10px;color:#666;">⚠️ Load a chart to see notes.</div>`; 
            return; 
        }
        
        wrap.innerHTML = `<div style="padding:10px;text-align:center;">⏳ Loading...</div>`;

        try {
            // Timestamp to prevent caching issues
            const res = await fetch(`/list_events?chart_id=${chartId}&_=${Date.now()}`);
            const j = await res.json();
            allTimelineItems = j.events || [];
            
            if (allTimelineItems.length === 0) {
                wrap.innerHTML = `<div style="padding:10px;text-align:center;color:#888;">No notes yet.</div>`;
            } else {
                renderFilteredList(document.getElementById("eventSearchBox").value || "");
            }
        } catch(e) { 
            console.error(e);
            wrap.innerHTML = `<div style="padding:10px;color:red;">Error loading notes.</div>`; 
        }
    };
    
    // Expose for Core.js to call
    window.loadEvents = window.renderClientNotes; 

    function renderFilteredList(query) {
        const wrap = document.getElementById("notesWrap");
        const q = query.toLowerCase();
        const visibleItems = allTimelineItems.filter(item => (item.event_notes || "").toLowerCase().includes(q));

        if (visibleItems.length === 0) {
            wrap.innerHTML = `<div style="padding:10px;text-align:center;color:#888;">No matches found.</div>`;
            return;
        }

        wrap.innerHTML = visibleItems.map(item => {
            let dashaStr = "";
            if(item.dasha) {
                const taD = toTamil(item.dasha);
                const taB = toTamil(item.bhukti);
                const taA = toTamil(item.antara);
                dashaStr = `🪔 ${taD}${taB ? " - " + taB : ""}${taA ? " - " + taA : ""}`;
            }

            return `
            <div class="timeline-entry">
                <div style="display:flex;justify-content:space-between; align-items:center;">
                    <strong>${item.event_date} <span style="color:#666;font-size:11px;">${item.event_time}</span></strong>
                </div>
                <div class="note" style="margin:4px 0; word-wrap:break-word;">${item.event_notes}</div>
                ${dashaStr ? `<div class="dasha-info">${dashaStr}</div>` : ""}
                <div style="margin-top:8px;">
                    <button onclick="editEvent(${item.id})">✏️ Edit</button>
                    <button onclick="deleteEvent(${item.id})" style="color:red;">🗑️</button>
                    <button onclick="window.showTimelineTransit('${item.event_date}', '${item.event_time}')" style="background:#E0F2F1;color:#00695C;border:1px solid #00695C;">🪐 Transit</button>
                </div>
            </div>`;
        }).join("");
    }

    window.editEvent = (id) => {
        const item = allTimelineItems.find(i => i.id === id);
        if(item) {
            editingEventId = id;
            const form = document.getElementById("addNoteForm");
            form.style.display = "block";
            document.getElementById("noteDate").value = item.event_date;
            document.getElementById("noteTime").value = item.event_time;
            document.getElementById("noteText").value = item.event_notes;
            liveUpdateDashaPreview();
            // Scroll to top of panel
            document.getElementById(PANEL_ID).scrollTop = 0;
        }
    };

    window.deleteEvent = async (id) => {
        if(confirm("Are you sure you want to delete this note?")) {
            try {
                await fetch("/delete_event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
                renderClientNotes();
            } catch(e) { alert("Delete failed."); }
        }
    };
    
    console.log("Client Notes Module Loaded (Mobile Ready)");
})();
