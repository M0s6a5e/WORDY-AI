(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------
     Sticky navbar background on scroll
  ----------------------------------------------------------- */
  var navbar = document.querySelector(".navbar");
  function updateNavbarState() {
    if (!navbar) return;
    if (window.scrollY > 12) {
      navbar.classList.add("is-scrolled");
    } else {
      navbar.classList.remove("is-scrolled");
    }
  }
  updateNavbarState();
  window.addEventListener("scroll", updateNavbarState, { passive: true });

  /* -----------------------------------------------------------
     Mobile menu toggle
  ----------------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");

  function closeMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function openMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close menu when a link inside it is clicked
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileMenu);
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMobileMenu();
    });

    // Close if resized back to desktop width
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) closeMobileMenu();
    });
  }

  /* -----------------------------------------------------------
     Smooth anchor scrolling with navbar offset
  ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      var navHeight = navbar ? navbar.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;
      window.scrollTo({
        top: top,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      // move focus for accessibility after scroll settles
      window.setTimeout(function () {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 500);
    });
  });

  /* -----------------------------------------------------------
     Active nav link highlighting based on scroll position
  ----------------------------------------------------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navAnchors = document.querySelectorAll(".nav-links a[href^='#']");

  function setActiveLink() {
    if (!sections.length || !navAnchors.length) return;
    var scrollPos = window.scrollY + (navbar ? navbar.offsetHeight : 0) + 40;
    var currentId = sections[0].id;

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        currentId = section.id;
      }
    });

    navAnchors.forEach(function (a) {
      var isActive = a.getAttribute("href") === "#" + currentId;
      a.classList.toggle("is-active", isActive);
      if (isActive) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }
  setActiveLink();
  window.addEventListener("scroll", setActiveLink, { passive: true });

  /* -----------------------------------------------------------
     Scroll reveal animations
  ----------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* -----------------------------------------------------------
     Current year in footer
  ----------------------------------------------------------- */
  var yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var mascotBtn = document.getElementById("mascotBtn");
  var mascotFloat = document.getElementById("mascotFloat");
  var mascotBubble = document.getElementById("mascotBubble");
  var heroSection = document.getElementById("home");
  var heroVisual = document.querySelector(".hero-visual");
  var chatPanel = document.getElementById("chatPanel");
  var chatBackdrop = document.getElementById("chatBackdrop");
  var chatClose = document.getElementById("chatClose");
  var chatMsgs = document.getElementById("chatMsgs");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var chatChips = document.getElementById("chatChips");
  var chatGreeted = false;

  function nowTime() {
    var d = new Date(), h = d.getHours(), m = ("0" + d.getMinutes()).slice(-2);
    var ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return h + ":" + m + " " + ap;
  }

  function addMsg(text, who) {
    if (!chatMsgs) return null;
    var div = document.createElement("div");
    div.className = "msg " + who;
    div.innerHTML = text + '<span class="chat-time">' + nowTime() + "</span>";
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
  }

  function wordyReply(q) {
    var s = (q || "").toLowerCase().trim();
    var link = function (href, label) { return '<a href="' + href + '">' + label + "</a>"; };
    if (/^(hi|hello|hey|salam|ahlan|marhaba)\b/.test(s) || s === "صباح الخير" || s === "مساء الخير" || s === "سلام عليكم" || s === "السلام عليكم" || s === "اهلا" || s === "ازيك") {
      return "Hello! Great to see you. I can help you create Word files, Excel sheets, pick a plan, or find help. What do you need?";
    }
    if (s.indexOf("excel") > -1 || s.indexOf("sheet") > -1 || s.indexOf("xlsx") > -1 || s.indexOf("جدول") > -1) {
      return "For spreadsheets, open the " + link("wordy-ai-excel-creator.html", "Excel Creator Studio") + " — describe your data and I will build rows, formulas, and totals for you.";
    }
    if (s.indexOf("word") > -1 || s.indexOf("docx") > -1 || s.indexOf("report") > -1 || s.indexOf("document") > -1 || s.indexOf("تقرير") > -1) {
      return "For documents, open the " + link("wordy-ai-word-creator.html", "Word Creator Studio") + " — tell me the topic and I will draft headings, tables, and a full layout.";
    }
    if (s.indexOf("price") > -1 || s.indexOf("cost") > -1 || s.indexOf("plan") > -1 || s.indexOf("subscription") > -1 || s.indexOf("سعر") > -1) {
      return "Simple weekly billing — cancel anytime. See " + link("index.html#pricing", "all plans here") + ", or go straight to " + link("wordy-PAY-CHECK.html", "checkout") + ".";
    }
    if (s.indexOf("template") > -1 || s.indexOf("قالب") > -1) {
      return "Browse ready-made starters in the " + link("wordy-ai-dashboard.html#templates", "Template Library") + " — one click opens the right studio.";
    }
    if (s.indexOf("help") > -1 || s.indexOf("support") > -1 || s.indexOf("contact") > -1 || s.indexOf("مساعدة") > -1) {
      return "You can visit the " + link("help.html", "Help Center") + " for instant answers, or " + link("contact.html", "message support") + " — we reply within 24 hours.";
    }
    if (s.indexOf("login") > -1 || s.indexOf("sign") > -1 || s.indexOf("account") > -1 || s.indexOf("حساب") > -1) {
      return "You can " + link("wordy-ai-auth.html", "log in") + " or " + link("wordy-ai-auth.html?view=signup", "create a free account") + ". Forgot your password? " + link("auth-recovery.html", "Recover it here") + ".";
    }
    if (s.indexOf("thank") > -1 || s.indexOf("شكرا") > -1) {
      return "Anytime! I am here whenever you need a document. Anything else?";
    }
    if (s.indexOf("who are you") > -1 || s.indexOf("your name") > -1 || s.indexOf("مين") > -1) {
      return "I am <b>Wordy</b>, your AI document assistant. I live in this little coffee pot and I love turning ideas into Word and Excel files.";
    }
    return "Got it! For full AI answers, describe what you want to build and I will point you to the right place — try " + link("wordy-ai-word-creator.html", "Word") + ", " + link("wordy-ai-excel-creator.html", "Excel") + ", or " + link("help.html", "Help") + ".";
  }

  function botAnswer(q) {
    if (!chatMsgs) return;
    var typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    chatMsgs.appendChild(typing);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    window.setTimeout(function () {
      typing.remove();
      addMsg(wordyReply(q), "bot");
    }, 900);
  }

  function openChat() {
    if (!chatPanel) return;
    if (mascotBtn) { mascotBtn.classList.remove("excited"); void mascotBtn.offsetWidth; mascotBtn.classList.add("excited"); }
    chatPanel.classList.add("open");
    chatPanel.setAttribute("aria-hidden", "false");
    if (chatBackdrop) chatBackdrop.classList.add("show");
    if (!chatGreeted) {
      chatGreeted = true;
      addMsg("Hi, I am <b>Wordy</b>! Ask me about Word files, Excel sheets, pricing, or anything on this site.", "bot");
    }
    window.setTimeout(function () { if (chatInput) chatInput.focus({ preventScroll: true }); }, 400);
  }

  function closeChat() {
    if (!chatPanel) return;
    chatPanel.classList.remove("open");
    chatPanel.setAttribute("aria-hidden", "true");
    if (chatBackdrop) chatBackdrop.classList.remove("show");
  }

  if (mascotBtn) mascotBtn.addEventListener("click", openChat);
  if (mascotFloat) mascotFloat.addEventListener("click", openChat);
  if (chatClose) chatClose.addEventListener("click", closeChat);
  if (chatBackdrop) chatBackdrop.addEventListener("click", closeChat);

  /* Redundant delegated opener: works even if direct bindings are lost.
     Re-queries the DOM so it never depends on cached references. */
  window.__wordyChatOpens = 0;
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#mascotBtn,#mascotFloat") : null;
    if (!t) return;
    var panel = document.getElementById("chatPanel");
    var backdrop = document.getElementById("chatBackdrop");
    if (!panel) return;
    window.__wordyChatOpens++;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.classList.add("show");
    var msgs = document.getElementById("chatMsgs");
    if (msgs && !msgs.dataset.greeted) {
      msgs.dataset.greeted = "1";
      addMsg("Hi, I am <b>Wordy</b>! Ask me about Word files, Excel sheets, pricing, or anything on this site.", "bot");
    }
  });

  /* Close chat with Escape */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeChat();
  });

  if (chatForm) chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = chatInput.value.trim();
    if (!v) return;
    addMsg(v.replace(/</g, "&lt;"), "user");
    chatInput.value = "";
    botAnswer(v);
  });

  if (chatChips) chatChips.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-q]");
    if (!btn || !chatInput) return;
    chatInput.value = btn.getAttribute("data-q");
    chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  /* Speech bubble: show once on load, and on hover */
  if (mascotBubble && mascotBtn && !reduceMotion) {
    window.setTimeout(function () {
      if (!document.body.classList.contains("mascot-floating")) mascotBubble.classList.add("show");
      window.setTimeout(function () { mascotBubble.classList.remove("show"); }, 4200);
    }, 1600);
    mascotBtn.addEventListener("mouseenter", function () { mascotBubble.classList.add("show"); });
    mascotBtn.addEventListener("mouseleave", function () { mascotBubble.classList.remove("show"); });
  }

  /* Scroll: floating mini-mascot + hero parallax (reversed when back) */
  var ticking = false;
  function updateMascotOnScroll() {
    ticking = false;
    if (!heroSection) return;
    var r = heroSection.getBoundingClientRect();
    var past = r.bottom < 140;
    document.body.classList.toggle("mascot-floating", past);
    if (mascotBubble) mascotBubble.classList.toggle("show", false);
    if (heroVisual && !reduceMotion) {
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var p = Math.min(Math.max(window.scrollY / Math.max(r.height, 1), 0), 1);
        heroVisual.style.transform = "translateY(" + (p * 60).toFixed(1) + "px) scale(" + (1 - p * 0.08).toFixed(3) + ")";
        heroVisual.style.opacity = (1 - p * 0.55).toFixed(2);
      } else if (r.bottom <= 0) {
        heroVisual.style.transform = "";
        heroVisual.style.opacity = "";
      }
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateMascotOnScroll); }
  }, { passive: true });
  /* -----------------------------------------------------------
     Modern scroll experience: stagger, marquee,
     and 3D tilt on showcase cards
  ----------------------------------------------------------- */

  /* Staggered cascade for grids */
  document.querySelectorAll("[data-stagger]").forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (child, i) {
      child.style.transitionDelay = Math.min(i * 80, 480) + "ms";
    });
  });

  /* Trust strip marquee (duplicate content for a seamless loop) */
  var trustTags = document.querySelector(".trust-tags");
  if (trustTags && !reduceMotion) {
    var track = document.createElement("div");
    track.className = "marquee-track";
    while (trustTags.firstChild) track.appendChild(trustTags.firstChild);
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(clone.children, function (c) { c.setAttribute("tabindex", "-1"); });
    track.appendChild(document.createTextNode(""));
    Array.prototype.forEach.call(clone.childNodes, function (c) { track.appendChild(c); });
    trustTags.appendChild(track);
    trustTags.classList.add("marquee");
  }

  /* 3D tilt on showcase cards (fine pointers only) */
  var canTilt = !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canTilt) {
    document.querySelectorAll(".showcase-card").forEach(function (card) {
      card.classList.add("tilt");
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-y * 7).toFixed(2) + "deg) rotateY(" + (x * 9).toFixed(2) + "deg) translateY(-3px)";
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }

  /* -----------------------------------------------------------
     GSAP 3D scroll choreography (falls back to CSS reveals)
  ----------------------------------------------------------- */
  (function initScrollFX() {
    if (reduceMotion) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    /* HERO: mascot drifts left in 3D + blur while copy ripples */
    var heroChar = document.getElementById("heroCharacter");
    var heroCopy = document.querySelector(".hero-copy");
    var heroLetters = Array.prototype.slice.call(document.querySelectorAll(".hero-title .ch"));
    if (heroSection && heroChar) {
      gsap.to(heroChar, {
        xPercent: -58, rotationY: 26, scale: 0.6, filter: "blur(5px)", opacity: 0.9,
        ease: "none", transformPerspective: 900,
        scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom 25%", scrub: 0.6 }
      });
    }
    if (heroSection && heroCopy) {
      gsap.to(heroCopy, {
        xPercent: 4, filter: "blur(2px)", opacity: 0.45, ease: "none",
        scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom 30%", scrub: 0.6 }
      });
    }
    /* Water ripple: letters part as the mascot passes through them */
    if (heroSection && heroChar && heroLetters.length) {
      ScrollTrigger.create({
        trigger: heroSection, start: "top top", end: "bottom top", scrub: true,
        onUpdate: function (self) {
          var p = self.progress;
          var mr = heroChar.getBoundingClientRect();
          var mx = mr.left + mr.width / 2;
          var amp = Math.sin(Math.min(Math.max(p * 1.15, 0), 1) * Math.PI);
          heroLetters.forEach(function (ch) {
            var r = ch.getBoundingClientRect();
            var d = (r.left + r.width / 2 - mx) / 220;
            var w = Math.exp(-d * d) * amp;
            ch.style.transform = "translateY(" + (w * 26).toFixed(1) + "px) skewX(" + (w * -10).toFixed(1) + "deg)";
            ch.style.filter = w > 0.02 ? "blur(" + (w * 3).toFixed(1) + "px)" : "";
          });
        }
      });
    }

    /* SHOWCASE models fly out in 3D -> STEPS squares fly in */
    var showCards = gsap.utils.toArray(".showcase-grid .showcase-card");
    var stepCards = gsap.utils.toArray(".steps .step");
    showCards.concat(stepCards).forEach(function (el) { el.style.transition = "none"; });
    if (showCards.length && stepCards.length) {
      var morph = gsap.timeline({
        scrollTrigger: { trigger: "#how-it-works", start: "top 88%", end: "top 22%", scrub: 0.7 }
      });
      morph.to(showCards, {
        y: -150, rotationX: 46, opacity: 0, filter: "blur(12px)",
        stagger: 0.09, ease: "power2.in", transformPerspective: 900
      }, 0);
      morph.from(stepCards, {
        y: 150, rotationX: -46, opacity: 0, filter: "blur(12px)",
        stagger: 0.09, ease: "power2.out", transformPerspective: 900,
        clearProps: "opacity,filter"
      }, 0.12);
    }

    /* TEMPLATE LIBRARY: 3D flip-in with blur clearing */
    var tplCards = gsap.utils.toArray(".template-card");
    tplCards.forEach(function (el) { el.style.transition = "none"; });
    tplCards.forEach(function (card, i) {
      gsap.from(card, {
        y: 90, rotationY: i % 2 ? 32 : -32, opacity: 0, filter: "blur(10px)",
        transformPerspective: 900, ease: "power3.out", duration: 0.9, delay: (i % 4) * 0.08,
        clearProps: "opacity,filter",
        scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none reverse" }
      });
    });

    /* WHO IT'S FOR: enter + exit both ways with blur */
    var whoCards = gsap.utils.toArray(".usecase-card");
    whoCards.forEach(function (el) { el.style.transition = "none"; });
    whoCards.forEach(function (card, i) {
      gsap.fromTo(card,
        { y: 90, rotationX: -30, opacity: 0, filter: "blur(10px)" },
        {
          y: 0, rotationX: 0, opacity: 1, filter: "blur(0px)",
          transformPerspective: 900, ease: "power3.out", duration: 0.85, delay: (i % 5) * 0.07,
          clearProps: "opacity,filter",
          scrollTrigger: { trigger: card, start: "top 90%", end: "top 45%", toggleActions: "play reverse play reverse" }
        });
    });

    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  })();
})();
