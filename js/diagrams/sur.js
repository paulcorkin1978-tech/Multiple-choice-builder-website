// ── CONSUMER / PRODUCER SURPLUS & DEADWEIGHT LOSS BUILDER ────────────────────
// Static surplus diagram + multiple-choice question. The chosen areas reveal
// step by step in the quiz (like the Tax builder). Rendering lives in utils.js
// (surInner) so it is shared with the export.
// Depends on: utils.js (surInner), app.js (addToQuiz, quizQuestions).

var surMode = 'eq';

// Reads the controls into a question-shaped object.
function surGet() {
  var reveals = [];
  if (document.getElementById('surRevCS').checked)     reveals.push('CS');
  if (document.getElementById('surRevPS').checked)     reveals.push('PS');
  if (document.getElementById('surRevLossCS').checked) reveals.push('LOSSCS');
  if (document.getElementById('surRevLossPS').checked) reveals.push('LOSSPS');
  if (document.getElementById('surRevDWL').checked)    reveals.push('DWL');
  if (document.getElementById('surRevTAX').checked)    reveals.push('TAX');
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
    showLetters: document.getElementById('surLetters').checked,
    reveals: reveals
  };
}

// Live preview shows every chosen area (final revealed state) for the teacher.
function surDraw() {
  document.getElementById('surChart').innerHTML = surInner(surGet());
}

// Switch distortion mode: highlight button, reconfigure the parameter slider.
function surSetMode(m) {
  surMode = m;
  var row = document.getElementById('surModeRow');
  [].forEach.call(row.querySelectorAll('.btn'), function(b){ b.classList.toggle('btn-primary', b.dataset.m === m); });
  var pw = document.getElementById('surParamWrap'), sl = document.getElementById('surParam'), lbl = document.getElementById('surParamLabel');
  document.getElementById('surRevTAXwrap').style.display = (m === 'tax') ? '' : 'none';
  if (m === 'eq') { pw.style.display = 'none'; }
  else {
    pw.style.display = '';
    if (m === 'qty')   { lbl.textContent = 'Restricted quantity (Q)';                 sl.min = 5; sl.max = 49; sl.step = 1; sl.value = 40; }
    else if (m === 'tax')   { lbl.textContent = 'Tax per unit ($)';                   sl.min = 4; sl.max = 90; sl.step = 2; sl.value = 20; }
    else if (m === 'price') { lbl.textContent = 'Controlled price ($) — over 50 = floor, under = ceiling'; sl.min = 5; sl.max = 95; sl.step = 5; sl.value = 60; }
  }
  surDraw();
}

function surReset() {
  document.getElementById('surVUnit').value = 50;
  document.getElementById('surHUnit').value = 50;
  document.getElementById('surTitle').value = '';
  document.getElementById('surYLbl').value = 'Price ($)';
  document.getElementById('surXLbl').value = 'Quantity';
  document.getElementById('surDCol').value = '#185FA5';
  document.getElementById('surSCol').value = '#0F6E56';
  document.getElementById('surLetters').checked = false;
  ['surRevCS','surRevPS','surRevDWL','surRevTAX'].forEach(function(id){ document.getElementById(id).checked = true; });
  ['surRevLossCS','surRevLossPS'].forEach(function(id){ document.getElementById(id).checked = false; });
  surClearAnswers();
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
  var rv = q.reveals || [];
  document.getElementById('surRevCS').checked     = rv.indexOf('CS')     >= 0;
  document.getElementById('surRevPS').checked     = rv.indexOf('PS')     >= 0;
  document.getElementById('surRevLossCS').checked = rv.indexOf('LOSSCS') >= 0;
  document.getElementById('surRevLossPS').checked = rv.indexOf('LOSSPS') >= 0;
  document.getElementById('surRevDWL').checked    = rv.indexOf('DWL')    >= 0;
  document.getElementById('surRevTAX').checked    = rv.indexOf('TAX')    >= 0;
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
