async function load() {
const res = await fetch("data/report.json", { cache: "no-store" });
const j = await res.json();


const brandEl = document.getElementById("brand");
brandEl.textContent = `${j.brand} · ${j.category}`;
document.getElementById("score").textContent = j.score_overall;


const b = j.breakdown_overall;
document.getElementById("breakdown").textContent =
`Recognition ${b.recognition_pct}% · Context ${b.context_avg} · Sentiment ${b.sentiment_pct}% · Competitive ${b.competitive_pct}%`;


// Radar
const ctx = document.getElementById("radar").getContext("2d");
new Chart(ctx, {
type: "radar",
data: {
labels: ["Recognition", "Context", "Sentiment", "Competitive"],
datasets: [{ label: "Score", data: [b.recognition_pct, b.context_avg, b.sentiment_pct, b.competitive_pct] }]
},
options: { responsive: false, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
});


// Markets table
const mt = document.getElementById("markets");
mt.innerHTML = `
<tr><th>Market</th><th>Recognition</th><th>Context</th><th>Sentiment</th><th>Competitive</th><th>Mentions</th></tr>
${Object.entries(j.scores_by_market).map(([m, s]) => `
<tr>
<td>${m}</td>
<td>${s.recognition_pct}%</td>
<td>${s.context_avg}</td>
<td>${s.sentiment_pct}%</td>
<td>${s.competitive_pct}%</td>
<td>${s.mentions}</td>
</tr>`).join("")}
`;


// Competitors
document.getElementById("competitors").innerHTML =
j.top_competitors.map(([name, count]) => `<li>${name} · ${count}</li>`).join("");


// Signals
const yesno = v => v ? "Yes" : "No";
const site = j.site_signals;
document.getElementById("site-signals").innerHTML = `
<ul>
<li>Organization schema: ${yesno(site.organization_schema)}</li>
<li>FAQ schema: ${yesno(site.faq_schema)}</li>
<li>hreflang: ${yesno(site.hreflang)}</li>
<li>Location pages: ${yesno(site.location_pages)}</li>
<li>/faq route exists: ${yesno(site.faq_route)}</li>
</ul>`;


const off = j.offsite_signals;
document.getElementById("offsite-signals").innerHTML = `
<ul>
<li>Wikipedia: ${yesno(off.wikipedia)}</li>
<li>Wikidata: ${yesno(off.wikidata)}</li>
<li>G2: ${yesno(off.g2)}</li>
<li>Capterra: ${yesno(off.capterra)}</li>
<li>Trustpilot: ${yesno(off.trustpilot)}</li>
<li>LinkedIn: ${yesno(off.linkedin)}</li>
<li>Crunchbase: ${yesno(off.crunchbase)}</li>
load();