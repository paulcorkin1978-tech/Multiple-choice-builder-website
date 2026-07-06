// ── DATA TABLE BUILDER ─────────────────────────────────────────────────────────
// Handles state and logic for the Data Table question builder.
// The teacher defines column count, row count, column headers, and cell data.
// The left panel shows a live HTML table preview.
// Depends on: app.js (quizQuestions, renderList, buildQuizHTML)

let tblCols = 2;
let tblRows = 2;

// ── ESCAPE HELPER ─────────────────────────────────────────────────────────────
function tblEsc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DRAW PREVIEW ──────────────────────────────────────────────────────────────
// Renders the current table data as a styled HTML preview in the left panel.
function tblDraw() {
  const title = document.getElementById('tblTitle')?.value || '';
  const preview = document.getElementById('tablePreview');
  if (!preview) return;

  const headers = [];
  for (let c = 0; c < tblCols; c++) {
    const el = document.getElementById(`tblHdr_${c}`);
    headers.push(el ? el.value : '');
  }

  const rows = [];
  for (let r = 0; r < tblRows; r++) {
    const row = [];
    for (let c = 0; c < tblCols; c++) {
      const el = document.getElementById(`tblCell_${r}_${c}`);
      row.push(el ? el.value : '');
    }
    rows.push(row);
  }

  const hasAnyContent = headers.some(h => h.trim()) || rows.some(r => r.some(c => c.trim()));
  if (!hasAnyContent) {
    preview.innerHTML = '<p class="hint" style="text-align:center;padding:32px 20px">Fill in the table to see a preview</p>';
    return;
  }

  let html = '<div class="tbl-preview-wrap">';
  if (title) html += `<div class="tbl-preview-title">${tblEsc(title)}</div>`;
  html += '<table class="tbl-preview-table"><thead><tr>';
  headers.forEach(h => { html += `<th>${tblEsc(h) || '&nbsp;'}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => { html += `<td>${tblEsc(cell) || '&nbsp;'}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  preview.innerHTML = html;
}

// ── GRID BUILDER ──────────────────────────────────────────────────────────────
// Rebuilds the data entry grid in the form panel, preserving existing values.
function tblBuildGrid() {
  const grid = document.getElementById('tblDataGrid');
  if (!grid) return;

  // Capture current values before rebuilding
  const savedHdrs = [];
  const savedCells = [];
  for (let c = 0; c < 8; c++) {
    const el = document.getElementById(`tblHdr_${c}`);
    savedHdrs.push(el ? el.value : '');
  }
  for (let r = 0; r < 12; r++) {
    savedCells.push([]);
    for (let c = 0; c < 8; c++) {
      const el = document.getElementById(`tblCell_${r}_${c}`);
      savedCells[r].push(el ? el.value : '');
    }
  }

  grid.style.gridTemplateColumns = `repeat(${tblCols}, 1fr)`;

  let html = '';
  // Header row
  for (let c = 0; c < tblCols; c++) {
    html += `<input type="text" id="tblHdr_${c}" class="sched-inp tbl-hdr-inp"
      placeholder="Column ${c+1}" value="${tblEsc(savedHdrs[c])}" oninput="tblDraw()">`;
  }
  // Data rows
  for (let r = 0; r < tblRows; r++) {
    for (let c = 0; c < tblCols; c++) {
      html += `<input type="text" id="tblCell_${r}_${c}" class="sched-inp"
        placeholder="—" value="${tblEsc(savedCells[r]?.[c] || '')}" oninput="tblDraw()">`;
    }
  }
  grid.innerHTML = html;
}

// ── ADD / REMOVE COLUMN / ROW ─────────────────────────────────────────────────
function tblUpdateButtons() {
  const addColBtn = document.getElementById('tblAddColBtn');
  const remColBtn = document.getElementById('tblRemColBtn');
  const addRowBtn = document.getElementById('tblAddRowBtn');
  const remRowBtn = document.getElementById('tblRemRowBtn');
  if (addColBtn) addColBtn.disabled = tblCols >= 8;
  if (remColBtn) remColBtn.disabled = tblCols <= 1;
  if (addRowBtn) addRowBtn.disabled = tblRows >= 12;
  if (remRowBtn) remRowBtn.disabled = tblRows <= 1;
}

function tblAddCol() {
  if (tblCols >= 8) return;
  tblCols++;
  tblBuildGrid();
  tblDraw();
  tblUpdateButtons();
}

function tblRemoveCol() {
  if (tblCols <= 1) return;
  tblCols--;
  tblBuildGrid();
  tblDraw();
  tblUpdateButtons();
}

function tblAddRow() {
  if (tblRows >= 12) return;
  tblRows++;
  tblBuildGrid();
  tblDraw();
  tblUpdateButtons();
}

function tblRemoveRow() {
  if (tblRows <= 1) return;
  tblRows--;
  tblBuildGrid();
  tblDraw();
  tblUpdateButtons();
}

// ── QUESTION BUILD ────────────────────────────────────────────────────────────
function tblGetCorrect() {
  for (const r of document.querySelectorAll('input[name="tblC"]'))
    if (r.checked) return parseInt(r.value);
  return -1;
}

function tblBuildQ() {
  const headers = [];
  for (let c = 0; c < tblCols; c++) {
    const el = document.getElementById(`tblHdr_${c}`);
    headers.push(el ? el.value.trim() : '');
  }
  const rows = [];
  for (let r = 0; r < tblRows; r++) {
    const row = [];
    for (let c = 0; c < tblCols; c++) {
      const el = document.getElementById(`tblCell_${r}_${c}`);
      row.push(el ? el.value : '');
    }
    rows.push(row);
  }
  return {
    type: 'table',
    title:        document.getElementById('tblTitle')?.value || '',
    headers,
    rows,
    questionText: document.getElementById('tblQText').value,
    answers:      [0,1,2,3].map(i => document.getElementById('tblA' + i).value),
    correctIndex: tblGetCorrect()
  };
}

// ── ADD / PREVIEW ─────────────────────────────────────────────────────────────
function tblAddQ() {
  const q = tblBuildQ();
  addToQuiz(q, 'tblMsg', tblReset);
}

function tblReset() {
  document.getElementById('tblQText').value = '';
  [0,1,2,3].forEach(i => document.getElementById('tblA' + i).value = '');
  document.querySelectorAll('input[name="tblC"]').forEach(r => r.checked = false);
}

// Pre-fills the table builder when editing an existing question.
// Loads text/answers always; table data only if source type is 'table'.
function tblLoad(q) {
  document.getElementById('tblQText').value = q.questionText || '';
  [0,1,2,3].forEach(i => {
    document.getElementById('tblA' + i).value = (q.answers && q.answers[i] != null) ? q.answers[i] : '';
  });
  document.querySelectorAll('input[name="tblC"]').forEach(r => {
    r.checked = parseInt(r.value) === q.correctIndex;
  });

  if (q.type === 'table') {
    document.getElementById('tblTitle').value = q.title || '';
    tblCols = Math.max(1, Math.min(8, (q.headers || []).length || 2));
    tblRows = Math.max(1, Math.min(12, (q.rows    || []).length || 2));
    tblBuildGrid();
    tblUpdateButtons();
    (q.headers || []).forEach((h, c) => {
      const el = document.getElementById('tblHdr_' + c);
      if (el) el.value = h || '';
    });
    (q.rows || []).forEach((row, r) => {
      (row || []).forEach((cell, c) => {
        const el = document.getElementById('tblCell_' + r + '_' + c);
        if (el) el.value = cell || '';
      });
    });
    tblDraw();
  }
  document.getElementById('tblMsg').textContent = '✏ Editing — make changes and click Update Question.';
}

function tblPreview() {
  const q = tblBuildQ();
  if (!q.questionText.trim()) { document.getElementById('tblMsg').textContent = '⚠ Enter a question to preview.'; return; }
  window.open(URL.createObjectURL(new Blob([buildQuizHTML([q])], {type:'text/html'})), '_blank');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function tblInit() {
  tblCols = 2;
  tblRows = 2;
  tblBuildGrid();
  tblDraw();
  tblUpdateButtons();
}
