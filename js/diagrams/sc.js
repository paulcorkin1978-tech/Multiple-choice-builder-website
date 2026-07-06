// ── SINGLE CURVE BUILDER ──────────────────────────────────────────────────────
// Handles all state and logic for the Single Curve diagram builder.
// Depends on: utils.js (GRID, QS, QE, W, H, PAD, buildSVGInner, getYLbl)
//             app.js   (quizQuestions, renderList, buildQuizHTML)

// State
let scCurve = 'demand';  // Active curve type: 'demand' or 'supply'
let scFP  = 5;           // Target fixed price (discrete step)
let scFPA = 5;           // Animated fixed price position
let scCS  = 0;           // Target curve shift (discrete step)
let scCA  = 0;           // Animated curve shift position
let scStartCS = 0;       // Configured starting curve shift
let scCap = null;        // Captured answer snapshot
let scAnim = null;       // Active animation frame handle

// Switches between demand/supply curve and updates button highlight
function scSetCurve(c) {
  scCurve = c;
  document.getElementById('scBtnD').className = 'btn' + (c === 'demand' ? ' btn-primary' : '');
  document.getElementById('scBtnS').className = 'btn' + (c === 'supply' ? ' btn-primary' : '');
  document.getElementById('scCol').value = c === 'demand' ? '#185FA5' : '#0F6E56';
  scDraw();
}

// Animates a price level shift (dir = +1 or -1)
function scShiftPrice(dir) {
  if (scAnim) return;
  const nFP = Math.max(1, Math.min(GRID, scFP + dir));
  if (nFP === scFP) return;
  const fFP = scFPA;
  scFP = nFP;
  const start = performance.now(), dur = 400;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    scFPA = fFP + (nFP - fFP) * e;
    scDraw(t < 1);
    if (t < 1) scAnim = requestAnimationFrame(step);
    else { scFPA = nFP; scAnim = null; scDraw(); }
  }
  scAnim = requestAnimationFrame(step);
}

// Animates a curve shift (dir = +1 or -1)
function scShiftCurve(dir) {
  if (scAnim) return;
  const nCS = Math.max(-2, Math.min(2, scCS + dir));
  if (nCS === scCS) return;
  const fCA = scCA;
  scCS = nCS;
  const start = performance.now(), dur = 450;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    scCA = fCA + (nCS - fCA) * e;
    scDraw(t < 1);
    if (t < 1) scAnim = requestAnimationFrame(step);
    else { scCA = nCS; scAnim = null; scDraw(); }
  }
  scAnim = requestAnimationFrame(step);
}

// Reads the starting price field (entered as actual price value) and converts
// to a grid position by dividing by the current price unit.
// e.g. start price 50, vUnit 10 → grid position 5
function scGetStartFP() {
  const vU = parseFloat(document.getElementById('scVUnit').value) || 1;
  const raw = parseFloat(document.getElementById('scStartFP').value) || (5 * vU);
  return Math.max(1, Math.min(GRID, Math.round(raw / vU)));
}

// Called when price unit changes — updates the start price field so it keeps
// showing the same price, expressed in new actual price units.
// e.g. field was 5 (vUnit=1, grid=5) → vUnit changes to 10 → field becomes 50
function scSyncStartFP() {
  const vU = parseFloat(document.getElementById('scVUnit').value) || 1;
  const el = document.getElementById('scStartFP');
  el.min  = vU;
  el.max  = GRID * vU;
  el.step = vU;
  el.value = scFP * vU;  // keep same grid position, express as actual price
}

// Resets price and curve back to the configured starting price and starting curve shift
function scReset() {
  if (scAnim) { cancelAnimationFrame(scAnim); scAnim = null; }
  const sp = scGetStartFP();
  scFP = sp; scFPA = sp; scCS = scStartCS; scCA = scStartCS;
  scDraw();
}

// Records current curve shift as the diagram's starting state
function scSetStart() {
  scStartCS = scCS;
  const card = document.getElementById('scStartCard');
  card.style.display = 'block';
  document.getElementById('scStartMsg').textContent =
    `✓ Starting position set (curve shift: ${scStartCS >= 0 ? '+' : ''}${scStartCS}). Now shift to the correct answer position and capture.`;
  scDraw();
}

// Redraws the Single Curve SVG diagram from current state
function scDraw(isAnimating = false) {
  const vU = parseFloat(document.getElementById('scVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('scHUnit').value) || 5;
  const dA = scCurve === 'demand' ? scCA : 0;
  const sA = scCurve === 'supply' ? scCA : 0;
  document.getElementById('scChart').innerHTML = buildSVGInner({
    W, H, pad: PAD,
    title:  document.getElementById('scTitle').value,
    yLbl:   getYLbl('scYLbl', vU),
    xLbl:   document.getElementById('scXLbl').value || 'Quantity',
    vU, hU, type: 'sc', curve: scCurve,
    col:    document.getElementById('scCol').value,
    dA, sA, fpA: scFPA,
    startCS: scStartCS, showFaded: true, isAnimating,
    showEqLines: document.getElementById('scShowEq').checked
  });
  document.getElementById('scPUp').disabled = scFP >= GRID;
  document.getElementById('scPDn').disabled = scFP <= 1;
  document.getElementById('scCL').disabled  = scCS <= -2;
  document.getElementById('scCR').disabled  = scCS >= 2;
}

// Captures current position as the answer, then animates back to starting position
function scCapture() {
  scCap = { fp: scFP, cs: scCS };
  if (scAnim) { cancelAnimationFrame(scAnim); scAnim = null; }
  const fFP = scFPA, fCA = scCA;
  const sp = scGetStartFP();
  const targetCS = scStartCS;
  scFP = sp; scCS = targetCS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    scFPA = fFP + (sp - fFP) * e;
    scCA  = fCA + (targetCS - fCA) * e;
    scDraw(t < 1);
    if (t < 1) scAnim = requestAnimationFrame(step);
    else { scFPA = sp; scCA = targetCS; scAnim = null; scDraw(); }
  }
  scAnim = requestAnimationFrame(step);
  const card = document.getElementById('scCapCard');
  card.style.display = 'block';
  document.getElementById('scCapMsg').textContent =
    `✓ Answer captured (price: ${scCap.fp}, curve shift: ${scCap.cs >= 0 ? '+' : ''}${scCap.cs}). Diagram reset — now write your question below.`;
}

// Returns index of selected correct-answer radio button, or -1
function scGetCorrect() {
  for (let r of document.querySelectorAll('input[name="scC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

// Builds a question data object from the current form state
function scBuildQ() {
  const vU = parseFloat(document.getElementById('scVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('scHUnit').value) || 5;
  return {
    type: 'sc', curve: scCurve,
    title:        document.getElementById('scTitle').value,
    yLabel:       getYLbl('scYLbl', vU),
    xLabel:       document.getElementById('scXLbl').value || 'Quantity',
    color:        document.getElementById('scCol').value,
    vUnit: vU, hUnit: hU,
    startFP: scGetStartFP(), startCS: scStartCS,
    showEqLines:  document.getElementById('scShowEq').checked,
    ansFP:        scCap ? scCap.fp : scFP,
    ansCS:        scCap ? scCap.cs : scCS,
    questionText: document.getElementById('scQText').value,
    answers:      [0,1,2,3].map(i => document.getElementById('scA' + i).value),
    correctIndex: scGetCorrect()
  };
}

// Validates and adds (or updates) the current question
function scAddQ() {
  const q = scBuildQ();
  addToQuiz(q, 'scMsg', scClearForm);
}

function scClearForm() {
  scCap = null;
  scStartCS = 0;
  document.getElementById('scCapCard').style.display = 'none';
  document.getElementById('scStartCard').style.display = 'none';
  document.getElementById('scQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('scA' + i).value = '');
  document.querySelectorAll('input[name="scC"]').forEach(r => r.checked = false);
}

// Pre-fills the SC builder when editing an existing question.
// Loads text/answers always; diagram state only if source type is 'sc'.
function scLoad(q) {
  document.getElementById('scQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('scA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="scC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });

  if (q.type === 'sc') {
    document.getElementById('scVUnit').value    = q.vUnit  || 1;
    document.getElementById('scHUnit').value    = q.hUnit  || 5;
    document.getElementById('scTitle').value    = q.title  || '';
    document.getElementById('scYLbl').value     = q.yLabel || 'Price ($)';
    document.getElementById('scXLbl').value     = q.xLabel || 'Quantity';
    document.getElementById('scCol').value      = q.color  || '#185FA5';
    document.getElementById('scShowEq').checked = q.showEqLines !== false;
    if (q.curve) scSetCurve(q.curve);
    const vU   = q.vUnit || 1;
    const spEl = document.getElementById('scStartFP');
    spEl.value = (q.startFP || 5) * vU;
    spEl.min = vU; spEl.max = 9 * vU; spEl.step = vU;
    // Restore starting position
    scStartCS = q.startCS || 0;
    scFP = q.startFP || 5; scFPA = scFP; scCS = scStartCS; scCA = scStartCS;
    if (scStartCS !== 0) {
      document.getElementById('scStartCard').style.display = 'block';
      document.getElementById('scStartMsg').textContent =
        `Starting position: curve shift ${scStartCS >= 0 ? '+' : ''}${scStartCS}. Reset to change.`;
    }
    // Restore captured answer so it's kept if teacher just clicks Update
    scCap = { fp: q.ansFP || scFP, cs: q.ansCS || 0 };
    document.getElementById('scCapCard').style.display = 'block';
    document.getElementById('scCapMsg').textContent =
      `Previously captured (price: ${scCap.fp}, shift: ${scCap.cs >= 0 ? '+' : ''}${scCap.cs}). Re-capture to change, or click Update Question to keep.`;
    scDraw();
  }
  document.getElementById('scMsg').textContent = '✏ Editing — update diagram if needed, then click Update Question.';
}

// Opens a preview of the current question in a new tab
function scPreview() {
  const q = scBuildQ();
  if (!q.questionText.trim()) { document.getElementById('scMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}
