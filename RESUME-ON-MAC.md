# START HERE (resuming on the Mac)

This folder is the whole Theory2Econ project. The previous chat's history does **not** carry over to a new Claude session, so this file plus `PROJECT-NOTES.md` are how you catch up.

## To resume with Claude on the Mac
1. Open this folder as the working folder in the Claude app / Claude Code on the Mac.
2. Read **`PROJECT-NOTES.md`** first — it has the full state: what's built, the explainer "method", the syllabus structure, decisions, and next steps.
3. Then continue.

## Quick orientation
- **Explainers:** `video/subsidy-explainer.html`, `video/tariff-explainer.html`, `video/quota-explainer.html` (open in a browser; click/space to advance). House style: `video/EXPLAINER-RECIPE.md`.
- **Voiceover scripts:** `video/voiceover-scripts.md` (per-slide, all three) and `video/tariff-narration-plain.txt` (continuous).
- **Recordings:** `recordings/{tariff,subsidy,quota}/` — Paul's levelled narration takes (being split per-slide and assembled in iMovie). These are gitignored (kept out of the public repo) but travel on this drive copy.
- **Homepage mockups:** `mockups/` — front-runner is `homepage-split.html`. Live `index.html` is untouched.
- **Draw-area prototype:** `protection draw quiz (prototype).html`.
- **Daily-MCQ idea:** topic folders (`1. Introduction…` etc.) hold ~80 photographed MCQs to digitise later; previews in `mockups/daily-question-preview*.html`.

## Git / publishing
- Repo: `github.com/paulcorkin1978-tech/Multiple-choice-builder-website`, branch `main`.
- Recent work is committed locally (commit message: "Explainers (quota rebuild), homepage mockups, …").
- **Nothing is live until `git push`.** Explainers are intentionally `noindex,nofollow` — keep that.
- If both machines touch the repo, use git (push from one, pull on the other) rather than copying folders back and forth, to avoid divergence.
