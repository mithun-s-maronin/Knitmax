# Knitmax Exports

A single-page site for Knitmax Exports — knitwear manufacturing and export.

Static HTML, CSS and vanilla JavaScript. No build step, no framework, no
third-party requests at runtime.

```
index.html            markup + the inline SVG textile art
css/knitmax.css       design system, layout, motion
js/content.js         every factual detail on the site  ← edit this
js/knitmax.js         reveals, panel stacking, parallax, form
fonts/                Manrope (variable, self-hosted)
PLACEHOLDERS.md       what still needs real content
```

## Running it

Any static server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly over `file://`
also works, though the self-hosted font may not load in some browsers.

## Content

All copy that states a fact lives in `js/content.js` as a `TODO_` token. See
**PLACEHOLDERS.md** for the checklist and for the notes on which drafted copy
still needs review. No company figures, certifications or contact details were
invented.

## Design system

**Palette** — burnt orange `#E84912`, rich orange `#F45A1D`, warm coral
`#FF7954`, soft peach `#FFAA83`, warm cream `#FFF5EB`, deep espresso `#1D120E`,
soft brown `#74594F`.

Each panel carries a `data-theme` that sets its background, foreground, muted
and accent tokens, so scrolling moves through cream → orange → coral → espresso
rather than one flat colour.

**Type** — Manrope, self-hosted as a variable font (200–800). Display sizes run
to `clamp(3.4rem, 8vw, 9rem)` with tight leading and negative tracking; weight is
mixed deliberately (a light `<em>` inside a medium heading) rather than set bold
throughout.

**Imagery** — all textile visuals are hand-built SVG: jersey-loop and rib
pattern tiles, multi-stop gradients that read as fabric folds, draped cloth with
a scalloped hem, fabric bolts, folded stacks and yarn cones. They live in a
shared `<defs>` block at the top of `index.html`.

Every visual sits inside a `.mask` element. To swap in real photography, replace
the `<svg>` with an `<img>` — the reveal, hover and crop behaviour all come from
the mask, so no layout changes are needed.

## Motion

- **Panel stacking** — every panel is `position: sticky`, and the next rises
  over it with rounded shoulders while the outgoing one scales down, dims and
  blurs very slightly. This runs at all viewport sizes. Panels taller than the
  viewport (most sections on a phone) get a negative stick offset from JS, so
  they scroll fully and then pin by their *bottom* edge — otherwise their lower
  content would sit behind a pinned panel and be unreachable. Blur is reduced
  on small screens, where it is the expensive part of the effect.
- **Reveals** — headings rise out of an overflow mask line by line; images
  reveal with a `clip-path` wipe while scaling `1.09 → 1`.
- **Parallax** — capped at 14–30px over a full scroll range.
- **Hero pointer** — the cloth follows the cursor by at most 8px and 0.55°,
  desktop and fine pointers only.

Everything above is disabled under `prefers-reduced-motion: reduce`.

## Browser support

Modern evergreen browsers. Uses `clip-path`, `backdrop-filter`, CSS custom
properties, `svh` units and `IntersectionObserver`; where the observer is
missing, all content is shown immediately rather than hidden.

## Accessibility

- Landmarks, a single `h1`, and labelled form fields
- `role="img"` plus `aria-label` on every decorative SVG that carries meaning;
  purely ornamental ones are `aria-hidden`
- Keyboard-operable mobile menu with `aria-expanded`, Escape to close
- Visible `:focus-visible` outlines throughout
