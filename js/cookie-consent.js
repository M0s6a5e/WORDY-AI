/* WORDY AI — Cookie consent banner (frontend only, preference stored locally) */
(function () {
  "use strict";
  var KEY = "wordy-consent";
  try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }

  var css = ".w-cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;background:#fff;border:1px solid #E8E3D7;border-radius:14px;box-shadow:0 12px 36px -6px rgba(18,20,28,.16);padding:14px 16px;display:flex;gap:14px;align-items:center;max-width:640px;margin:0 auto;font-family:'Inter',-apple-system,sans-serif;font-size:13px;color:#2B2924;line-height:1.6}"
    + ".w-cookie p{margin:0;flex:1}.w-cookie a{color:#3F4CE0;font-weight:600;text-decoration:none}"
    + ".w-cookie .row{display:flex;gap:8px;flex-shrink:0}"
    + ".w-cookie button{border-radius:8px;font-size:12.5px;font-weight:700;padding:9px 16px;cursor:pointer;font-family:inherit}"
    + ".w-cookie .ok{background:#3F4CE0;border:1px solid #3F4CE0;color:#fff}"
    + ".w-cookie .no{background:#fff;border:1px solid #E8E3D7;color:#2B2924}"
    + "@media(max-width:560px){.w-cookie{flex-direction:column;align-items:stretch}.w-cookie .row .ok,.w-cookie .row .no{flex:1}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var bar = document.createElement("div");
  bar.className = "w-cookie";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Cookie consent");
  bar.innerHTML = "<p>We use cookies to keep you signed in and improve WORDY AI. Read our <a href=\"policies.html#cookies\">Cookie Policy</a>.</p>"
    + "<div class=\"row\"><button class=\"no\" type=\"button\">Decline</button><button class=\"ok\" type=\"button\">Accept</button></div>";
  document.body.appendChild(bar);

  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    bar.remove();
  }
  bar.querySelector(".ok").addEventListener("click", function () { save("accepted"); });
  bar.querySelector(".no").addEventListener("click", function () { save("declined"); });
})();
