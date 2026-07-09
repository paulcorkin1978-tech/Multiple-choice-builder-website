// ── AUTO-CAPITALISE ──────────────────────────────────────────────────────────
// Capitalises the first letter of every diagram title, question textarea and
// answer field, and the first letter of each new sentence after . ! or ?
// Runs on typing and on blur, so it also tidies dictated text (which dispatches
// an 'input' event).
//
// Deliberately conservative — it will NOT capitalise when:
//   • the letter is already a capital, or the character is a digit/symbol
//   • the next character is uppercase  (protects "iPhone", "eBay", "iPad")
//   • the full stop belongs to an abbreviation ("e.g. the", "etc. the")
//   • the full stop is a decimal point ("$2.00" — no space follows)
//
// Every transformation changes case only, never length, so the caret stays put.

(function () {

  var ABBR = /(?:^|\s)(?:e\.g|i\.e|etc|vs|approx|no|fig|cf|dr|mr|mrs|ms|prof|inc|ltd|est|dept)$/i;

  // "iPhone" guard: don't upper-case a letter whose neighbour is already capital.
  function shouldSkip(str, idx) {
    var next = str.charAt(idx + 1);
    return !!(next && /[A-Z]/.test(next));
  }

  function capitalise(v) {
    // 1. first non-space character of the field
    var i = v.search(/\S/);
    if (i >= 0 && /[a-z]/.test(v.charAt(i)) && !shouldSkip(v, i)) {
      v = v.slice(0, i) + v.charAt(i).toUpperCase() + v.slice(i + 1);
    }

    // 2. first letter after a sentence-ending . ! or ? followed by whitespace
    v = v.replace(/([.!?])(["'’)\]]?\s+)([a-z])/g, function (m, punct, gap, ch, off, whole) {
      var before = whole.slice(0, off);
      var word = (before.match(/[A-Za-z.]+$/) || [''])[0];
      if (ABBR.test(' ' + word)) return m;            // e.g. / etc. / vs.
      if (/^[A-Za-z]$/.test(word)) return m;          // stray single letter, e.g. the "g" in "e.g"
      var chIdx = off + punct.length + gap.length;
      if (shouldSkip(whole, chIdx)) return m;         // ". iPhone"
      return punct + gap + ch.toUpperCase();
    });

    return v;
  }

  function polish(el) {
    var v = el.value;
    if (!v) return;
    var out = capitalise(v);
    if (out === v) return;
    var start = el.selectionStart, end = el.selectionEnd;
    el.value = out;                                    // same length — caret is still valid
    try { el.setSelectionRange(start, end); } catch (e) {}
  }

  function attach() {
    var fields = document.querySelectorAll('textarea[id$="QText"], .arow input[type="text"], input[type="text"][id$="Title"]');
    Array.prototype.forEach.call(fields, function (el) {
      if (el.dataset.autocap) return;
      el.dataset.autocap = '1';
      el.addEventListener('input', function () { polish(el); });
      el.addEventListener('blur',  function () { polish(el); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
