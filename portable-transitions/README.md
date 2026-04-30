# Portable: Barba page transitions + GSAP text reveals

Extract from this repo for use in **any** bundler setup (Vite, Webpack, Next client component, etc.). Not Astro-specific.

## Dependencies

```bash
npm install @barba/core gsap lenis
```

**SplitText** (`gsap/SplitText`) is a **GSAP Club** plugin. Add it per GreenSock’s install docs for your bundler, or swap `copyReveal.ts` for your own reveal logic.

## Files to copy

| File | Role |
|------|------|
| `app.ts` | Barba + Lenis + enter/leave timelines + reveal lifecycle |
| `copyReveal.ts` | SplitText-based variants (`rotate`, `flicker`, `slide`) |
| `transitions.css` | Fullscreen scrim layer for leave transition |

Import paths: keep `app.ts` and `copyReveal.ts` in the same folder, or adjust the `./copyReveal` import.

## Required DOM (every full HTML page Barba loads)

1. **`body`** gets `data-barba="wrapper"`.
2. **Persistent UI** (e.g. `<nav>`) lives **inside** `body` but **outside** the Barba container so it is not replaced on navigation.
3. **Transition overlay** sits in `body`, next to the container:

```html
<div data-transition-wrap>
  <div data-transition-dark></div>
</div>
```

4. **Swapped content** is a single root with `data-barba="container"`:

```html
<div data-barba="container" data-barba-namespace="home">
  <!-- page content -->
</div>
```

Link to other pages with plain `<a href="/other">` (same wrapper + container structure on each document). Optionally add `data-barba-prevent` on links that should do a full reload.

## Optional: nav sync without re-mounting

If `<nav>` stays outside the container, mark pairs of nodes in **nav** and in each **incoming** HTML document with `data-barba-update` in the **same order**. On navigation, `app.ts` copies `aria-current`, `class`, `href`, and `innerHTML` from the next page’s nav fragment into the live DOM.

## Text reveals (markup)

Elements that should animate must be in the fetched HTML and carry:

- `data-copy-wrapper` on the element you pass to the registry (usually a wrapper).
- Optional: `data-copy-variant="rotate" | "flicker" | "slide"` (default `rotate`).
- Optional: `data-copy-split="chars" | "words" | "lines"` (default `chars`).
- Optional: `data-copy-delay="0.2"` (seconds).

If the wrapper has **child** elements, each child is revealed separately. If it has **no** children, the wrapper’s own text is split.

Example:

```html
<div
  data-copy-wrapper
  data-copy-variant="rotate"
  data-copy-split="chars"
>
  <h1>Line one<br />Line two</h1>
</div>
```

Lifecycle (handled in `app.ts`):

- **beforeEnter**: destroy old reveal state, `SplitText` init for new container (manual mode, no auto-play).
- **afterEnter**: `play()` for elements already in view; `ScrollTrigger` for below-the-fold.

## Boot

```ts
import { initApp } from "./app";

initApp({
  debug: false, // Vite: import.meta.env.DEV
});
```

Call **once** after DOM is ready (e.g. `type="module"` script at end of `body`).

## `prefers-reduced-motion`

Leave/enter timelines shorten to opacity fades; refresh your own reduced-motion rules for copy reveals if you need stricter behavior.

## Customisation

- Timings / easing: `runPageLeaveAnimation`, `runPageEnterAnimation`, `CustomEase.create` in `app.ts`.
- Disable smooth scroll: set `hasLenis = false` and remove Lenis wiring in `initLenis` / hooks.
- No overlay: omit `[data-transition-wrap]`; leave falls back to a simple fade on the outgoing container.
