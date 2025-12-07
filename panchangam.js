// panchangam.js — FINAL COMPACT VERSION
// ✅ Two-column Tamil Panchangam layout with Lat/Lon display

async function loadPanchangam(meta) {
    try {
        // Default test data (Chennai 18-10-2025 / 09:30 AM)
        const payload = meta || {
            year: 2025,
            month: 10,
            day: 18,
            hour: 9,
            minute: 30,
            second: 0,
            lat: 13.0827,
            lon: 80.2707,
            tz: 5.5
        };

        const res = await fetch("/panchangam", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { return; }

        if (data.status === "ok" && data.panchangam) {
            const p = data.panchangam;
            const wrap = document.getElementById("panchangamWrap");
            if (!wrap) return;

            wrap.style.display = "block";

            // ✅ UPDATED: Added Latitude & Longitude in the header
            document.getElementById("panchangamData").innerHTML = `
              <div style="background:#fffef5;padding:6px 8px;border:1px solid #ccc;border-radius:6px;
                          font-size:11px;line-height:1.25;color:#222;max-width:460px;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; border-bottom:1px dashed #ddd; padding-bottom:3px;">
                    <div style="font-weight:bold; font-size:11.5px;">🪔 தமிழ் பஞ்சாங்கம்</div>
                    <div style="font-size:15px; color:#555;">
                        📍 ${parseFloat(payload.lat).toFixed(2)} N, ${parseFloat(payload.lon).toFixed(2)} E
                    </div>
                </div>

                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;width:50%;padding-right:6px;">
                      திதி: ${p.tithi}<br>
                      நட்சத்திரம்: ${p.nakshatra}<br>
                      யோகம்: ${p.yoga}<br>
                      கரணம்: ${p.karana}<br>
                      வாரம்: ${p.weekday}
                    </td>
                    <td style="vertical-align:top;width:50%;">
                      சூரிய உதயம்: ${p.sunrise}<br>
                      சூரிய அஸ்தமனம்: ${p.sunset}<br>
                      சந்திரோதயம்: ${p.moonrise}<br>
                      உதய நட்சத்திரம்: ${p.udaya_nakshatra}<br>
                      அடுத்த திதி முடிவு: ${p.next_tithi_end}
                    </td>
                  </tr>
                </table>
              </div>
            `;
        } else {
            console.warn("Panchangam returned error:", data);
        }
    } catch (err) {
        console.error("Error loading panchangam:", err);
    }
}