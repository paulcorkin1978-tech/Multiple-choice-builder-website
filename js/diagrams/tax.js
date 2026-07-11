// ── TAX / SUBSIDY / EXTERNALITY BUILDER ───────────────────────────────────────
// Handles state and logic for the market-intervention diagram builder.
// The diagram shows both a demand and supply curve. A tax shifts supply LEFT;
// a subsidy shifts supply RIGHT. After the student answers correctly, the quiz
// player animates the supply shift and then reveals the economic rectangles
// (total wedge, consumer portion, producer portion) one click at a time.
//
// The same machinery draws externalities, because the geometry is identical:
//   negative externality → supply shifts LEFT  (MPC → MSC), overproduction
//   positive externality → demand shifts RIGHT (MPB → MSB), underproduction
// The difference is only in what the curves are called and what gets revealed.
// Depends on: utils.js, app.js

// State
let txDA = 0, txSA = 0;          // current animated positions
let txDS = 0, txSS = 0;          // target discrete step positions
let txStartDS = 0, txStartSS = 0; // configured starting position (pre-intervention)
let txCap = null;                  // captured answer snapshot
let txAnim = null;                 // active animation frame handle
let txType = 'tax';                // 'tax' | 'subsidy' | 'negext' | 'posext'
let txElasticity = 'normal';       // 'normal' | 'inelastic' | 'elastic'

// Which reveal checkboxes belong to which variant, in display order.
const TX_REV_TAX = [['txRevSize','size'],['txRevWedge','wedge'],['txRevConsumer','consumer'],['txRevProdLoss','prodloss'],['txRevProdRev','prodrev']];
const TX_REV_EXT = [['txRevDWL','dwl'],['txRevOptQ','optq'],['txRevExtW','extwedge'],['txRevCorr','corrective']];
function txRevMap() { return txIsExt(txType) ? TX_REV_EXT : TX_REV_TAX; }

// Returns the demand slope multiplier for the current elasticity setting
function txGetDm() {
  return txElasticity === 'inelastic' ? 2 : txElasticity === 'elastic' ? 0.5 : 1;
}

// Returns the supply shift coefficient for the current elasticity.
// Chosen so every supply step lands on an integer grid intersection:
//   normal   (dm=1): ssc=2 → p = 5 - ss        (e.g. ss=-1 → P=6)
//   inelastic(dm=2): ssc=3 → p = 5 - 2×ss      (e.g. ss=-1 → P=7)
//   elastic  (dm½):  ssc=3 → p = 5 - ss         (e.g. ss=-1 → P=6)
function txGetSsc() {
  return txElasticity === 'normal' ? 2 : 3;
}

// Demand shift coefficient per step.
// Tax/subsidy only ever shift demand to set up a starting position, so 1 grid
// square (dsc = dm) reads most naturally there. A POSITIVE EXTERNALITY makes the
// demand shift the answer, so it needs the same integer-equilibrium treatment the
// supply shift gets: Δp = dsc·ds/(1+dm), which is a whole number when dsc = ssc.
function txGetDsc() {
  return txType === 'posext' ? txGetSsc() : txGetDm();
}

// A +2 demand shift throws MSB above the top of the grid unless the demand curve
// has the normal slope, which would clip the deadweight loss triangle.
function txMaxDS() {
  return (txType === 'posext' && txElasticity !== 'normal') ? 1 : 2;
}

// Keeps the demand shift inside the range the current variant allows
function txClampDS() {
  const m = txMaxDS();
  txDS = Math.max(-m, Math.min(m, txDS));
  txDA = Math.max(-m, Math.min(m, txDA));
  txStartDS = Math.max(-m, Math.min(m, txStartDS));
}

// Updates the Demand Slope button states and redraws
function txSetElasticity(e) {
  txElasticity = e;
  document.getElementById('txElNormal').className    = 'btn' + (e === 'normal'    ? ' btn-primary' : '');
  document.getElementById('txElInelastic').className = 'btn' + (e === 'inelastic' ? ' btn-primary' : '');
  document.getElementById('txElElastic').className   = 'btn' + (e === 'elastic'   ? ' btn-primary' : '');
  txClampDS();
  txDraw();
}

// Redraws the tax diagram preview using the SD SVG builder
function txDraw(isAnimating = false) {
  const vU = parseFloat(document.getElementById('txVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('txHUnit').value) || 5;
  // MPC/MSC/MPB/MSB are three characters wide and are drawn just outside the plot,
  // so the externality diagrams need extra room on the right or the last letter clips.
  const txPad = txIsExt(txType) ? Object.assign({}, PAD, { r: PAD.r + 18 }) : PAD;
  document.getElementById('txChart').innerHTML = buildSVGInner({
    W, H, pad: txPad,
    title:  document.getElementById('txTitle').value,
    yLbl:   getYLbl('txYLbl', vU),
    xLbl:   document.getElementById('txXLbl').value || 'Quantity',
    vU, hU, type: 'sd',
    dCol:   document.getElementById('txDCol').value,
    sCol:   document.getElementById('txSCol').value,
    dA: txDA, sA: txSA, fpA: 5,
    startDS: txStartDS, startSS: txStartSS, showFaded: true, isAnimating,
    showEqLines: document.getElementById('txShowEq').checked,
    showEqLabel: false,    // show dot/dashes but no number (label shown in quiz as Pc/Ps)
    dMult: txGetDm(),
    dShiftCoeff: txGetDsc(),  // demand: 1 grid square, or integer equilibria for +externality
    sShiftCoeff: txGetSsc(),  // supply: integer equilibria guaranteed
    labels: txLabels(txType)  // D1/S1/… or MPC/MSC/MPB/MSB
  });
  // Enable/disable shift buttons
  document.getElementById('txDL').disabled = txDS <= -txMaxDS();
  document.getElementById('txDR').disabled = txDS >= txMaxDS();
  document.getElementById('txSL').disabled = txSS <= -2;
  document.getElementById('txSR').disabled = txSS >= 2;
}

// Animates a curve shift (curve = 'd' or 's', dir = -1 or +1)
function txShift(curve, dir) {
  if (txAnim) return;
  const nD = curve === 'd' ? txDS + dir : txDS;
  const nS = curve === 's' ? txSS + dir : txSS;
  if (nD < -txMaxDS() || nD > txMaxDS() || nS < -2 || nS > 2) return;
  const fD = txDA, fS = txSA;
  txDS = nD; txSS = nS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    txDA = fD + (nD - fD) * e;
    txSA = fS + (nS - fS) * e;
    txDraw(t < 1);
    if (t < 1) txAnim = requestAnimationFrame(step);
    else { txDA = nD; txSA = nS; txAnim = null; txDraw(); }
  }
  txAnim = requestAnimationFrame(step);
}

// Resets diagram to the configured starting position
function txReset() {
  if (txAnim) { cancelAnimationFrame(txAnim); txAnim = null; }
  txDA = txStartDS; txSA = txStartSS;
  txDS = txStartDS; txSS = txStartSS;
  txDraw();
}

// Records current position as the pre-intervention (starting) state
function txSetStart() {
  txStartDS = txDS;
  txStartSS = txSS;
  const card = document.getElementById('txStartCard');
  card.style.display = 'block';
  document.getElementById('txStartMsg').textContent =
    `✓ Starting position set (D: ${txStartDS >= 0 ? '+' : ''}${txStartDS}, S: ${txStartSS >= 0 ? '+' : ''}${txStartSS}). Now ${TX_MOVE_HINT[txType]} and capture.`;
  txDraw();
}

// Captures current supply position as the post-intervention answer,
// then animates the diagram back to the starting position
function txCapture() {
  txCap = { dShift: txDS, sShift: txSS };
  if (txAnim) { cancelAnimationFrame(txAnim); txAnim = null; }
  const fD = txDA, fS = txSA;
  const targetD = txStartDS, targetS = txStartSS;
  txDS = targetD; txSS = targetS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    txDA = fD + (targetD - fD) * e;
    txSA = fS + (targetS - fS) * e;
    txDraw(t < 1);
    if (t < 1) txAnim = requestAnimationFrame(step);
    else { txDA = targetD; txSA = targetS; txAnim = null; txDraw(); }
  }
  txAnim = requestAnimationFrame(step);
  const card = document.getElementById('txCapCard');
  card.style.display = 'block';
  // A positive externality is a demand shift; everything else is a supply shift.
  const moved = txType === 'posext' ? txCap.dShift : txCap.sShift;
  const which = txType === 'posext' ? 'D' : 'S';
  const name  = { tax:'tax', subsidy:'subsidy', negext:'negative externality', posext:'positive externality' }[txType];
  document.getElementById('txCapMsg').textContent =
    `✓ Answer captured (${which} shift: ${moved >= 0 ? '+' : ''}${moved} = ${name}). Diagram reset. Now write your question.`;
}

// The wording used in the "set start / capture" guidance for each variant
const TX_MOVE_HINT = {
  tax:     'shift supply LEFT for the tax',
  subsidy: 'shift supply RIGHT for the subsidy',
  negext:  'shift supply LEFT to add the external cost (MPC → MSC)',
  posext:  'shift demand RIGHT to add the external benefit (MPB → MSB)'
};

const TX_YLBL_MARKET = 'Price ($)';
const TX_YLBL_EXT    = 'Price, Cost, Benefit ($)';

// Sets the diagram variant and updates the UI to match
function txSetType(type) {
  const wasExt = txIsExt(txType);
  txType = type;

  const btns = { tax:'txTypeTax', subsidy:'txTypeSub', negext:'txTypeNegExt', posext:'txTypePosExt' };
  Object.entries(btns).forEach(([t, id]) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.classList.toggle('btn-primary', type === t);
    b.classList.toggle('btn', type !== t);
  });

  // Swap the reveal checkbox panel
  const nowExt = txIsExt(type);
  const rt = document.getElementById('txRevTaxSet'), re = document.getElementById('txRevExtSet');
  if (rt) rt.style.display = nowExt ? 'none' : 'flex';
  if (re) re.style.display = nowExt ? 'flex' : 'none';

  // Nudge the y-axis label across, but only if it's still the untouched default
  const yl = document.getElementById('txYLbl');
  if (yl && wasExt !== nowExt) {
    if (nowExt && yl.value === TX_YLBL_MARKET) yl.value = TX_YLBL_EXT;
    if (!nowExt && yl.value === TX_YLBL_EXT)   yl.value = TX_YLBL_MARKET;
  }

  txClampDS();
  txDraw();
}

// Returns index of selected correct-answer radio button, or -1
function txGetCorrect() {
  for (let r of document.querySelectorAll('input[name="txC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

// Builds a question data object from the current form state
function txBuildQ() {
  const vU = parseFloat(document.getElementById('txVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('txHUnit').value) || 5;
  // Build reveals array in display order, only including checked options.
  // The externality variants have their own reveal set.
  const reveals = txRevMap().filter(([id]) => document.getElementById(id).checked).map(([,key]) => key);
  return {
    type:         'tax',
    taxType:      txType,
    dElasticity:  txElasticity,
    sShiftCoeff:  txGetSsc(),
    dShiftCoeff:  txGetDsc(),
    showEqLines:  document.getElementById('txShowEq').checked,
    title:        document.getElementById('txTitle').value,
    yLabel:       getYLbl('txYLbl', vU),
    xLabel:       document.getElementById('txXLbl').value || 'Quantity',
    dColor:       document.getElementById('txDCol').value,
    sColor:       document.getElementById('txSCol').value,
    vUnit: vU, hUnit: hU,
    startDS: txStartDS, startSS: txStartSS,
    ansDS:   txCap ? txCap.dShift : txDS,
    ansSS:   txCap ? txCap.sShift : txSS,
    reveals,
    questionText: document.getElementById('txQText').value,
    answers:      [0,1,2,3].map(i => document.getElementById('txA' + i).value),
    correctIndex: txGetCorrect()
  };
}

// Validates and adds (or updates) the current question
function txAddQ() {
  const q = txBuildQ();
  addToQuiz(q, 'txMsg', txClearForm);
}

function txClearForm() {
  txCap = null;
  txStartDS = 0; txStartSS = 0;
  document.getElementById('txCapCard').style.display  = 'none';
  document.getElementById('txStartCard').style.display = 'none';
  document.getElementById('txQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('txA' + i).value = '');
  document.querySelectorAll('input[name="txC"]').forEach(r => r.checked = false);
  // Reset reveal options to defaults (all ticked except Producer revenue)
  ['txRevSize','txRevWedge','txRevConsumer','txRevProdLoss','txRevDWL','txRevOptQ','txRevExtW','txRevCorr'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = true;
  });
  const pr = document.getElementById('txRevProdRev'); if (pr) pr.checked = false;
  // Reset elasticity to normal
  txSetElasticity('normal');
}

// Pre-fills the tax builder when editing an existing question
function txLoad(q) {
  document.getElementById('txQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('txA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="txC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });

  if (q.type === 'tax') {
    document.getElementById('txVUnit').value = q.vUnit  || 1;
    document.getElementById('txHUnit').value = q.hUnit  || 5;
    document.getElementById('txTitle').value = q.title  || '';
    document.getElementById('txXLbl').value  = q.xLabel || 'Quantity';
    document.getElementById('txDCol').value  = q.dColor || '#185FA5';
    document.getElementById('txSCol').value  = q.sColor || '#0F6E56';
    document.getElementById('txShowEq').checked = q.showEqLines !== false;
    // Type first — txSetType nudges the y-axis default, so the saved label is written after it
    txSetType(q.taxType || 'tax');
    document.getElementById('txYLbl').value  = q.yLabel || (txIsExt(q.taxType) ? TX_YLBL_EXT : TX_YLBL_MARKET);
    txStartDS = q.startDS || 0;
    txStartSS = q.startSS || 0;
    txDA = txStartDS; txSA = txStartSS; txDS = txStartDS; txSS = txStartSS;
    if (txStartDS !== 0 || txStartSS !== 0) {
      document.getElementById('txStartCard').style.display = 'block';
      document.getElementById('txStartMsg').textContent =
        `Starting position: D ${txStartDS >= 0 ? '+' : ''}${txStartDS}, S ${txStartSS >= 0 ? '+' : ''}${txStartSS}. Reset to change.`;
    }
    txCap = { dShift: q.ansDS || 0, sShift: q.ansSS || 0 };
    document.getElementById('txCapCard').style.display = 'block';
    const ldMoved = q.taxType === 'posext' ? txCap.dShift : txCap.sShift;
    const ldWhich = q.taxType === 'posext' ? 'D' : 'S';
    document.getElementById('txCapMsg').textContent =
      `Previously captured (${ldWhich} shift: ${ldMoved >= 0 ? '+' : ''}${ldMoved}). Re-capture to change, or click Update Question to keep.`;
    // Restore reveal checkboxes (only those belonging to this variant)
    const savedRevs = q.reveals || txDefRev(q);
    txRevMap().forEach(([id, key]) => {
      const el = document.getElementById(id); if (el) el.checked = savedRevs.includes(key);
    });
    // Restore demand elasticity (txSetElasticity also redraws, so skip explicit txDraw)
    txSetElasticity(q.dElasticity || 'normal');
  }
  document.getElementById('txMsg').textContent = '✏ Editing — update diagram if needed, then click Update Question.';
}

// Opens a preview of the current question in a new tab
function txPreview() {
  const q = txBuildQ();
  if (!q.questionText.trim()) { document.getElementById('txMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}
