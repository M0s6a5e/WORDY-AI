(function(){
"use strict";
function $(s){return document.querySelector(s)} function $all(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
var toastT=null;
function toast(m){var t=$("#toast");if(!t)return;$("#toast-msg").textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("show")},2600)}
function render(){
  var tb=$("#grid-body");if(!tb)return;var h="",i,n;
  h+='<tr class="banner"><td class="rh">1</td><td colspan="7">Untitled Workbook</td></tr>';
  h+='<tr class="heads"><td class="rh">2</td><td>Description</td><td class="n">Amount</td><td class="n">Cost</td><td class="n">Total</td><td class="n">Change</td><td class="n">Rate</td><td style="text-align:center">Trend</td></tr>';
  for(i=0;i<10;i++){n=i+3;
    h+='<tr data-row="'+n+'"><td class="rh">'+n+'</td><td contenteditable="true"></td><td class="n" contenteditable="true"></td><td class="n" contenteditable="true"></td><td class="n" contenteditable="true"></td><td class="n" contenteditable="true"></td><td class="n" contenteditable="true"></td><td></td></tr>';
  }
  h+='<tr><td class="rh">13</td><td colspan="7" style="height:22px;background:var(--panel)"></td></tr>';
  h+='<tr class="totals sel"><td class="rh">14</td><td>Totals</td><td class="n cell-active" data-cell="B14" data-formula="">$0</td><td class="n" data-cell="C14" data-formula="">$0</td><td class="n g" data-cell="D14" data-formula="">$0</td><td class="n">—</td><td class="n">—</td><td style="text-align:center"></td></tr>';
  tb.innerHTML=h;
  $all("#grid-body td[data-cell]").forEach(function(td){td.style.cursor="cell";td.addEventListener("click",function(){selectCell(td)})});
}
function selectCell(td){
  $all("#grid-body td").forEach(function(x){x.classList.remove("cell-active")});td.classList.add("cell-active");
  $("#cell-box").textContent=td.getAttribute("data-cell");$("#formula-text").textContent=td.getAttribute("data-formula")||"—";
  var ctx=$("#ctx-cell");if(ctx)ctx.textContent="Sheet: Summary • Cell: "+td.getAttribute("data-cell");
}
document.addEventListener("DOMContentLoaded",function(){
  render();
  var t=$("#toggle-assistant-btn"),a=$("#ai-drawer");if(t)t.addEventListener("click",function(){a.classList.toggle("hidden")});
  $all(".sheet-item").forEach(function(s){s.addEventListener("click",function(){$all(".sheet-item").forEach(function(x){x.classList.remove("on")});s.classList.add("on");toast(s.dataset.sheet+" sheet opened")})});
  $all(".tab").forEach(function(tb){tb.addEventListener("click",function(){$all(".tab").forEach(function(x){x.classList.remove("on")});tb.classList.add("on")})});
});
window.toast=toast;
window.sendPrompt=function(){var ta=$("#ai-text");if(!ta.value.trim()){toast("Type a formula request first");return}toast("Building formula…");setTimeout(function(){toast("Sheet refined ✓");ta.value=""},1100)};
})();
