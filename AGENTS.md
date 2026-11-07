# AGENTS

- `public/index.html` holds the whole homepage. The brand tokens are CSS variables in `:root`, and the dark theme comes from `prefers-color-scheme` or `data-theme`. Pastel bands (`.band`) always use plum text in both themes.
- `public/demo.js` is the only JavaScript on the page. It runs the hero demo with sample data and makes no network calls. Keep it under 15 KB.
- `public/fonts/` holds the font subsets, made with fontTools pyftsubset (Latin plus typographic punctuation).
- `tools/og.html` is the source for `public/og.png` (1200×630). Re-render it with a headless browser screenshot.
- Brand rules come from the brand kit: plum outlines and shadows, pill buttons, white text only on grape or plum, and about 1° of static rotation on stickers.
