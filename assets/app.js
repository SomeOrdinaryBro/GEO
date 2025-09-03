let dataCache = window.__REPORT__ || null;

async function getData() {
  if (dataCache) return dataCache;                 // fallback if we inline report.js
  const res = await fetch("data/report.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  dataCache = await res.json();
  return dataCache;
}

function panic(msg, err) {
  console.error(msg, err);
  const p = document.createElement("p");
  p.style.color = "#b00";
  p.textContent = `Failed to load data/report.json: ${msg} ${err ? err.message : ""}`;
  document.body.appendChild(p);
}

function yesno(v){ return v ? "Yes" : "No"; }

async function load() {
  try {
    const j = await getData();

    document.getElementById("brand").textContent = `${j.brand} · ${j.category}`;
    document.getElementById("score").textContent = j.score_overall;

    const b = j.breakdown_overall;
    document.getElementById("breakdown").textContent =
      `Recognition ${b.recognition_pct}% · Context ${b.context_avg} · Sentiment ${b.sentiment_pct}% · Competitive ${b.competitive_pct}%`;

    // Chart
    const ctx = document.getElementById("radar").getContext("2d");
    new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Recognition","Context","Sentiment","Competitive"],
        datasets: [{ label: "Score", data: [b.recognition_pct, b.context_avg, b.sentiment_pct, b.competitive_pct] }]
      },
      options: { responsive: false, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
    });

    // Markets
    const mt = document.getElementById("markets");
    mt.innerHTML = `
      <tr><th>Market</th><th>Recognition</th><th>Context</th><th>Sentiment</th><th>Competitive</th><th>Mentions</th></tr>
      ${Object.entries(j.scores_by_market).map(([m,s]) => `
        <tr>
          <td>${m}</td><td>${s.recognition_pct}%</td><td>${s.context_avg}</td>
          <td>${s.sentiment_pct}%</td><td>${s.competitive_pct}%</td><td>${s.mentions}</td>
        </tr>`).join("")}
    `;

    // Competitors
    document.getElementById("competitors").innerHTML =
      j.top_competitors.map(([n,c]) => `<li class="list-group-item">${n} · ${c}</li>`).join("");

    // Signals
    const site = j.site_signals, off = j.offsite_signals;
    document.getElementById("site-signals").innerHTML = `
      <ul>
        <li>Organization schema: ${yesno(site.organization_schema)}</li>
        <li>FAQ schema: ${yesno(site.faq_schema)}</li>
        <li>hreflang: ${yesno(site.hreflang)}</li>
        <li>Location pages: ${yesno(site.location_pages)}</li>
        <li>/faq route exists: ${yesno(site.faq_route)}</li>
      </ul>`;
    document.getElementById("offsite-signals").innerHTML = `
      <ul>
        <li>Wikipedia: ${yesno(off.wikipedia)}</li>
        <li>Wikidata: ${yesno(off.wikidata)}</li>
        <li>G2: ${yesno(off.g2)}</li>
        <li>Capterra: ${yesno(off.capterra)}</li>
        <li>Trustpilot: ${yesno(off.trustpilot)}</li>
        <li>LinkedIn: ${yesno(off.linkedin)}</li>
        <li>Crunchbase: ${yesno(off.crunchbase)}</li>
      </ul>`;

    // Recs
    const top = (j.recommendations || [])
      .sort((a,b) => ({high:0,medium:1,low:2}[a.priority] - ({high:0,medium:1,low:2}[b.priority]))
      ).slice(0,10);
    document.getElementById("recs").innerHTML = `<ol class="list-group">${top.map(r => `<li class="list-group-item">[${r.priority}] ${r.action}</li>`).join("")}</ol>`;

    // Plan
    const plan = j.next_90_days_plan || {High:[],Medium:[],Low:[]};
    document.getElementById("plan").innerHTML = `
      <div class="cols">
        <div><h3>High</h3><ol class="list-group">${plan.High.map(r=>`<li class="list-group-item">${r.action}</li>`).join("")}</ol></div>
        <div><h3>Medium</h3><ol class="list-group">${plan.Medium.map(r=>`<li class="list-group-item">${r.action}</li>`).join("")}</ol></div>
        <div><h3>Low</h3><ol class="list-group">${plan.Low.map(r=>`<li class="list-group-item">${r.action}</li>`).join("")}</ol></div>
      </div>`;

    // JSON-LD
    const jsonld = {
      "@context":"https://schema.org","@type":"Organization",
      name:j.brand,url:j.website,logo:`${new URL(j.website).origin}/logo.png`,
      sameAs:["https://www.linkedin.com/company/dna-behavior/"]
    };
    document.getElementById("jsonld").textContent = JSON.stringify(jsonld, null, 2);

  } catch (e) { panic("render error", e); }
}

window.addEventListener("DOMContentLoaded", load);
