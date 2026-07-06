// ── PRICE ELASTICITY OF DEMAND (PED) BUILDER ─────────────────────────────────
// Static teaching diagram + multiple-choice question.
// The teacher sets up the scenario (starting price, price change, elasticity)
// with the controls; the student sees a static diagram and answers.
// Diagram rendering lives in utils.js (pedInner) so it is shared with the export.
// Depends on: utils.js (pedInner), app.js (addToQuiz, quizQuestions).

// Reads the current control values into a question-shaped object.
function pedGet() {
  const sp  = parseFloat(document.getElementById('pedStartPrice').value);
  const pc   = parseFloat(document.getElementById('pedPriceChange').value);
  const val  = parseFloat(document.getElementById('pedSlider').value);
  const perfectElastic = val > 2.05;
  const ped  = perfectElastic ? 2 : Math.round(val * 10) / 10;  // stored numeric; flag distinguishes ∞
  return {
    type: 'ped',
    title:      document.getElementById('pedTitle').value.trim(),
    yLbl:       document.getElementById('pedYLbl').value.trim() || 'Price ($)',
    xLbl:       document.getElementById('pedXLbl').value.trim() || 'Quantity',
    startPrice: (isFinite(sp) && sp > 0) ? sp : 10,
    pricePct:   (isFinite(pc) && pc !== 0) ? pc : 0.20,
    ped:        ped,
    perfectElastic: perfectElastic,
    color:      document.getElementById('pedCol').value
  };
}

// Redraws the live preview and the teacher-only readout (value, category, working).
function pedDraw() {
  const q = pedGet();
  document.getElementById('pedChart').innerHTML = pedInner(q);

  const f = n => Math.round(n * 100) / 100;
  const valEl = document.getElementById('pedVal');
  const catEl = document.getElementById('pedCat');
  const workEl = document.getElementById('pedWork');
  let catName, catColor;

  if (q.perfectElastic) {
    valEl.textContent = '∞';
    catName = 'Perfectly elastic'; catColor = '#0d9488';
    workEl.textContent = 'Any quantity demanded at $' + f(q.startPrice) + '.  PED = ∞';
  } else {
    const ped = q.ped;
    valEl.textContent = ped.toFixed(1);
    if (ped === 0)      { catName = 'Perfectly inelastic'; catColor = '#6b21a8'; }
    else if (ped < 1)   { catName = 'Inelastic';           catColor = '#185FA5'; }
    else if (ped === 1) { catName = 'Unit elastic';        catColor = '#15803d'; }
    else                { catName = 'Elastic';             catColor = '#EC3C78'; }
    const sgn = x => (x > 0 ? '+' : '') + x;
    const pctP = f(q.pricePct * 100);
    const pctQ = f(-ped * q.pricePct * 100);   // quantity moves opposite to price
    workEl.textContent = '%ΔP = ' + sgn(pctP) + '%   %ΔQ = ' + sgn(pctQ) + '%   PED = ' + ped.toFixed(1);
  }
  catEl.textContent = catName;
  catEl.style.background = catColor;
}

// +/- 0.1 stepping on the elasticity slider.
function pedNudge(d) {
  const sl = document.getElementById('pedSlider');
  let v = Math.round((parseFloat(sl.value) + d) * 10) / 10;
  v = Math.max(0, Math.min(2.1, v));
  sl.value = v;
  pedDraw();
}

// Clears just the question text + answers (keeps the diagram set-up).
function pedClearAnswers() {
  document.getElementById('pedQText').value = '';
  for (let i = 0; i < 4; i++) document.getElementById('ped' + 'A' + i).value = '';
  const r = document.querySelector('input[name="pedC"]:checked');
  if (r) r.checked = false;
  const msg = document.getElementById('pedMsg');
  if (msg) msg.textContent = '';
}

// Full reset back to defaults (used when opening a fresh question).
function pedReset() {
  document.getElementById('pedStartPrice').value = 10;
  document.getElementById('pedPriceChange').value = '0.2';
  document.getElementById('pedSlider').value = 0.5;
  document.getElementById('pedTitle').value = '';
  document.getElementById('pedYLbl').value = 'Price ($)';
  document.getElementById('pedXLbl').value = 'Quantity';
  document.getElementById('pedCol').value = '#185FA5';
  pedClearAnswers();
  pedDraw();
}

// Adds (or updates) the question via the shared save logic.
function pedAddQ() {
  const q = pedGet();
  q.questionText = document.getElementById('pedQText').value;
  q.answers = [0, 1, 2, 3].map(i => document.getElementById('ped' + 'A' + i).value);
  const r = document.querySelector('input[name="pedC"]:checked');
  q.correctIndex = r ? parseInt(r.value) : -1;
  addToQuiz(q, 'pedMsg', pedClearAnswers);
}

// Opens a saved PED question back into the builder for editing.
function pedLoad(q) {
  document.getElementById('pedStartPrice').value = q.startPrice != null ? q.startPrice : 10;
  document.getElementById('pedPriceChange').value = (q.pricePct != null ? q.pricePct : 0.2).toString();
  document.getElementById('pedSlider').value = q.perfectElastic ? 2.1 : (q.ped != null ? q.ped : 0.5);
  document.getElementById('pedTitle').value = q.title || '';
  document.getElementById('pedYLbl').value = q.yLbl || 'Price ($)';
  document.getElementById('pedXLbl').value = q.xLbl || 'Quantity';
  document.getElementById('pedCol').value = q.color || '#185FA5';
  document.getElementById('pedQText').value = q.questionText || '';
  for (let i = 0; i < 4; i++) document.getElementById('ped' + 'A' + i).value = (q.answers && q.answers[i]) || '';
  if (q.correctIndex >= 0) {
    const r = document.querySelector('input[name="pedC"][value="' + q.correctIndex + '"]');
    if (r) r.checked = true;
  }
  pedDraw();
}

// Opens a standalone preview of just this one question.
function pedPreview() {
  const q = pedGet();
  q.questionText = document.getElementById('pedQText').value || '(preview)';
  q.answers = [0, 1, 2, 3].map(i => document.getElementById('ped' + 'A' + i).value || ('Option ' + (i + 1)));
  const r = document.querySelector('input[name="pedC"]:checked');
  q.correctIndex = r ? parseInt(r.value) : 0;
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], { type: 'text/html' })), '_blank');
}
