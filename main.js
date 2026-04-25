// -----------------------------------------
// GEZEITEN — OSMO PAGE TRANSITION BOILERPLATE
// Parallax slide transition (current up, next from below, dark overlay)
// -----------------------------------------

gsap.registerPlugin(CustomEase);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("parallax", "0.7, 0.05, 0.13, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });



// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  // Runs once on first load — global stuff that survives transitions
  // if (has('[data-nav]')) initNav();
  // if (has('[data-cursor]')) initCursor();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;

  // Runs before the enter animation (DOM is ready, animations not started)
  // if (has('[data-something]')) initSomething();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Runs after enter animation completes (page is settled)
  // if (has('[data-reveal]')) initReveal();
  // if (has('[data-home="hero"]')) initHomeHero();

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}



// -----------------------------------------
// PAGE TRANSITIONS — Parallax Slide
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionDark = transitionWrap?.querySelector("[data-transition-dark]");

  const tl = gsap.timeline({
    onComplete: () => {
      current.remove();
      // Reset transition layer so it doesn't sit above next page
      if (transitionWrap) {
        gsap.set(transitionWrap, { clearProps: "zIndex" });
      }
    }
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  // Pin current page so it can translate without affecting next page's layout
  tl.set(current, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1
  }, 0);

  if (transitionWrap) {
    tl.set(transitionWrap, { zIndex: 2 }, 0);
  }

  // Dark overlay fades in
  if (transitionDark) {
    tl.fromTo(transitionDark, {
      autoAlpha: 0
    }, {
      autoAlpha: 0.8,
      duration: 1.2,
      ease: "parallax"
    }, 0);
  }

  // Current page slides up (parallax — slower than incoming page)
  tl.fromTo(current, {
    y: "0vh"
  }, {
    y: "-25vh",
    duration: 1.2,
    ease: "parallax"
  }, 0);

  // Reset dark overlay AFTER the leave is done (was the bug in original)
  if (transitionDark) {
    tl.set(transitionDark, { autoAlpha: 0 });
  }

  return tl;
}

function runPageEnterAnimation(next) {
  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1, y: 0 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  // Pre-position next BEFORE the enter starts (avoids flash)
  // beforeEnter already set position:fixed; we add the offset + z-index
  tl.set(next, {
    zIndex: 3,
    y: "100vh",
    autoAlpha: 1
  }, 0);

  tl.add("startEnter", 0);

  tl.fromTo(next, {
    y: "100vh"
  }, {
    y: "0vh",
    duration: 1.2,
    ease: "parallax",
    clearProps: "zIndex"
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}



// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {
  // Position new container on top so it can slide in from below
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    autoAlpha: 0,
    y: "100vh"
  });

  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }

  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter(data => {
  initAfterEnterFunctions(data.next.container);

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

barba.init({
  debug: true, // Set to false in production
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,

      async once(data) {
        initOnceFunctions();
        return runPageOnceAnimation(data.next.container);
      },

      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});



// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;

  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right,zIndex,y,transform" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data) {
  const tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  const nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  const currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach((curr, index) => {
    const next = nextNodes[index];
    if (!next) return;

    const newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    const newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}



// -----------------------------------------
// YOUR FUNCTIONS GO BELOW HERE
// -----------------------------------------
