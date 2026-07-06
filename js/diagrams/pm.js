// ── PRICE MECHANISM BUILDER ───────────────────────────────────────────────────
// Shows a starting price creating a surplus or shortage, then animates the
// price adjusting to equilibrium — illustrating the price mechanism at work.
// Depends on: utils.js (GRID, QS, QE, W, H, PAD, gxF, gyF, clipLine, getEq,
//                        dPf, sPf, dQf, sQf, fmt, getYLbl)
//             app.js   (quizQuestions, editingIndex, renderList, buildQuizHTML,
//                        goMenu)

// ── STATE ─────────────────────────────────────────────────────────────────────
let pmDA = 0, pmSA = 0;      // Animated curve positions (demand / supply shifts)
let pmDS = 0, pmSS = 0;      // Discrete step positions
let pmPrice = 7;             // Starting price (grid units, 1–9)
let pmCurveAnim = null;      // Handle for curve-shift animation frame

// ── DRAW ──────────────────────────────────────────────────────────────────────
// Redraws the builder preview. showBracket=true so the teacher can verify
// the surplus/shortage gap before adding to the quiz.
function pmDraw() {
  const vU = parseFloat(document.getElementById('pmVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('pmHUnit').value) || 5;
  document.getElementById('pmChart').innerHTML = buildPMSVGInner({
    W, H, pad: PAD,
    title:       document.getElementById('pmTitle').value,
    yLbl:        getYLbl('pmYLbl', vU),
    xLbl:        document.getElementById('pmXLbl').value || 'Quantity',
    vU, hU,
    dCol:        document.getElementById('pmDCol').value,
    sCol:        document.getElementById('pmSCol').value,
    dA: pmDA, sA: pmSA,
    currentPrice: pmPrice,
    startPrice:   pmPrice,
    showEqLines:  document.getElementById('pmShowEq').checked,
    showBracket:  true,       // always visible in builder preview
    isAnimating:  false
  });

  // Update surplus / shortage info strip
  const eq  = getEq(pmDS, pmSS);
  const info = document.getElementById('pmEqInfo');
  const diff = pmPrice - eq.p;
  if (Math.abs(diff) < 0.06) {
    info.textContent = `Starting price (${fmt(pmPrice)}) is at equilibrium — move the slider above or below to show a surplus or shortage.`;
    info.style.color  = '#888';
  } else if (diff > 0) {
    const qd = fmt(dQf(pmPrice, pmDS)), qs = fmt(sQf(pmPrice, pmSS));
    info.textContent = `▲ Surplus: Qs (${qs}) > Qd (${qd}) at price ${pmPrice}. Equilibrium: P=${fmt(eq.p)}, Q=${fmt(eq.q)}.`;
    info.style.color  = '#D85A30';
  } else {
    const qd = fmt(dQf(pmPrice, pmDS)), qs = fmt(sQf(pmPrice, pmSS));
    info.textContent = `▼ Shortage: Qd (${qd}) > Qs (${qs}) at price ${pmPrice}. Equilibrium: P=${fmt(eq.p)}, Q=${fmt(eq.q)}.`;
    info.style.color  = '#7B2FA8';
  }

  // Disable curve-shift buttons at limits
  document.getElementById('pmDL').disabled = pmDS <= -2;
  document.getElementById('pmDR').disabled = pmDS >= 2;
  document.getElementById('pmSL').disabled = pmSS <= -2;
  document.getElementById('pmSR').disabled = pmSS >= 2;
}

// ── SVG BUILDER ───────────────────────────────────────────────────────────────
// Generates the SVG markup for the Price Mechanism diagram.
// Used by: pmDraw() (builder preview) and directly in the quiz export.
//
// cfg fields:
//   W, H, pad         — canvas dimensions & padding
//   title, yLbl, xLbl — text labels
//   vU, hU            — price & quantity units (for axis scaling)
//   dCol, sCol        — demand / supply curve colours
//   dA, sA            — curve shift positions (fixed for PM questions)
//   currentPrice      — the price level to display (animates during quiz)
//   startPrice        — original starting price (used for bracket fade ratio)
//   showEqLines       — whether to draw equilibrium dashed lines when at eq
//   showBracket       — whether to render the surplus/shortage bracket + label
//   isAnimating       — suppresses Qd/Qs axis labels during animation flicker
function buildPMSVGInner(cfg) {
  const { W, H, pad, title, yLbl, xLbl, vU, hU, dCol, sCol,
          dA, sA, currentPrice, startPrice, showEqLines,
          showBracket = false, isAnimating = false } = cfg;

  const gx  = q => gxF(q, pad, W);
  const gy  = p => gyF(p, pad, H);
  const fs  = 11, fs2 = 9;
  const vDisp    = vU >= 1000 ? vU / 1000 : vU;
  const hDisp    = hU >= 1000 ? hU / 1000 : hU;
  const xLblDisp = hU >= 1000 ? xLbl + ' (000s)' : xLbl;

  const eq         = getEq(dA, sA);
  const atEq       = Math.abs(currentPrice - eq.p) < 0.06;
  const qd         = dQf(currentPrice, dA);   // Qd at current price
  const qs         = sQf(currentPrice, sA);   // Qs at current price
  const hasSurplus = currentPrice > eq.p + 0.06;

  // Bracket opacity fades from 1→0 as price approaches eq
  const totalDist = Math.abs((startPrice || currentPrice) - eq.p);
  const curDist   = Math.abs(currentPrice - eq.p);
  const fadeFrac  = totalDist > 0.01 ? Math.min(curDist / totalDist, 1) : 1;

  const bracketCol = hasSurplus ? '#D85A30' : '#7B2FA8';
  const label      = hasSurplus ? 'SURPLUS'  : 'SHORTAGE';

  // ── Arrow marker ──────────────────────────────────────────────────────────
  let s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;

  // ── Title ─────────────────────────────────────────────────────────────────
  if (title) s += `<text x="${W/2}" y="13" text-anchor="middle" font-size="${fs}" font-family="Verdana" font-weight="bold" fill="#2c2c2a">${title}</text>`;

  // ── Grid lines ────────────────────────────────────────────────────────────
  for (let i = 1; i <= GRID; i++) {
    s += `<line x1="${pad.l}" y1="${gy(i)}" x2="${W-pad.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
    s += `<line x1="${gx(i)}" y1="${pad.t}" x2="${gx(i)}" y2="${H-pad.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;
  }

  // ── Axes ──────────────────────────────────────────────────────────────────
  s += `<line x1="${pad.l}" y1="${H-pad.b+6}" x2="${pad.l}" y2="${pad.t-6}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;
  s += `<line x1="${pad.l-6}" y1="${H-pad.b}" x2="${W-pad.r+6}" y2="${H-pad.b}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;

  // ── Axis tick labels (suppress clashing values) ───────────────────────────
  for (let i = 1; i <= GRID; i++) {
    const isCP  = !atEq && Math.abs(i - currentPrice) < 0.25;
    const isEP  = showEqLines && Math.abs(i - eq.p)   < 0.15;
    const isQd  = !atEq && Math.abs(i - qd) < 0.25;
    const isQs  = !atEq && Math.abs(i - qs) < 0.25;
    const isEQ  = showEqLines && atEq && Math.abs(i - eq.q) < 0.15;
    if (!isCP && !isEP)         s += `<text x="${pad.l-4}" y="${gy(i)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*vDisp)}</text>`;
    if (!isQd && !isQs && !isEQ) s += `<text x="${gx(i)}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*hDisp)}</text>`;
  }
  s += `<text x="${pad.l-6}" y="${H-pad.b+10}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
  s += `<text x="${pad.l+(W-pad.l-pad.r)/2}" y="${H-1}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${xLblDisp}</text>`;
  s += `<text x="${fs2}" y="${pad.t+(H-pad.t-pad.b)/2}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888" transform="rotate(-90,${fs2},${pad.t+(H-pad.t-pad.b)/2})">${yLbl}</text>`;

  // ── S & D curves ──────────────────────────────────────────────────────────
  const cd = clipLine(QS, dPf(QS, dA), QE, dPf(QE, dA), pad, W, H, 1);
  const cs = clipLine(QS, sPf(QS, sA), QE, sPf(QE, sA), pad, W, H);
  if (cd) s += `<line x1="${cd.x1}" y1="${cd.y1}" x2="${cd.x2}" y2="${cd.y2}" stroke="${dCol}" stroke-width="2.5" stroke-linecap="round"/><text x="${cd.x2+4}" y="${cd.y2}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${dCol}" font-weight="bold">D</text>`;
  if (cs) s += `<line x1="${cs.x1}" y1="${cs.y1}" x2="${cs.x2}" y2="${cs.y2}" stroke="${sCol}" stroke-width="2.5" stroke-linecap="round"/><text x="${cs.x2+4}" y="${Math.min(cs.y1,cs.y2)}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${sCol}" font-weight="bold">S</text>`;

  if (atEq) {
    // ── At equilibrium — standard eq dot + dashed lines ────────────────────
    if (eq.q >= QS && eq.q <= QE && eq.p >= 1 && eq.p <= GRID) {
      const ex = gx(eq.q), ey = gy(eq.p);
      if (showEqLines) {
        s += `<line x1="${pad.l}" y1="${ey}" x2="${ex}" y2="${ey}" stroke="#888" stroke-width="1" stroke-dasharray="5,4"/>`;
        s += `<line x1="${ex}" y1="${H-pad.b}" x2="${ex}" y2="${ey}" stroke="#888" stroke-width="1" stroke-dasharray="5,4"/>`;
        s += `<circle cx="${ex}" cy="${ey}" r="6" fill="#D85A30" stroke="white" stroke-width="2"/>`;
        if (!isAnimating) {
          s += `<text x="${pad.l-4}" y="${ey}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(eq.p*vDisp)}</text>`;
          s += `<text x="${ex}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(eq.q*hDisp)}</text>`;
        }
      }
    }
  } else {
    // ── Not at equilibrium — price mechanism display ───────────────────────
    const py   = gy(currentPrice);
    const qdV  = Math.max(QS, Math.min(QE, qd));
    const qsV  = Math.max(QS, Math.min(QE, qs));
    const xQd  = gx(qdV), xQs = gx(qsV);
    const xLeft  = Math.min(xQd, xQs);
    const xRight = Math.max(xQd, xQs);
    const xMid   = (xLeft + xRight) / 2;

    // Faint destination eq dot (visual hint of where the price is heading)
    if (eq.q >= QS && eq.q <= QE && eq.p >= 1 && eq.p <= GRID)
      s += `<circle cx="${gx(eq.q)}" cy="${gy(eq.p)}" r="4" fill="#D85A30" stroke="white" stroke-width="1.5" opacity="0.18"/>`;

    // Horizontal dashed price line
    s += `<line x1="${pad.l}" y1="${py}" x2="${W-pad.r}" y2="${py}" stroke="#555" stroke-width="1.2" stroke-dasharray="6,4" opacity="0.7"/>`;

    // Vertical dotted lines from Qd / Qs down to x-axis
    if (qd >= QS && qd <= QE)
      s += `<line x1="${xQd}" y1="${py}" x2="${xQd}" y2="${H-pad.b}" stroke="#888" stroke-width="1" stroke-dasharray="4,3" opacity="0.45"/>`;
    if (qs >= QS && qs <= QE)
      s += `<line x1="${xQs}" y1="${py}" x2="${xQs}" y2="${H-pad.b}" stroke="#888" stroke-width="1" stroke-dasharray="4,3" opacity="0.45"/>`;

    // ── Bracket + label (teacher preview OR during animation) ─────────────
    if (showBracket && xRight - xLeft > 5 && fadeFrac > 0.02) {
      const armLen = hasSurplus ? -16 : 16;    // bracket bar offset from price line
      const barY   = py + armLen;
      const op     = fadeFrac.toFixed(2);

      // Left & right vertical arms
      s += `<line x1="${xLeft}"  y1="${py}" x2="${xLeft}"  y2="${barY}" stroke="${bracketCol}" stroke-width="1.5" opacity="${op}"/>`;
      s += `<line x1="${xRight}" y1="${py}" x2="${xRight}" y2="${barY}" stroke="${bracketCol}" stroke-width="1.5" opacity="${op}"/>`;
      // Horizontal bar
      s += `<line x1="${xLeft}" y1="${barY}" x2="${xRight}" y2="${barY}" stroke="${bracketCol}" stroke-width="1.5" opacity="${op}"/>`;
      // Centre arrow pointing toward equilibrium (down for surplus, up for shortage)
      const arrowTip = hasSurplus ? py + 9 : py - 9;
      s += `<line x1="${xMid}" y1="${barY}" x2="${xMid}" y2="${arrowTip}" stroke="${bracketCol}" stroke-width="1.5" marker-end="url(#arr)" opacity="${op}"/>`;
      // Label
      const labelY = hasSurplus ? barY - 11 : barY + 11;
      s += `<text x="${xMid}" y="${labelY}" text-anchor="middle" font-size="${fs}" font-family="Verdana" font-weight="bold" fill="${bracketCol}" opacity="${op}">${label}</text>`;
    }

    // Y-axis label for starting price
    s += `<text x="${pad.l-4}" y="${py}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#444" font-weight="bold">${fmt(currentPrice*vDisp)}</text>`;

    // X-axis labels for Qd and Qs (hidden during animation to avoid flicker)
    if (!isAnimating) {
      if (qd >= QS && qd <= QE) s += `<text x="${xQd}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(qdV*hDisp)}</text>`;
      if (qs >= QS && qs <= QE) s += `<text x="${xQs}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(qsV*hDisp)}</text>`;
    }

    // Curve-tracing dots — same colour and size as the equilibrium dot
    if (qd >= QS && qd <= QE) s += `<circle cx="${xQd}" cy="${py}" r="6" fill="#D85A30" stroke="white" stroke-width="2"/>`;
    if (qs >= QS && qs <= QE) s += `<circle cx="${xQs}" cy="${py}" r="6" fill="#D85A30" stroke="white" stroke-width="2"/>`;
  }

  return s;
}

// ── CONTROLS ──────────────────────────────────────────────────────────────────
function pmShift(curve, dir) {
  if (pmCurveAnim) return;
  const nD = curve === 'd' ? pmDS + dir : pmDS;
  const nS = curve === 's' ? pmSS + dir : pmSS;
  if (nD < -2 || nD > 2 || nS < -2 || nS > 2) return;
  const fD = pmDA, fS = pmSA;
  pmDS = nD; pmSS = nS;
  const start = performance.now(), dur = 500;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    pmDA = fD + (nD - fD) * e;
    pmSA = fS + (nS - fS) * e;
    pmDraw();
    if (t < 1) pmCurveAnim = requestAnimationFrame(step);
    else { pmDA = nD; pmSA = nS; pmCurveAnim = null; pmDraw(); }
  }
  pmCurveAnim = requestAnimationFrame(step);
}

function pmReset() {
  if (pmCurveAnim) { cancelAnimationFrame(pmCurveAnim); pmCurveAnim = null; }
  pmDA = 0; pmSA = 0; pmDS = 0; pmSS = 0;
  pmDraw();
}

function pmSetPrice(val) {
  pmPrice = parseInt(val);
  document.getElementById('pmPriceVal').textContent = pmPrice;
  pmDraw();
}

// ── QUESTION BUILD / VALIDATE / SAVE ──────────────────────────────────────────
function pmGetCorrect() {
  for (let r of document.querySelectorAll('input[name="pmC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

function pmBuildQ() {
  const vU = parseFloat(document.getElementById('pmVUnit').value) || 1;
  const hU = parseFloat(document.getElementById('pmHUnit').value) || 5;
  return {
    type:         'pm',
    title:         document.getElementById('pmTitle').value,
    yLabel:        getYLbl('pmYLbl', vU),
    xLabel:        document.getElementById('pmXLbl').value || 'Quantity',
    dColor:        document.getElementById('pmDCol').value,
    sColor:        document.getElementById('pmSCol').value,
    vUnit: vU, hUnit: hU,
    dShift:        pmDS,
    sShift:        pmSS,
    startPrice:    pmPrice,
    showEqLines:   document.getElementById('pmShowEq').checked,
    animatePrice:  document.getElementById('pmAnimatePrice').checked,
    questionText:  document.getElementById('pmQText').value,
    answers:       [0,1,2,3].map(i => document.getElementById('pmA' + i).value),
    correctIndex:  pmGetCorrect()
  };
}

function pmAddQ() {
  const q   = pmBuildQ();
  const msg = document.getElementById('pmMsg');
  // PM-specific validation: starting price must differ from equilibrium
  const eq = getEq(pmDS, pmSS);
  if (Math.abs(pmPrice - eq.p) < 0.1) {
    msg.textContent = '⚠ Starting price equals equilibrium — move the slider above or below to show a surplus or shortage.';
    return;
  }
  addToQuiz(q, 'pmMsg', pmClearForm);
}

function pmClearForm() {
  pmDA = 0; pmSA = 0; pmDS = 0; pmSS = 0; pmPrice = 7;
  document.getElementById('pmAnimatePrice').checked = true;
  document.getElementById('pmPriceSlider').value = 7;
  document.getElementById('pmPriceVal').textContent = '7';
  document.getElementById('pmQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('pmA' + i).value = '');
  document.querySelectorAll('input[name="pmC"]').forEach(r => r.checked = false);
  pmDraw();
}

function pmLoad(q) {
  document.getElementById('pmQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('pmA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="pmC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });
  if (q.type === 'pm') {
    document.getElementById('pmVUnit').value     = q.vUnit  || 1;
    document.getElementById('pmHUnit').value     = q.hUnit  || 5;
    document.getElementById('pmTitle').value     = q.title  || '';
    document.getElementById('pmYLbl').value      = q.yLabel || 'Price ($)';
    document.getElementById('pmXLbl').value      = q.xLabel || 'Quantity';
    document.getElementById('pmDCol').value      = q.dColor || '#185FA5';
    document.getElementById('pmSCol').value      = q.sColor || '#0F6E56';
    document.getElementById('pmShowEq').checked    = q.showEqLines !== false;
    document.getElementById('pmAnimatePrice').checked = q.animatePrice !== false;
    pmDS = q.dShift || 0; pmSS = q.sShift || 0;
    pmDA = pmDS; pmSA = pmSS;
    pmPrice = q.startPrice || 7;
    document.getElementById('pmPriceSlider').value = pmPrice;
    document.getElementById('pmPriceVal').textContent = pmPrice;
    pmDraw();
  }
  document.getElementById('pmMsg').textContent = '✏ Editing — update settings if needed, then click Update Question.';
}

function pmPreview() {
  const q = pmBuildQ();
  if (!q.questionText.trim()) { document.getElementById('pmMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}
