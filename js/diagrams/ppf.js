// ── PPF BUILDER ───────────────────────────────────────────────────────────────
// Handles state and logic for the Production Possibility Frontier builder.
// Supports two diagram modes:
//   'curved'   — smooth quarter-ellipse arc, shifted in/out for animation
//   'schedule' — up to 8 user-defined (x, y) data points connected by a line
//
// Depends on: utils.js (GRID, W, H, PAD, gxF, gyF)
//             app.js   (quizQuestions, renderList, buildQuizHTML)

// ── STATE ─────────────────────────────────────────────────────────────────────
// Curved mode keeps a SEPARATE shift per intercept, so the frontier can either
// shift as a whole (general growth) or pivot on one axis with the other fixed
// (e.g. better technology in one industry only) — a common interpretation question.
let ppfShiftX  = 0;        // Target discrete shift (-2 to +2) of the x-intercept
let ppfShiftY  = 0;        // Target discrete shift (-2 to +2) of the y-intercept
let ppfShiftXA = 0;        // Current animated value (x)
let ppfShiftYA = 0;        // Current animated value (y)
let ppfShiftAxis = 'both'; // 'both' | 'x' | 'y' — which intercept the shift buttons move
let ppfCap    = null;      // Captured answer snapshot
let ppfAnim   = null;      // Active rAF handle
let ppfMode   = 'linear';  // 'linear', 'curved' or 'schedule'

// ── LINEAR PPF (constant opportunity cost) ────────────────────────────────────
// The teacher picks the x-intercept (max of good X, in gridlines) and the
// opportunity cost (whole gridlines of Y given up per gridline of X). The
// y-intercept is DERIVED as xInt * oc, so the line always passes through a grid
// corner at every x gridline — which is what makes opportunity cost readable.
// Real-world values come from the axis intervals: max X = xInt*hUnit,
// max Y = xInt*oc*vUnit, and 1 unit of X costs (oc*vUnit/hUnit) units of Y.
// Intercepts step in multiples of PPF_STEP_INT (3, 6, 9). Because both are then
// multiples of 3, gcd(xInt,yInt) is always >= 3, so the frontier ALWAYS meets at
// least 4 grid corners (both end points plus two in between) — enough for students
// to read off production combinations. Still gives 7 distinct grid slopes
// (1/3, 1/2, 2/3, 1, 1.5, 2, 3), and the real opportunity cost is set by the
// axis intervals, so it is not restricted at all.
const PPF_STEP_INT = 3;
let ppfXInt = 6;           // PPF1 x-intercept in gridlines (3, 6 or 9); GRID is 9
let ppfYInt = 9;           // PPF1 y-intercept in gridlines (3, 6 or 9)

// Optional second frontier. Because PPF2's intercepts also step in 3s, BOTH lines
// keep the >=4 grid-corner guarantee — so students can read production combinations
// off either one. Moving just one intercept gives a single-axis pivot (e.g. better
// technology in good X only); moving both gives general growth.
let ppfLinShift = false;   // linear mode shows PPF1 -> PPF2?
let ppfXInt2 = 9;          // PPF2 x-intercept
let ppfYInt2 = 9;          // PPF2 y-intercept

// Greatest common divisor — decides where the frontier meets grid corners.
function ppfGcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

// The frontier from (0,yInt) to (xInt,0) passes through exactly gcd(xInt,yInt)+1
// grid corners. Returns them in gridline coordinates — these are the readable
// production combinations students use to work out opportunity cost.
function ppfCorners(xInt, yInt) {
  const g = ppfGcd(xInt, yInt), out = [];
  for (let k = 0; k <= g; k++) out.push({ x: k * xInt / g, y: yInt - k * yInt / g });
  return out;
}

// Steppers move in multiples of 3, so every reachable pair is guaranteed readable.
function ppfStepXInt(dir)  { ppfXInt  = Math.min(9, Math.max(3, ppfXInt  + dir * PPF_STEP_INT)); ppfDraw(); }
function ppfStepYInt(dir)  { ppfYInt  = Math.min(9, Math.max(3, ppfYInt  + dir * PPF_STEP_INT)); ppfDraw(); }
function ppfStepXInt2(dir) { ppfXInt2 = Math.min(9, Math.max(3, ppfXInt2 + dir * PPF_STEP_INT)); ppfDraw(); }
function ppfStepYInt2(dir) { ppfYInt2 = Math.min(9, Math.max(3, ppfYInt2 + dir * PPF_STEP_INT)); ppfDraw(); }

// Toggles the second frontier on/off and shows its steppers.
function ppfToggleLinShift() {
  const cb = document.getElementById('ppfLinShift');
  ppfLinShift = !!(cb && cb.checked);
  const row = document.getElementById('ppfLinShiftControls');
  if (row) row.style.display = ppfLinShift ? '' : 'none';
  ppfDraw();
}

// Curved PPF: radius = PPF_BASE + shift * PPF_STEP (in grid units, range 2–8)
const PPF_BASE = 5;
const PPF_STEP = 1.5;

function ppfR(s) { return PPF_BASE + s * PPF_STEP; }

// ── NICE TICKS ────────────────────────────────────────────────────────────────
// Returns an array of evenly-spaced, human-readable tick values from 0 to max.
// e.g. ppfNiceTicks(100) → [0, 20, 40, 60, 80, 100]
//      ppfNiceTicks(50)  → [0, 10, 20, 30, 40, 50]
//      ppfNiceTicks(9)   → [0, 2, 4, 6, 8]
function ppfNiceTicks(max) {
  if (!max || max <= 0) return [0];
  const raw   = max / 5;
  const mag   = Math.pow(10, Math.floor(Math.log10(raw)));
  const n     = raw / mag;
  const step  = (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = 0; v <= max * 1.001; v += step) {
    ticks.push(Math.round(v * 1e9) / 1e9);
    if (ticks.length > 20) break;
  }
  return ticks.filter(t => t <= max * 1.001);
}

// Rounds a raw data maximum up to the nearest "nice" step boundary.
// e.g. ppfNiceMax(95) → 100,  ppfNiceMax(43) → 50,  ppfNiceMax(8) → 8
function ppfNiceMax(dataMax) {
  if (!dataMax || dataMax <= 0) return 9;
  const raw  = dataMax / 5;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n    = raw / mag;
  const step = (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * mag;
  return Math.ceil(dataMax / step) * step;
}

// ── SCHEDULE DATA ─────────────────────────────────────────────────────────────
// Returns array of 8 { x, y } raw string objects from the schedule input fields.
function ppfGetSchedulePoints() {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const xe = document.getElementById('ppfPx' + i);
    const ye = document.getElementById('ppfPy' + i);
    pts.push({ x: xe ? xe.value.trim() : '', y: ye ? ye.value.trim() : '' });
  }
  return pts;
}

// Auto-computes xMax and yMax from the largest values in the entered data.
// Returns { xMax, yMax } where both are null if no valid data has been entered.
function ppfGetAutoScale() {
  const raw = ppfGetSchedulePoints()
    .filter(p => p.x !== '' && p.y !== '')
    .map(p => ({ x: parseFloat(p.x), y: parseFloat(p.y) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x >= 0 && p.y >= 0);
  if (!raw.length) return { xMax: null, yMax: null };
  return {
    xMax: ppfNiceMax(Math.max(...raw.map(p => p.x))),
    yMax: ppfNiceMax(Math.max(...raw.map(p => p.y)))
  };
}

// Normalises valid schedule points to grid coordinates (0–9) using auto-scale.
function ppfValidPoints() {
  const raw = ppfGetSchedulePoints()
    .filter(p => p.x !== '' && p.y !== '')
    .map(p => ({ x: parseFloat(p.x), y: parseFloat(p.y) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x >= 0 && p.y >= 0);
  if (!raw.length) return [];
  const xMax = ppfNiceMax(Math.max(...raw.map(p => p.x)));
  const yMax = ppfNiceMax(Math.max(...raw.map(p => p.y)));
  return raw
    .map(p => ({ x: p.x * 9 / xMax, y: p.y * 9 / yMax }))
    .filter(p => p.x >= 0 && p.x <= GRID && p.y >= 0 && p.y <= GRID)
    .sort((a, b) => a.x - b.x);
}

// ── SVG BUILDER ───────────────────────────────────────────────────────────────
// Generates SVG inner markup for the PPF builder canvas.
function ppfBuildSVG(shiftA, isAnimating) {
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const gx = q => gxF(q, PAD, W);
  const gy = p => gyF(p, PAD, H);
  const fs = 11, fs2 = 9;

  const title     = document.getElementById('ppfTitle').value;
  const xLbl      = document.getElementById('ppfXLbl').value  || 'Good A';
  const yLbl      = document.getElementById('ppfYLbl').value  || 'Good B';
  const col       = document.getElementById('ppfCol').value;
  const showFaded = document.getElementById('ppfShowFaded').checked;
  const hideGrid  = !!(document.getElementById('ppfHideGrid') && document.getElementById('ppfHideGrid').checked);
  const hideNums  = !!(document.getElementById('ppfHideNums') && document.getElementById('ppfHideNums').checked);

  // ── Base SVG: arrow marker ──
  let s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;

  // Title
  if (title) s += `<text x="${W/2}" y="13" text-anchor="middle" font-size="${fs}" font-family="Verdana" font-weight="bold" fill="#2c2c2a">${title}</text>`;

  // Axes (drawn before mode-specific content so gridlines sit behind)
  s += `<line x1="${PAD.l}" y1="${H-PAD.b+6}" x2="${PAD.l}" y2="${PAD.t-6}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;
  s += `<line x1="${PAD.l-6}" y1="${H-PAD.b}" x2="${W-PAD.r+6}" y2="${H-PAD.b}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;

  // Axis name labels
  s += `<text x="${PAD.l+(W-PAD.l-PAD.r)/2}" y="${H-1}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#666">${xLbl}</text>`;
  s += `<text x="${fs2-1}" y="${PAD.t+(H-PAD.t-PAD.b)/2}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#666" transform="rotate(-90,${fs2-1},${PAD.t+(H-PAD.t-PAD.b)/2})">${yLbl}</text>`;

  if (ppfMode === 'linear') {
    // ── Linear: straight PPF, constant opportunity cost ──
    const vU   = parseFloat(document.getElementById('ppfVUnit').value) || 10;
    const hU   = parseFloat(document.getElementById('ppfHUnit').value) || 10;
    const yInt = ppfYInt;
    if (!hideGrid) {
      for (let i = 1; i <= GRID; i++) {
        s += `<line x1="${PAD.l}" y1="${gy(i)}" x2="${W-PAD.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
        s += `<line x1="${gx(i)}" y1="${PAD.t}" x2="${gx(i)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
      }
    }
    if (!hideNums) {
      for (let i = 1; i <= GRID; i++) {
        s += `<text x="${PAD.l-5}" y="${gy(i)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#888">${Math.round(i*vU*100)/100}</text>`;
        s += `<text x="${gx(i)}" y="${H-PAD.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${Math.round(i*hU*100)/100}</text>`;
      }
      s += `<text x="${PAD.l-5}" y="${H-PAD.b+11}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
    }
    // Draws one frontier (0,yI)→(xI,0) plus a dot at every grid corner it crosses.
    const frontier = function (xI, yI, colour, r) {
      let out = `<line x1="${gx(0)}" y1="${gy(yI)}" x2="${gx(xI)}" y2="${gy(0)}" stroke="${colour}" stroke-width="2.5" stroke-linecap="round"/>`;
      ppfCorners(xI, yI).forEach(function (p) {
        out += `<circle cx="${gx(p.x).toFixed(1)}" cy="${gy(p.y).toFixed(1)}" r="${r}" fill="${colour}" stroke="#fff" stroke-width="1.2"/>`;
      });
      return out;
    };
    // Label sits ON the line at fraction t from the y-intercept. Using different t
    // for PPF1/PPF2 keeps them apart even on a single-axis pivot, where the two
    // lines converge at the unmoved intercept.
    const flabel = function (xI, yI, t, text, colour) {
      const px = xI * t, py = yI * (1 - t);
      return `<text x="${(gx(px)+7).toFixed(1)}" y="${(gy(py)-7).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${colour}" font-weight="bold" stroke="#fff" stroke-width="3" paint-order="stroke">${text}</text>`;
    };
    if (ppfLinShift) {
      s += frontier(ppfXInt,  ppfYInt,  '#999', 2.6);          // PPF1 (original)
      s += frontier(ppfXInt2, ppfYInt2, col,    3.2);          // PPF2 (after)
      s += flabel(ppfXInt,  ppfYInt,  0.70, 'PPF1', '#999');   // low, toward its x-end
      s += flabel(ppfXInt2, ppfYInt2, 0.35, 'PPF2', col);      // high, toward its y-end
    } else {
      s += frontier(ppfXInt, ppfYInt, col, 3.2);
      s += flabel(ppfXInt, ppfYInt, 0.5, 'PPF', col);
    }
  } else if (ppfMode === 'curved') {
    // ── Curved: GRID=9 background gridlines + "0" origin label ──
    if (!hideGrid) {
      for (let i = 1; i <= GRID; i++) {
        s += `<line x1="${PAD.l}" y1="${gy(i)}" x2="${W-PAD.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
        s += `<line x1="${gx(i)}" y1="${PAD.t}" x2="${gx(i)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
      }
    }
    if (!hideNums) s += `<text x="${PAD.l-4}" y="${H-PAD.b+11}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;

    // Each intercept has its own radius, so the frontier can pivot on one axis.
    const shifted = Math.abs(ppfShiftXA) > 0.05 || Math.abs(ppfShiftYA) > 0.05;

    // ── Faded original curve (only when shifted) ──
    if (showFaded && shifted) {
      const r0  = ppfR(0);
      const rx0 = r0 * cW / GRID, ry0 = r0 * cH / GRID;
      s += `<path d="M ${gx(0).toFixed(1)} ${gy(r0).toFixed(1)} A ${rx0.toFixed(1)} ${ry0.toFixed(1)} 0 0 1 ${gx(r0).toFixed(1)} ${gy(0).toFixed(1)}" stroke="${col}" fill="none" stroke-width="2" stroke-linecap="round" opacity="1"/>`;
      // PPF1 sits LOW (near its x-axis end); the active curve's label sits HIGH.
      // Keeping them at different angles stops them colliding on a one-axis pivot,
      // where the two curves meet at the unmoved intercept.
      const lx0 = r0 * 0.88, ly0 = r0 * 0.475;
      s += `<text x="${(gx(lx0)+5).toFixed(1)}" y="${gy(ly0).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${col}" opacity="1" font-weight="bold" stroke="#fff" stroke-width="3" paint-order="stroke">PPF1</text>`;
    }

    // ── Active curve: quarter-ellipse from (0, rY) to (rX, 0) ──
    const rX = ppfR(ppfShiftXA), rY = ppfR(ppfShiftYA);
    if (rX > 0.3 && rY > 0.3 && rX <= GRID + 1 && rY <= GRID + 1) {
      const rxp = rX * cW / GRID, ryp = rY * cH / GRID;
      s += `<path d="M ${gx(0).toFixed(1)} ${gy(rY).toFixed(1)} A ${rxp.toFixed(1)} ${ryp.toFixed(1)} 0 0 1 ${gx(rX).toFixed(1)} ${gy(0).toFixed(1)}" stroke="${col}" fill="none" stroke-width="2.5" stroke-linecap="round"/>`;
      const lbl = shifted ? 'PPF2' : 'PPF1';
      const lx  = rX * 0.45, ly = rY * 0.893;   // point on the ellipse, high up — clear of the PPF1 label
      s += `<text x="${(gx(lx)+5).toFixed(1)}" y="${gy(ly).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${col}" font-weight="bold" stroke="#fff" stroke-width="3" paint-order="stroke">${lbl}</text>`;
    }
  } else {
    // ── Schedule: derive scale from data, gridlines align with tick interval ──
    const { xMax, yMax } = ppfGetAutoScale();

    if (xMax !== null) {
      // ── Data-driven gridlines + tick labels ──
      const xTicks = ppfNiceTicks(xMax);
      const yTicks = ppfNiceTicks(yMax);

      xTicks.forEach(v => {
        const gxPos = gx(v * 9 / xMax);
        if (!hideGrid) s += `<line x1="${gxPos.toFixed(1)}" y1="${PAD.t}" x2="${gxPos.toFixed(1)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.6"/>`;
        if (!hideNums) {
          s += `<line x1="${gxPos.toFixed(1)}" y1="${H-PAD.b}" x2="${gxPos.toFixed(1)}" y2="${H-PAD.b+4}" stroke="#999" stroke-width="1"/>`;
          s += `<text x="${gxPos.toFixed(1)}" y="${H-PAD.b+13}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#666">${v}</text>`;
        }
      });

      yTicks.forEach(v => {
        const gyPos = gy(v * 9 / yMax);
        if (!hideGrid) s += `<line x1="${PAD.l}" y1="${gyPos.toFixed(1)}" x2="${W-PAD.r}" y2="${gyPos.toFixed(1)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.6"/>`;
        if (!hideNums) {
          s += `<line x1="${PAD.l-4}" y1="${gyPos.toFixed(1)}" x2="${PAD.l}" y2="${gyPos.toFixed(1)}" stroke="#999" stroke-width="1"/>`;
          s += `<text x="${(PAD.l-7)}" y="${gyPos.toFixed(1)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#666">${v}</text>`;
        }
      });

      // ── Plot points and connecting line ──
      const pts = ppfValidPoints();
      if (pts.length >= 2) {
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${gx(p.x).toFixed(1)} ${gy(p.y).toFixed(1)}`).join(' ');
        s += `<path d="${d}" stroke="${col}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        const last = pts[pts.length - 1];
        s += `<text x="${(gx(last.x)+6).toFixed(1)}" y="${gy(last.y).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${col}" font-weight="bold">PPF</text>`;
      }
      pts.forEach(p => {
        s += `<circle cx="${gx(p.x).toFixed(1)}" cy="${gy(p.y).toFixed(1)}" r="4.5" fill="${col}" stroke="white" stroke-width="1.5"/>`;
      });
    } else {
      // ── No data yet: blank grid with "0" origin ──
      if (!hideGrid) {
        for (let i = 1; i <= GRID; i++) {
          s += `<line x1="${PAD.l}" y1="${gy(i)}" x2="${W-PAD.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
          s += `<line x1="${gx(i)}" y1="${PAD.t}" x2="${gx(i)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
        }
      }
      if (!hideNums) s += `<text x="${PAD.l-4}" y="${H-PAD.b+11}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
    }
  }

  return s;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function ppfDraw(isAnimating = false) {
  const el = document.getElementById('ppfChart');
  if (!el) return;
  el.innerHTML = ppfBuildSVG(ppfShiftXA, isAnimating);
  // The buttons move whichever intercept(s) the axis selector targets, so the
  // limits are the tightest of the axes actually being moved.
  const lo = ppfShiftAxis === 'y' ? ppfShiftY : ppfShiftAxis === 'x' ? ppfShiftX : Math.min(ppfShiftX, ppfShiftY);
  const hi = ppfShiftAxis === 'y' ? ppfShiftY : ppfShiftAxis === 'x' ? ppfShiftX : Math.max(ppfShiftX, ppfShiftY);
  if (document.getElementById('ppfIn'))  document.getElementById('ppfIn').disabled  = lo <= -2;
  if (document.getElementById('ppfOut')) document.getElementById('ppfOut').disabled = hi >= 2;

  // ── Linear mode: stepper readouts + real-world opportunity cost strip ──
  const xv = document.getElementById('ppfXIntVal');  if (xv) xv.textContent = ppfXInt;
  const yv = document.getElementById('ppfYIntVal');  if (yv) yv.textContent = ppfYInt;
  const xv2 = document.getElementById('ppfXInt2Val'); if (xv2) xv2.textContent = ppfXInt2;
  const yv2 = document.getElementById('ppfYInt2Val'); if (yv2) yv2.textContent = ppfYInt2;
  const info = document.getElementById('ppfLinInfo');
  if (info && ppfMode === 'linear') {
    const vU = parseFloat(document.getElementById('ppfVUnit').value) || 10;
    const hU = parseFloat(document.getElementById('ppfHUnit').value) || 10;
    const xL = document.getElementById('ppfXLbl').value || 'Good A';
    const yL = document.getElementById('ppfYLbl').value || 'Good B';
    const rnd = n => Math.round(n * 1000) / 1000;
    const line = (xI, yI, tag) => `${tag}max ${xL}: ${rnd(xI*hU)} · max ${yL}: ${rnd(yI*vU)} · 1 ${xL} = ${rnd((yI*vU)/(xI*hU))} ${yL}`
      + ` <span style="color:#888">(${ppfCorners(xI, yI).length} grid corners)</span>`;
    if (ppfLinShift) {
      const moved = ppfXInt2 !== ppfXInt && ppfYInt2 !== ppfYInt ? 'both intercepts move'
                  : ppfXInt2 !== ppfXInt ? `only ${xL} moves — a pivot`
                  : ppfYInt2 !== ppfYInt ? `only ${yL} moves — a pivot`
                  : 'no shift yet — change a PPF2 intercept';
      info.innerHTML = line(ppfXInt, ppfYInt, 'PPF1 — ') + '<br>' + line(ppfXInt2, ppfYInt2, 'PPF2 — ')
        + `<br><span style="color:#888">${moved}</span>`;
    } else {
      info.innerHTML = line(ppfXInt, ppfYInt, '');
    }
  }
}

// ── SHIFT ANIMATION (curved mode only) ────────────────────────────────────────
// Selects which intercept the Inward/Outward buttons move.
function ppfSetShiftAxis(axis) {
  ppfShiftAxis = axis;
  ['both','x','y'].forEach(function (a) {
    const b = document.getElementById('ppfAxis_' + a);
    if (b) b.className = 'btn' + (a === axis ? ' btn-primary' : '');
  });
  ppfDraw();
}

function ppfShiftCurve(dir) {
  if (ppfAnim || ppfMode !== 'curved') return;
  const nx = ppfShiftAxis === 'y' ? ppfShiftX : ppfShiftX + dir;   // 'y' holds x fixed
  const ny = ppfShiftAxis === 'x' ? ppfShiftY : ppfShiftY + dir;   // 'x' holds y fixed
  if (nx < -2 || nx > 2 || ny < -2 || ny > 2) return;
  const fromX = ppfShiftXA, fromY = ppfShiftYA;
  ppfShiftX = nx; ppfShiftY = ny;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    ppfShiftXA = fromX + (nx - fromX) * e;
    ppfShiftYA = fromY + (ny - fromY) * e;
    ppfDraw(t < 1);
    if (t < 1) ppfAnim = requestAnimationFrame(step);
    else { ppfShiftXA = nx; ppfShiftYA = ny; ppfAnim = null; ppfDraw(); }
  }
  ppfAnim = requestAnimationFrame(step);
}

// ── SET MODE ──────────────────────────────────────────────────────────────────
function ppfSetMode(mode) {
  ppfMode = mode;
  const el = id => document.getElementById(id);
  if (el('ppfBtnLinear')) el('ppfBtnLinear').className = 'btn' + (mode === 'linear' ? ' btn-primary' : '');
  el('ppfBtnCurved').className = 'btn' + (mode === 'curved'   ? ' btn-primary' : '');
  el('ppfBtnSched').className  = 'btn' + (mode === 'schedule' ? ' btn-primary' : '');
  if (el('ppfLinearControls')) el('ppfLinearControls').style.display = mode === 'linear' ? '' : 'none';
  el('ppfShiftControls').style.display = mode === 'curved'   ? '' : 'none';
  el('ppfSchedSection').style.display  = mode === 'schedule' ? '' : 'none';
  if (el('ppfInfoLinear')) el('ppfInfoLinear').style.display = mode === 'linear' ? '' : 'none';
  el('ppfInfoCurved').style.display    = mode === 'curved'   ? '' : 'none';
  el('ppfInfoSched').style.display     = mode === 'schedule' ? '' : 'none';
  // A linear PPF is static — there is no shift to capture, so hide the capture card.
  if (mode === 'linear' && el('ppfCapCard')) el('ppfCapCard').style.display = 'none';
  ppfReset();
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function ppfReset() {
  if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
  ppfShiftX = 0; ppfShiftY = 0; ppfShiftXA = 0; ppfShiftYA = 0;
  ppfDraw();
}

// ── CAPTURE ───────────────────────────────────────────────────────────────────
function ppfCapture() {
  const card = document.getElementById('ppfCapCard');
  card.style.display = 'block';

  if (ppfMode === 'curved') {
    ppfCap = { mode: 'curved', shiftX: ppfShiftX, shiftY: ppfShiftY };
    // Animate back to origin
    if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
    const fromX = ppfShiftXA, fromY = ppfShiftYA;
    ppfShiftX = 0; ppfShiftY = 0;
    const start = performance.now(), dur = 500;
    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      ppfShiftXA = fromX * (1 - e);
      ppfShiftYA = fromY * (1 - e);
      ppfDraw(t < 1);
      if (t < 1) ppfAnim = requestAnimationFrame(step);
      else { ppfShiftXA = 0; ppfShiftYA = 0; ppfAnim = null; ppfDraw(); }
    }
    ppfAnim = requestAnimationFrame(step);
    const xL = document.getElementById('ppfXLbl').value || 'Good A';
    const yL = document.getElementById('ppfYLbl').value || 'Good B';
    const word = v => v > 0 ? 'outward' : v < 0 ? 'inward' : 'no shift';
    const desc = (ppfCap.shiftX === ppfCap.shiftY)
      ? `both intercepts ${word(ppfCap.shiftX)}`
      : `${xL} ${word(ppfCap.shiftX)} (${ppfCap.shiftX > 0 ? '+' : ''}${ppfCap.shiftX}), ${yL} ${word(ppfCap.shiftY)} (${ppfCap.shiftY > 0 ? '+' : ''}${ppfCap.shiftY})`;
    document.getElementById('ppfCapMsg').textContent =
      `✓ Answer captured (${desc}). Diagram reset — now write your question below.`;
  } else {
    const { xMax, yMax } = ppfGetAutoScale();
    ppfCap = { mode: 'schedule', points: ppfGetSchedulePoints(), xMax: xMax || 9, yMax: yMax || 9 };
    const n = ppfValidPoints().length;
    document.getElementById('ppfCapMsg').textContent =
      `✓ Schedule captured (${n} valid points). Now write your question below.`;
  }
}

// ── BUILD QUESTION ────────────────────────────────────────────────────────────
function ppfGetCorrect() {
  for (const r of document.querySelectorAll('input[name="ppfC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

function ppfBuildQ() {
  const q = {
    type:         'ppf',
    title:        document.getElementById('ppfTitle').value,
    xLabel:       document.getElementById('ppfXLbl').value  || 'Good A',
    yLabel:       document.getElementById('ppfYLbl').value  || 'Good B',
    color:        document.getElementById('ppfCol').value,
    ppfType:      ppfCap ? ppfCap.mode : ppfMode,
    questionText: document.getElementById('ppfQText').value,
    answers:      [0,1,2,3].map(i => document.getElementById('ppfA' + i).value),
    correctIndex: ppfGetCorrect(),
    hideGrid:     document.getElementById('ppfHideGrid').checked,
    hideNums:     document.getElementById('ppfHideNums').checked
  };
  if (q.ppfType === 'linear') {
    // Static frontier: no shift/answer to capture, the diagram is just read.
    q.xInt     = ppfXInt;
    q.yInt     = ppfYInt;
    q.linShift = ppfLinShift;
    if (ppfLinShift) { q.xInt2 = ppfXInt2; q.yInt2 = ppfYInt2; }
    q.vUnit    = parseFloat(document.getElementById('ppfVUnit').value) || 10;
    q.hUnit    = parseFloat(document.getElementById('ppfHUnit').value) || 10;
    q.ansShift = 0;
  } else if (q.ppfType === 'curved') {
    q.ansShiftX = ppfCap ? ppfCap.shiftX : ppfShiftX;
    q.ansShiftY = ppfCap ? ppfCap.shiftY : ppfShiftY;
    q.ansShift  = q.ansShiftX;   // kept for older exports that read a single shift
  } else {
    // Normalise stored points to grid coordinates for export
    const autoScale = ppfGetAutoScale();
    const xMax = ppfCap ? ppfCap.xMax : (autoScale.xMax || 9);
    const yMax = ppfCap ? ppfCap.yMax : (autoScale.yMax || 9);
    const raw  = ppfCap ? ppfCap.points : ppfGetSchedulePoints();
    q.schedulePoints = raw
      .filter(p => p.x !== '' && p.y !== '')
      .map(p => ({ x: parseFloat(p.x) * 9 / xMax, y: parseFloat(p.y) * 9 / yMax }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x >= 0 && p.x <= GRID && p.y >= 0 && p.y <= GRID)
      .sort((a, b) => a.x - b.x);
    q.xMax   = xMax;
    q.yMax   = yMax;
    q.xTicks = ppfNiceTicks(xMax);
    q.yTicks = ppfNiceTicks(yMax);
    q.ansShift = 0;
  }
  return q;
}

// ── ADD TO QUIZ ───────────────────────────────────────────────────────────────
function ppfAddQ() {
  const q = ppfBuildQ();
  addToQuiz(q, 'ppfMsg', ppfClearForm);
}

function ppfClearForm() {
  ppfCap = null;
  document.getElementById('ppfCapCard').style.display = 'none';
  document.getElementById('ppfQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('ppfA' + i).value = '');
  document.querySelectorAll('input[name="ppfC"]').forEach(r => r.checked = false);
}

// Pre-fills the PPF builder when editing an existing question.
// Loads text/answers always; diagram state only if source type is 'ppf'.
function ppfLoad(q) {
  document.getElementById('ppfQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('ppfA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="ppfC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });

  if (q.type === 'ppf') {
    document.getElementById('ppfTitle').value = q.title  || '';
    document.getElementById('ppfXLbl').value  = q.xLabel || 'Good A';
    document.getElementById('ppfYLbl').value  = q.yLabel || 'Good B';
    document.getElementById('ppfCol').value   = q.color  || '#185FA5';
    document.getElementById('ppfHideGrid').checked = !!q.hideGrid;
    document.getElementById('ppfHideNums').checked = !!q.hideNums;
    // Switch to the stored mode
    ppfSetMode(q.ppfType || 'curved');
    if (q.ppfType === 'schedule' && q.schedulePoints) {
      // Back-convert normalised grid coords to raw values using stored xMax/yMax
      const xMax = q.xMax || 9, yMax = q.yMax || 9;
      // Clear existing inputs first
      for (let i = 0; i < 8; i++) {
        const px = document.getElementById('ppfPx' + i);
        const py = document.getElementById('ppfPy' + i);
        if (px) px.value = '';
        if (py) py.value = '';
      }
      q.schedulePoints.forEach((pt, i) => {
        if (i >= 8) return;
        const px = document.getElementById('ppfPx' + i);
        const py = document.getElementById('ppfPy' + i);
        if (px) px.value = Math.round(pt.x * xMax / 9 * 1000) / 1000;
        if (py) py.value = Math.round(pt.y * yMax / 9 * 1000) / 1000;
      });
    }
    // Restore captured answer so it's kept if teacher just clicks Update
    if (q.ppfType === 'curved') {
      ppfCap = { mode: 'curved',
                 shiftX: (q.ansShiftX != null ? q.ansShiftX : (q.ansShift || 0)),
                 shiftY: (q.ansShiftY != null ? q.ansShiftY : (q.ansShift || 0)) };
    } else {
      const xMax = q.xMax || 9, yMax = q.yMax || 9;
      ppfCap = {
        mode: 'schedule',
        points: (q.schedulePoints || []).map(pt => ({
          x: String(Math.round(pt.x * xMax / 9 * 1000) / 1000),
          y: String(Math.round(pt.y * yMax / 9 * 1000) / 1000)
        })),
        xMax, yMax
      };
    }
    document.getElementById('ppfCapCard').style.display = 'block';
    document.getElementById('ppfCapMsg').textContent =
      'Previously captured — re-capture to change, or click Update Question to keep.';
    ppfDraw();
  }
  document.getElementById('ppfMsg').textContent = '✏ Editing — update diagram if needed, then click Update Question.';
}

// ── PREVIEW ───────────────────────────────────────────────────────────────────
function ppfPreview() {
  const q = ppfBuildQ();
  if (!q.questionText.trim()) { document.getElementById('ppfMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}

// ── INIT (called once when builder opens) ─────────────────────────────────────
function ppfInit() {
  // Build the schedule grid table if not already done
  const grid = document.getElementById('ppfSchedGrid');
  if (grid && !grid.dataset.built) {
    grid.dataset.built = '1';
    let html = `<div class="sched-hdr">#</div><div class="sched-hdr">X</div><div class="sched-hdr">Y</div>`;
    for (let i = 0; i < 8; i++) {
      html += `
        <div class="sched-num">${i+1}</div>
        <input type="number" id="ppfPx${i}" min="0" step="0.5" placeholder="0" class="sched-inp" oninput="ppfDraw()">
        <input type="number" id="ppfPy${i}" min="0" step="0.5" placeholder="0" class="sched-inp" oninput="ppfDraw()">`;
    }
    grid.innerHTML = html;
  }
  // Reset to linear mode (the default)
  ppfXInt = 6; ppfYInt = 9;
  ppfShiftAxis = 'both';
  ppfCap = null;
  if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
  ppfSetShiftAxis('both');
  ppfSetMode('linear');   // sets button states + section visibility, then resets & redraws
}
