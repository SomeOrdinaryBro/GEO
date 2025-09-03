function formatCurrency(n){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
}
function formatPercent(n){
  return new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
}
function renderDelta(v){
  const cls=v>=0?'up':'down';
  const arrow=v>=0?'▲':'▼';
  return `<span class="delta ${cls}">${arrow} ${formatPercent(Math.abs(v))}</span>`;
}
function copyToClipboard(id){
  const el=document.getElementById(id);
  navigator.clipboard.writeText(el.textContent).then(()=>{
    const toast=document.getElementById('copyToast');
    toast.textContent='Copied!';
    setTimeout(()=>toast.textContent='',2000);
  });
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open','expanded');
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('menuBtn').setAttribute('aria-expanded','false');
}
async function init(){
  const res=await fetch('data/report.json');
  const data=await res.json();
  document.getElementById('score').textContent=data.overallScore;
  document.getElementById('delta').innerHTML=renderDelta(data.delta);
  document.getElementById('topSales').textContent=data.topSales;
  document.getElementById('bestDealValue').textContent=formatCurrency(data.bestDeal.value);
  document.getElementById('bestDealCompany').textContent=data.bestDeal.company;
  document.getElementById('totalDeals').textContent=data.totalDeals;
  document.getElementById('jsonld').textContent=JSON.stringify(data.jsonld,null,2);
  const comp=document.getElementById('competitors');
  data.competitors.forEach(c=>{
    const li=document.createElement('li');
    li.innerHTML=`<span><img src="${c.logo}" alt=""/> ${c.name}</span><span>${c.score}</span>`;
    comp.appendChild(li);
  });
  const rec=document.getElementById('recommendations');
  data.recommendations.forEach(r=>{
    const li=document.createElement('li');
    li.innerHTML=`<h4>${r.title}</h4><p>${r.why}</p><span class="tag impact-${r.impact.toLowerCase()}">${r.impact}</span><span class="tag effort-${r.effort.toLowerCase()}">Effort: ${r.effort}</span>`;
    rec.appendChild(li);
  });
  new Chart(document.getElementById('marketsChart'),{
    type:'doughnut',
    data:{labels:data.markets.map(m=>m.platform),datasets:[{data:data.markets.map(m=>m.share),backgroundColor:['#ff4d6d','#5b7cfa','#2ec9b8','#16a34a','#ef4444']}]},
    options:{plugins:{legend:{position:'bottom'}}}
  });
  new Chart(document.getElementById('siteChart'),{
    type:'bar',
    data:{labels:data.siteSignals.labels,datasets:[{label:'Site',data:data.siteSignals.values,backgroundColor:'#5b7cfa'}]},
    options:{scales:{y:{beginAtZero:true}}}
  });
  new Chart(document.getElementById('offsiteChart'),{
    type:'bar',
    data:{labels:data.offSiteSignals.labels,datasets:[{label:'Off-site',data:data.offSiteSignals.values,backgroundColor:'#2ec9b8'}]},
    options:{scales:{y:{beginAtZero:true}}}
  });
  new Chart(document.getElementById('referrerChart'),{
    type:'bar',
    data:{labels:data.dealsByReferrer.labels,datasets:[{data:data.dealsByReferrer.values,backgroundColor:'#ff4d6d'}]},
    options:{scales:{y:{beginAtZero:true}}}
  });
}
document.getElementById('copyJsonld').addEventListener('click',()=>copyToClipboard('jsonld'));
document.getElementById('menuBtn').addEventListener('click',()=>{
  const sb=document.getElementById('sidebar');
  const overlay=document.getElementById('overlay');
  const expanded=sb.classList.toggle(window.innerWidth>=640?'expanded':'open');
  if(window.innerWidth<640) overlay.classList.toggle('show');
  document.getElementById('menuBtn').setAttribute('aria-expanded',expanded);
});
document.getElementById('overlay').addEventListener('click',closeSidebar);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSidebar();});
document.querySelectorAll('.submenu').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const expanded=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',!expanded);
    document.getElementById(btn.getAttribute('aria-controls')).hidden=expanded;
  });
});
init();
