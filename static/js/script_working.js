async function updateChart() {
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const place = document.getElementById("place").value;

    const response = await fetch("/generate_chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, place }),
    });

    const data = await response.json();
    document.getElementById("chart-container").innerHTML = data.chart_html;
}
