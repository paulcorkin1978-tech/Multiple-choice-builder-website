// ── PPF BUILDER ───────────────────────────────────────────────────────────────
// Handles state and logic for the Production Possibility Frontier builder.
// Supports two diagram modes:
//   'curved'   — smooth quarter-ellipse arc, shifted in/out for animation
//   'schedule' — up to 8 user-defined (x, y) data points connected by a line
//
// Depends on: utils.js (GRID, W, H, PAD, gxF, gyF)
//             app.js   (quizQuestions, renderList, buildQuizHTML)

// ── STATE ─────────────────────────────────────────────────────────────────────
let ppfShift  = 0;         // Target discrete shift (-2 to +2) for curved mode
let ppfShiftA = 0;         // Current animated shift value
let ppfCap    = null;      // Captured answer snapshot
let ppfAnim   = null;      // Active rAF handle
let ppfMode   = 'curved';  // 'curved' or 'schedule'

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

  if (ppfMode === 'curved') {
    // ── Curved: GRID=9 background gridlines + "0" origin label ──
    for (let i = 1; i <= GRID; i++) {
      s += `<line x1="${PAD.l}" y1="${gy(i)}" x2="${W-PAD.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
      s += `<line x1="${gx(i)}" y1="${PAD.t}" x2="${gx(i)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
    }
    s += `<text x="${PAD.l-4}" y="${H-PAD.b+11}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;

    // ── Faded original curve (only when shifted) ──
    if (showFaded && Math.abs(shiftA) > 0.05) {
      const r0  = ppfR(0);
      const rx0 = r0 * cW / GRID, ry0 = r0 * cH / GRID;
      s += `<path d="M ${gx(0).toFixed(1)} ${gy(r0).toFixed(1)} A ${rx0.toFixed(1)} ${ry0.toFixed(1)} 0 0 1 ${gx(r0).toFixed(1)} ${gy(0).toFixed(1)}" stroke="${col}" fill="none" stroke-width="2" stroke-linecap="round" opacity="0.3"/>`;
      const lx0 = r0 * 0.72, ly0 = Math.sqrt(Math.max(0, r0*r0 - lx0*lx0));
      s += `<text x="${(gx(lx0)+5).toFixed(1)}" y="${gy(ly0).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${col}" opacity="0.3" font-weight="bold">PPF1</text>`;
    }

    // ── Active curve ──
    const r = ppfR(shiftA);
    if (r > 0.3 && r <= GRID + 1) {
      const rx = r * cW / GRID, ry = r * cH / GRID;
      s += `<path d="M ${gx(0).toFixed(1)} ${gy(r).toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${gx(r).toFixed(1)} ${gy(0).toFixed(1)}" stroke="${col}" fill="none" stroke-width="2.5" stroke-linecap="round"/>`;
      const lbl = Math.abs(shiftA) > 0.05 ? 'PPF2' : 'PPF1';
      const lx  = r * 0.72, ly = Math.sqrt(Math.max(0, r*r - lx*lx));
      s += `<text x="${(gx(lx)+5).toFixed(1)}" y="${gy(ly).toFixed(1)}" font-size="${fs}" font-family="Verdana" fill="${col}" font-weight="bold">${lbl}</text>`;
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
        s += `<line x1="${gxPos.toFixed(1)}" y1="${PAD.t}" x2="${gxPos.toFixed(1)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.6"/>`;
        s += `<line x1="${gxPos.toFixed(1)}" y1="${H-PAD.b}" x2="${gxPos.toFixed(1)}" y2="${H-PAD.b+4}" stroke="#999" stroke-width="1"/>`;
        s += `<text x="${gxPos.toFixed(1)}" y="${H-PAD.b+13}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#666">${v}</text>`;
      });

      yTicks.forEach(v => {
        const gyPos = gy(v * 9 / yMax);
        s += `<line x1="${PAD.l}" y1="${gyPos.toFixed(1)}" x2="${W-PAD.r}" y2="${gyPos.toFixed(1)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.6"/>`;
        s += `<line x1="${PAD.l-4}" y1="${gyPos.toFixed(1)}" x2="${PAD.l}" y2="${gyPos.toFixed(1)}" stroke="#999" stroke-width="1"/>`;
        s += `<text x="${(PAD.l-7)}" y="${gyPos.toFixed(1)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#666">${v}</text>`;
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
      for (let i = 1; i <= GRID; i++) {
        s += `<line x1="${PAD.l}" y1="${gy(i)}" x2="${W-PAD.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
        s += `<line x1="${gx(i)}" y1="${PAD.t}" x2="${gx(i)}" y2="${H-PAD.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
      }
      s += `<text x="${PAD.l-4}" y="${H-PAD.b+11}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
    }
  }

  return s;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function ppfDraw(isAnimating = false) {
  const el = document.getElementById('ppfChart');
  if (!el) return;
  el.innerHTML = ppfBuildSVG(ppfShiftA, isAnimating);
  if (document.getElementById('ppfIn'))  document.getElementById('ppfIn').disabled  = ppfShift <= -2;
  if (document.getElementById('ppfOut')) document.getElementById('ppfOut').disabled = ppfShift >= 2;
}

// ── SHIFT ANIMATION (curved mode only) ────────────────────────────────────────
function ppfShiftCurve(dir) {
  if (ppfAnim || ppfMode !== 'curved') return;
  const newShift = ppfShift + dir;
  if (newShift < -2 || newShift > 2) return;
  const fromShift = ppfShiftA;
  ppfShift = newShift;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    ppfShiftA = fromShift + (newShift - fromShift) * e;
    ppfDraw(t < 1);
    if (t < 1) ppfAnim = requestAnimationFrame(step);
    else { ppfShiftA = newShift; ppfAnim = null; ppfDraw(); }
  }
  ppfAnim = requestAnimationFrame(step);
}

// ── SET MODE ──────────────────────────────────────────────────────────────────
function ppfSetMode(mode) {
  ppfMode = mode;
  document.getElementById('ppfBtnCurved').className = 'btn' + (mode === 'curved'   ? ' btn-primary' : '');
  document.getElementById('ppfBtnSched').className  = 'btn' + (mode === 'schedule' ? ' btn-primary' : '');
  document.getElementById('ppfShiftControls').style.display = mode === 'curved'   ? '' : 'none';
  document.getElementById('ppfSchedSection').style.display  = mode === 'schedule' ? '' : 'none';
  document.getElementById('ppfInfoCurved').style.display    = mode === 'curved'   ? '' : 'none';
  document.getElementById('ppfInfoSched').style.display     = mode === 'schedule' ? '' : 'none';
  ppfReset();
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function ppfReset() {
  if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
  ppfShift = 0; ppfShiftA = 0;
  ppfDraw();
}

// ── CAPTURE ───────────────────────────────────────────────────────────────────
function ppfCapture() {
  const card = document.getElementById('ppfCapCard');
  card.style.display = 'block';

  if (ppfMode === 'curved') {
    ppfCap = { mode: 'curved', shift: ppfShift };
    // Animate back to origin
    if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
    const fromShift = ppfShiftA;
    ppfShift = 0;
    const start = performance.now(), dur = 500;
    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      ppfShiftA = fromShift * (1 - e);
      ppfDraw(t < 1);
      if (t < 1) ppfAnim = requestAnimationFrame(step);
      else { ppfShiftA = 0; ppfAnim = null; ppfDraw(); }
    }
    ppfAnim = requestAnimationFrame(step);
    const dir = ppfCap.shift > 0 ? 'outward' : ppfCap.shift < 0 ? 'inward' : 'no shift';
    document.getElementById('ppfCapMsg').textContent =
      `✓ Answer captured (curve shift: ${dir}, amount: ${ppfCap.shift > 0 ? '+' : ''}${ppfCap.shift}). Diagram reset — now write your question below.`;
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
    correctIndex: ppfGetCorrect()
  };
  if (q.ppfType === 'curved') {
    q.ansShift = ppfCap ? ppfCap.shift : ppfShift;
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
      ppfCap = { mode: 'curved', shift: q.ansShift || 0 };
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
  // Reset to curved mode
  ppfMode = 'curved';
  ppfShift = 0; ppfShiftA = 0; ppfCap = null;
  if (ppfAnim) { cancelAnimationFrame(ppfAnim); ppfAnim = null; }
  document.getElementById('ppfBtnCurved').className = 'btn btn-primary';
  document.getElementById('ppfBtnSched').className  = 'btn';
  document.getElementById('ppfShiftControls').style.display = '';
  document.getElementById('ppfSchedSection').style.display  = 'none';
  document.getElementById('ppfInfoCurved').style.display    = '';
  document.getElementById('ppfInfoSched').style.display     = 'none';
  ppfDraw();
}
