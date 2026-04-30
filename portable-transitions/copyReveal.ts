import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

export type CopyVariant = "rotate" | "flicker" | "slide";
export type CopySplitType = "chars" | "words" | "lines";

export interface CopyRevealOptions {
  variant?: CopyVariant;
  splitType?: CopySplitType;
  animateOnScroll?: boolean;
  delay?: number;
  /**
   * When true, sets the initial hidden state but does NOT auto-create a
   * ScrollTrigger or auto-play. Caller drives play() / attachScrollTrigger()
   * once the container has settled into its natural layout (e.g. after a
   * Barba page-enter animation completes).
   */
  manual?: boolean;
}

export interface CopyRevealHandle {
  destroy: () => void;
  play: () => void;
  isInView: () => boolean;
  attachScrollTrigger: (start?: string) => void;
}

/**
 * Text reveals — GSAP SplitText + ScrollTrigger.
 * Returns a handle with destroy/play/isInView for SPA teardown + manual triggering.
 */
export function initCopyReveal(
  container: Element | string,
  options: CopyRevealOptions = {},
): CopyRevealHandle {
  const {
    variant = "rotate",
    splitType = "chars",
    animateOnScroll = true,
    delay = 0,
    manual = false,
  } = options;

  const root =
    typeof container === "string"
      ? document.querySelector<HTMLElement>(container)
      : (container as HTMLElement);

  const noop = () => {};
  if (!root)
    return {
      destroy: noop,
      play: noop,
      isInView: () => false,
      attachScrollTrigger: noop,
    };

  const scrollTriggers: ScrollTrigger[] = [];
  let pausedTween: gsap.core.Tween | gsap.core.Timeline | null = null;
  const tweenTargets: Element[] = [];

  let elements: HTMLElement[];
  if (root.hasAttribute("data-copy-wrapper") && root.children.length > 0) {
    elements = Array.from(root.children) as HTMLElement[];
  } else {
    elements = [root];
  }

  const splits: SplitText[] = [];

  let played = false;
  let revealPlay: () => void = () => {};

  function play() {
    if (played) return;
    played = true;
    revealPlay();
  }

  function isInView() {
    if (!root) return false;
    const rect = root.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function addScrollTrigger(config: ScrollTrigger.Vars) {
    const st = ScrollTrigger.create(config);
    scrollTriggers.push(st);
    return st;
  }

  let defaultTriggerStart = "top 90%";

  function attachScrollTrigger(start?: string) {
    if (played || !root) return;
    addScrollTrigger({
      trigger: root,
      start: start ?? defaultTriggerStart,
      once: true,
      onEnter: () => play(),
    });
  }

  if (variant === "rotate") {
    const allTargets: Element[] = [];

    elements.forEach((element) => {
      if (splitType === "lines") {
        const split = SplitText.create(element, {
          type: "lines",
          linesClass: "copy-line",
        });
        splits.push(split);
        allTargets.push(...split.lines);
      } else if (splitType === "words") {
        const split = SplitText.create(element, {
          type: "words",
          wordsClass: "copy-word",
        });
        splits.push(split);
        allTargets.push(...split.words);
      } else {
        const split = SplitText.create(element, {
          type: "words,chars",
          wordsClass: "copy-word",
          charsClass: "copy-char",
        });
        splits.push(split);
        split.words.forEach((word) => {
          allTargets.push(...(word as HTMLElement).querySelectorAll(".copy-char"));
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

    tweenTargets.push(...allTargets);

    const playRotateReveal = () => {
      const tl = gsap.timeline();

      if (splitType === "lines") {
        tl.to(allTargets, {
          delay,
          rotationX: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.05,
        });
      } else if (splitType === "words") {
        tl.to(allTargets, {
          delay,
          rotationX: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: { each: 0.035, from: "random" },
        });
      } else {
        const allWords: { chars: Element[] }[] = [];
        splits.forEach((split) => {
          split.words.forEach((word) => {
            allWords.push({
              chars: Array.from(
                (word as HTMLElement).querySelectorAll(".copy-char"),
              ),
            });
          });
        });

        allWords.forEach(({ chars }) => {
          const wordTl = gsap.timeline().to(chars, {
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
    };

    revealPlay = () => {
      playRotateReveal();
    };

    defaultTriggerStart = "top 90%";

    if (manual) {
      // caller drives play() / attachScrollTrigger()
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  if (variant === "flicker") {
    const allChars: Element[] = [];

    elements.forEach((element) => {
      const split = SplitText.create(element, {
        type: "chars",
        charsClass: "copy-char",
      });
      splits.push(split);
      allChars.push(...split.chars);
    });

    gsap.set(allChars, { opacity: 0 });
    tweenTargets.push(...allChars);

    const flickerAnimation = gsap.to(allChars, {
      delay,
      duration: 0.05,
      opacity: 1,
      ease: "power2.inOut",
      stagger: { amount: 0.5, each: 0.1, from: "random" },
      paused: true,
    });

    pausedTween = flickerAnimation;
    revealPlay = () => {
      flickerAnimation.play();
    };

    defaultTriggerStart = "top 85%";

    if (manual) {
      // caller drives play() / attachScrollTrigger()
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  if (variant === "slide") {
    gsap.set(elements, { y: 50, opacity: 0 });

    const slideAnimation = gsap.to(elements, {
      delay,
      y: 0,
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.1,
      paused: true,
    });

    pausedTween = slideAnimation;
    revealPlay = () => {
      slideAnimation.play();
    };

    defaultTriggerStart = "top 90%";

    if (manual) {
      // caller drives play() / attachScrollTrigger()
    } else if (animateOnScroll) {
      attachScrollTrigger();
    } else {
      play();
    }
  }

  function destroy() {
    scrollTriggers.forEach((st) => st.kill());
    scrollTriggers.length = 0;

    if (pausedTween) {
      pausedTween.kill();
      pausedTween = null;
    }

    gsap.killTweensOf([...elements, ...tweenTargets]);
    splits.forEach((split) => {
      try {
        split.revert();
      } catch {
        /* DOM may already be gone */
      }
    });
    splits.length = 0;
  }

  return { destroy, play, isInView, attachScrollTrigger };
}

export default initCopyReveal;
