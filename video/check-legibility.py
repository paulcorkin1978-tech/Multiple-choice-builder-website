#!/usr/bin/env python3
"""
Legibility checker for the Theory2Econ explainer videos.

Run it on any explainer before recording:
    python3 video/check-legibility.py video/tariff-practice.html
    python3 video/check-legibility.py            # checks every video/*.html

It enforces the legibility contract in EXPLAINER-RECIPE.md so we stop finding
unreadable numbers slide by slide. It flags:

  1. SMALL   — any on-diagram text below MIN_TEXT px (numbers are worst-hit).
  2. CHIP    — a number's background pill that isn't fully opaque, OR a number
               chip that is drawn BEFORE the curves (so a glowing line can
               render on top of the digits — the recurring bug).
  3. DIM     — a numeric label in a low-contrast colour on the dark ground.

Exit code is non-zero if any ERROR-level issue is found, so it can gate a build.
"""
import re, sys, glob, os

MIN_TEXT = 20        # px: floor for supporting text at 1920x1080 (warn)
MIN_NUMBER = 24      # px: floor for a value a student must READ — a $ or a count (error)
DIM = {"#61618a", "#7a7aa8", "#5a5a80", "#3f7a48", "#2f8f3f", "#1f4a26"}  # too dark for numbers

def curve_floor(svg):
    """Document offset of the first big glowing stroke (the curves). A number
    chip defined before this can be overdrawn by a line."""
    offs = [m.start() for m in re.finditer(r'stroke-width="(?:5|11|12|14)"[^>]*filter="url\(#(?:glow|bloom)', svg)]
    return min(offs) if offs else 10**9

def is_number(txt):
    t = txt.strip()
    return bool(re.fullmatch(r'\$?[\d,]+m?', t)) or bool(re.fullmatch(r'[\d,]+', t))

def check(path):
    s = open(path, encoding="utf-8").read()
    svg = re.search(r'<svg.*?</svg>', s, re.S)
    svg = svg.group(0) if svg else s
    cf = curve_floor(svg)
    errs, warns = [], []

    for m in re.finditer(r'<text\b([^>]*)>(.*?)</text>', svg, re.S):
        attrs, inner = m.group(1), re.sub(r'<[^>]+>', '', m.group(2)).strip()
        if not inner:
            continue
        fs = re.search(r'font-size="(\d+)"', attrs)
        fs = int(fs.group(1)) if fs else 16
        fill = (re.search(r'fill="(#[0-9a-fA-F]{6})"', attrs) or [None, ""])[1].lower()
        num = is_number(inner)
        floor = MIN_NUMBER if num else MIN_TEXT
        tag = inner[:22]

        if fs < floor:
            (errs if num else warns).append(
                "%-6s %2dpx  '%s'  (min %d)" % ("SMALL", fs, tag, floor))
        if num and fill in DIM:
            errs.append("DIM    '%s' in %s — too dark to read on the dark ground" % (tag, fill))
        # a number drawn before the curves can be crossed by a glowing line
        if num and m.start() < cf:
            # is there an opaque chip right before it? look 260 chars back
            back = svg[max(0, m.start()-260):m.start()]
            opaque = re.search(r'rx="\d+"[^>]*opacity="1"', back) or re.search(r'opacity="1"[^>]*rx="\d+"', back)
            if not opaque:
                errs.append("CHIP   '%s' is below the curves with no opaque chip — a line can cross it" % tag)

    return errs, warns

def main(argv):
    files = argv[1:] or sorted(glob.glob(os.path.join(os.path.dirname(__file__) or ".", "*.html")))
    bad = 0
    for f in files:
        errs, warns = check(f)
        name = os.path.basename(f)
        if not errs and not warns:
            print("OK    %s" % name)
            continue
        print("\n%s" % name)
        for e in errs:  print("  ERROR  " + e)
        for w in warns: print("  warn   " + w)
        bad += len(errs)
    print("\n%d error(s)." % bad)
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
