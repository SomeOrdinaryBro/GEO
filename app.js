const data = {
  updatedAt: "2025-09-03",
  score: 78,
  markets: [
    {label: "US", value: 45},
    {label: "EU", value: 30},
    {label: "Asia", value: 25}
  ],
  competitors: [
    {name: "AlphaLabs", score: 82, note: "Technical content edge"},
    {name: "BrandCo", score: 75, note: "Strong PR, weak CWV"},
    {name: "SearchSmith", score: 71, note: "Good backlinks, thin content"}
  ],
  onsite: { lcpSec: 2.7, cls: 0.08, mobile: "Good", brokenLinks: 12, pageSpeed: 86, metadata: "OK" },
  offsite: { backlinks: 1240, referringDomains: 220, mentions: 310, trend: [62,64,66,70,72,74,76,79,80] },
  recommendations: [
    {action:"Compress hero images", why:"LCP", effort:"Low", impact:"High"},
    {action:"Add Organization schema", why:"Rich results", effort:"Low", impact:"Medium"},
    {action:"Fix 12 broken links", why:"Crawlability", effort:"Medium", impact:"Medium"},
    {action:"Improve mobile font sizes", why:"UX", effort:"Low", impact:"Medium"},
    {action:"Add internal links to cornerstone pages", why:"Distribution", effort:"Low", impact:"Medium"},
    {action:"Write unique H1s on 8 pages", why:"Relevance", effort:"Medium", impact:"Medium"},
    {action:"Minify CSS", why:"Load", effort:"Low", impact:"Medium"},
    {action:"Add blog cadence 2 posts/month", why:"Freshness", effort:"Medium", impact:"Medium"},
    {action:"Build 5 authority backlinks", why:"Off-site trust", effort:"High", impact:"High"},
    {action:"Set up analytics goals", why:"Measure ROI", effort:"Medium", impact:"High"}
  ]
};

const $ = id => document.getElementById(id);

function renderScore(){
  $("updated-date").textContent = data.updatedAt;
  $("score-value").textContent = data.score;
  const radius = 45;
  const circ = 2 * Math.PI * radius;
  const ring = $("score-ring");
  ring.setAttribute("stroke-dasharray", circ);
  ring.setAttribute("stroke-dashoffset", circ * (1 - data.score / 100));
  const summary = data.score >= 80 ? "Strong SEO health." : data.score >= 60 ? "Solid foundation with room to grow." : "Needs significant work.";
  $("score-summary").textContent = summary;
}

function renderMarkets(){
  const container = $("markets-bars");
  data.markets.forEach(m => {
    const row = document.createElement("div");
    row.className = "flex items-center space-x-2";
    row.innerHTML = `<span class="w-12">${m.label}</span>
      <div class="flex-1 bg-gray-200 rounded h-3"><div class="bg-blue-600 h-3 rounded" style="width:${m.value}%"></div></div>
      <span class="w-10 text-right">${m.value}%</span>`;
    container.appendChild(row);
  });
}

function renderCompetitors(){
  const container = $("competitor-cards");
  data.competitors.forEach(c => {
    const li = document.createElement("li");
    li.className = "p-4 bg-white rounded shadow flex items-center space-x-3";
    li.innerHTML = `<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold" aria-hidden="true">${c.name.charAt(0)}</div>
      <div class="flex-1"><h3 class="font-semibold">${c.name}</h3><p class="text-sm text-gray-600">${c.note}</p></div>
      <span class="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800 font-medium">${c.score}</span>`;
    container.appendChild(li);
  });
}

function renderOnsite(){
  const container = $("onsite-grid");
  const items = [
    {label:"Page Speed", value:`${data.onsite.pageSpeed}`, type:"bar"},
    {label:"LCP", value:`${data.onsite.lcpSec}s`},
    {label:"CLS", value:data.onsite.cls},
    {label:"Mobile", value:data.onsite.mobile},
    {label:"Broken Links", value:data.onsite.brokenLinks},
    {label:"Metadata", value:data.onsite.metadata}
  ];
  items.forEach(it => {
    const div = document.createElement("div");
    div.className = "p-4 bg-white rounded shadow";
    div.innerHTML = `<h3 class="font-medium mb-2">${it.label}</h3>`;
    if(it.type === "bar"){
      div.innerHTML += `<div class="w-full bg-gray-200 rounded h-2"><div class="bg-green-500 h-2 rounded" style="width:${it.value}%"></div></div><p class="mt-1 text-sm">${it.value}</p>`;
    }else{
      div.innerHTML += `<p class="text-lg font-semibold">${it.value}</p>`;
    }
    container.appendChild(div);
  });
}

function renderOffsite(){
  const statsContainer = $("offsite-stats");
  const stats = [
    {label:"Backlinks", value:data.offsite.backlinks},
    {label:"Referring domains", value:data.offsite.referringDomains},
    {label:"Brand mentions", value:data.offsite.mentions}
  ];
  stats.forEach(s => {
    const div = document.createElement("div");
    div.innerHTML = `<div class="text-xl font-semibold">${s.value.toLocaleString()}</div><p class="text-sm text-gray-600">${s.label}</p>`;
    statsContainer.appendChild(div);
  });
  const values = data.offsite.trend;
  const w = 100, h = 30;
  const max = Math.max(...values), min = Math.min(...values);
  const points = values.map((v,i) => {
    const x = i / (values.length - 1) * w;
    const y = h - ((v - min) / (max - min) * h);
    return `${x},${y}`;
  }).join(" ");
  $("trend-line").setAttribute("points", points);
}

function renderRecommendations(){
  const list = $("recommendations-list");
  data.recommendations.forEach(r => {
    const li = document.createElement("li");
    li.className = "space-y-1";
    li.innerHTML = `<div class="flex items-center justify-between flex-wrap gap-2">
        <span class="font-medium">${r.action}</span>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-gray-200 text-xs">Effort: ${r.effort}</span>
          <span class="px-2 py-0.5 rounded bg-blue-200 text-xs">Impact: ${r.impact}</span>
        </div>
      </div>
      <p class="text-sm text-gray-600">${r.why}</p>`;
    list.appendChild(li);
  });
}

function renderJsonLd(){
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Example Corp",
    "url": "https://example.com",
    "logo": "https://example.com/logo.png",
    "sameAs": [
      "https://twitter.com/example",
      "https://www.linkedin.com/company/example"
    ]
  };
  $("jsonld").value = JSON.stringify(json, null, 2);
}

function enableCopy(){
  $("copy-jsonld").addEventListener("click", () => {
    navigator.clipboard.writeText($("jsonld").value).then(() => {
      $("copy-msg").textContent = "Copied!";
      setTimeout(() => $("copy-msg").textContent = "", 2000);
    });
  });
}

function init(){
  renderScore();
  renderMarkets();
  renderCompetitors();
  renderOnsite();
  renderOffsite();
  renderRecommendations();
  renderJsonLd();
  enableCopy();
}

document.addEventListener("DOMContentLoaded", init);
