// -----------------------------------------
// Page transitions (Barba + GSAP + Lenis) + copy reveals (SplitText)
// Framework-agnostic: import and call initApp() once from your client bundle.
// -----------------------------------------

import barba from "@barba/core";
import type { ITransitionData } from "@barba/core";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
import { initCopyReveal } from "./copyReveal";
import type { CopyVariant, CopySplitType } from "./copyReveal";

gsap.registerPlugin(ScrollTrigger, CustomEase);

history.scrollRestoration = "manual";

let lenis: Lenis | null = null;
let nextPage: Document | HTMLElement = document;
let onceFunctionsInitialized = false;

const hasLenis = true;
const hasScrollTrigger = true;

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", (e) => (reducedMotion = e.matches));
rmMQ.addListener?.((e) => (reducedMotion = e.matches));

const has = (s: string) => !!nextPage.querySelector(s);

const staggerDefault = 0.05;
const durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("parallax", "0.87, 0, 0.13, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

export interface InitAppOptions {
  /** Barba debug logs. In Vite: pass `import.meta.env.DEV`. */
  debug?: boolean;
}

// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
}

function initBeforeEnterFunctions(next: HTMLElement | Document | null) {
  nextPage = next ?? document;
  destroyAllReveals();
  if (next instanceof HTMLElement) {
    initCopyRevealsFor(next);
  }
}

function initAfterEnterFunctions(next: HTMLElement | Document | null) {
  nextPage = next ?? document;

  if (hasLenis && lenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }

  if (next instanceof HTMLElement) {
    activateRevealsFor(next);
  }
}

// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next: HTMLElement) {
  const tl = gsap.timeline();

  tl.call(
    () => {
      resetPage(next);
      initCopyRevealsFor(next);
      activateRevealsFor(next);
    },
    undefined,
    0,
  );

  return tl;
}

function runPageLeaveAnimation(current: HTMLElement, _next: HTMLElement) {
  const transitionWrap = document.querySelector<HTMLElement>("[data-transition-wrap]");
  const transitionDark =
    transitionWrap?.querySelector<HTMLElement>("[data-transition-dark]") ?? null;

  const tl = gsap.timeline({
    onComplete: () => {
      current.remove();
    },
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  if (!transitionWrap || !transitionDark) {
    return tl.to(current, { autoAlpha: 0, duration: 0.4 });
  }

  tl.set(transitionWrap, {
    zIndex: 2,
  });

  tl.fromTo(
    transitionDark,
    { autoAlpha: 0 },
    { autoAlpha: 0.8, duration: 1.2, ease: "parallax" },
    0,
  );

  tl.fromTo(
    current,
    { y: "0vh" },
    { y: "-25vh", duration: 1.2, ease: "parallax" },
    0,
  );

  tl.set(transitionDark, {
    autoAlpha: 0,
  });

  return tl;
}

function runPageEnterAnimation(next: HTMLElement): Promise<void> {
  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    tl.call(
      () => {
        if (hasScrollTrigger) ScrollTrigger.refresh();
      },
      undefined,
      "pageReady",
    );
    return new Promise<void>((resolve) =>
      tl.call(() => resolve(), undefined, "pageReady"),
    );
  }

  tl.add("startEnter", 0);

  tl.set(next, {
    zIndex: 3,
  });

  tl.fromTo(
    next,
    { y: "100vh" },
    { y: "0vh", duration: 1.2, clearProps: "all", ease: "parallax" },
    "startEnter",
  );

  tl.call(
    () => {
      if (hasScrollTrigger) ScrollTrigger.refresh();
    },
    undefined,
    "startEnter+=0.9",
  );

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise<void>((resolve) => {
    tl.call(() => resolve(), undefined, "pageReady");
  });
}

// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

let barbaInitialized = false;

export function initApp(options: InitAppOptions = {}) {
  if (typeof window === "undefined") return;
  if (barbaInitialized) return;
  barbaInitialized = true;

  const debug = options.debug ?? false;

  barba.hooks.beforeEnter((data) => {
    if (!data) return;
    gsap.set(data.next.container, {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
    });

    if (lenis && typeof lenis.stop === "function") {
      lenis.stop();
    }

    initBeforeEnterFunctions(data.next.container);
  });

  barba.hooks.afterLeave((data) => {
    if (!data) return;
    const leaving = data.current.container;
    destroyRevealsFor(leaving);
    if (hasScrollTrigger) {
      ScrollTrigger.getAll().forEach((trigger) => {
        const el = trigger.trigger;
        if (el instanceof Node && leaving.contains(el)) {
          trigger.kill();
        }
      });
    }
  });

  barba.hooks.enter((data) => {
    if (!data) return;
    initBarbaNavUpdate(data);
  });

  barba.hooks.afterEnter((data) => {
    if (!data) return;
    initAfterEnterFunctions(data.next.container);

    if (hasLenis && lenis) {
      lenis.resize();
      lenis.start();
    }

    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });

  barba.init({
    debug,
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
        },
      },
    ],
  });

  initOnceFunctions();
}

// -----------------------------------------
// COPY REVEAL MANAGER
// -----------------------------------------

interface RevealEntry {
  container: HTMLElement;
  destroy: () => void;
  play: () => void;
  isInView: () => boolean;
  attachScrollTrigger: (start?: string) => void;
}

const revealEntries: RevealEntry[] = [];

function initCopyRevealsFor(container: HTMLElement) {
  const els = container.querySelectorAll<HTMLElement>("[data-copy-wrapper]");
  els.forEach((el) => {
    const variant = (el.dataset.copyVariant as CopyVariant | undefined) || "rotate";
    const splitType = (el.dataset.copySplit as CopySplitType | undefined) || "chars";
    const delay = parseFloat(el.dataset.copyDelay ?? "") || 0;
    const handle = initCopyReveal(el, {
      variant,
      splitType,
      delay,
      animateOnScroll: true,
      manual: true,
    });
    revealEntries.push({ container, ...handle });
  });
}

function activateRevealsFor(container: HTMLElement) {
  for (const entry of revealEntries) {
    if (entry.container !== container) continue;
    if (entry.isInView()) {
      entry.play();
    } else {
      entry.attachScrollTrigger();
    }
  }
}

function destroyAllReveals() {
  for (const entry of revealEntries) {
    try {
      entry.destroy();
    } catch {
      /* destroy is idempotent */
    }
  }
  revealEntries.length = 0;
}

function destroyRevealsFor(container: HTMLElement | null | undefined) {
  if (!container) return;
  const remaining: RevealEntry[] = [];
  for (const entry of revealEntries) {
    if (entry.container === container) {
      try {
        entry.destroy();
      } catch {
        /* idempotent */
      }
    } else {
      remaining.push(entry);
    }
  }
  revealEntries.length = 0;
  revealEntries.push(...remaining);
}

// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger && lenis) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container: HTMLElement) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis && lenis) {
    lenis.resize();
    lenis.start();
  }
}

function debounceOnWidthChange<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
) {
  let last = window.innerWidth;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.innerWidth !== last) {
        last = window.innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data: ITransitionData) {
  const tpl = document.createElement("template");
  tpl.innerHTML = data.next.html.trim();
  const nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
  const currentNodes = document.querySelectorAll("nav [data-barba-update]");

  currentNodes.forEach((curr, index) => {
    const next = nextNodes[index];
    if (!next) return;

    const newStatus = next.getAttribute("aria-current");
    if (newStatus !== null) {
      curr.setAttribute("aria-current", newStatus);
    } else {
      curr.removeAttribute("aria-current");
    }

    const newClassList = next.getAttribute("class") || "";
    curr.setAttribute("class", newClassList);

    const newHref = next.getAttribute("href");
    if (newHref !== null && curr.getAttribute("href") !== newHref) {
      curr.setAttribute("href", newHref);
    }

    if (curr.innerHTML.trim() !== next.innerHTML.trim()) {
      curr.innerHTML = next.innerHTML;
    }
  });
}

export { has, staggerDefault, debounceOnWidthChange };
