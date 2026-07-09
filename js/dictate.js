// ── DICTATION ────────────────────────────────────────────────────────────────
// One microphone per builder, sitting in the "Question Text" header. While it's
// recording, speech goes into WHICHEVER field your cursor is in — the diagram
// title, the question box, or any of the four answer boxes. Put the cursor in a
// field and press the mic to start there; click into a different box mid-sentence
// and the words follow you. The receiving box is outlined so you can see where
// text will land.
//
// Uses the browser's built-in Web Speech API — no external service, no API key,
// no cost. Chrome and Edge only; the button is disabled elsewhere. Chrome sends
// audio to Google for transcription, so it needs an internet connection.

(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var FIELDS = 'textarea[id$="QText"], .arow input[type="text"], input[type="text"][id$="Title"]';

  var rec = null, activeBtn = null, lastField = null, fallbackId = null;

  function isField(el) { return !!(el && el.matches && el.matches(FIELDS)); }

  // Remember the last question/answer box the user was in.
  document.addEventListener('focusin', function (e) {
    if (isField(e.target)) {
      lastField = e.target;
      if (rec) highlight(lastField);
    }
  });

  function highlight(el) {
    var prev = document.querySelector('.dictating');
    if (prev) prev.classList.remove('dictating');
    if (el) el.classList.add('dictating');
  }

  // Where should the words go right now?
  function target() {
    if (isField(document.activeElement)) return document.activeElement;
    if (lastField && document.body.contains(lastField)) return lastField;
    return document.getElementById(fallbackId);
  }

  function setIdle(btn) {
    if (!btn) return;
    btn.classList.remove('rec');
    btn.textContent = '🎤';
    btn.title = 'Dictate into whichever title, question or answer box your cursor is in';
  }

  function stopUI() {
    setIdle(activeBtn);
    highlight(null);
    rec = null;
    activeBtn = null;
  }

  window.toggleDictation = function (fallback, btn) {
    if (!SR) return;
    if (rec) { try { rec.stop(); } catch (e) {} return; }

    fallbackId = fallback;
    rec = new SR();
    rec.lang = 'en-AU';
    rec.continuous = true;
    rec.interimResults = false;
    activeBtn = btn;

    btn.classList.add('rec');
    btn.textContent = '● Stop';
    btn.title = 'Click to stop dictating';
    highlight(target());

    rec.onresult = function (e) {
      var txt = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) txt += e.results[i][0].transcript;
      }
      txt = txt.trim();
      if (!txt) return;

      var el = target();
      if (!el) return;
      highlight(el);

      var needsSpace = el.value.length > 0 && !/\s$/.test(el.value);
      el.value += (needsSpace ? ' ' : '') + txt;
      el.dispatchEvent(new Event('input', { bubbles: true }));  // triggers autocap + live preview
      if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight;
    };

    rec.onerror = stopUI;
    rec.onend   = stopUI;

    try { rec.start(); }
    catch (e) { stopUI(); }
  };

  // Drop a mic button into the "Question Text" header above each textarea.
  function attachMics() {
    var areas = document.querySelectorAll('textarea[id$="QText"]');
    Array.prototype.forEach.call(areas, function (ta) {
      var title = ta.previousElementSibling;
      if (!title || !title.classList.contains('card-title')) return;
      if (title.querySelector('.mic-btn')) return;

      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.justifyContent = 'space-between';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mic-btn';

      if (SR) {
        setIdle(btn);
        // Keep focus in the field the user was typing in — don't let the button steal it.
        btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
        btn.addEventListener('click', function () { toggleDictation(ta.id, btn); });
      } else {
        btn.textContent = '🎤';
        btn.disabled = true;
        btn.title = 'Dictation needs Chrome or Edge';
      }
      title.appendChild(btn);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachMics);
  else attachMics();
})();
