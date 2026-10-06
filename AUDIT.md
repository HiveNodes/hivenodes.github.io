# AUDIT — hivenodes.github.io before the cinematic rebuild (2026-10-06, night)

Written before any UI work, as the build brief (step 1) requires. Verified against the tree, not memory.

## 1. What is live, what is local

| | commit | where |
|---|---|---|
| Live at https://hivenodes.github.io/ | `5fa4a9e` | remote `hivenodes` (HiveNodes/hivenodes.github.io), branch `main` |
| Local, not pushed | `fa85c62` | cinematic short homepage + `/capabilities/` + `/simulation/` split + fact-check fixes |
| Rebuild work | branch `cinematic` | from `fa85c62`; swapped to `main` only after every gate passes |

The old personal repo (nidhipsharma123-lab/homingvector) now only redirects to hivenodes.github.io.

## 2. File map (shipped)

- `index.html` homepage; `simulation/index.html` live mission + evidence (moved there in `fa85c62`); `capabilities/index.html` full capability list.
- `css/home.css` (homepage), `css/site.css` (simulation page, live-mission console).
- `js/home.js` page glue; `js/story.js` scroll chapters; `js/live.js` compact live display; `js/formations.js` slot-geometry morph;
  `js/sound.js` optional sound; `js/mission.js` + `js/mission-worker.js` the full live mission (UI + worker); `js/sim-core.js` wasm loader;
  `js/sim-page.js` simulation-page glue; `js/site.js`, `js/film-hud.js` (pre-redesign page; no longer referenced by index).
- `sim/sncore.wasm` (550,231 B) built by `tools/build_wasm.sh` from Scattrnodes **17ac9ee**; `sim/provenance.json` holds the sha256 of the wasm,
  of `sim/harness.cpp` and `sim/mission.cpp` (written for the page) and the list of 17 product files compiled unchanged.
- `media/`: film `hero-film-av1.mp4` (3.4 MB), `hero-film.webm` (10.8 MB), `hero-film.mp4` (3.2 MB H.264, re-encoded), stills, `cine/` WebP stills.
- `fonts/`: Host Grotesk variable (300–800, OFL) and IBM Plex Mono 400/500 (OFL), latin subsets, self-hosted.
- `brand/`: logo SVGs, favicons, `og-image-1200x630.png`, `sim-static.svg` (a real frame of the mission engine).

## 3. The recount gate

`film/blender/publish.sh` (outside the repo, `07_HIVENODES_WEBSITE/film/blender/`) refuses to push unless all of these pass:
1. every film the page references exists and is the whole film (frame count and length: `EXPECT_FRAMES`, `EXPECT_SEC`);
2. withdrawn claims absent (`742`, `33.25`, `changed zero files`, `33 times`);
3. **figures**: `tools/check_figures.py` re-derives every `data-figure` value from the Scattrnodes repo (`~/scattrnodes`) and fails on any
   mismatch; `--summary` mode for the homepage headline figures; exemptions must carry their disclosure;
4. head/social metadata; no old name or personal handle in any shipped file; every absolute URL on `hivenodes.github.io`;
5. the wasm is the product code it claims (provenance hashes), deterministic (same seed → same hash), all 7 mission scenarios complete,
   timeline rewind exact;
6. browser gates (`verify/verify_site.sh`): nothing overlaps at 1440×900, 1024×768, 390×844 on every page; fonts applied; every asset 200;
   zero third-party requests; zero CSP violations; axe WCAG 2.2 AA; frame pacing while scrolling and while the live sim runs; trusted-input
   mission keys; Lighthouse (perf ≥ 95, a11y/BP/SEO = 100).
Only then does it commit by pathspec and push to remote `hivenodes`.

## 4. How the wasm core is loaded

`js/mission-worker.js` (module worker) fetches `../sim/sncore.wasm`, instantiates it through `js/sim-core.js` (WASI shim, no network),
and owns the timeline: actions are recorded by step, linear memory is checkpointed every 120 simulated seconds, so seek = restore +
replay (exact rewind). The page posts `init/seek/play/visible/speed/step/event/confirm/zone/rdv`; the worker posts `frame` snapshots
(26 fields per vehicle + n×n link matrix + lanes), `meta` (40), `geom` (29), the decision text and the log.
Event codes are named by the FAILURE: 1 GPS denial on, 2 off, 3 radio degraded on, 4 off, 5 cut comms, 6 lose, 7 leave, 8 formation.

## 5. Film chapter timecodes (current 46 s cut; 54 s with the operator shot)

`0:00` Seventy aircraft, one AI · `0:06` Inside the wedge · `0:11` Air, ground and water · `0:17` GPS jammed ·
`0:23` Radio degraded, relays climb · `0:28.5` Aircraft lost, wedge re-forms · `0:34` Split and search · `0:40` Sensor watch (thermal) ·
`0:46` operator shot (re-render in progress: v5, `film/frames_v5/`).
Known defect in the published film: the thermal shot (0:40–0:46) carries a crosshair reticle. The brief bans targeting imagery;
the v5 grade (`film/blender/v5/grade_v5.py`, `overwatch()`) replaces it with a plain framing box labelled OVERWATCH GND TEAM (OWN).

## 6. Every number on the site and its source

| number | page | source | gated |
|---|---|---|---|
| 768 test missions flown in simulation | home, simulation | `derive_missions_total` (runs/ verdict files) | yes (`data-figure="missions"`) |
| 555 passed / 141 failed / 72 skipped, 114 campaigns | simulation | `derive_verdict_counts`, `derive_campaigns_scored` | yes |
| 8 aircraft in tight formation (largest flown in sim) | simulation | `derive_formation_max_fw` | yes |
| position error without GPS 396–750 m → 25.5–39.0 m | simulation | exempt, with disclosure | yes (disclosure gated) |
| 0 core files changed by the two adapter commits | simulation | `derive_core_files_adapter_commits` (8ce860f, 8b0b0bb) | yes |
| 250 problems written up with causes | simulation | `derive_defects_logged` | yes |
| 0 flights on a real aircraft | simulation | `derive_real_flights` | yes |
| 2,000+ orders accepted by the autopilot | simulation | cannot be recounted; caveat on the page | caveat gated |
| 0 losses of separation, all-conditions mission | home | run 20261003_013220Z (MORNING_REPORT §1) | NOT gated — to add |
| 150 s with zero satellites, all five aircraft | home | run 20261003_013220Z | NOT gated — to add |
| 70 aircraft, 6 ground robots, 4 boats | film, live display | scenario 3 of `sim/mission.cpp` (written for the page): a demonstration of the fleet Scattrnodes is built for, NOT a result | label required |

Never claimed (brief §1.1): a real-aircraft flight; separation as a guarantee (B-148 open); fleets beyond what was simulated.

## 7. Content that must survive the rebuild (from the live page, 5fa4a9e)

Problem cards (Jamming / Spoofing / Contested links) · the eight mission beats · live mission + Eyes console · "Above the autopilot.
Below the operator." + four cards (incl. "That brand, ArduPilot, has only been tested standing still so far.") · three Eyes principles ·
seven Evidence rows with measurement notes · Status ("we have not flown a real aircraft yet, and you should hear that from us before
anything else") + four roadmap items · founders line · footer disclaimers. Anchors: `#system #live #evidence #status #contact`.
Copy changes are listed in `CHANGES_COPY.md`.

## 8. Decisions for the rebuild (recorded, with reasons)

- **No build step (no Vite/TypeScript, no GSAP/Lenis).** The site is plain ES modules under a strict CSP with every gate passing; a build
  step tonight adds a toolchain and a second artefact for no visible gain. Pinning/scrubbing use `position: sticky` + rAF scroll progress;
  smooth-scroll hijacking (Lenis) is left out on accessibility grounds. Re-evaluate if the site grows a second developer.
- **Post-processing only on pictures, never over text.** Grain, vignette and edge CA run on the film/scene canvases (WebGL) and as a grain
  texture inside glass panels. A full-page overlay canvas would sit on top of every word, which the standing no-overlap rule forbids and
  which costs legibility; the brief also requires body text to stay perfectly legible.
- **Fonts:** keep Host Grotesk variable (OFL, weight axis) + IBM Plex Mono (OFL) already self-hosted and subset; see `brand/FONTS.md`.
- **Palette per brief:** base `#0b0d10`→`#14181d`; emitted-light accent `#cfe9ff` for live values/active states; amber `#f2b544` only for
  awaiting-operator/warnings; red only for lost vehicles in the console.
