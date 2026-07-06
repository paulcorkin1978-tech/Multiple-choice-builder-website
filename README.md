# HSC Economics Quiz Builder

A browser-based tool for building, previewing, and exporting self-contained HSC Economics multiple-choice quizzes with animated supply/demand diagrams.

---

## Project Structure

```
Multiple-choice builder website/
├── builder.html              # Main quiz builder UI
├── quiz.html                 # Quiz player (loads exported JSON)
├── js/
│   ├── quiz-export.js        # Core: SVG diagram renderer + quiz player logic
│   └── diagrams/
│       ├── sc.js             # Single-curve (demand/supply shift) builder
│       ├── sd.js             # Supply & demand (price mechanism) builder
│       ├── pm.js             # Price mechanism builder
│       ├── table.js          # Table question builder
│       └── plain.js          # Plain text question builder
├── quiz-bank-demand.json     # Saved demand question bank
├── MC supply.csv             # Supply questions (import-ready CSV)
└── README.md
```

---

## Question Types

### `sc` — Single Curve (demand or supply shift)
Shows one curve. Can animate a shift (D1→D2 or S1→S2) with a directional arrow.

**Key JSON fields:**
```json
{
  "type": "sc",
  "curve": "demand",          // "demand" or "supply"
  "title": "Demand for apples",
  "yLabel": "Price ($kg)",
  "xLabel": "Quantity",
  "color": "#00ff11",         // curve colour
  "vUnit": 1,                 // price axis tick spacing
  "hUnit": 5,                 // quantity axis tick spacing
  "startFP": 5,               // starting grid position (price units)
  "startCS": 0,               // starting curve shift (grid units)
  "showEqLines": true,        // show equilibrium dotted lines
  "ansFP": 4,                 // answer price position
  "ansCS": 0,                 // answer curve shift (0=no shift, ±1=shift)
  "questionText": "...",
  "answers": ["A","B","C","D"],
  "correctIndex": 1
}
```

**Curve math:**
- Demand: `Q = 10 - P + ds*2` → at P=6, Q = 4 + 2*shift
- Supply: `Q = P - ss*2` → at P=4, Q = 4 + 2*shift
- Arrow sits at `gy(6)` for demand, `gy(4)` for supply, spanning from start to answer x-position
- 7px buffer at each arrow endpoint keeps it visually clear of the curves

### `sd` — Supply & Demand
Shows both curves together. Animates equilibrium intersection.

### `pm` — Price Mechanism
Shows supply and demand with a price line that can animate to equilibrium, or reveal a surplus/shortage bracket label.

**Key JSON fields (beyond sd fields):**
```json
{
  "type": "pm",
  "animatePrice": true,       // true (default): animate price to equilibrium
                              // false: fade-in surplus/shortage label only
  "startPrice": 5,            // starting price position (grid units)
  "dShift": 0,                // demand curve shift for answer state
  "sShift": 0                 // supply curve shift for answer state
}
```

### `table` — Table question
Displays a data table above the question.

```json
{
  "type": "table",
  "title": "",
  "headers": ["Year", "Price A $", "Price B $"],
  "rows": [["1","100","100"], ["2","100","95"]],
  "questionText": "...",
  "answers": ["A","B","C","D"],
  "correctIndex": 0
}
```

### `plain` — Plain text
No diagram, just question text and answers.

```json
{
  "type": "plain",
  "questionText": "...",
  "answers": ["A","B","C","D"],
  "correctIndex": 0
}
```

---

## Animation System (`quiz-export.js`)

The `mkSVG()` function generates all SVG diagrams inline (no external deps) for self-contained exported quizzes.

**Signature:**
```javascript
mkSVG(q, dA, sA, fpA, isAnimating, shiftDirD=0, shiftDirS=0, animT=0, showStaticBracket=false)
```

- `animT` runs 0→1 during animation
- Arrow opacity uses a 90% fade-in window: `animT<0.9 ? animT/0.9 : animT>0.95 ? (1-animT)/0.05 : 1`
- `showStaticBracket=true` triggers CSS `@keyframes labelFadeIn` for PM label-reveal mode (no price animation)

**PM `animatePrice=false` flow:**
- On answer reveal: `mkSVG(q, q.dShift, q.sShift, q.startPrice, false, 0, 0, 0, true)`
- Replay button also re-triggers the static bracket (no animation)
- CSS class `pm-label-reveal` on `<g>` wrapper re-triggers fade-in animation on each innerHTML insert

---

## Loading a Question Bank

1. Open `builder.html`
2. Click **Load Bank** and select your `.json` file — this loads all questions for review/edit
3. To **add** new questions to an already-loaded bank:
   - Build the new question using the builder form
   - Click **Add to Bank** (do NOT click New Bank, which resets)
   - Save/export the bank when done

---

## CSV Import Format

Supply/demand questions can be drafted in CSV for bulk import:

```
Question,A,B,C,D,Correct
"Question text here","Option A","Option B","Option C","Option D",B
```

`Correct` column uses letter (A/B/C/D). Import via the builder's CSV import feature.

---

## Known Issues / Pending Items

- **quiz-bank-demand.json Q6**: Diagram title shows "Demand for iPads" — should be "Demand for cinema tickets". Fix in builder.
- **quiz-bank-demand.json Q3/Q5**: Curve colours near-invisible (`#050505`, `#cfcece`). Worth updating.
- **quiz-bank-demand.json Q15**: Answer D has typo "An decrease" (should be "A decrease").
- **MC supply.csv Q15**: Answer options are placeholders — need filling in. Q6, Q11, Q15 need diagram setup in builder.
- **Q8, Q9 in supply CSV**: Table data is embedded in question text — needs table-type question setup in builder.

---

## Diagram Colour Tips

Avoid near-white or near-black colours — they disappear against the SVG background. Good choices: bright primaries, pastels with contrast. The colour picker in the builder gives a live preview.

---

## HSC Economics Notes

- **Movement along curve** = contraction/expansion (caused by price change)
- **Shift of curve** = increase/decrease in demand/supply (caused by non-price factors)
- Price mechanism: shortage → competition among buyers → price bid up → contraction in demand + expansion in supply → equilibrium restored
- Substitute goods: price of substitute ↑ → demand for good ↑ (increase/shift right)
- Complementary goods: price of complement ↑ → demand for good ↓ (decrease/shift left)
- Joint products (e.g. petrol/diesel): supply of one affects supply of the other
