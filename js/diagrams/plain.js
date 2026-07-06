// ── PLAIN TEXT QUESTION BUILDER ───────────────────────────────────────────────
// A simple builder for multiple choice questions that need no diagram or table.
// The layout is full-width — there is no diagram panel.
// Depends on: app.js (quizQuestions, renderList, buildQuizHTML)

function plainGetCorrect() {
  for (const r of document.querySelectorAll('input[name="plainC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

function plainBuildQ() {
  return {
    type:         'plain',
    questionText: document.getElementById('plainQText').value,
    answers:      [0,1,2,3].map(i => document.getElementById('plainA' + i).value),
    correctIndex: plainGetCorrect()
  };
}

function plainAddQ() {
  const q = plainBuildQ();
  addToQuiz(q, 'plainMsg', plainReset);
}

function plainReset() {
  document.getElementById('plainQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('plainA' + i).value = '');
  document.querySelectorAll('input[name="plainC"]').forEach(r => r.checked = false);
}

// Pre-fills the plain builder when editing an existing question.
function plainLoad(q) {
  document.getElementById('plainQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('plainA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="plainC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });
  document.getElementById('plainMsg').textContent = '✏ Editing — make changes and click Update Question.';
}

function plainPreview() {
  const q = plainBuildQ();
  if (!q.questionText.trim()) { document.getElementById('plainMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}
