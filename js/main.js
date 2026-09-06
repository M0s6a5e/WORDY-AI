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
})();
