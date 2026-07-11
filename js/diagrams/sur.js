// ── CONSUMER / PRODUCER SURPLUS & DEADWEIGHT LOSS BUILDER ────────────────────
// Static surplus diagram + multiple-choice question. The chosen areas reveal
// step by step in the quiz (like the Tax builder). Rendering lives in utils.js
// (surInner) so it is shared with the export.
// Depends on: utils.js (surInner), app.js (addToQuiz, quizQuestions).

var surMode = 'eq';

// Reads the controls into a question-shaped object.
function surGet() {
  var ext = surIsExt(surMode);
  var policy = ext && document.getElementById('surPolicy').checked;
  var reveals = [];
  if (document.getElementById('surRevCS').checked)     reveals.push('CS');
  if (document.getElementById('surRevPS').checked)     reveals.push('PS');
  if (ext) {
    if (document.getElementById('surRevEXT').checked)  reveals.push('EXT');
    if (policy) { if (document.getElementById('surRevPOL').checked) reveals.push('POL'); }
    else        { if (document.getElementById('surRevDWL').checked) reveals.push('DWL'); }
  } else {
    if (document.getElementById('surRevLossCS').checked) reveals.push('LOSSCS');
    if (document.getElementById('surRevLossPS').checked) reveals.push('LOSSPS');
    if (document.getElementById('surRevDWL').checked)    reveals.push('DWL');
    if (document.getElementById('surRevTAX').checked)    reveals.push('TAX');
  }
  var param = surMode === 'eq' ? 0 : parseFloat(document.getElementById('surParam').value);
  var vU = parseFloat(document.getElementById('surVUnit').value);
  var hU = parseFloat(document.getElementById('surHUnit').value);
  return {
    type: 'sur',
    vUnit: (isFinite(vU) && vU > 0) ? vU : 50,
    hUnit: (isFinite(hU) && hU > 0) ? hU : 50,
    title: document.getElementById('surTitle').value.trim(),
    yLbl:  document.getElementById('surYLbl').value.trim() || 'Price ($)',
    xLbl:  document.getElementById('surXLbl').value.trim() || 'Quantity',
    dCol:  document.getElementById('surDCol').value,
    sCol:  document.getElementById('surSCol').value,
    mode:  surMode,
    param: param,
    showPolicy: policy,
    showLetters: document.getElementById('surLetters').checked,
    reveals: reveals
  };
}

// Live preview shows every chosen area (final revealed state) for the teacher.
function surDraw() {
  document.getElementById('surChart').innerHTML = surInner(surGet());
}

// Switch distortion mode: highlight button, reconfigure the parameter slider,
// and swap the reveal checkboxes between the market set and the externality set.
function surSetMode(m) {
  // Re-entering the same mode (e.g. from the policy toggle) must not reset the slider
  var fresh = (surMode !== m);
  surMode = m;
  var ext = surIsExt(m);
  var row = document.getElementById('surModeRow');
  [].forEach.call(row.querySelectorAll('.btn'), function(b){ b.classList.toggle('btn-primary', b.dataset.m === m); });
  var pw = document.getElementById('surParamWrap'), sl = document.getElementById('surParam'), lbl = document.getElementById('surParamLabel');
  document.getElementById('surRevTAXwrap').style.display   = (m === 'tax') ? 'flex' : 'none';
  document.getElementById('surLossWrap').style.display     = ext ? 'none' : 'flex';
  document.getElementById('surExtWrap').style.display      = ext ? 'flex' : 'none';
  document.getElementById('surPolicyWrap').style.display   = ext ? '' : 'none';
  // "Deadweight loss" and "Tax revenue / Subsidy cost" are mutually exclusive:
  // once the policy corrects the market there is no welfare loss left to shade.
  var policy = ext && document.getElementById('surPolicy').checked;
  document.getElementById('surRevPOLwrap').style.display = (ext && policy) ? 'flex' : 'none';
  document.getElementById('surRevDWLwrap').style.display = (ext && policy) ? 'none' : 'flex';
  var polLbl = document.getElementById('surRevPOLlabel');
  if (polLbl) polLbl.textContent = (m === 'negext') ? 'Tax revenue' : 'Subsidy cost';
  var extLbl = document.getElementById('surRevEXTlabel');
  if (extLbl) extLbl.textContent = (m === 'negext') ? 'External cost' : 'External benefit';
  if (m === 'eq') { pw.style.display = 'none'; }
  else {
    pw.style.display = '';
    if (m === 'qty')   { lbl.textContent = 'Restricted quantity (Q)';                 sl.min = 5; sl.max = 49; sl.step = 1; if (fresh) sl.value = 40; }
    else if (m === 'tax')   { lbl.textContent = 'Tax per unit ($)';                   sl.min = 4; sl.max = 90; sl.step = 2; if (fresh) sl.value = 20; }
    else if (m === 'price') { lbl.textContent = 'Controlled price ($) — over 50 = floor, under = ceiling'; sl.min = 5; sl.max = 95; sl.step = 5; if (fresh) sl.value = 60; }
    else if (m === 'negext'){ lbl.textContent = 'External cost per unit ($)';    sl.min = 5; sl.max = 40; sl.step = 5; if (fresh) sl.value = 20; }
    else if (m === 'posext'){ lbl.textContent = 'External benefit per unit ($)'; sl.min = 5; sl.max = 40; sl.step = 5; if (fresh) sl.value = 20; }
  }
  surDraw();
}

// The policy checkbox changes which reveals make sense, so it re-runs the mode setup.
function surTogglePolicy() { surSetMode(surMode); }

function surReset() {
  document.getElementById('surVUnit').value = 50;
  document.getElementById('surHUnit').value = 50;
  document.getElementById('surTitle').value = '';
  document.getElementById('surYLbl').value = 'Price ($)';
  document.getElementById('surXLbl').value = 'Quantity';
  document.getElementById('surDCol').value = '#000000';
  document.getElementById('surSCol').value = '#000000';
  document.getElementById('surLetters').checked = false;
  document.getElementById('surPolicy').checked = false;
  ['surRevCS','surRevPS','surRevDWL','surRevTAX','surRevEXT','surRevPOL'].forEach(function(id){ document.getElementById(id).checked = true; });
  ['surRevLossCS','surRevLossPS'].forEach(function(id){ document.getElementById(id).checked = false; });
  surClearAnswers();
  surMode = '';            // force surSetMode to treat 'eq' as a fresh mode
  surSetMode('eq');
}

function surClearAnswers() {
  document.getElementById('surQText').value = '';
  for (var i = 0; i < 4; i++) document.getElementById('sur' + 'A' + i).value = '';
  var r = document.querySelector('input[name="surC"]:checked');
  if (r) r.checked = false;
  var msg = document.getElementById('surMsg');
  if (msg) msg.textContent = '';
}

function surAddQ() {
  var q = surGet();
  q.questionText = document.getElementById('surQText').value;
  q.answers = [0,1,2,3].map(function(i){ return document.getElementById('sur' + 'A' + i).value; });
  var r = document.querySelector('input[name="surC"]:checked');
  q.correctIndex = r ? parseInt(r.value) : -1;
  addToQuiz(q, 'surMsg', surClearAnswers);
}

function surLoad(q) {
  document.getElementById('surVUnit').value = q.vUnit != null ? q.vUnit : 50;
  document.getElementById('surHUnit').value = q.hUnit != null ? q.hUnit : 50;
  document.getElementById('surTitle').value = q.title || '';
  document.getElementById('surYLbl').value = q.yLbl || 'Price ($)';
  document.getElementById('surXLbl').value = q.xLbl || 'Quantity';
  document.getElementById('surDCol').value = q.dCol || '#185FA5';
  document.getElementById('surSCol').value = q.sCol || '#0F6E56';
  document.getElementById('surLetters').checked = !!q.showLetters;
  document.getElementById('surPolicy').checked  = !!q.showPolicy;
  var rv = q.reveals || [];
  document.getElementById('surRevCS').checked     = rv.indexOf('CS')     >= 0;
  document.getElementById('surRevPS').checked     = rv.indexOf('PS')     >= 0;
  document.getElementById('surRevLossCS').checked = rv.indexOf('LOSSCS') >= 0;
  document.getElementById('surRevLossPS').checked = rv.indexOf('LOSSPS') >= 0;
  document.getElementById('surRevDWL').checked    = rv.indexOf('DWL')    >= 0;
  document.getElementById('surRevTAX').checked    = rv.indexOf('TAX')    >= 0;
  document.getElementById('surRevEXT').checked    = rv.indexOf('EXT')    >= 0;
  document.getElementById('surRevPOL').checked    = rv.indexOf('POL')    >= 0;
  surMode = '';            // force a fresh mode setup, then restore the saved parameter
  surSetMode(q.mode || 'eq');
  if (q.mode && q.mode !== 'eq') document.getElementById('surParam').value = q.param;
  document.getElementById('surQText').value = q.questionText || '';
  for (var i = 0; i < 4; i++) document.getElementById('sur' + 'A' + i).value = (q.answers && q.answers[i]) || '';
  if (q.correctIndex >= 0) { var r = document.querySelector('input[name="surC"][value="' + q.correctIndex + '"]'); if (r) r.checked = true; }
  surDraw();
}

function surPreview() {
  var q = surGet();
  q.questionText = document.getElementById('surQText').value || '(preview)';
  var raw = [0,1,2,3].map(function(i){ return document.getElementById('sur' + 'A' + i).value; });
  var r = document.querySelector('input[name="surC"]:checked');
  var chosen = r ? parseInt(r.value) : 0;
  var filled = [], nc = -1;
  raw.forEach(function(a, i){ if (a && a.trim()) { if (i === chosen) nc = filled.length; filled.push(a.trim()); } });
  if (filled.length < 2) { filled = ['Option A', 'Option B']; nc = 0; }  // fallback so the preview isn't empty
  q.answers = filled;
  q.correctIndex = nc < 0 ? 0 : nc;
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], { type: 'text/html' })), '_blank');
}
