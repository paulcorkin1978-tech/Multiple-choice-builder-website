// ── TRADE PROTECTION BUILDER ─────────────────────────────────────────────────
// Protection on an imported good in a small open economy. The world price sits
// below the domestic equilibrium (so the country imports). Three modes:
//   'tariff'  — a per-unit tariff raises the domestic price to Pw + t.
//   'quota'   — a limit on imports raises the price to Pq (where the domestic
//               supply/demand gap equals the allowed quota).
//   'subsidy' — a per-unit production subsidy leaves the price at Pw (consumption
//               unchanged) but lifts domestic output to where supply meets Pw + s.
// Toggleable shaded areas (tariff revenue / subsidy cost, domestic producer
// revenue, import spending) and quantity brackets (rise in production, fall in
// consumption) reveal one at a time in the quiz. Rendering lives in utils.js
// (tradeInner) so it is shared with the export.
// Depends on: utils.js (tradeInner), app.js (addToQuiz, quizQuestions).

var trMode = 'tariff';   // 'tariff', 'quota' or 'subsidy'

// Switches policy mode: relabels the policy control + reveal, swaps in a sensible
// default value, shows/hides the "fall in consumption" reveal, and redraws.
function trSetMode(m) {
  trMode = m;
  var btns = document.querySelectorAll('#trModeRow [data-m]');
  for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('btn-primary', btns[i].getAttribute('data-m') === m);
  var polLbl   = document.getElementById('trPolicyLabel');
  var wedgeLbl = document.getElementById('trRevWedgeLabel');
  var input    = document.getElementById('trTariff');
  var consLbl  = document.getElementById('trRevConsDecLabel');
  if (m === 'quota') {
    if (polLbl)  polLbl.textContent  = 'Quota (units of imports allowed)';
    if (wedgeLbl) wedgeLbl.textContent = 'Quota size (bracket)';
    if (consLbl) consLbl.textContent = 'Bracket: fall in consumption';
    input.value = 40;
  } else if (m === 'subsidy') {
    if (polLbl)  polLbl.textContent  = 'Subsidy ($ per unit)';
    if (wedgeLbl) wedgeLbl.textContent = 'Subsidy cost';
    if (consLbl) consLbl.textContent = 'Bracket: subsidy size';   // consumption is unchanged; reuse this toggle for the subsidy-size bracket
    input.value = 20;
  } else {
    if (polLbl)  polLbl.textContent  = 'Tariff ($ per unit)';
    if (wedgeLbl) wedgeLbl.textContent = 'Tariff revenue';
    if (consLbl) consLbl.textContent = 'Bracket: fall in consumption';
    input.value = 20;
  }
  var s2Row = document.getElementById('trRevS2Row');   // the hide-until-revealed shift only applies to a subsidy
  if (s2Row) s2Row.style.display = (m === 'subsidy') ? 'flex' : 'none';
  trStepPolicy(0);   // clamp the default to the current world price + redraw
}

// Reads the controls into a question-shaped object.
function trGet() {
  var reveals = [];
  var s2El = document.getElementById('trRevS2');
  if (s2El && s2El.checked && trMode === 'subsidy') reveals.push('s2');   // supply shift stays hidden until revealed (drawn first, before any bracket)
  if (document.getElementById('trRevTariff').checked)   reveals.push('tariffrev');
  if (document.getElementById('trRevDomProd').checked)  reveals.push('domprod');
  if (document.getElementById('trRevImports').checked)  reveals.push('imports');
  if (document.getElementById('trRevProdInc').checked)  reveals.push('prodinc');
  var plEl = document.getElementById('trRevProdLvl'); if (plEl && plEl.checked) reveals.push('prodlvl');
  var ilEl = document.getElementById('trRevImpLvl');  if (ilEl && ilEl.checked) reveals.push('implvl');
  if (document.getElementById('trRevConsDec').checked)  reveals.push('consdec');
  var vU = parseFloat(document.getElementById('trVUnit').value);
  var hU = parseFloat(document.getElementById('trHUnit').value);
  var wp = parseFloat(document.getElementById('trWorld').value);
  var val = parseFloat(document.getElementById('trTariff').value);   // tariff $ or quota units
  var q = {
    type: 'trade',
    mode: trMode,
    title: document.getElementById('trTitle').value.trim(),
    yLbl:  document.getElementById('trYLbl').value.trim() || 'Price ($)',
    xLbl:  document.getElementById('trXLbl').value.trim() || 'Quantity',
    dCol:  document.getElementById('trDCol').value,
    sCol:  document.getElementById('trSCol').value,
    vUnit: (isFinite(vU) && vU > 0) ? vU : 10,
    hUnit: (isFinite(hU) && hU > 0) ? hU : 10,
    worldPrice: (isFinite(wp) ? wp : 20),
    reveals: reveals,
    hideGrid: document.getElementById('trHideGrid').checked,
    hideNums: document.getElementById('trHideNums').checked
  };
  if (trMode === 'quota')        q.quota   = isFinite(val) ? val : 40;
  else if (trMode === 'subsidy') q.subsidy = isFinite(val) ? val : 20;
  else                           q.tariff  = isFinite(val) ? val : 20;
  return q;
}

// Live preview shows every chosen area (final revealed state) for the teacher.
function trDraw() {
  var vU = parseFloat(document.getElementById('trVUnit').value) || 10;
  var hU = parseFloat(document.getElementById('trHUnit').value) || 10;
  document.getElementById('trChart').innerHTML = '<svg width="100%" viewBox="0 0 400 340">' + tradeInner(trGet()) + '</svg>';

  // Readout mirrors the on-grid snapping the renderer uses (values round to whole intervals).
  var wp = parseFloat(document.getElementById('trWorld').value) || 0;
  var val = parseFloat(document.getElementById('trTariff').value) || 0;
  var gPw = Math.round(wp / vU); if (gPw < 1) gPw = 1; if (gPw > 4) gPw = 4;
  var autarky = 5 * vU;
  var el = document.getElementById('trTariffVal');
  if (!el) return;
  if (trMode === 'quota') {
    var freeImp = 10 - 2 * gPw;                        // free-trade imports (grid)
    var gQq = Math.round(val / hU); if (gQq > freeImp) gQq = freeImp; if (gQq < 0) gQq = 0;
    var gPtq = (10 - gQq) / 2; if (gPtq > 5) gPtq = 5; if (gPtq < gPw) gPtq = gPw;
    if (gQq <= 0) el.textContent = 'Prohibitive quota (0 imports): price = $' + autarky;
    else el.textContent = 'Quota ' + (gQq * hU) + ' units of imports -> domestic price $' + Math.round(gPtq * vU);
  } else if (trMode === 'subsidy') {
    var gPts = gPw + Math.round(val / vU);
    var caps = 10 - gPw; if (gPts > caps) gPts = caps; if (gPts < gPw) gPts = gPw;
    var imp = (10 - gPw - gPts) * hU;                  // imports = (Qd0 - Qst) in display units
    if (imp <= 0) el.textContent = 'Subsidy large enough for self-sufficiency: imports = 0';
    else el.textContent = 'Producers receive $' + Math.round(gPts * vU) + '/unit; imports fall to ' + imp + ' units (consumption unchanged)';
  } else {
    var gPtt = gPw + Math.round(val / vU); if (gPtt > 5) gPtt = 5;
    if (gPtt >= 5) el.textContent = 'Prohibitive tariff: price = $' + autarky + ', imports = 0';
    else el.textContent = 'Domestic price with tariff: $' + Math.round(gPtt * vU);
  }
}

// The world price and policy size are adjusted only by these +/- steppers, so
// every value is a whole gridline interval (no off-grid typing).
function trStepWorld(dir) {
  var vU = parseFloat(document.getElementById('trVUnit').value) || 10;
  var g = Math.round((parseFloat(document.getElementById('trWorld').value) || 0) / vU) + dir;
  if (g < 1) g = 1; if (g > 4) g = 4;                 // world price on gridlines 1..4 (below equilibrium at 5)
  document.getElementById('trWorld').value = g * vU;
  trStepPolicy(0);                                    // re-clamp the policy to the new world price, then redraw
}

function trStepPolicy(dir) {
  var vU = parseFloat(document.getElementById('trVUnit').value) || 10;
  var hU = parseFloat(document.getElementById('trHUnit').value) || 10;
  var gPw = Math.round((parseFloat(document.getElementById('trWorld').value) || 0) / vU); if (gPw < 1) gPw = 1; if (gPw > 4) gPw = 4;
  var pEl = document.getElementById('trTariff');
  if (trMode === 'quota') {
    var g = Math.round((parseFloat(pEl.value) || 0) / hU) + dir;
    var freeImp = 10 - 2 * gPw;                        // most imports free trade allows (grid)
    if (g < 0) g = 0; if (g > freeImp) g = freeImp;
    pEl.value = g * hU;
  } else {
    var g2 = Math.round((parseFloat(pEl.value) || 0) / vU) + dir;
    var maxg = (trMode === 'subsidy') ? (10 - 2 * gPw) : (5 - gPw);   // subsidy -> self-sufficiency; tariff -> autarky
    if (g2 < 1) g2 = 1; if (g2 > maxg) g2 = maxg;
    pEl.value = g2 * vU;
  }
  trDraw();
}

function trReset() {
  document.getElementById('trVUnit').value = 10;
  document.getElementById('trHUnit').value = 10;
  document.getElementById('trTitle').value = '';
  document.getElementById('trYLbl').value = 'Price ($)';
  document.getElementById('trXLbl').value = 'Quantity';
  document.getElementById('trDCol').value = '#000000';
  document.getElementById('trSCol').value = '#000000';
  document.getElementById('trWorld').value = 20;
  ['trRevTariff', 'trRevDomProd', 'trRevImports'].forEach(function (id) { document.getElementById(id).checked = true; });
  ['trRevProdInc', 'trRevConsDec', 'trRevS2', 'trRevProdLvl', 'trRevImpLvl'].forEach(function (id) { var e = document.getElementById(id); if (e) e.checked = false; });
  document.getElementById('trHideGrid').checked = false;
  document.getElementById('trHideNums').checked = false;
  trClearAnswers();
  trSetMode('tariff');   // sets the policy input default + labels, then draws
}

function trClearAnswers() {
  document.getElementById('trQText').value = '';
  for (var i = 0; i < 4; i++) document.getElementById('trA' + i).value = '';
  var r = document.querySelector('input[name="trC"]:checked');
  if (r) r.checked = false;
  var msg = document.getElementById('trMsg');
  if (msg) msg.textContent = '';
}

function trAddQ() {
  var q = trGet();
  q.questionText = document.getElementById('trQText').value;
  q.answers = [0, 1, 2, 3].map(function (i) { return document.getElementById('trA' + i).value; });
  var r = document.querySelector('input[name="trC"]:checked');
  q.correctIndex = r ? parseInt(r.value) : -1;
  addToQuiz(q, 'trMsg', trClearAnswers);
}

function trLoad(q) {
  document.getElementById('trVUnit').value = q.vUnit != null ? q.vUnit : 10;
  document.getElementById('trHUnit').value = q.hUnit != null ? q.hUnit : 10;
  document.getElementById('trTitle').value = q.title || '';
  document.getElementById('trYLbl').value = q.yLbl || 'Price ($)';
  document.getElementById('trXLbl').value = q.xLbl || 'Quantity';
  document.getElementById('trDCol').value = q.dCol || '#185FA5';
  document.getElementById('trSCol').value = q.sCol || '#0F6E56';
  document.getElementById('trWorld').value = q.worldPrice != null ? q.worldPrice : 20;
  trSetMode(q.mode === 'quota' ? 'quota' : (q.mode === 'subsidy' ? 'subsidy' : 'tariff'));   // relabels + sets default input
  // then override the input with the saved value
  if (q.mode === 'quota')        document.getElementById('trTariff').value = q.quota   != null ? q.quota   : 40;
  else if (q.mode === 'subsidy') document.getElementById('trTariff').value = q.subsidy != null ? q.subsidy : 20;
  else                           document.getElementById('trTariff').value = q.tariff  != null ? q.tariff  : 20;
  var rv = q.reveals || [];
  document.getElementById('trRevTariff').checked  = rv.indexOf('tariffrev') >= 0;
  document.getElementById('trRevDomProd').checked = rv.indexOf('domprod')   >= 0;
  document.getElementById('trRevImports').checked = rv.indexOf('imports')   >= 0;
  document.getElementById('trRevProdInc').checked = rv.indexOf('prodinc')   >= 0;
  var plEl = document.getElementById('trRevProdLvl'); if (plEl) plEl.checked = rv.indexOf('prodlvl') >= 0;
  var ilEl = document.getElementById('trRevImpLvl');  if (ilEl) ilEl.checked = rv.indexOf('implvl')  >= 0;
  document.getElementById('trRevConsDec').checked = rv.indexOf('consdec')   >= 0;
  var s2El = document.getElementById('trRevS2'); if (s2El) s2El.checked = rv.indexOf('s2') >= 0;
  document.getElementById('trHideGrid').checked = !!q.hideGrid;
  document.getElementById('trHideNums').checked = !!q.hideNums;
  document.getElementById('trQText').value = q.questionText || '';
  for (var i = 0; i < 4; i++) document.getElementById('trA' + i).value = (q.answers && q.answers[i]) || '';
  if (q.correctIndex >= 0) { var r = document.querySelector('input[name="trC"][value="' + q.correctIndex + '"]'); if (r) r.checked = true; }
  trDraw();
}

function trPreview() {
  var q = trGet();
  q.questionText = document.getElementById('trQText').value || '(preview)';
  var raw = [0, 1, 2, 3].map(function (i) { return document.getElementById('trA' + i).value; });
  var r = document.querySelector('input[name="trC"]:checked');
  var chosen = r ? parseInt(r.value) : 0;
  var filled = [], nc = -1;
  raw.forEach(function (a, i) { if (a && a.trim()) { if (i === chosen) nc = filled.length; filled.push(a.trim()); } });
  if (filled.length < 2) { filled = ['Option A', 'Option B']; nc = 0; }
  q.answers = filled;
  q.correctIndex = nc < 0 ? 0 : nc;
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], { type: 'text/html' })), '_blank');
}
