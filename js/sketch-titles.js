/* WORDY AI — Sketch headline writer: splits [data-sketch] titles into animated letters */
(function () {
  "use strict";
  var css = ".sketch-title{font-family:'Fraunces','DM Serif Display',Georgia,'Times New Roman',serif;font-weight:500;letter-spacing:-.01em}"
    + ".sketch-title .ch{display:inline-block;opacity:0;transform:translateY(.35em) rotate(5deg)}"
    + ".sketch-title.on .ch{animation:sketchWrite .55s cubic-bezier(.2,.7,.3,1) forwards;animation-delay:calc(var(--i)*45ms)}"
    + ".sketch-title .pen-dot{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:#3F4CE0;margin-left:.08em;opacity:0}"
    + ".sketch-title.on .pen-dot{animation:penDot 2.4s ease forwards;animation-delay:.2s}"
    + "@keyframes sketchWrite{to{opacity:1;transform:translateY(0) rotate(0)}}"
    + "@keyframes penDot{0%{opacity:0;transform:scale(.4)}12%{opacity:1;transform:scale(1)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}"
    + "@media(prefers-reduced-motion:reduce){.sketch-title .ch{opacity:1;transform:none;animation:none}.sketch-title .pen-dot{display:none}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  function split(el) {
    if (el.dataset.sketchDone) return;
    el.dataset.sketchDone = "1";
    el.classList.add("sketch-title");
    var nodes = Array.prototype.slice.call(el.childNodes), i = 0;
    el.innerHTML = "";
    nodes.forEach(function (node) {
      var text = node.textContent, frag = document.createTextNode("");
      void frag;
      Array.prototype.forEach.call(text, function (ch) {
        if (ch === " " || ch === "\n" || ch === "\t") {
          el.appendChild(document.createTextNode(" "));
          return;
        }
        var s = document.createElement("span");
        s.className = "ch";
        s.style.setProperty("--i", i++);
        s.textContent = ch;
        el.appendChild(s);
      });
    });
    var dot = document.createElement("span");
    dot.className = "pen-dot";
    dot.setAttribute("aria-hidden", "true");
    el.appendChild(dot);
  }
  function start(el) { split(el); el.classList.add("on"); }
  document.addEventListener("DOMContentLoaded", function () {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-sketch]"));
    if (!("IntersectionObserver" in window)) { els.forEach(start); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { start(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    els.forEach(function (el) { split(el); io.observe(el); });
  });
})();
