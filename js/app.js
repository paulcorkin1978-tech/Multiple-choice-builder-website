// ── APP — Navigation, Quiz Management, Import, Download ───────────────────────
// Central controller: manages the quiz question list and screen navigation.
// Diagram files (sd.js, sc.js, etc.) push questions into quizQuestions and
// call renderList() to refresh the sidebar list.

// ── SHARED STATE ──────────────────────────────────────────────────────────────
let quizQuestions = [];
let editingIndex  = -1;   // -1 = adding new; ≥0 = editing that question index

// ── TYPE LABEL HELPER ─────────────────────────────────────────────────────────
function typeLabel(type) {
  return { plain:'Text', sc:'SC', sd:'S&D', ppf:'PPF', table:'Table', pm:'Price Mech', tax:'Tax/Sub' }[type] || type;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function openBuilder(type) {
  document.getElementById('menuScreen').style.display = 'none';
  if (type === 'sd') {
    document.getElementById('sdBuilder').classList.add('active');
    if (editingIndex < 0) {
      // Fresh question: clear any lingering start state from a previous abandoned session
      sdStartDS = 0; sdStartSS = 0;
      document.getElementById('sdStartCard').style.display = 'none';
      document.getElementById('sdCapCard').style.display  = 'none';
    }
    sdDraw();
    if (editingIndex >= 0) sdLoad(quizQuestions[editingIndex]);
  } else if (type === 'sc') {
    document.getElementById('scBuilder').classList.add('active');
    if (editingIndex < 0) {
      scStartCS = 0;
      document.getElementById('scStartCard').style.display = 'none';
      document.getElementById('scCapCard').style.display   = 'none';
    }
    scReset();
    if (editingIndex >= 0) scLoad(quizQuestions[editingIndex]);
  } else if (type === 'ppf') {
    document.getElementById('ppfBuilder').classList.add('active');
    ppfInit();
    if (editingIndex >= 0) ppfLoad(quizQuestions[editingIndex]);
  } else if (type === 'table') {
    document.getElementById('tableBuilder').classList.add('active');
    tblInit();
    if (editingIndex >= 0) tblLoad(quizQuestions[editingIndex]);
  } else if (type === 'pm') {
    document.getElementById('pmBuilder').classList.add('active');
    if (editingIndex < 0) {
      pmDA = 0; pmSA = 0; pmDS = 0; pmSS = 0; pmPrice = 7;
      document.getElementById('pmPriceSlider').value = 7;
      document.getElementById('pmPriceVal').textContent = '7';
    }
    pmDraw();
    if (editingIndex >= 0) pmLoad(quizQuestions[editingIndex]);
  } else if (type === 'tax') {
    document.getElementById('taxBuilder').classList.add('active');
    if (editingIndex < 0) {
      txStartDS = 0; txStartSS = 0; txType = 'tax';
      txSetType('tax');
      document.getElementById('txStartCard').style.display = 'none';
      document.getElementById('txCapCard').style.display   = 'none';
      txDA = 0; txSA = 0; txDS = 0; txSS = 0;
    }
    txDraw();
    if (editingIndex >= 0) txLoad(quizQuestions[editingIndex]);
  } else if (type === 'plain') {
    document.getElementById('plainBuilder').classList.add('active');
    if (editingIndex >= 0) plainLoad(quizQuestions[editingIndex]);
  }
  // Update Add button labels and position row visibility for edit vs new mode
  const label = editingIndex >= 0 ? '✓ Update Question' : '+ Add to Quiz';
  ['sdAddBtn','scAddBtn','ppfAddBtn','tblAddBtn','pmAddBtn','txAddBtn','plainAddBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = label;
  });
  document.querySelectorAll('.insertPosRow').forEach(row => {
    row.style.display = editingIndex >= 0 ? 'none' : '';
  });
}

// Returns to the main menu from any builder screen
function goMenu() {
  editingIndex = -1;  // cancel any in-progress edit
  document.getElementById('sdBuilder').classList.remove('active');
  document.getElementById('scBuilder').classList.remove('active');
  document.getElementById('ppfBuilder').classList.remove('active');
  document.getElementById('tableBuilder').classList.remove('active');
  document.getElementById('pmBuilder').classList.remove('active');
  document.getElementById('taxBuilder').classList.remove('active');
  document.getElementById('plainBuilder').classList.remove('active');
  document.getElementById('menuScreen').style.display = '';
  updateMenu();
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function editQ(i) {
  editingIndex = i;
  const q = quizQuestions[i];
  document.getElementById('editModalQNum').textContent  = i + 1;
  document.getElementById('editModalQText').textContent = q.questionText
    ? (q.questionText.length > 120 ? q.questionText.substring(0, 117) + '…' : q.questionText)
    : '(no question text)';
  // Highlight the current type button
  ['plain','sc','sd','ppf','table','pm','tax'].forEach(t => {
    const btn = document.getElementById('editType_' + t);
    if (btn) btn.classList.toggle('btn-primary', t === q.type);
  });
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  editingIndex = -1;
  document.getElementById('editModal').style.display = 'none';
}

function editWithType(type) {
  document.getElementById('editModal').style.display = 'none';
  openBuilder(type);
}

// ── MENU STATE ────────────────────────────────────────────────────────────────
function updateMenu() {
  const n       = quizQuestions.length;
  const section = document.getElementById('menuQuizSection');
  const listEl  = document.getElementById('menuQList');
  const titleEl = document.getElementById('menuQTitle');

  if (n) {
    section.style.display = '';
    if (titleEl) titleEl.textContent = `Quiz — ${n} question${n !== 1 ? 's' : ''}`;
    listEl.innerHTML = quizQuestions.map((q, i) =>
      `<div class="qitem">
        <span class="qitem-text">
          <em class="qtype-tag">${typeLabel(q.type)}</em>
          Q${i+1}: ${q.questionText ? q.questionText.substring(0, 55) + (q.questionText.length > 55 ? '…' : '') : '—'}
        </span>
        <div class="qitem-btns">
          <button class="btn btn-sm btn-edit" onclick="editQ(${i})" title="Edit">✏</button>
          <button class="btn btn-sm btn-danger" onclick="removeQ(${i})" title="Remove">✕</button>
        </div>
      </div>`
    ).join('');
  } else {
    section.style.display = 'none';
  }

  document.getElementById('menuInfo').textContent = n
    ? 'Questions saved — go back to add more, or download when ready.'
    : 'Build questions then download your quiz.';
  document.getElementById('dlBtnMenu').disabled = !n;
  const prev = document.getElementById('previewAllBtn');
  if (prev) prev.style.display = n ? '' : 'none';
  document.getElementById('clearBtn').style.display    = n ? '' : 'none';
  const saveBtn = document.getElementById('saveBankBtn');
  if (saveBtn) saveBtn.style.display = n ? '' : 'none';
  populatePositionSelects();
}

function clearQuiz() {
  quizQuestions = [];
  updateMenu();
}

// ── SAVE / LOAD QUESTION BANK (JSON) ─────────────────────────────────────────
// Unlike CSV import (text-only), this preserves ALL question data: diagram
// types, curve shifts, colours, units, start prices, answers, correct index.

async function saveBank() {
  if (!quizQuestions.length) return;
  const name = prompt('Name this question bank:', 'quiz-bank');
  if (name === null) return;  // user cancelled
  const filename = (name.trim() || 'quiz-bank').replace(/[^a-z0-9\-_ ]/gi, '') + '.json';
  const json = JSON.stringify(quizQuestions, null, 2);
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON Question Bank', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;  // user cancelled picker
      // fall through to old method
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = filename;
  a.click();
}

function loadBank() {
  document.getElementById('bankInput').click();
}

function handleBankFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Not an array');
      quizQuestions = data;
      updateMenu();
      const info = document.getElementById('menuInfo');
      info.textContent = `✓ Loaded ${data.length} question${data.length !== 1 ? 's' : ''} from saved bank.`;
      setTimeout(updateMenu, 4000);
    } catch(err) {
      const info = document.getElementById('menuInfo');
      info.textContent = '⚠ Could not load file — make sure it is a quiz-bank.json saved from this builder.';
      setTimeout(updateMenu, 4000);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// ── QUIZ LIST ─────────────────────────────────────────────────────────────────
// Parameters kept for API compatibility with diagram modules.
function renderList(listId, countId) {
  updateMenu();
}

function removeQ(i) {
  quizQuestions.splice(i, 1);
  updateMenu();
}

// ── INSERT POSITION ───────────────────────────────────────────────────────────
// Populates all "Insert at:" selects with current question positions.
function populatePositionSelects() {
  document.querySelectorAll('.insertPosSelect').forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = '<option value="-1">End of quiz</option>' +
      quizQuestions.map((q, i) =>
        `<option value="${i}">Before Q${i + 1}</option>`
      ).join('');
    // Restore previous selection if still valid
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  });
}

// Returns the chosen insert index from the active builder's select.
// Returns quizQuestions.length (end) if no valid selection or no questions.
function getInsertPosition() {
  const active = document.querySelector('[id$="Builder"].active');
  if (!active) return quizQuestions.length;
  const sel = active.querySelector('.insertPosSelect');
  if (!sel) return quizQuestions.length;
  const v = parseInt(sel.value);
  return (isNaN(v) || v < 0) ? quizQuestions.length : v;
}

// Call this instead of quizQuestions.push(q) in every addQ function.
function insertAtPosition(q) {
  const pos = getInsertPosition();
  if (pos >= quizQuestions.length) {
    quizQuestions.push(q);
  } else {
    quizQuestions.splice(pos, 0, q);
  }
}

// ── CENTRALISED SAVE LOGIC ────────────────────────────────────────────────────
// Every diagram's addQ function calls this instead of duplicating save logic.
// Handles: common validation, edit vs new, insert position, messages, goMenu.
// resetFn  — called after a new question is added (not after editing)
// Returns true if saved successfully, false if validation failed.
// Type-specific validation (e.g. PM price ≠ eq) should run BEFORE calling this.
function addToQuiz(q, msgId, resetFn) {
  const msg = document.getElementById(msgId);
  // ── Common validation (same for every diagram type) ──
  if (!q.questionText.trim())         { msg.textContent = '⚠ Please enter a question.'; return false; }
  if (q.correctIndex < 0)             { msg.textContent = '⚠ Please select the correct answer.'; return false; }
  if (q.answers.some(a => !a.trim())) { msg.textContent = '⚠ Please fill in all four answers.'; return false; }

  if (editingIndex >= 0) {
    // ── Editing existing question ──
    const idx = editingIndex;
    editingIndex = -1;
    quizQuestions[idx] = q;
    renderList();
    msg.textContent = `✓ Question ${idx + 1} updated!`;
    setTimeout(goMenu, 700);
  } else {
    // ── Adding new question ──
    insertAtPosition(q);
    renderList();
    msg.textContent = `✓ Question ${quizQuestions.length} added to quiz!`;
    if (resetFn) resetFn();
  }
  return true;
}

// ── PANEL RESIZER ─────────────────────────────────────────────────────────────
function startResize(e, builderId) {
  e.preventDefault();
  const builder   = document.getElementById(builderId);
  const diagPanel = builder.querySelector('.diag-panel');
  const resizer   = builder.querySelector('.resizer');
  const startX    = e.clientX;
  const startW    = diagPanel.offsetWidth;

  resizer.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  function onMove(e) {
    const newW = Math.max(180, Math.min(window.innerWidth * 0.65, startW + e.clientX - startX));
    diagPanel.style.width = newW + 'px';
  }
  function onUp() {
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── PREVIEW / DOWNLOAD ────────────────────────────────────────────────────────
function previewQuiz() {
  if (!quizQuestions.length) return;
  window.open(URL.createObjectURL(new Blob([buildQuizHTML(quizQuestions)], {type:'text/html'})), '_blank');
}

async function downloadQuiz() {
  if (!quizQuestions.length) return;
  const html = buildQuizHTML(quizQuestions);
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'hsc-economics-quiz.html',
        types: [{ description: 'HTML Quiz File', accept: { 'text/html': ['.html'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(html);
      await writable.close();
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;
      // fall through to old method
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'hsc-economics-quiz.html';
  a.click();
}

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
// Expected CSV format (first row = header, ignored):
//   Question, A, B, C, D, Correct
//   "What is X?","Answer A","Answer B","Answer C","Answer D",A
// Correct column: A/B/C/D (case-insensitive) or 0/1/2/3.
// All imported questions arrive as 'plain' (Text Only) type.
// Use the ✏ Edit button to upgrade any question to a diagram type.

function importCSV() {
  document.getElementById('csvInput').click();
}

function downloadCSVTemplate() {
  const csv = [
    'Question,A,B,C,D,Correct',
    '"Which of the following is a function of money?","Medium of exchange","Store of debt","Unit of weight","Source of income",A',
    '"A fall in consumer income for a normal good will:","Increase demand","Decrease demand","Increase supply","Decrease supply",B',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'quiz-import-template.csv';
  a.click();
}

function handleCSVFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const rows      = parseCSV(e.target.result);
    const imported  = [];
    const correctMap = { A:0, B:1, C:2, D:3, '0':0, '1':1, '2':2, '3':3 };

    rows.forEach((cols, i) => {
      if (i === 0) return;  // skip header row
      const c = cols.map(s => (s || '').trim());
      if (c.length < 6 || !c[0]) return;
      const correctKey = c[5].toUpperCase();
      const correctIndex = correctMap.hasOwnProperty(correctKey) ? correctMap[correctKey] : -1;
      imported.push({
        type: 'plain',
        questionText: c[0],
        answers:      [c[1], c[2], c[3], c[4]],
        correctIndex
      });
    });

    imported.forEach(q => quizQuestions.push(q));
    updateMenu();

    const info = document.getElementById('menuInfo');
    info.textContent = imported.length
      ? `✓ Imported ${imported.length} question${imported.length !== 1 ? 's' : ''} — use ✏ Edit to add a diagram or upgrade the type.`
      : '⚠ No valid questions found. Check your CSV matches the template format.';
    setTimeout(updateMenu, 4500);
  };
  reader.readAsText(file);
  input.value = '';  // allow re-importing the same file
}

// Parses CSV text into a 2D array of strings. Handles quoted fields,
// escaped double-quotes (""), and \r\n / \n / \r line endings.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"')            { inQuote = false; }
      else                            { cell += ch; }
    } else {
      if      (ch === '"')                   { inQuote = true; }
      else if (ch === ',')                   { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r')   {
        row.push(cell); cell = '';
        if (row.some(c => c.trim())) rows.push(row);
        row = [];
        if (ch === '\r' && next === '\n') i++;
      } else { cell += ch; }
    }
  }
  row.push(cell);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}
