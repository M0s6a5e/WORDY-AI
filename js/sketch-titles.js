/* WORXXEL — Text FX: scatter-in letters + marker highlights.
   [data-sketch]  -> heading chars fly in from random offsets, then settle.
   [data-scatter] / .hero-sub / .section-sub -> words rise with random offsets.
   <mark> / .hl   -> highlighter swipe plays when scrolled into view. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css =
    ".tx{visibility:visible}"
    + ".tx .tx-wd{display:inline-block;white-space:nowrap}"
    + ".tx .tx-ch{display:inline-block;opacity:0;will-change:transform,opacity}"
    + ".tx:not(.tx-on) .tx-ch{transform:translate(var(--dx,0px),var(--dy,0px)) rotate(var(--dr,0deg))}"
    + ".tx.tx-on .tx-ch{opacity:1;transform:translate(0,0) rotate(0deg);"
    + "transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);"
    + "transition-delay:var(--dl,0ms)}"
    + ".tx .tx-w{display:inline-block;opacity:0;will-change:transform,opacity}"
    + ".tx:not(.tx-on) .tx-w{transform:translateY(var(--dy,14px))}"
    + ".tx.tx-on .tx-w{opacity:1;transform:translateY(0);"
    + "transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1);"
    + "transition-delay:var(--dl,0ms)}"
    + "mark,.hl{background:none;color:inherit;position:relative;white-space:nowrap}"
    + "mark::after,.hl::after{content:\"\";position:absolute;left:-2%;right:-2%;top:58%;bottom:2%;z-index:-1;"
    + "background:linear-gradient(100deg,rgba(251,191,36,.55),rgba(251,191,36,.75));"
    + "border-radius:2px;transform:scaleX(0);transform-origin:left center}"
    + ".tx-on mark::after,.tx-on.hl::after,.hl-on::after{transform:scaleX(1);"
    + "transition:transform .8s cubic-bezier(.16,1,.3,1) .35s}"
    + "@media(prefers-reduced-motion:reduce){"
    + ".tx .tx-ch,.tx .tx-w{opacity:1 !important;transform:none !important;transition:none !important}"
    + "mark::after,.hl::after{transform:scaleX(1) !important;transition:none !important}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function rnd(min, max) { return (Math.random() * (max - min) + min).toFixed(1); }

  function splitChars(el) {
    if (el.dataset.txDone) return;
    el.dataset.txDone = "1";
    el.classList.add("tx");
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = "";
    nodes.forEach(function (node) {
      // keep words unbreakable: group each word's chars in a nowrap span
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span");
        w.className = "tx-wd";
        w.setAttribute("aria-hidden", "true");
        Array.prototype.forEach.call(part, function (c) {
          var s = document.createElement("span");
          s.className = "tx-ch";
          s.style.setProperty("--dx", rnd(-46, 46) + "px");
          s.style.setProperty("--dy", rnd(-38, 38) + "px");
          s.style.setProperty("--dr", rnd(-50, 50) + "deg");
          s.style.setProperty("--dl", Math.floor(Math.random() * 480) + "ms");
          s.textContent = c;
          w.appendChild(s);
        });
        el.appendChild(w);
      });
    });
  }

  function splitWords(el) {
    if (el.dataset.txDone) return;
    el.dataset.txDone = "1";
    el.classList.add("tx");
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = "";
    var i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === 1) {
        // keep elements (mark, a, strong...) intact as one animated unit
        var w = document.createElement("span");
        w.className = "tx-w";
        w.setAttribute("aria-hidden", "true");
        w.style.setProperty("--dy", rnd(10, 26) + "px");
        w.style.setProperty("--dl", Math.floor(Math.random() * 380 + i * 12) + "ms");
        w.appendChild(node);
        el.appendChild(w);
        el.appendChild(document.createTextNode(" "));
        i++;
        return;
      }
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
        var s = document.createElement("span");
        s.className = "tx-w";
        s.setAttribute("aria-hidden", "true");
        s.style.setProperty("--dy", rnd(10, 26) + "px");
        s.style.setProperty("--dl", Math.floor(Math.random() * 380 + i * 12) + "ms");
        s.textContent = part;
        el.appendChild(s);
        el.appendChild(document.createTextNode(" "));
        i++;
      });
    });
  }

  function start(el) {
    if (el.hasAttribute("data-sketch")) splitChars(el);
    else splitWords(el);
    // force reflow so transitions play from the scattered state
    void el.offsetWidth;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add("tx-on"); });
    });
  }

  function init() {
    var heads = Array.prototype.slice.call(document.querySelectorAll("[data-sketch]"));
    var bodies = Array.prototype.slice.call(
      document.querySelectorAll("[data-scatter], .hero-sub, .section-sub")
    );
    var els = heads.concat(bodies.filter(function (el) { return heads.indexOf(el) === -1; }));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        if (el.hasAttribute("data-sketch")) splitChars(el); else splitWords(el);
        el.classList.add("tx-on");
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { start(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) {
      if (el.hasAttribute("data-sketch")) splitChars(el); else splitWords(el);
      io.observe(el);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
