// ── SUPPLY & DEMAND BUILDER ───────────────────────────────────────────────────
// Handles all state and logic for the Supply & Demand diagram builder.
// Depends on: utils.js (GRID, QS, QE, W, H, PAD, buildSVGInner, getYLbl)
//             app.js   (quizQuestions, renderList, buildQuizHTML)

// State
let sdDA = 0, sdSA = 0;       // Current animated positions (demand shift, supply shift)
let sdDS = 0, sdSS = 0;       // Target discrete step positions
let sdStartDS = 0, sdStartSS = 0;  // Configured starting position
let sdCap = null;              // Captured answer snapshot
let sdAnim = null;             // Active animation frame handle

// Redraws the S&D SVG diagram from current state
function sdDraw(isAnimating = false) {
  const vU = parseFloat(document.getElementById('sdVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('sdHUnit').value) || 5;
  document.getElementById('sdChart').innerHTML = buildSVGInner({
    W, H, pad: PAD,
    title:  document.getElementById('sdTitle').value,
    yLbl:   getYLbl('sdYLbl', vU),
    xLbl:   document.getElementById('sdXLbl').value || 'Quantity',
    vU, hU, type: 'sd',
    dCol:   document.getElementById('sdDCol').value,
    sCol:   document.getElementById('sdSCol').value,
    dA: sdDA, sA: sdSA, fpA: 5,
    startDS: sdStartDS, startSS: sdStartSS, showFaded: true, isAnimating,
    showEqLines: document.getElementById('sdShowEq').checked
  });
  document.getElementById('sdDL').disabled = sdDS <= -2;
  document.getElementById('sdDR').disabled = sdDS >= 2;
  document.getElementById('sdSL').disabled = sdSS <= -2;
  document.getElementById('sdSR').disabled = sdSS >= 2;
}

// Animates a curve shift (curve = 'd' or 's', dir = -1 or +1)
function sdShift(curve, dir) {
  if (sdAnim) return;
  const nD = curve === 'd' ? sdDS + dir : sdDS;
  const nS = curve === 's' ? sdSS + dir : sdSS;
  if (nD < -2 || nD > 2 || nS < -2 || nS > 2) return;
  const fD = sdDA, fS = sdSA;
  sdDS = nD; sdSS = nS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;  // ease in-out
    sdDA = fD + (nD - fD) * e;
    sdSA = fS + (nS - fS) * e;
    sdDraw(t < 1);
    if (t < 1) sdAnim = requestAnimationFrame(step);
    else { sdDA = nD; sdSA = nS; sdAnim = null; sdDraw(); }
  }
  sdAnim = requestAnimationFrame(step);
}

// Resets both curves to the configured starting position (or origin if none set)
function sdReset() {
  if (sdAnim) { cancelAnimationFrame(sdAnim); sdAnim = null; }
  sdDA = sdStartDS; sdSA = sdStartSS; sdDS = sdStartDS; sdSS = sdStartSS;
  sdDraw();
}

// Records current curve position as the diagram's starting state
function sdSetStart() {
  sdStartDS = sdDS;
  sdStartSS = sdSS;
  const card = document.getElementById('sdStartCard');
  card.style.display = 'block';
  document.getElementById('sdStartMsg').textContent =
    `✓ Starting position set (D: ${sdStartDS >= 0 ? '+' : ''}${sdStartDS}, S: ${sdStartSS >= 0 ? '+' : ''}${sdStartSS}). Now shift curves to the correct answer and capture.`;
  sdDraw();
}

// Captures current position as the answer, then animates back to the starting position
function sdCapture() {
  sdCap = { dShift: sdDS, sShift: sdSS };
  if (sdAnim) { cancelAnimationFrame(sdAnim); sdAnim = null; }
  const fD = sdDA, fS = sdSA;
  const targetD = sdStartDS, targetS = sdStartSS;
  sdDS = targetD; sdSS = targetS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    sdDA = fD + (targetD - fD) * e;
    sdSA = fS + (targetS - fS) * e;
    sdDraw(t < 1);
    if (t < 1) sdAnim = requestAnimationFrame(step);
    else { sdDA = targetD; sdSA = targetS; sdAnim = null; sdDraw(); }
  }
  sdAnim = requestAnimationFrame(step);
  const card = document.getElementById('sdCapCard');
  card.style.display = 'block';
  const startDesc = (sdStartDS !== 0 || sdStartSS !== 0)
    ? ` Diagram reset to starting position (D: ${sdStartDS >= 0 ? '+' : ''}${sdStartDS}, S: ${sdStartSS >= 0 ? '+' : ''}${sdStartSS}).`
    : ' Diagram reset.';
  document.getElementById('sdCapMsg').textContent =
    `✓ Answer captured (D shift: ${sdCap.dShift >= 0 ? '+' : ''}${sdCap.dShift}, S shift: ${sdCap.sShift >= 0 ? '+' : ''}${sdCap.sShift}).${startDesc} Now write your question below.`;
}

// Returns index of selected correct-answer radio button, or -1
function sdGetCorrect() {
  for (let r of document.querySelectorAll('input[name="sdC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

// Builds a question data object from the current form state
function sdBuildQ() {
  const vU = parseFloat(document.getElementById('sdVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('sdHUnit').value) || 5;
  return {
    type: 'sd',
    title:         document.getElementById('sdTitle').value,
    yLabel:        getYLbl('sdYLbl', vU),
    xLabel:        document.getElementById('sdXLbl').value || 'Quantity',
    dColor:        document.getElementById('sdDCol').value,
    sColor:        document.getElementById('sdSCol').value,
    vUnit: vU, hUnit: hU,
    startDS: sdStartDS, startSS: sdStartSS,
    showEqLines:   document.getElementById('sdShowEq').checked,
    ansDS:         sdCap ? sdCap.dShift : sdDS,
    ansSS:         sdCap ? sdCap.sShift : sdSS,
    questionText:  document.getElementById('sdQText').value,
    answers:       [0,1,2,3].map(i => document.getElementById('sdA' + i).value),
    correctIndex:  sdGetCorrect()
  };
}

// Validates and adds (or updates) the current question
function sdAddQ() {
  const q = sdBuildQ();
  addToQuiz(q, 'sdMsg', sdClearForm);
}

function sdClearForm() {
  sdCap = null;
  sdStartDS = 0; sdStartSS = 0;
  document.getElementById('sdCapCard').style.display = 'none';
  document.getElementById('sdStartCard').style.display = 'none';
  document.getElementById('sdQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('sdA' + i).value = '');
  document.querySelectorAll('input[name="sdC"]').forEach(r => r.checked = false);
}

// Pre-fills the SD builder when editing an existing question.
// Loads text/answers always; diagram state only if source type is 'sd'.
function sdLoad(q) {
  document.getElementById('sdQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('sdA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="sdC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });

  if (q.type === 'sd') {
    document.getElementById('sdVUnit').value    = q.vUnit  || 1;
    document.getElementById('sdHUnit').value    = q.hUnit  || 5;
    document.getElementById('sdTitle').value    = q.title  || '';
    document.getElementById('sdYLbl').value     = q.yLabel || 'Price ($)';
    document.getElementById('sdXLbl').value     = q.xLabel || 'Quantity';
    document.getElementById('sdDCol').value     = q.dColor || '#185FA5';
    document.getElementById('sdSCol').value     = q.sColor || '#0F6E56';
    document.getElementById('sdShowEq').checked = q.showEqLines !== false;
    // Restore starting position
    sdStartDS = q.startDS || 0;
    sdStartSS = q.startSS || 0;
    sdDA = sdStartDS; sdSA = sdStartSS; sdDS = sdStartDS; sdSS = sdStartSS;
    if (sdStartDS !== 0 || sdStartSS !== 0) {
      document.getElementById('sdStartCard').style.display = 'block';
      document.getElementById('sdStartMsg').textContent =
        `Starting position: D ${sdStartDS >= 0 ? '+' : ''}${sdStartDS}, S ${sdStartSS >= 0 ? '+' : ''}${sdStartSS}. Reset to change.`;
    }
    // Restore captured answer so it's kept if teacher just clicks Update
    sdCap = { dShift: q.ansDS || 0, sShift: q.ansSS || 0 };
    document.getElementById('sdCapCard').style.display = 'block';
    document.getElementById('sdCapMsg').textContent =
      `Previously captured (D: ${sdCap.dShift >= 0 ? '+' : ''}${sdCap.dShift}, S: ${sdCap.sShift >= 0 ? '+' : ''}${sdCap.sShift}). Re-capture to change, or click Update Question to keep.`;
    sdDraw();
  }
  document.getElementById('sdMsg').textContent = '✏ Editing — update diagram if needed, then click Update Question.';
}

// Opens a preview of the current question in a new tab
function sdPreview() {
  const q = sdBuildQ();
  if (!q.questionText.trim()) { document.getElementById('sdMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}
