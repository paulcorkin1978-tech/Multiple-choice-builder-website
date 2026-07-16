# Theory2Econ animated explainers — the recipe

How to build another one of these (quotas, subsidies, PPF, surplus…) without
re-learning what took a whole session to work out on the tariff explainer.

**Start every new explainer by saying to Claude:**

> Read `video/EXPLAINER-RECIPE.md` and `video/tariff-explainer.html`, then build
> the same thing for **quotas**, using the numbers in `banks/quotas.json`.

`tariff-explainer.html` *is* the template. Copy it and swap the stages — the
machinery underneath is generic.

---

## 1. The house style

| | |
|---|---|
| Canvas | fixed **1920 × 1080** stage, scaled to the window (`--s`) |
| Background | `#05050c` near-black, plus a radial vignette |
| Font | Nunito, weights 800/900 |
| Look | neon lines on dark, glow filters, no grey prose |

**The colour language is fixed. Never break it — the whole deck teaches through it:**

| Colour | Means | Hex |
|---|---|---|
| green | domestic supply / domestic production / domestic quantity | `#00e5c0` |
| pink | demand / consumers / total demand | `#ff5c8a` |
| yellow | world price · imports | `#ffd43b` |
| orange | the policy — tariff, quota, subsidy · price+policy | `#ff8c42` |

Cross-hatch patterns exist in all three of green / yellow / orange (`hatchG`,
`hatchY`, `hatchO`) for shaded revenue boxes.

---

## 2. Stage architecture

Everything is one declarative list. To build a new explainer, **you mostly just
rewrite `STAGES`**:

```js
{ cap:'Caption — toolbar only, never drawn on screen',
  show:  ['id','id'],      // revealed; the CURRENT stage's items burn full-neon
  replay:['id'],           // re-fire a tracer's draw-on (for re-highlights)
  set:   {'v-dom':'40,000'}, // readout panel values (flash on change)
  rows:  ['r-dom'] }       // reveal a readout panel row
```

- `show` is **cumulative** — everything from stages 0..N stays visible.
- Only the **current** stage's `show` items get `.hot` (full brightness);
  everything earlier settles back to `.on` (62%, or 85% for `.keep`).
- **Anything that must HIDE again cannot use `show`.** Drive it explicitly in
  `render()` (see the bars, the revenue boxes, the summary cards).

### Animation classes
| class | speed | use |
|---|---|---|
| `.draw` | 1.15s | standard line draw-on |
| `.trace` | 1.6s | tracer along a curve — the beat you narrate over |
| `.quick` | 0.7s | throwaway highlights (the P×Q edges) |
| `.slow` | 2.3s | closing full-curve tracers |
| `.rise` | 1.3s | the policy price line rising off the world price |

---

## 3. The geometry contract

Grid 0..10 on both axes. Supply `P=Q`, demand `P=10−Q`, crossing at (5,5).

```js
gx = q => 320 + q * 86     // 86px = one quantity unit
gy = p => 830 - p * 66     // 66px = one price unit
```

**Every shaded box must be drawn to scale so that `area = quantity × price`.**
This is what makes the diagram *prove* things instead of asserting them.
Always verify with a script before believing it:

```
172px wide × 132px tall  =  20,000 t × $200  =  $4,000,000
```

Scenario numbers come **from the quiz bank**, so the video and the quiz agree.
Tariffs = `banks/tariffs.json` (steel, world price $200, $200 tariff).
Quotas = `banks/quotas.json`. Subsidies = `banks/subsidies.json`.

---

## 4. TRAPS — read this before debugging anything

**1. SVG glow filters MUST be `filterUnits="userSpaceOnUse"`.**
This cost three rounds. With the default (`objectBoundingBox`), a **horizontal
or vertical line has a zero-thickness bounding box**, so the filter region
computes to zero and the element renders **completely invisible**. Diagonal
lines work fine — which makes it look like a colour or CSS bug. If some lines
show and others vanish, check their orientation first.

**2. Writes to this folder get truncated to the previous file's byte length.**
It has silently eaten `builder.html`'s script tags and 29 lines of `style.css`.
**After every save:** check byte count, check the file ends with `</html>`, and
run the script through `node --check`. A truncated `<script>` is a syntax error,
which kills the whole page silently. Safest: `rm` the file first, then write.

**3. The toolbar's `0 / 19` is hardcoded in the markup.**
It displays whether or not JavaScript runs. Never treat it as evidence the
script executed.

**4. CSS `filter` overrides the SVG `filter="url(#glow)"` attribute.**
So dim things with **opacity**, never with a CSS filter, or you kill the glow.

**5. iOS won't run JS in a mailed HTML attachment.** Black screen, no taps. The
file must be *served* over HTTP. Push it and view it at the live URL.

**6. Nothing renders before JS runs** — every `.el` starts at `opacity:0`, and
the grid and axis ticks are *built* by JS. Black screen = script didn't run.

---

## 5. Narrative rules (learned the hard way)

- **The diagram proves every claim.** If it isn't visible on screen, it doesn't
  belong on the slide. Macro effects (growth, inflation, retaliation) deserve
  their own slide, clearly marked as beyond the diagram.
- **Decomposition bars must only coexist when their sum is true.** Below the
  axis: green production + yellow imports = pink total demand. Clear them when
  the policy lands and bring them back once every component has moved —
  otherwise the picture contradicts itself mid-sequence.
- **Reveal cause before consequence.** Supply expands, demand contracts, *then*
  imports fall out as the residual — "squeezed from both ends".
- **No grey prose under the diagram.** Captions live in the data for the toolbar
  only. Coloured data labels (readings off the diagram) are fine.
- **Number the effects** 1,2,3,4 — each number takes its heading's colour.
- **Plain language beats jargon.** "Firms using it as an input", not
  "downstream firms". "Foreign firms", not "exporters" (a student reads
  "exporters" as *Australian* exporters).
- **Colour carries win/lose** so you don't have to say it: green revenue up,
  orange costs up, pink revenue/quantity down.
- Closing slide: generic, no scenario numbers, grouped **households → firms →
  government**, with firms bracketed **DOMESTIC / FOREIGN** (the two domestic
  groups pull in opposite directions — that's the point).

---

## 6. Controls & recording

`space` / click / `→` next · `←` back · `R` restart · **`H` hides the toolbar**

Record at **1920×1080 full-screen** for a pixel-exact master. Press H first.
Click-to-advance exists so you can narrate at your own pace — don't replace it
with auto-play.

---

## 7. Publishing

These live in `video/`, which **is** inside the repo, so pushing publishes them
to `theory2econ.com/video/<name>.html`. Nothing links to them and each carries
`<meta name="robots" content="noindex, nofollow">`, so they're reachable only by
typing the URL. That's deliberate: it's how you view them on a phone, and it's
the only real backup.

---

## 8. Notes for the next ones

**Quotas** (`banks/quotas.json`) — the price rises until the gap between demand
and domestic supply equals the quota. Importers get the *higher* domestic price,
so importer revenue can rise, fall or stay flat — the cars scenario lands on
exactly $12b either side, which is a gift of a teaching moment. A quota above
free-trade imports doesn't bind at all (the beef 140k case).

**Subsidies** (`banks/subsidies.json`) — supply shifts down by the subsidy;
**consumers still pay the world price** (this is the thing students get wrong).
Producers receive Pw + subsidy. Subsidy cost = subsidy × **new** domestic
output, not the increase. Shifts must be **even** grid steps or the S₂×D
crossing lands off-grid.

**Both** already have 20 verified questions with explanations — reuse those
numbers so the video and the quiz agree.
