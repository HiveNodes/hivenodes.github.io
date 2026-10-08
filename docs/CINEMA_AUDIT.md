# Cinema audit: why the site's footage reads as CGI (2026-10-08)

Baseline: `main` at 282a18a. Live at https://hivenodes.github.io/. This file is the acceptance checklist for the
replacement footage in `docs/SHOT_LIST.md`. **Every new asset must pass section C.**

## A. Media in use

| Asset | Spec | Size | Used in | Source |
|---|---|---|---|---|
| `media/hero-film-av1.mp4` | AV1 10-bit, 1600×900, 24 fps, 54.0 s, BT.709 | 3.28 MB | Briefing film (all 8 chapters, both layers) | Blender/Cycles render v5 + grade (LUT v3) |
| `media/hero-film.webm` | VP9, 1600×900, 24 fps, 54.0 s | 6.09 MB | same, fallback | same |
| `media/hero-film.mp4` | H.264, 1600×900, 24 fps, 54.0 s | 7.39 MB | same, fallback | same |
| `media/hero-poster.jpg` | 1600×900 JPEG | 111 KB | Briefing poster, CSS background | Film frame 1 |
| `media/film-tracks.json` | Per-frame screen position of 80 vehicles | 842 KB | Network-line overlay (`js/comms.js`) | Exported from the Blender scene |
| `media/cine/c0812_{800,1600}.webp` | 16:9 stills | 10/35 KB | System: UAV card | Film frame 812 (S6 chase) |
| `media/cine/ugv_close_{800,1600}.webp` | 16:9 | 20/57 KB | System: UGV card | Blender close-up render |
| `media/cine/eyes_{800,1600}.webp` | 16:9, cropped + lifted | 23/57 KB | System: Scattrnodes Eyes | Film frame 1201 (screen = the real Eyes UI) |
| `media/cine/c0613_{800,1600}.webp` | 16:9 | 7/28 KB | Live section | Film frame 613 (S5) |
| USV card | none (placeholder text "USV footage in production") | — | System: USV card | — |
| `brand/*` | logo, favicons, OG image | small | all pages | brand set |
| `media/stills/s_1.jpg`, `s_36_5.jpg` | 1600×900 | 31/23 KB | /capabilities/ | old film stills |

**Not used anywhere (legacy, about 1.8 MB):** 30 old `media/cine/c*.webp` stills, 6 `media/stills/*.jpg`,
`media/ops-map-600.webp`, 7 spare brand files. **Not loaded by any page:** `js/main.js`, `css/main.css`, `css/console.css`.
Per the working method, these move to `media/_legacy/` (or `js/_legacy/`) rather than being deleted. They are listed
for your approval, not moved yet.

## B. Why each reads as CGI (observed in the frames, not guessed)

1. **Terrain is a 10 m elevation model.** Between samples the ground is smooth, so mountains read as clay, with no
   scree, gullies, boulders or strata at any distance closer than a few km. This is the single largest tell (S1, S3, S4).
2. **No surface micro-detail on the ground.** One satellite colour per 10 m. There's no rock texture, no gravel scale
   change with distance and no wet band at the waterline.
3. **Water is a mirror.** The lake is near-flat with no wind chop, no depth banding (turquoise shallows vs. deep blue)
   and no wakes. Vehicles on it don't disturb it. Real Pangong has constant chop (see the real plates in
   `film/plates/`).
4. **Wrong sky.** The HDRI is `table_mountain_2`, a South African sky at about 1 km altitude. Ladakh at 4,300 m has a
   deeper, darker zenith and thin, high cloud. Sky blue measured 1.35–1.9 B/R, against 3.6–4.0 in real Pangong photos.
5. **Lighting is clean and even.** Single sun plus sky, with no bounce colour from the lake onto vehicles, no cloud
   shadows crossing the ground and no contact dust.
6. **Vehicles are simple models.**
   - The UAV has a uniform grey skin (v6 adds panel seams).
   - The UGV is boxy, with clean wheels and no suspension articulation.
   - The v5 USV is a white slab with a box on it; the v6 model is better but still has no wake or spray.
7. **Motion is keyframed and perfect.** The formations fly exact paths, with no gust response, wing flex or
   turbulence. Camera moves are smooth, apart from the noise added in v5.
8. **Camera physics are partial.** Grain, halation, gate weave, vignette and lens distortion are added in the grade.
   Missing: anamorphic flare, lens dirt, heat shimmer, and real depth of field on most shots.
9. **The scale cues are weak.** At most distances the vehicles are a few pixels, with nothing of known size beside
   them.
10. **Resolution.** The master is 1600×900 at 128 samples. Fine detail is soft against a 2.39:1 4K source.

**What is already real:**
- the Copernicus DEM and Sentinel-2 colour, from the real place;
- the Scattrnodes Eyes screen, which is the real UI;
- the mission events, which come from the simulation;
- the drone plates in `film/plates/` (Pexels, real Pangong footage, free licence).

## C. Acceptance checklist for every new shot

- [ ] Ground carries detail down to gravel at the nearest distance, and the scale shrinks with distance.
- [ ] Water has chop that matches the wind, depth colour bands, and wakes or spray where hulls move.
- [ ] Sky is high-altitude: dark zenith, thin cloud, clear far ranges with aerial perspective that is bluer and lighter with distance.
- [ ] Real light: cloud shadows, bounce, contact shadows; no clean even fill.
- [ ] Vehicles match the look bible: panel lines, wear, dirt, articulation, exhaust shimmer.
- [ ] Motion shows physics: gust response, bank, suspension travel, hull slap.
- [ ] Lens: shallow depth of field where the lens implies it, real motion blur at a 180° shutter, grain, no perfect sharpness.
- [ ] No text, logos, watermarks or invented UI in the footage. The Eyes UI is a screen replacement from `/simulation/`.
- [ ] Nothing in a frame implies a real flight test happened (no "flight #1", no real-telemetry framing).
- [ ] 24 fps, 2.39:1 master, delivered at or above 1920×803.

## D. Structure notes

- The briefing has 8 chapters:
  - 01 hero (T+00:00)
  - 02 One network
  - 03 GPS denied
  - 04 Comms degraded
  - 05 Asset lost
  - 06 Split and search
  - 07 Eyes on the position
  - 08 Operator (tasking + approval)
- On 2026-10-08 the owner moved the operator to the end ("put GCS as the last ... show the capabilities first"). The
  shot list maps prompt items "02 Tasking" and "09 A human decides" onto chapter 08. **Confirm whether Tasking returns
  to position 02.**
- The footer currently reads "Film is rendered from simulation." It changes to the brief's exact line: "Film is a
  dramatised visualisation. Results are from simulation."
- Hard rules in force:
  - zero third-party requests (CSP);
  - the weapons-language gate (word list in `film/blender/publish.sh`, site brief 1.2); for this reason the look
    bible says "ISR airframe";
  - every figure is recounted before publishing;
  - no overlap at 13 sizes.
