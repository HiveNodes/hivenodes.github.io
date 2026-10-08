# Shot list and generation spec: HiveNodes "Photoreal Cinema"

How to use it:
1. Generate each shot with a photoreal video model (Veo 3, Runway Gen-4, Kling 2 or Luma) or a photoreal still model.
2. Name the delivery exactly as given under **Deliver**.
3. Run `tools/encode.sh SHOT RAW_FILE`.

The site reads `media/manifest.json` and swaps a shot's placeholder for the real file automatically.
Read `docs/CINEMA_AUDIT.md` §C first: every shot must pass it.

**Master format, every shot:** 24 fps, 2.39:1, 4K source (3840×1608 or larger).
- Site encodes: 1920×803 (AV1 + H.264).
- Hero: also 2560×1070.
- Stills: 400/800/1600 px.

## World (one location, one day)

- **Place:** Ladakh, India, about 4,300 m.
- **Season and light:** late autumn, blue hour into first light.
- **Air:** thin, dry and very clear; long shadows.
- **Mountains:** the far ridges carry fresh snow on dark rock. The near slopes are grey-brown scree and gravel.
- **Lake:** a glacial lake (Pangong-like). Turquoise in the shallows, deep blue offshore, steady wind chop with
  whitecaps in gusts.
- **Shore:** grey-brown gravel with a dark wet band at the waterline, frost on the stones in shadow.
- **Shelter:** a canvas-over-steel field shelter on the shore.
- **Sky:** dark zenith (high altitude), a few thin high clouds, sun just rising behind the eastern ridge.

## Vehicle look bible

**UAV:**
- About a 3 m span, jet-powered fixed-wing ISR airframe, matte grey-green.
- Detail: visible panel lines and rivet shadows, a pitot tube, blade antennas, a small EO/IR ball gimbal under the nose.
- Engine: a small turbojet with faint exhaust heat shimmer.
- Behaviour: wings flex and buffet in gusts. They fly in formations of 5–8.
- No contrails at these altitudes; heat shimmer only.

**UGV:**
- Six-wheeled, about 1.2 m long, olive.
- A mast with a sensor head; headlights and IR illuminators on.
- Mud and dust on the wheels; suspension visibly articulating over gravel; an antenna whip bending.
- Shown in groups of 3–4.

**USV:**
- About a 4 m rigid-hull catamaran / RHIB-style unmanned surface vessel, grey hull.
- A short mast with a small radar dome and an EO sensor; a jet-pod or small outboard.
- In motion: a real wake, spray off the bow, hull slap in chop, the hull reflected and broken by the waves.
- Shown in groups of 2–3.

**Scattrnodes Eyes (GCS):**
- A rugged laptop on a folding table inside the dim shelter.
- Breath fog, a gloved hand, the screen glow on the operator's face.
- **Screen = a flat placeholder (solid dark grey, tracking markers in the corners)**: the real UI from `/simulation/` is
  composited in post. Never let the model invent UI or text.

**People:** the operator is the only person; the face is half in shadow, never the subject. No uniforms or insignia.

**Negative prompt (append to every shot):**
`3D render, CGI, cartoon, video game, Unreal Engine, Blender, plastic, oversaturated, clean specular, perfect symmetry, floating, no shadows, uncanny, text, watermark, logo, insignia, flag, explosion, weapon, missile, gunfire`

**Truth rule:** nothing in any frame may imply that a real flight test happened. No telemetry burned into the
picture, no captions, no "flight #1".

## Shots

**Text frame** is the frame (at 24 fps) on which that chapter's text fades in. **Deliver** is the raw file to hand back.

### SHOT 01: Hero, chapter 01 (T+00:00): "Holds the mission when GPS and comms are gone."

- **Shot:** one continuous move, 20 s, designed to loop.
  - Open on a 7-UAV V formation crossing a snow ridgeline against the dawn sky.
  - The camera descends and drifts with them as they pass overhead.
  - Reveal the lake: two USVs cutting across in a line, wakes catching first light.
  - Continue down to the shore: three UGVs rolling along the gravel, headlights on.
  - Settle on the field shelter, warm light inside.
- **Camera:** 35 mm to 50 mm equivalent; a slow crane-down from 120 m to 3 m with a gentle lateral drift; never faster than a person could walk.
- **Light:** blue hour, then the first sun touching the snow peaks only.
- **Atmosphere:** wind, chop, faint mist on the water.
- **Loop:** the last 12 frames must cross-dissolve into frame 1 (same ridge silhouette). Generate 24 s and trim.
- **Duration:** 20 s. **Text frame:** 36.
- **Deliver:** `raw/shot01_hero.mov`, encoded as `media/cine/shot01_hero.*` (also at 2560×1070).
- **Prompt:** *Photographed on a cinema camera with anamorphic lenses, high-altitude Himalayan lake at blue hour, a formation of seven grey-green jet-powered fixed-wing drones crosses a snow-covered ridgeline, camera cranes down past them to reveal two grey unmanned catamaran boats cutting wakes across a turquoise lake with wind chop, then three six-wheeled small robotic ground vehicles with headlights on rolling along a grey gravel shore, ending on a canvas field shelter with warm light inside, thin dry air, real film grain, natural motion blur, 24 fps.*

### SHOT 02: Tasking, chapter 08 (part A)

- **Shot:**
  - Macro on the laptop keyboard and screen inside the shelter.
  - A gloved finger types; the screen is a dark placeholder.
  - Rack focus from the keys to the operator's breath fog in the screen glow.
- **Camera:** 100 mm macro, locked off, shallow depth of field (T2).
- **Light:** the screen glow, plus cold daylight through the canvas.
- **Duration:** 6 s. **Text frame:** 12.
- **Deliver:** `raw/shot02_tasking.mov`, plus a clean plate of the screen for UI replacement.
- **Prompt:** *Extreme close-up in a dim canvas field shelter at 4,300 m, a gloved hand typing on a rugged laptop, cold breath fog drifting through the screen glow, shallow depth of field, rack focus, the laptop screen is a plain dark grey panel with small corner tracking markers, real film grain.*

### SHOT 03: One network, chapter 02 (T+00:06)

- **Shot:** one wide frame holding all three domains: UAVs overhead in a line, two USVs on the water, three UGVs on the shore in the foreground.
- **Camera:** 200 mm long-lens compression from a ridge, a slow pan following the USVs.
- **Light:** first sun on the water.
- **Duration:** 8 s. **Text frame:** 24.
- **Deliver:** `raw/shot03_network.mov`.
- **Prompt:** *Long-lens telephoto shot across a high-altitude glacial lake, foreground three small six-wheeled robotic ground vehicles on a gravel shore, mid-ground two grey unmanned catamaran boats with white wakes, sky with a line of five small grey jet drones, heat shimmer, compressed perspective, early sun, wind chop, real photograph.*

### SHOT 04: GPS denied, chapter 03 (T+00:17)

- **Shot:** the formation holds course while a large cloud shadow sweeps across the lake and slopes under it; a gust visibly buffets them and they hold their spacing. No glitch effects.
- **Camera:** air-to-air from 30 m behind and slightly above, 50 mm, gentle handheld float.
- **Duration:** 6 s. **Text frame:** 12.
- **Deliver:** `raw/shot04_gpsdenied.mov`.
- **Prompt:** *Air-to-air footage behind a formation of six grey-green jet drones flying low over a high-altitude lake, a large cloud shadow sweeping across the water and mountain slopes beneath them, a wind gust buffets the wings and the formation holds its spacing, natural handheld camera float, film grain.*

### SHOT 05: Comms degraded, chapter 04 (T+00:23)

- **Shot:** four UAVs pitch up together and climb into a high ring against the sun; backlit, with a lens flare and exhaust shimmer.
- **Camera:** low angle from the shore, 85 mm, slow tilt up.
- **Duration:** 6 s. **Text frame:** 12.
- **Deliver:** `raw/shot05_relay.mov`.
- **Prompt:** *Low angle from a lakeshore, four grey jet drones pitch up together and climb into a wide circle high in a dark blue high-altitude sky, backlit by the rising sun, anamorphic lens flare, exhaust heat shimmer, real footage.*

### SHOT 06: Asset lost, chapter 05 (T+00:28)

- **Shot:**
  - Chase position on one UAV over the lake.
  - The aircraft ahead of it peels away and drops out of frame; no fire, no explosion.
  - The chased UAV banks and slides into the empty slot.
- **Camera:** chase-plane POV, 35 mm, handheld micro-shake.
- **Duration:** 6 s. **Text frame:** 12.
- **Deliver:** `raw/shot06_lost.mov`.
- **Prompt:** *Chase-plane footage close behind a grey-green jet drone over a turquoise lake, the drone ahead of it rolls away and drops out of frame, the followed drone banks and slides forward into the empty position, mountains with snow behind, subtle handheld shake, natural motion blur, no explosion.*

### SHOT 07: Split and search, chapter 06 (T+00:34)

- **Shot:** top-down to oblique. The fleet divides: one UAV line over the slopes, one over the water; the USVs fan out in parallel lines; the UGVs run along the shoreline.
- **Camera:** high drone, 24 mm, slow tilt from nadir to 45°.
- **Duration:** 8 s. **Text frame:** 24.
- **Deliver:** `raw/shot07_search.mov`.
- **Prompt:** *High aerial view tilting from straight down to oblique over a high-altitude lake and gravel shore, small grey jet drones splitting into two parallel search lines, two grey unmanned boats fanning out leaving parallel wakes, small six-wheeled robots driving along the shoreline, long morning shadows, real aerial footage.*

### SHOT 08: Eyes on the position, chapter 07 (T+00:40)

- **Shot A (4 s):** thermal POV from a UAV gimbal looking down on three UGVs, white-hot, the sensor slewing slowly; no symbology (the site adds none).
- **Shot B (3 s):** cut to the real-light counter-shot from the ground, a UAV passing low overhead.
- **Duration:** 7 s. **Text frame:** 12.
- **Deliver:** `raw/shot08a_thermal.mov`, `raw/shot08b_counter.mov`.
- **Prompt A:** *Black-and-white thermal camera view from above, white-hot, three small six-wheeled ground robots on cold gravel, slight sensor noise, slow pan, no text, no crosshair.*
- **Prompt B:** *From the ground looking up, a grey-green jet drone passes low overhead against a dark blue sky, heat shimmer behind it, real footage.*

### SHOT 09: A human decides, chapter 08 (part B, T+00:46)

- **Shot:** in the shelter, the gloved hand hovers over the laptop, a pause, then one press. Hold on the quiet, the breath fog, the screen glow (a placeholder panel).
- **Camera:** 50 mm, locked off, then a very slow push-in.
- **Duration:** 8 s. **Text frame:** 24.
- **Deliver:** `raw/shot09_decide.mov`, plus a clean plate.
- **Prompt:** *Inside a dim canvas shelter at dawn, an operator's gloved hand hovers over a rugged laptop then presses one key, breath fog in the screen glow, the screen is a plain dark grey panel with corner tracking markers, quiet, still, shallow depth of field, film grain.*

### CARDS: System section (6 s seamless loops, 16:9 crop of the 2.39 master is fine)

**`card_uav`:**
- **Shot:** a chase plane on one UAV banking low over the lake.
- **Camera:** 50 mm.
- **Prompt:** *chase-plane footage of a grey-green jet drone banking low over a turquoise high-altitude lake, snow mountains behind, real footage*.

**`card_ugv`:**
- **Shot:** a UGV crossing gravel toward the camera.
- **Camera:** 35 mm, low.
- **Look:** suspension working, dust.
- **Prompt:** *low close-up of a six-wheeled small olive robotic ground vehicle with a sensor mast driving over grey gravel toward camera, suspension flexing, dust, headlights on, dawn, real footage*.

**`card_usv`:**
- **Shot:** a USV punching through chop toward and past the camera.
- **Camera:** 35 mm, at water level.
- **Look:** spray hits the lens.
- **Prompt:** *water-level close-up of a grey unmanned catamaran boat with a small radar mast punching through wind chop on a glacial lake, spray hitting the camera lens, wake, real footage*.

**`card_eyes`:**
- **Shot:** the laptop in the shelter, a slow slide.
- **Camera:** 50 mm.
- **Screen:** a placeholder panel (UI in post).

### LIVE: the teaser behind "Run the mission yourself" (6 s loop)

- **Shot:** an over-the-shoulder slow push onto the laptop screen.
- **Screen:** a placeholder panel; the `/simulation/` capture is composited in post.
- **Deliver:** `raw/live_teaser.mov`.

## Option: real location plates plus CGI vehicles

Real drone footage of Pangong Tso is in `film/plates/` (Pexels 19024880 and 19024881, free licence, credited in
README). The compositing pipeline works: OpenCV camera track plus `comp_plate.py`.

It suits SHOT 03 and SHOT 07 if a generated shot's terrain or water fails the checklist. The UAVs must sit closer than
150 m to read.

## Text frames and manifest

`media/manifest.json` lists each shot: `{ "shot01_hero": {"ready": false, "slug": "...", "textFrame": 36, "loop": true} }`.
`tools/encode.sh` sets `ready: true` when the files exist. Until then the site shows the cinematic placeholder (grain, the
slug line) in the same frame.
