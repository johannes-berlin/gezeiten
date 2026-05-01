// -----------------------------------------
// OSMO PAGE TRANSITION BOILERPLATE
// + portable-transitions: copy reveals (SplitText), reveal lifecycle, selective ST kill
// -----------------------------------------

gsap.registerPlugin(CustomEase);
if (typeof ScrollTrigger !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}
const hasSplitText = typeof SplitText !== "undefined";
if (hasSplitText) {
  gsap.registerPlugin(SplitText);
}

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", (e) => (reducedMotion = e.matches));
rmMQ.addListener?.((e) => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("parallax", "0.87, 0, 0.13, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

// -----------------------------------------
// COPY REVEAL (from portable-transitions/copyReveal.ts)
// -----------------------------------------

function normalizeRichTextParagraphsForSplit(container) {
  if (!container || !container.querySelectorAll) return;
  var ps = container.querySelectorAll(".u-text.u-rich-text p");
  if (ps.length) {
    /* Nur Margin — kein display:inline: sonst spannen .copy-line-Zeilen nicht als Block auf. */
    gsap.set(ps, { margin: 0, display: "block" });
  }
}

/**
 * @param {Element|string} container — target node or selector
 * @param {{
 *   variant?: 'rotate'|'flicker'|'slide',
 *   splitType?: 'chars'|'words'|'lines',
 *   animateOnScroll?: boolean,
 *   delay?: number,
 *   manual?: boolean
 * }} [options]
 *
 * If `data-copy-wrapper` has element children, each child is initialised separately
 * (merged options: child `data-copy-*` overrides wrapper defaults). Children with
 * `data-reveal="elegance"` are skipped here (handled by initEleganceRevealsFor).
 */
function initCopyReveal(container, options) {
  options = options || {};
  var variant = options.variant || "rotate";
  var splitType = options.splitType || "chars";
  var animateOnScroll = options.animateOnScroll !== false;
  var delay = typeof options.delay === "number" ? options.delay : parseFloat(options.delay) || 0;
  var manual = !!options.manual;

  var root =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  var noop = function () {};
  if (!root || !hasSplitText) {
    return {
      destroy: noop,
      play: noop,
      isInView: function () {
        return false;
      },
      attachScrollTrigger: noop,
    };
  }

  var isCopyWrapper = root.hasAttribute && root.hasAttribute("data-copy-wrapper");
  var childNodes =
    isCopyWrapper && root.children && root.children.length
      ? Array.prototype.slice.call(root.children).filter(function (child) {
          return !(child.matches && child.matches('[data-reveal="elegance"]'));
        })
      : [];

  if (isCopyWrapper && root.children && root.children.length > 0 && childNodes.length === 0) {
    return {
      destroy: noop,
      play: noop,
      isInView: function () {
        return false;
      },
      attachScrollTrigger: noop,
    };
  }

  if (isCopyWrapper && childNodes.length > 0) {
    var handles = [];
    for (var ci = 0; ci < childNodes.length; ci++) {
      var ch = childNodes[ci];
      var childVariant = ch.dataset.copyVariant || variant;
      var childSplit = ch.dataset.copySplit || splitType;
      var childDelay =
        ch.dataset.copyDelay !== undefined && String(ch.dataset.copyDelay).trim() !== ""
          ? parseFloat(ch.dataset.copyDelay) || 0
          : delay;
      handles.push(
        initCopyReveal(ch, {
          variant: childVariant,
          splitType: childSplit,
          delay: childDelay,
          animateOnScroll: animateOnScroll,
          manual: manual,
        }),
      );
    }
    return {
      destroy: function () {
        handles.forEach(function (h) {
          h.destroy();
        });
      },
      play: function () {
        handles.forEach(function (h) {
          h.play();
        });
      },
      isInView: function () {
        for (var hi = 0; hi < handles.length; hi++) {
          if (handles[hi].isInView()) return true;
        }
        return false;
      },
      attachScrollTrigger: function (start) {
        handles.forEach(function (h) {
          h.attachScrollTrigger(start);
        });
      },
    };
  }

  var elements = [root];

  if (root.matches && root.matches('[data-reveal="elegance"]')) {
    return {
      destroy: noop,
      play: noop,
      isInView: function () {
        return false;
      },
      attachScrollTrigger: noop,
    };
  }

  var scrollTriggers = [];
  var pausedTween = null;
  var tweenTargets = [];

  var splits = [];
  var played = false;
  var revealPlay = noop;

  function play() {
    if (played) return;
    played = true;
    revealPlay();
  }

  function isInView() {
    var rect = root.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function addScrollTrigger(config) {
    var st = ScrollTrigger.create(config);
    scrollTriggers.push(st);
    return st;
  }

  var defaultTriggerStart = "top 90%";

  function attachScrollTrigger(start) {
    if (played || !root) return;
    addScrollTrigger({
      trigger: root,
      start: start != null ? start : defaultTriggerStart,
      once: true,
      onEnter: function () {
        play();
      },
    });
  }

  if (variant === "rotate") {
    var allTargets = [];

    elements.forEach(function (element) {
      if (splitType === "lines") {
        var split = SplitText.create(element, {
          type: "lines",
          linesClass: "copy-line",
        });
        splits.push(split);
        allTargets.push.apply(allTargets, split.lines);
      } else if (splitType === "words") {
        var splitW = SplitText.create(element, {
          type: "words",
          wordsClass: "copy-word",
        });
        splits.push(splitW);
        allTargets.push.apply(allTargets, splitW.words);
      } else {
        var splitC = SplitText.create(element, {
          type: "words,chars",
          wordsClass: "copy-word",
          charsClass: "copy-char",
        });
        splits.push(splitC);
        splitC.words.forEach(function (word) {
          var chars = word.querySelectorAll(".copy-char");
          for (var i = 0; i < chars.length; i++) {
            allTargets.push(chars[i]);
          }
        });
      }
    });

    gsap.set(elements, {
      perspective: 700,
      transformStyle: "preserve-3d",
    });

    gsap.set(allTargets, {
      opacity: 0,
      rotationX: -90,
      transformOrigin: "50% 50% -50px",
    });

    tweenTargets.push.apply(tweenTargets, allTargets);

    function playRotateReveal() {
      var tl = gsap.timeline();

      if (splitType === "lines") {
        tl.to(allTargets, {
          delay: delay,
          rotationX: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.05,
        });
      } else if (splitType === "words") {
        tl.to(allTargets, {
          delay: delay,
          rotationX: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: { each: 0.035, from: "random" },
        });
      } else {
        var allWords = [];
        splits.forEach(function (split) {
          split.words.forEach(function (word) {
            allWords.push({
              chars: Array.prototype.slice.call(word.querySelectorAll(".copy-char")),
            });
          });
        });

        allWords.forEach(function (w) {
          var wordTl = gsap.timeline().to(w.chars, {
            rotationX: 0,
            opacity: 1,
            duration: 0.75,
            ease: "power3.out",
            stagger: { each: 0.035, from: "random" },
          });
          tl.add(wordTl, delay + Math.random() * 0.4);
        });
      }

      return tl;
    }

    revealPlay = function () {
      playRotateReveal();
    };

    defaultTriggerStart = "top 90%";

    if (manual) {
      /* caller drives play / attachScrollTrigger */
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  if (variant === "flicker") {
    var allChars = [];

    elements.forEach(function (element) {
      var splitF = SplitText.create(element, {
        type: "chars",
        charsClass: "copy-char",
      });
      splits.push(splitF);
      allChars.push.apply(allChars, splitF.chars);
    });

    gsap.set(allChars, { opacity: 0 });
    tweenTargets.push.apply(tweenTargets, allChars);

    var flickerAnimation = gsap.to(allChars, {
      delay: delay,
      duration: 0.05,
      opacity: 1,
      ease: "power2.inOut",
      stagger: { amount: 0.5, each: 0.1, from: "random" },
      paused: true,
    });

    pausedTween = flickerAnimation;
    revealPlay = function () {
      flickerAnimation.play();
    };

    defaultTriggerStart = "top 85%";

    if (manual) {
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  if (variant === "slide") {
    gsap.set(elements, { y: 50, opacity: 0 });

    var slideAnimation = gsap.to(elements, {
      delay: delay,
      y: 0,
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.1,
      paused: true,
    });

    pausedTween = slideAnimation;
    revealPlay = function () {
      slideAnimation.play();
    };

    defaultTriggerStart = "top 90%";

    if (manual) {
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  function destroy() {
    scrollTriggers.forEach(function (st) {
      st.kill();
    });
    scrollTriggers.length = 0;

    if (pausedTween) {
      pausedTween.kill();
      pausedTween = null;
    }

    gsap.killTweensOf(elements.concat(tweenTargets));
    splits.forEach(function (split) {
      try {
        split.revert();
      } catch (e) {
        /* DOM may already be gone */
      }
    });
    splits.length = 0;
  }

  return { destroy: destroy, play: play, isInView: isInView, attachScrollTrigger: attachScrollTrigger };
}

// -----------------------------------------
// COPY REVEAL MANAGER (from portable-transitions/app.ts)
// -----------------------------------------

/** @type {{ container: HTMLElement, destroy: () => void, play: () => void, isInView: () => boolean, attachScrollTrigger: (start?: string) => void }[]} */
var revealEntries = [];

function initCopyRevealsFor(container) {
  if (!hasSplitText || !hasScrollTrigger) return;
  var els = container.querySelectorAll("[data-copy-wrapper]:not([data-reveal=\"elegance\"])");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var variant = el.dataset.copyVariant || "rotate";
    var splitType = el.dataset.copySplit || "chars";
    var copyDelay = parseFloat(el.dataset.copyDelay || "") || 0;
    var handle = initCopyReveal(el, {
      variant: variant,
      splitType: splitType,
      delay: copyDelay,
      animateOnScroll: true,
      manual: true,
    });
    revealEntries.push({ container: container, destroy: handle.destroy, play: handle.play, isInView: handle.isInView, attachScrollTrigger: handle.attachScrollTrigger });
  }
}

function activateRevealsFor(container) {
  for (var i = 0; i < revealEntries.length; i++) {
    var entry = revealEntries[i];
    if (entry.container !== container) continue;
    if (entry.isInView()) {
      entry.play();
    } else {
      entry.attachScrollTrigger();
    }
  }
}

function destroyAllReveals() {
  for (var i = 0; i < revealEntries.length; i++) {
    try {
      revealEntries[i].destroy();
    } catch (e) {
      /* idempotent */
    }
  }
  revealEntries.length = 0;
}

function destroyRevealsFor(container) {
  if (!container) return;
  var remaining = [];
  for (var i = 0; i < revealEntries.length; i++) {
    var entry = revealEntries[i];
    if (entry.container === container) {
      try {
        entry.destroy();
      } catch (e) {
        /* idempotent */
      }
    } else {
      remaining.push(entry);
    }
  }
  revealEntries.length = 0;
  for (var j = 0; j < remaining.length; j++) {
    revealEntries.push(remaining[j]);
  }
}

// -----------------------------------------
// ELEGANCE TEXT REVEAL — [data-reveal="elegance"] (SplitText chars + ScrollTrigger)
// -----------------------------------------

/** @type {{ container: HTMLElement, destroy: () => void }[]} */
var eleganceEntries = [];

function destroyAllElegance() {
  for (var i = 0; i < eleganceEntries.length; i++) {
    try {
      eleganceEntries[i].destroy();
    } catch (e) {
      /* idempotent */
    }
  }
  eleganceEntries.length = 0;
}

function destroyEleganceFor(container) {
  if (!container) return;
  var remaining = [];
  for (var i = 0; i < eleganceEntries.length; i++) {
    var entry = eleganceEntries[i];
    if (entry.container === container) {
      try {
        entry.destroy();
      } catch (e) {
        /* idempotent */
      }
    } else {
      remaining.push(entry);
    }
  }
  eleganceEntries.length = 0;
  for (var j = 0; j < remaining.length; j++) {
    eleganceEntries.push(remaining[j]);
  }
}

function initEleganceRevealsFor(container) {
  if (!hasSplitText || !hasScrollTrigger) return;
  if (reducedMotion) return;

  /* Skip subtree only when scanning page content — nav roots live here too if nested.
     When container IS [data-anim-nav], descendants still closest-match → must NOT skip. */
  var skipRootsInsideAnimNav =
    !(container.matches && container.matches("[data-anim-nav]"));

  var roots = container.querySelectorAll('[data-reveal="elegance"]');
  for (var i = 0; i < roots.length; i++) {
    var root = roots[i];
    if (
      skipRootsInsideAnimNav &&
      root.closest &&
      root.closest("[data-anim-nav]")
    )
      continue;

    try {
      var split = SplitText.create(root, {
        type: "chars",
        charsClass: "reveal-elegance-char",
      });
      var chars = split.chars;
      gsap.set(chars, {
        display: "inline-block",
        opacity: 0,
        filter: "blur(8px)",
        y: 20,
      });

      var st = ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        once: true,
        onEnter: function () {
          gsap.to(chars, {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            duration: 0.6,
            stagger: 0.05,
            delay: 0.35,
            ease: "power2.out",
            onComplete: function () {
              requestAnimationFrame(function () {
                ScrollTrigger.refresh();
              });
            },
          });
        },
      });

      eleganceEntries.push({
        container: container,
        destroy: function () {
          st.kill();
          gsap.killTweensOf(chars);
          try {
            split.revert();
          } catch (err) {
            /* DOM may already be gone */
          }
        },
      });
    } catch (err) {
      console.warn("[gezeiten] initEleganceReveal skipped", root, err);
    }
  }

  if (roots.length && hasScrollTrigger) {
    requestAnimationFrame(function () {
      ScrollTrigger.refresh();
    });
  }
}

function initEleganceRevealsForAllAnimNav() {
  document.querySelectorAll("[data-anim-nav]").forEach(function (navRoot) {
    initEleganceRevealsFor(navRoot);
  });
}

// -----------------------------------------
// NAV II — mobile drawer (idempotent per .navII_wrap)
// -----------------------------------------

function initNavII() {
  document.querySelectorAll(".navII_wrap").forEach(function (component) {
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = "true";

    var toggle = component.querySelector(".navII_toggle_wrap");
    var drawer = component.querySelector(".navII_mobile_wrap");
    if (!toggle || !drawer) return;

    var focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function isOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function openMenu() {
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      toggle.classList.add("is-active");
      drawer.classList.add("is-active");
      component.classList.add("is-active");
      document.body.style.overflow = "hidden";
      var firstLink = drawer.querySelector(focusableSelector);
      if (firstLink) {
        window.requestAnimationFrame(function () {
          firstLink.focus();
        });
      }
    }

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      toggle.classList.remove("is-active");
      drawer.classList.remove("is-active");
      component.classList.remove("is-active");
      document.body.style.overflow = "";
      toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) closeMenu();
      else openMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) closeMenu();
    });

    drawer.addEventListener("click", function (event) {
      var el = event.target;
      if (el && el.nodeType !== 1) el = el.parentElement;
      if (el && el.closest && el.closest("a")) closeMenu();
    });

    drawer.addEventListener("keydown", function (event) {
      if (event.key !== "Tab" || !isOpen()) return;
      var focusables = drawer.querySelectorAll(focusableSelector);
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    function checkViewport() {
      var display = getComputedStyle(toggle).display;
      if (display === "none" && isOpen()) closeMenu();
    }

    window.addEventListener("resize", checkViewport);
  });
}

function closeAllNavIIDrawers() {
  document.querySelectorAll(".navII_wrap").forEach(function (component) {
    var toggle = component.querySelector(".navII_toggle_wrap");
    var drawer = component.querySelector(".navII_mobile_wrap");
    if (!toggle || !drawer) return;

    var appearsOpen =
      toggle.getAttribute("aria-expanded") === "true" ||
      component.classList.contains("is-active") ||
      drawer.classList.contains("is-active");

    if (!appearsOpen) return;

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.classList.remove("is-active");
    drawer.classList.remove("is-active");
    component.classList.remove("is-active");
  });

  document.body.style.overflow = "";
}

// -----------------------------------------
// CASE — sticky details list scrub (desktop / sticky only)
// -----------------------------------------

function initCaseWrapScroll(scopeRoot) {
  if (!hasScrollTrigger) return;

  var root =
    scopeRoot && scopeRoot.nodeType === 1 ? scopeRoot : document;

  root.querySelectorAll(".case_wrap").forEach(function (component) {
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = "true";

    var list = component.querySelector(".case_details_list");
    var parent = component.querySelector(".case_details_wrap");
    if (!list || !parent) return;

    function isDesktop() {
      var stickyApplied = getComputedStyle(parent).position === "sticky";
      return stickyApplied && !reducedMotion;
    }

    var tween = null;
    var trigger = null;

    function build() {
      if (tween) {
        tween.kill();
        tween = null;
      }
      if (trigger) {
        trigger.kill();
        trigger = null;
      }
      gsap.set(list, { y: 0 });
      if (!isDesktop()) return;

      var moveAmount = list.offsetHeight - parent.offsetHeight;
      if (moveAmount <= 0) return;

      tween = gsap.to(list, {
        y: -moveAmount,
        ease: "none",
        scrollTrigger: {
          trigger: component,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
      trigger = tween.scrollTrigger;
    }

    build();

    var resizeId;
    window.addEventListener("resize", function caseWrapOnResize() {
      if (!component.isConnected) {
        window.removeEventListener("resize", caseWrapOnResize);
        return;
      }
      clearTimeout(resizeId);
      resizeId = setTimeout(function () {
        build();
        if (hasScrollTrigger) ScrollTrigger.refresh();
      }, 150);
    });
  });
}

// -----------------------------------------
// GLOBAL PARALLAX — [data-parallax="trigger"] (+ optional target / attrs)
// -----------------------------------------

var globalParallaxMM = null;

function destroyGlobalParallax() {
  if (globalParallaxMM) {
    globalParallaxMM.kill();
    globalParallaxMM = null;
  }
}

function initGlobalParallax() {
  if (!hasScrollTrigger) return;
  if (reducedMotion) return;
  if (typeof gsap.matchMedia !== "function") return;

  destroyGlobalParallax();

  globalParallaxMM = gsap.matchMedia();

  globalParallaxMM.add(
    {
      isMobile: "(max-width:479px)",
      isMobileLandscape: "(max-width:767px)",
      isTablet: "(max-width:991px)",
      isDesktop: "(min-width:992px)",
    },
    function (context) {
      var cond = context.conditions || {};
      var isMobile = !!cond.isMobile;
      var isMobileLandscape = !!cond.isMobileLandscape;
      var isTablet = !!cond.isTablet;

      var ctx = gsap.context(function () {
        document
          .querySelectorAll('[data-parallax="trigger"]')
          .forEach(function (trigger) {
            var disable = trigger.getAttribute("data-parallax-disable");
            if (
              (disable === "mobile" && isMobile) ||
              (disable === "mobileLandscape" && isMobileLandscape) ||
              (disable === "tablet" && isTablet)
            ) {
              return;
            }

            var targetEl =
              trigger.querySelector('[data-parallax="target"]') || trigger;

            var direction =
              trigger.getAttribute("data-parallax-direction") || "vertical";
            var prop =
              direction === "horizontal" ? "xPercent" : "yPercent";

            var scrubAttr = trigger.getAttribute("data-parallax-scrub");
            var scrub = scrubAttr ? parseFloat(scrubAttr) : true;

            var startAttr = trigger.getAttribute("data-parallax-start");
            var startVal =
              startAttr !== null ? parseFloat(startAttr) : 20;

            var endAttr = trigger.getAttribute("data-parallax-end");
            var endVal = endAttr !== null ? parseFloat(endAttr) : -20;

            var scrollStartRaw =
              trigger.getAttribute("data-parallax-scroll-start") ||
              "top bottom";
            var scrollStart = "clamp(" + scrollStartRaw + ")";

            var scrollEndRaw =
              trigger.getAttribute("data-parallax-scroll-end") || "bottom top";
            var scrollEnd = "clamp(" + scrollEndRaw + ")";

            var fromVars = {};
            fromVars[prop] = startVal;
            var toVars = {
              ease: "none",
              scrollTrigger: {
                trigger: trigger,
                start: scrollStart,
                end: scrollEnd,
                scrub: scrub,
              },
            };
            toVars[prop] = endVal;

            gsap.fromTo(targetEl, fromVars, toVars);
          });
      });

      return function () {
        ctx.revert();
      };
    },
  );
}

// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  // Runs once on first load
  // if (has('[data-something]')) initSomething();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;

  destroyAllReveals();
  destroyAllElegance();
  if (next && next.nodeType === 1) {
    normalizeRichTextParagraphsForSplit(next);
    initCopyRevealsFor(next);
    initEleganceRevealsFor(next);
  }
  initEleganceRevealsForAllAnimNav();

  // Runs before the enter animation
  // if (has('[data-something]')) initSomething();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Runs after enter animation completes
  // if (has('[data-something]')) initSomething();

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }

  if (next && next.nodeType === 1) {
    activateRevealsFor(next);
    initCaseWrapScroll(next);
  }

  initNavII();
  initGlobalParallax();
}

// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next) {
  var tl = gsap.timeline();

  tl.call(
    function () {
      resetPage(next);
      destroyAllReveals();
      destroyAllElegance();
      if (next && next.nodeType === 1) {
        normalizeRichTextParagraphsForSplit(next);
        initCopyRevealsFor(next);
        initEleganceRevealsFor(next);
        activateRevealsFor(next);
      }
      initEleganceRevealsForAllAnimNav();
    },
    null,
    0,
  );

  return tl;
}

function runPageLeaveAnimation(current, next) {
  var transitionWrap = document.querySelector("[data-transition-wrap]");
  var transitionDark = transitionWrap?.querySelector("[data-transition-dark]");

  var tl = gsap.timeline({
    onComplete: function () {
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
    {
      autoAlpha: 0,
    },
    {
      autoAlpha: 0.8,
      duration: 1.2,
      ease: "parallax",
    },
    0,
  );

  tl.fromTo(
    current,
    {
      y: "0vh",
    },
    {
      y: "-25vh",
      duration: 1.2,
      ease: "parallax",
    },
    0,
  );

  tl.set(transitionDark, {
    autoAlpha: 0,
  });

  return tl;
}

function runPageEnterAnimation(next) {
  var tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    tl.call(
      function () {
        if (hasScrollTrigger) ScrollTrigger.refresh();
      },
      null,
      "pageReady",
    );
    return new Promise(function (resolve) {
      tl.call(resolve, null, "pageReady");
    });
  }

  tl.add("startEnter", 0);

  tl.set(next, {
    zIndex: 3,
  });

  tl.fromTo(
    next,
    {
      y: "100vh",
    },
    {
      y: "0vh",
      duration: 1.2,
      clearProps: "all",
      ease: "parallax",
    },
    "startEnter",
  );

  tl.call(
    function () {
      if (hasScrollTrigger) ScrollTrigger.refresh();
    },
    null,
    "startEnter+=0.9",
  );

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(function (resolve) {
    tl.call(resolve, null, "pageReady");
  });
}

// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter((data) => {
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
  applyThemeFrom(data.next.container);
});

barba.hooks.beforeLeave(() => {
  closeAllNavIIDrawers();
});

barba.hooks.afterLeave((data) => {
  destroyGlobalParallax();

  var leaving = data.current.container;
  destroyEleganceFor(leaving);
  destroyRevealsFor(leaving);
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(function (trigger) {
      var el = trigger.trigger;
      if (el instanceof Node && leaving.contains(el)) {
        trigger.kill();
      }
    });
  }
});

barba.hooks.afterEnter((data) => {
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
  debug: true, // Set to 'false' in production
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
initNavII();
initCaseWrapScroll(document);
initGlobalParallax();

// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    transition: "light",
  },
  dark: {
    transition: "dark",
  },
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector("[data-theme-transition]");
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
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
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth;
  let timer;
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

// -----------------------------------------
// YOUR FUNCTIONS GO BELOW HERE
// -----------------------------------------
