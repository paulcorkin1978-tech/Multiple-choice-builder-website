# Theory2Econ — project notes / handoff

Context file for any Claude session picking this up fresh (e.g. on the Mac). Read this first.

## What this is
Theory2Econ — a static, browser-based site for HSC/NSW Economics (teacher: Paul Corkin). It has:
- **Multiple-choice quizzes** with live-rendered supply/demand diagrams (`quizzes/`, banks in `banks/`, engine in `js/diagrams/`, authoring in `builder.html`).
- **Animated explainer videos** built as single-file HTML slide decks (`video/`): `subsidy-explainer.html`, `tariff-explainer.html`, `quota-explainer.html`. Click/space to advance; each has a declarative `STAGES` array + a render engine.
- **Homepage mockups** (`mockups/`) exploring a syllabus-based homepage.

## Hard rules
- **Everything stays LOCAL until Paul pushes.** Nothing is live until `git push`.
- **Explainers are unlisted:** every explainer page has `<meta name="robots" content="noindex,nofollow">`. Keep it.
- Voiceover is Paul's own voice.
- Repo is a **GitHub Pages** site (public). Do not commit the raw voice recordings — see `.gitignore` (`recordings/` and `*.m4a` are excluded).

## Syllabus structure (NSW Economics 11–12, 2025 — from the PDF in repo)
- **Year 11 (6 focus areas):** 1 Introduction to economics · 2 Markets · 3 Household and business sector · 4 Financial sector · 5 Government sector · 6 International sector.
- **Year 12 (3 focus areas):** 1 Economic issues in the Australian economy · 2 Economic management of the Australian economy · 3 Australia and the global economy.

## Explainer "method" (shared across subsidy/tariff/quota)
Curves first, then world price on its own slide; proportional coloured boxes UNDER the x-axis aligned to quantity (green = domestic, yellow = foreign/imports, white = total/consumer, orange = government for tariff/subsidy only — quota has NO government box); a generic `drawCalc` animates price×quantity with the numbers flashed on the lines; revenue figures shown as the literal product; highlight lines shown one beat then faded. The quota's distinctive point: it raises NO government revenue — importers keep the higher price. See `video/EXPLAINER-RECIPE.md` for the full house style.

## Status (as of this handoff)
- **Explainers:** subsidy + tariff finished; quota rebuilt to match. All verified with `video/check-legibility.py` + node syntax checks.
- **Voiceover scripts:** `video/voiceover-scripts.md` (all three, per-slide) and `video/tariff-narration-plain.txt` (continuous, for TTS). Tariff slide 16 carefully worded: the tariff is paid by the importer (not the foreign producer); foreign producers keep only the world price, government takes the tariff.
- **Recordings:** Paul recorded all three narrations (ATR2100x dynamic mic — records quiet but background is silent, so levelling up is clean). Levelled copies made at ~-20 LUFS. Files are LOCAL only (gitignored), organised in `recordings/{tariff,subsidy,quota}/`. Currently being split per-slide and assembled in **iMovie on the Mac**.
- **Quizzes:** recoloured to the green/pink palette; demand/supply/shift quizzes got a curve-shift animation. Defaults in `builder.html` set to the house palette (demand #e8447a, supply #00a98a light; neon variants in `css/graph-palette.css`).
- **Homepage mockups** (`mockups/`): `homepage-topics.html` (card grid), `homepage-circular-flow.html` (animated circular-flow nav), `homepage-split.html` (CURRENT favourite — left half = static circular-flow diagram with sectors as topic doorways numbered 3–6 + Intro/Markets cards 1–2; right half = 3 HSC photo cards). Live `index.html` is untouched.
- **Prototype:** `protection draw quiz (prototype).html` — 10 "draw the revenue area with a pencil" questions across subsidy/tariff/quota, IoU-graded.
- **Daily MCQ idea:** topic folders (`1. Introduction…` etc.) hold ~80 photographed daily MCQs. Plan: digitise into a tagged bank + a "question of the day" picker that serves random questions from content covered so far. Preview: `mockups/daily-question-preview*.html`. NOT yet built.

## Likely next steps
- Sync the levelled narration to each explainer's slides (in iMovie, or wire per-slide audio into the HTML).
- Decide the real homepage (split mockup is the front-runner) and replace `index.html`.
- Digitise the 80 daily MCQs + build the progressive picker.
- When ready: `git push` to publish.
