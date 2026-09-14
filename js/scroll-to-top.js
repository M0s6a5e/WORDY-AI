(function(){
  "use strict";
  var btn = document.createElement("button");
  btn.id = "scrollToTop";
  btn.setAttribute("aria-label", "Scroll to top");
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  btn.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9990;width:44px;height:44px;border-radius:50%;background:#3F4CE0;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(63,76,224,0.3);opacity:0;transform:translateY(20px);transition:opacity .3s,transform .3s;pointer-events:none;";
  document.body.appendChild(btn);
  
  window.addEventListener("scroll", function(){
    if(window.scrollY > 400){
      btn.style.opacity = "1";
      btn.style.transform = "translateY(0)";
      btn.style.pointerEvents = "auto";
    } else {
      btn.style.opacity = "0";
      btn.style.transform = "translateY(20px)";
      btn.style.pointerEvents = "none";
    }
  });
  
  btn.addEventListener("click", function(){
    window.scrollTo({top:0, behavior:"smooth"});
  });
})();
