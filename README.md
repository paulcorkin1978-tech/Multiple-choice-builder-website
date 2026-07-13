# Economics Quiz Builder

A browser-based tool for building, previewing, and exporting self-contained Economics multiple-choice quizzes with animated supply/demand diagrams.

---

## How to Save My Work (backups)

This project uses **git** to keep a history of every saved version, so you can always roll back if something breaks. Your work also lives in OneDrive, but git is the proper safety net.

**After you've made changes you want to keep**, open a terminal in this folder and run these three commands:

```
git add -A
git commit -m "short note about what changed"
git push origin main
```

- `git add -A` — gathers up every file you changed.
- `git commit -m "..."` — saves a snapshot to your local history. Replace the text in quotes with a quick note, e.g. `"Fixed demand quiz colours"`.
- `git push origin main` — uploads the snapshot to your GitHub backup. The first time, GitHub may ask you to sign in.

**Don't want to use the terminal?** GitHub Desktop or the Source Control tab in VS Code do the same thing with buttons: you type a summary, click **Commit**, then click **Push**.

**Rule of thumb:** commit whenever you finish a chunk of work you'd be annoyed to lose. Small, frequent saves are better than one giant one.

---

## Project Structure

```
Multiple-choice builder website/
├── index.html                # Landing page (student / teacher portals)
├── student.html              # Student portal — links to quizzes/
├── teacher.html              # Teacher portal — links to builder.html
├── builder.html              # Main quiz builder UI
├── css/style.css
├── js/
│   ├── utils.js              # Shared constants + SVG renderers (buildSVGInner, pedInner, surInner)
│   ├── app.js                # Navigation, quiz list, save/load, import, download
│   ├── quiz-export.js        # Builds the self-contained exported quiz (player + diagrams)
│   └── diagrams/
│       ├── sc.js             # Single curve (demand or supply shift)
│       ├── sd.js             # Supply & demand
│       ├── pm.js             # Price mechanism (surplus / shortage)
│       ├── ppf.js            # Production possibility frontier
│       ├── tax.js            # Tax & subsidy
│       ├── ped.js            # Price elasticity of demand
│       ├── sur.js            # Consumer/producer surplus & deadweight loss
│       ├── table.js          # Table question
│       └── plain.js          # Plain text question
├── banks/                    # Saved question banks (.json) — load via "Load Question Bank"
├── quizzes/                  # Exported, self-contained quiz HTML files
└── README.md
```

### Export modes

Downloading a quiz produces one of two versions, set by the **Student self-study mode**
checkbox on the builder menu:

- **unticked (classroom)** — wrong answers can be retried until correct; everyone finishes on 100%.
  Good for projecting at the front of a room. → `economics-quiz.html`
- **ticked (self-study)** — the first answer is locked in, the correct answer is shown, and the
  score reflects what the student actually got right. → `economics-quiz-selfstudy.html`

Every exported quiz also has **Student PDF** and **Teacher PDF** buttons that print a
worksheet (≈3 questions per page); the teacher copy marks the correct answers.

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

All question banks were audited and are currently clean: valid JSON, no blank or duplicate
answers, every correct-answer index in range, and all lettered surplus answers verified
against the diagram geometry.

Resolved (kept here so the history is clear):

- ~~quiz-bank-demand.json Q6 title said "Demand for iPads"~~ — now correctly "Demand for cinema tickets".
- ~~quiz-bank-demand.json Q15 answer typo "An decrease"~~ — no longer present; the placeholder
  option labels ("Option A"…) were replaced with "Row A"…"Row D". Correct answer is Row B
  (substitute's price falls **and** complement's price rises → demand decreases).
- ~~Pale curve colours~~ — demand Q2, Q12, Q14 and supply Q10 were bright yellows that
  disappeared on white; replaced with darker, readable equivalents.

Still outstanding:

- **MC supply.csv**: Q15 answer options are placeholders. Q6, Q11, Q15 need diagram setup in the builder.
- **MC supply.csv Q8, Q9**: Table data is embedded in question text — needs table-type question setup.
- **landing.html** duplicates `index.html` — decide which is the real front page.

---

## Diagram Colour Tips

Curves are drawn on a **white** background, so the rule is: avoid **light** colours.
Bright yellows and pale greens (`#fbff00`, `#bdf71d`, `#f3eb12`) effectively vanish.
Dark colours — including black — read perfectly well, which is why the surplus banks use
black demand and supply curves. Aim for a colour with low luminance; the builder's colour
picker gives a live preview.

---

## Economics Notes

- **Movement along curve** = contraction/expansion (caused by price change)
- **Shift of curve** = increase/decrease in demand/supply (caused by non-price factors)
- Price mechanism: shortage → competition among buyers → price bid up → contraction in demand + expansion in supply → equilibrium restored
- Substitute goods: price of substitute ↑ → demand for good ↑ (increase/shift right)
- Complementary goods: price of complement ↑ → demand for good ↓ (decrease/shift left)
- Joint products (e.g. petrol/diesel): supply of one affects supply of the other
