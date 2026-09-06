(function(){
"use strict";
function $(s,r){return (r||document).querySelector(s)} function $all(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
var toastTimer=null;
function toast(msg){var t=$("#toast");if(!t)return;$("#toast-msg").textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove("show")},2600)}
function switchLeftTab(which){
  var o=$("#tab-outline"),p=$("#tab-pages"),vo=$("#view-outline"),vp=$("#view-pages");
  if(which==="pages"){p.classList.add("on");o.classList.remove("on");vo.style.display="none";vp.style.display="block"}
  else{o.classList.add("on");p.classList.remove("on");vp.style.display="none";vo.style.display="block"}
}
function setDocZoom(z){var paper=$("#paper");if(paper)paper.style.transform="scale("+z+")";$all(".zoom-btns button").forEach(function(b){b.classList.remove("on")});toast("Zoom "+Math.round(z*100)+"%")}
function toggleStar(btn){btn.classList.toggle("on");toast(btn.classList.contains("on")?"Added to favorites":"Removed from favorites")}
function setPromptText(t){var ta=$("#ai-instruction");if(ta){ta.value=t;ta.focus()}toast("Prompt inserted")}
function insertAiCommand(cmd){setPromptText(cmd+" — ")}
function applyDiffChanges(){
  var card=$("#diff-card");if(!card)return;
  card.classList.add("done");
  card.innerHTML='<div class="diff-head"><span>✓ Revision applied</span><span class="diff-ver">v3.3</span></div><p style="font-size:12.5px;margin:0">Pursuant to Q1 actuals, we recommend a formal reallocation of <b>25% engineering capital</b> toward local-first sovereign caching, guaranteeing sub-second latency for executive roll-ups.</p>';
  var target=$("#sec-strategic-recommendations p");if(target)target.innerHTML='Pursuant to Q1 actuals, we recommend a formal reallocation of <b>25% engineering capital</b> toward local-first sovereign caching, guaranteeing sub-second latency for executive roll-ups.';
  toast("AI revision applied to Strategic Recommendations");
}
function rejectDiffChanges(){var card=$("#diff-card");if(card)card.style.display="none";toast("Suggestion dismissed")}
function executeAiRefinement(){var ta=$("#ai-instruction");if(!ta||!ta.value.trim()){toast("Type an instruction first");return}toast("Refining document…");setTimeout(function(){toast("Document refined ✓");ta.value=""},1200)}
document.addEventListener("DOMContentLoaded",function(){
  var l=$("#left-sidebar"),ai=$("#ai-panel");
  var tb=$("#toggle-drawer-btn");if(tb)tb.addEventListener("click",function(){l.classList.toggle("hidden")});
  var ca=$("#close-ai-panel");if(ca)ca.addEventListener("click",function(){ai.classList.add("hidden")});
  var tg=$("#ai-panel-toggle");if(tg)tg.addEventListener("click",function(){ai.classList.toggle("hidden")});
  var be=$("#btn-mode-edit"),bp=$("#btn-mode-preview");
  if(be&&bp){be.addEventListener("click",function(){be.classList.add("on");bp.classList.remove("on");$("#paper").contentEditable="true";$("#paper").focus()});bp.addEventListener("click",function(){bp.classList.add("on");be.classList.remove("on");$("#paper").contentEditable="false"})}
  var title=$("#doc-editable-title");if(title)title.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();title.blur();toast("Document renamed")}});  
  $all(".outline-link").forEach(function(a){a.addEventListener("click",function(){$all(".outline-link").forEach(function(x){x.classList.remove("on")});a.classList.add("on")})});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){ai.classList.add("hidden")}});
});
window.switchLeftTab=switchLeftTab;window.setDocZoom=setDocZoom;window.toggleStar=toggleStar;window.setPromptText=setPromptText;window.insertAiCommand=insertAiCommand;window.applyDiffChanges=applyDiffChanges;window.rejectDiffChanges=rejectDiffChanges;window.executeAiRefinement=executeAiRefinement;window.openPromptModal=function(){setPromptText("Compose new section: ")};
})();
