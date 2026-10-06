# How to edit hivenodes.github.io

The site is plain HTML, CSS and JavaScript. There is no build step: what is in this folder is what the internet sees.
Nothing goes live until the publish gate passes (`film/blender/publish.sh`, one folder up from this repo).

## Change a sentence
1. Open `index.html` and find the sentence (search for a few of its words).
2. Change only the words between the tags. Do not change anything inside `< >`.
3. If the sentence makes a claim (a number, "flown", "tested", "proven"), it must stay true. Read `CHANGES_COPY.md` for how
   claims have been worded so far, and add a line there for your change.
4. Publish (below). The gate refuses the page if a number no longer matches the repository or a banned word appears.

## Add or change a number in Evidence
Numbers in the Evidence table are NEVER typed by hand. Each value cell carries `data-figure="name"`, and `tools/check_figures.py`
recounts that figure from the Scattrnodes repository at every publish.
1. In `tools/check_figures.py`, write a `derive_<name>(repo)` function that computes the number from the repository, and add it to
   `DERIVATIONS`.
2. In `index.html`, add a row to the `<table class="ledger">` with `<td class="v" data-figure="<name>">VALUE</td>` and a
   "How it was measured" note.
3. Run `python3 -I tools/check_figures.py --repo ~/scattrnodes --page index.html`. It must print `OK`.
   A figure that cannot be recounted needs an entry in `EXEMPTIONS` with the disclosure sentence the page must carry.
The page's "recounted ✓" line is read from `figures.json`, which the gate writes; never edit that file by hand.

## Swap the film
1. Render frames with `film/blender/v5/full_render.sh` (GPU, resumable), grade with `film/blender/v5/grade_v5.py` twice:
   with grain into `graded/`, with `--grain 0` into `clean/`.
2. Encode (commands in `07_HIVENODES_WEBSITE/research/encode_grain_test_2026-10-06/RESULT.md`):
   AV1 from `graded/` with SVT film-grain synthesis → `media/hero-film-av1.mp4`; VP9 2-pass and H.264 from `clean/` →
   `media/hero-film.webm`, `media/hero-film.mp4`. Keyframes every 2 s (`-g 48`) so chapter jumps are instant.
3. If the film's length changes, update the chapter times in `js/main.js` (`CUES`, `BEATS`, `FILM_END`) and the `data-t0/t1`
   of the mission beats in `index.html`, then publish with `EXPECT_SEC` and `EXPECT_FRAMES` set to the new film.

## Publish
```
cd 07_HIVENODES_WEBSITE/film/blender
EXPECT_SEC=54 EXPECT_FRAMES=1296 PRODUCT=$HOME/scattrnodes bash publish.sh          # check only
EXPECT_SEC=54 EXPECT_FRAMES=1296 PRODUCT=$HOME/scattrnodes bash publish.sh --push   # check, commit, push
```
The gate checks: the film is whole; withdrawn claims are absent; every figure recounts; head and share metadata; no old names; no
weapons language; every absolute link stays on hivenodes.github.io; the live simulation is the product code it claims and is
deterministic; and in a real browser at three screen sizes on every page: nothing overlaps, fonts load, every asset loads, zero
third-party requests, zero security-policy violations, accessibility (axe, WCAG 2.2 AA), frame pacing and Lighthouse.
Pages redeploys within a minute or two of a push.

## Rules that do not bend
- No text over a picture. Words go in the bars and panels beside it.
- No weapons imagery or language: no crosshairs, reticles, "engage", "strike", "kill", "effector", "munition".
- Red means a lost vehicle, amber means a person is being asked to decide or a warning, nothing else.
- No third-party requests of any kind (fonts, analytics, video hosts). Everything is served from this repository.
- Never `git add -A`; stage files by name.
