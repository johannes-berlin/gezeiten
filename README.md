# Gezeiten Web

Code-Layer für die Gezeiten Studio Website. Webflow für Struktur/CMS/Styling, dieses Repo für JS-Logik (Barba Page Transitions, GSAP Animationen).

**Setup-Style:** Osmo-Boilerplate. Eine JS-Datei, kein Build-Step, alle Libraries via Webflow CDN.

---

## Stack

- **Webflow** — Struktur, CMS, Styling (Lumos Framework)
- **Barba.js** — Page Transitions (über CDN in Webflow)
- **GSAP** + CustomEase, ScrollTrigger — über CDN
- **Lenis** — Smooth Scroll, über CDN
- **Netlify** + **GitHub** — `main.js` wird als Static File ausgeliefert

---

## Branch-Strategie

| Branch | Netlify-Kontext | URL |
|---|---|---|
| `main` | Production | `gezeiten.netlify.app/main.js` |
| `develop` | Branch Deploy | `develop--gezeiten.netlify.app/main.js` |
| `feature/*` | Deploy Preview | per PR generiert |

---

## Webflow Integration

### 1. Libraries einbinden

**Project Settings → Custom Code → Footer Code:**

```html
<!-- GSAP Core + Plugins -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/CustomEase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/SplitText.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Flip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Draggable.min.js"></script>

<!-- Lenis Smooth Scroll -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>

<!-- Barba.js -->
<script src="https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.js"></script>

<!-- Gezeiten Main Script -->
<script src="https://gezeiten.netlify.app/main.js"></script>
```

> **Hinweis SplitText:** Ist seit GSAP 3.13 kostenlos (Anthropic-Update prüfen falls neuere Version genutzt wird). Falls du SplitText nicht brauchst, kannst du das Script entfernen.

### 2. Barba Container Markup

In Webflow am Body-Tag (Settings → Custom Attributes):
- `data-barba="wrapper"`

Am Main-Tag pro Page:
- `data-barba="container"`
- `data-barba-namespace="home"` (bzw. `work`, `about`, `case`, etc.)
- Optional: `data-page-theme="dark"` für Dark-Sektionen

### 3. Transition-Layer Markup

Diese Elemente liegen **außerhalb** des Barba-Containers (am besten direkt unter dem Body, vor dem Wrapper):

```html
<div data-transition-wrap data-theme-transition="light">
  <div data-transition-dark></div>
</div>
```

**CSS dafür (in Webflow als Embed oder global):**

```css
[data-transition-wrap] {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1; /* JS bumpt auf 2 während Transition */
}

[data-transition-dark] {
  position: absolute;
  inset: 0;
  background-color: #000;
  opacity: 0;
}
```

### 4. Nav Theme Switching

Am Nav-Element:
- `data-theme-nav="dark"` oder `"light"`

Das Theme wird automatisch basierend auf `data-page-theme` am Container umgeschaltet (siehe `themeConfig` in `main.js`).

### 5. Aria-Current Sync (Nav)

An jedem Nav-Link, der den Active-State zeigen soll:
- `data-barba-update`

Barba übernimmt dann automatisch die `aria-current` und Klassen vom neuen Page-DOM beim Wechsel.

---

## Page Transition Detail

**Parallax Slide:**

1. User klickt Link
2. **Leave (1.2s, parallel)**:
   - Current Page geht von `y: 0vh` → `y: -25vh` (langsamer als enter — Parallax-Effekt)
   - Dark Overlay fadet von `0` → `0.8` Opacity
3. **Enter (1.2s, parallel zu Leave)**:
   - Next Page kommt von `y: 100vh` → `y: 0vh`
4. Cleanup: Dark Overlay zurück auf `0`, alle Inline-Styles entfernt

Custom Ease: `"0.7, 0.05, 0.13, 1"` (sanfter Decel mit kurzem Anlauf).

**Reduced Motion:** Springt direkt um, keine Animation.

---

## Lokale Entwicklung

Da kein Build-Step existiert, einfachste Methode:

```bash
# Im Repo
npx serve . --cors
```

Dann in Webflow den `main.js` Script-Tag temporär auf `http://localhost:3000/main.js` setzen.

**Alternativen:**
- **ngrok:** Wenn du auf der echten Webflow-Staging-Domain testen willst
- **Chrome DevTools Local Overrides:** Production-URL überschreiben mit lokaler Datei

---

## Deployment

Netlify ist mit dem Repo verbunden — Push → Live.

**First-time Setup:**
1. Netlify → Add new site → Import from GitHub → `gezeiten-web`
2. Build Command: leer lassen
3. Publish directory: `.` (Root)
4. Optional: Custom Domain `cdn.gezeiten.studio` für saubere URL

---

## Dein Workflow innerhalb von `main.js`

Drei Funktions-Slots am Anfang der Datei:

- **`initOnceFunctions()`** — läuft einmal beim ersten Page-Load (Nav, Cursor, Lenis)
- **`initBeforeEnterFunctions(next)`** — läuft bevor die neue Page einblendet
- **`initAfterEnterFunctions(next)`** — läuft nachdem die Transition fertig ist (Reveals, Page-Animationen, ScrollTrigger refresh)

Pattern:

```js
function initAfterEnterFunctions(next) {
  nextPage = next || document;

  if (has('[data-home="hero"]')) initHomeHero();
  if (has('[data-reveal]')) initReveal();
  if (has('[data-work="card"]')) initWorkCards();

  if (hasLenis) lenis.resize();
  if (hasScrollTrigger) ScrollTrigger.refresh();
}

// ...further down in "YOUR FUNCTIONS GO BELOW HERE":

function initHomeHero() {
  const hero = nextPage.querySelector('[data-home="hero"]');
  // ... GSAP timeline
}
```

**Wichtig:** Page-spezifische Funktionen IMMER mit `nextPage.querySelector(...)` arbeiten, nicht `document.querySelector(...)` — sonst greifst du auf das alte DOM während der Transition zu.

---

## Roadmap

- [ ] Barba Container Setup in Webflow (alle Pages)
- [ ] Transition-Layer im Webflow-Body einbauen
- [ ] Custom Code Snippet im Webflow Footer
- [ ] Hero-Animation Home
- [ ] Reveal-System (`data-reveal`)
- [ ] Custom Cursor
- [ ] Work-Page Card-Hover & Filter

---

## Owner

Gezeiten Studio — Johannes Berlin
