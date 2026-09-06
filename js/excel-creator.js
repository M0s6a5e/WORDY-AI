(function(){
"use strict";
function $(s){return document.querySelector(s)} function $all(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
var toastT=null;
function toast(m){var t=$("#toast");if(!t)return;$("#toast-msg").textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("show")},2600)}
var DATA=[
 {r:"North America Enterprise",g:425000,c:235000,n:190000,y:"+14.2%",m:"44.7%",up:true},
 {r:"EMEA Commercial Accounts",g:310000,c:186000,n:124000,y:"+9.8%",m:"40.0%",up:true},
 {r:"APAC Direct & OEM Channels",g:285000,c:152000,n:133000,y:"+22.4%",m:"46.6%",up:true},
 {r:"LATAM Regional Partners",g:122500,c:83000,n:39500,y:"-2.1%",m:"32.2%",up:false},
 {r:"Mid-Market Solutions Group",g:88000,c:51000,n:37000,y:"+7.5%",m:"42.0%",up:true},
 {r:"Strategic Global Cloud Alliances",g:64000,c:33500,n:30500,y:"+18.0%",m:"47.6%",up:true},
 {r:"Public Sector & Institutions",g:96000,c:62000,n:34000,y:"+4.1%",m:"35.4%",up:true},
 {r:"Digital Subscriptions (Self-Serve)",g:72000,c:19000,n:53000,y:"+31.2%",m:"73.6%",up:true},
 {r:"Developer API Usage Credits",g:58000,c:14500,n:43500,y:"+45.0%",m:"75.0%",up:true},
 {r:"Advisory & Onboarding Deployments",g:47000,c:38000,n:9000,y:"+1.2%",m:"19.1%",up:null}
];
function fmt(n){return "$"+n.toLocaleString("en-US")}
function spark(up){var c=up===false?"var(--red)":up===null?"var(--faint)":"var(--green)";var d=up===false?"M0,3 L20,4 L40,8 L60,11 L80,14":up===null?"M0,7 L20,8 L40,8 L60,7 L80,6":"M0,12 L20,9 L40,7 L60,4 L80,2";return '<svg width="80" height="14" viewBox="0 0 80 16"><path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="1.6" stroke-linecap="round"/></svg>'}
function render(){
  var tb=$("#grid-body");if(!tb)return;var h="";
  h+='<tr class="banner"><td class="rh">1</td><td colspan="7">Q1 2026 REGIONAL PERFORMANCE &amp; REVENUE CONSOLIDATION</td></tr>';
  h+='<tr class="heads"><td class="rh">2</td><td>Region / Business Segment</td><td class="n">Gross Revenue</td><td class="n">Operating Cost</td><td class="n">Net Profit</td><td class="n">Growth YoY</td><td class="n">Margin %</td><td style="text-align:center">Trend (3M)</td></tr>';
  DATA.forEach(function(d,i){
    var n=i+3;var yc=d.y.charAt(0)==="-"?"neg":"g";
    h+='<tr data-row="'+n+'"><td class="rh">'+n+'</td><td>'+d.r+'</td><td class="n">'+fmt(d.g)+'</td><td class="n" style="color:var(--muted)">'+fmt(d.c)+'</td><td class="n g">'+fmt(d.n)+'</td><td class="n '+yc+'">'+d.y+'</td><td class="n">'+d.m+'</td><td style="text-align:center">'+spark(d.up)+'</td></tr>';
  });
  h+='<tr><td class="rh">13</td><td colspan="7" style="height:22px;background:var(--panel)"></td></tr>';
  h+='<tr class="totals sel"><td class="rh">14</td><td>Consolidated Totals (Q1)</td><td class="n cell-active" data-cell="B14" data-formula="=SUM(B3:B12)">$1,142,500</td><td class="n" data-cell="C14" data-formula="=SUM(C3:C12)">$655,000</td><td class="n g" data-cell="D14" data-formula="=SUM(D3:D12)">$487,500</td><td class="n g">+15.3%</td><td class="n g">42.6%</td><td style="text-align:center"><span class="active-pill">+4.8% Target</span></td></tr>';
  tb.innerHTML=h;
  $all("#grid-body td[data-cell]").forEach(function(td){td.style.cursor="cell";td.addEventListener("click",function(){selectCell(td)})});
}
function selectCell(td){
  $all("#grid-body td").forEach(function(x){x.classList.remove("cell-active")});td.classList.add("cell-active");
  $("#cell-box").textContent=td.getAttribute("data-cell");$("#formula-text").textContent=td.getAttribute("data-formula")||"—";
  var ctx=$("#ctx-cell");if(ctx)ctx.textContent="Sheet: Summary • Cell: "+td.getAttribute("data-cell");
}
function applyFormula(){
  var f=$("#formula-text").textContent;toast("Formula applied: "+f);
  setTimeout(function(){toast("Workbook synced & formulas validated ✓")},900);
}
document.addEventListener("DOMContentLoaded",function(){
  render();
  var t=$("#toggle-assistant-btn"),a=$("#ai-drawer");if(t)t.addEventListener("click",function(){a.classList.toggle("hidden")});
  $all(".sheet-item").forEach(function(s){s.addEventListener("click",function(){$all(".sheet-item").forEach(function(x){x.classList.remove("on")});s.classList.add("on");toast(s.dataset.sheet+" sheet opened")})});
  $all(".tab").forEach(function(tb){tb.addEventListener("click",function(){$all(".tab").forEach(function(x){x.classList.remove("on")});tb.classList.add("on")})});
});
window.applyFormula=applyFormula;window.toast=toast;
window.sendPrompt=function(){var ta=$("#ai-text");if(!ta.value.trim()){toast("Type a formula request first");return}toast("Building formula…");setTimeout(function(){toast("Sheet refined ✓");ta.value=""},1100)};
})();
