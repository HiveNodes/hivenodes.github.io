"""The homepage's ops map: REAL imagery, not a render.
  Ground colour: Copernicus Sentinel-2 L2A true colour, 30 Sep 2024 (contains modified Copernicus Sentinel data 2024).
  Relief:        hillshade from the Copernicus DEM GLO-30 ((c) DLR e.V. 2010-2014 and (c) Airbus 2014-2018, provided under
                 COPERNICUS by the European Union and ESA).
  Tracks:        the film's simulated vehicle positions (film/blender/v5/world_tracks.json), same local frame.
usage: python3 -I tools/make_ops_map.py GEO_DIR TRACKS_JSON OUT_DIR"""
import sys, json, numpy as np
from PIL import Image
GEO, TR, OUT = sys.argv[1:4]
alb = np.asarray(Image.open(f'{GEO}/pangong_albedo.png').convert('RGB'), dtype=np.float64) / 255     # 8.2 km, row 0 north
h = np.load(f'{GEO}/pangong_height.npy').astype(np.float64)                                         # same window
n = alb.shape[0]; cell = 8200.0 / (h.shape[0] - 1)
gy, gx = np.gradient(h, cell)
az, alt = np.radians(315), np.radians(38)                               # map convention: light from the north-west
slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
shade = np.clip(shade, 0, 1)
sh = np.asarray(Image.fromarray((shade * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), dtype=np.float64)[..., None] / 255
water = np.asarray(Image.fromarray(np.load(f'{GEO}/pangong_water.npy').astype(np.uint8) * 255).resize((n, n), Image.NEAREST))[..., None] > 127
img = np.where(water, alb * .95, alb * (.42 + .78 * sh))
# a gentle, honest print curve: lift nothing, just keep highlights from clipping in the ochre plains
img = np.clip(img, 0, 1) ** 1.06
im = Image.fromarray((img * 255 + .5).astype(np.uint8))
for W in (2048, 1200):
    (im if W == n else im.resize((W, W), Image.LANCZOS)).save(f'{OUT}/ops-map-{W}.webp', quality=80, method=6)
# tracks: every vehicle, every 12th film frame (0.5 s), integer metres; kinds from the object names
d = json.load(open(TR)); keep = {}
for k, v in d['tracks'].items():
    if k.endswith('_src'): continue
    kind = 'lead' if k.startswith('UAV_') else 'air' if k.startswith('UAVF') else 'gnd' if k.startswith('UGV') else 'sea' if k.startswith('USV') else 'air'
    keep[k] = {'k': kind, 'p': [[int(round(p[0])), int(round(p[1])), int(round(p[2]))] for p in v[::2]]}
json.dump({'size_m': 8200, 'dt': d['step'] * 2 / d['fps'], 'n': len(next(iter(keep.values()))['p']), 'v': keep},
          open(f'{OUT}/ops-tracks.json', 'w'), separators=(',', ':'))
print('map + tracks:', len(keep), 'vehicles')
