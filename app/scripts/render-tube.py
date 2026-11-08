"""
Render the hero background: a soft, foam-textured 3D tube on a transparent
background, saved as public/brand/tube.webp.

    python scripts/render-tube.py

How it works: a sphere is swept along a smooth looping path. Every pixel keeps
the sphere sample nearest the viewer (a z-buffer, with later parts of the path
in front where the tube crosses itself), which gives a true tube normal and a
(u, v) surface coordinate. A tileable foam height map is sampled in that
surface space, so the texture wraps around the tube, then bump-mapped and lit
with a key light, a specular highlight, a cool rim light and ambient occlusion
in the pores.
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 2400, 1500
R = 124.0  # tube radius in px
STEP = 2.0  # px between swept spheres
RNG = np.random.default_rng(11)

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "brand", "tube.webp")

# Control points of the path (Catmull-Rom). It sweeps in from the left, arcs
# over the title, ties a loop on the right and leaves bottom-right.
PTS = [
    (-420, 980), (-60, 1240), (330, 1330), (600, 1060), (520, 640), (690, 250),
    (1130, 95), (1600, 230), (1760, 640), (1520, 1010), (1160, 980), (1170, 690),
    (1520, 560), (1960, 760), (2180, 1180), (2520, 1420), (2900, 1540),
]


def catmull_rom(points, samples_per_seg=400):
    p = np.array(points, dtype=np.float64)
    p = np.vstack([p[0] * 2 - p[1], p, p[-1] * 2 - p[-2]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        t = np.linspace(0, 1, samples_per_seg, endpoint=False)[:, None]
        out.append(
            0.5
            * (
                2 * p1
                + (-p0 + p2) * t
                + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t**2
                + (-p0 + 3 * p1 - 3 * p2 + p3) * t**3
            )
        )
    return np.vstack(out)


def resample(curve, step):
    seg = np.linalg.norm(np.diff(curve, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    targets = np.arange(0, s[-1], step)
    x = np.interp(targets, s, curve[:, 0])
    y = np.interp(targets, s, curve[:, 1])
    return np.stack([x, y], 1), targets


def foam_texture(size=1024):
    """Tileable foam: many soft round bumps at two scales plus fine grit."""

    def blobs(count, radius):
        img = Image.new("L", (size, size), 0)
        px = img.load()
        xs = RNG.integers(0, size, count)
        ys = RNG.integers(0, size, count)
        for x, y in zip(xs, ys):
            px[int(x), int(y)] = 255
        img = img.filter(ImageFilter.MaxFilter(3)) if radius > 1.5 else img
        # tile-safe blur: blur a 3x3 mosaic and crop the centre
        big = Image.new("L", (size * 3, size * 3))
        for i in range(3):
            for j in range(3):
                big.paste(img, (i * size, j * size))
        big = big.filter(ImageFilter.GaussianBlur(radius))
        a = np.asarray(big.crop((size, size, size * 2, size * 2)), dtype=np.float64)
        return a / (a.max() + 1e-9)

    coarse = blobs(52000, 2.3)
    fine = blobs(110000, 1.0)
    f = 0.62 * coarse + 0.38 * fine
    f = (f - f.min()) / (f.max() - f.min())
    return f ** 0.85


def main():
    curve = catmull_rom(PTS)
    centers, arclen = resample(curve, STEP)
    tang = np.gradient(centers, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9

    zbuf = np.full((H, W), -np.inf)
    nx = np.zeros((H, W))
    ny = np.zeros((H, W))
    nz = np.zeros((H, W))
    tu = np.zeros((H, W))  # along the tube
    tv = np.zeros((H, W))  # around the tube
    alpha = np.zeros((H, W))

    K = 0.22  # later path wins where the tube crosses itself
    r = int(math.ceil(R + 2))
    yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
    for i, ((cx, cy), s) in enumerate(zip(centers, arclen)):
        x0, y0 = int(round(cx)), int(round(cy))
        if x0 + r < 0 or x0 - r >= W or y0 + r < 0 or y0 - r >= H:
            continue
        xa, xb = max(0, x0 - r), min(W, x0 + r + 1)
        ya, yb = max(0, y0 - r), min(H, y0 + r + 1)
        dx = xx[ya - (y0 - r) : yb - (y0 - r), xa - (x0 - r) : xb - (x0 - r)] + (x0 - cx)
        dy = yy[ya - (y0 - r) : yb - (y0 - r), xa - (x0 - r) : xb - (x0 - r)] + (y0 - cy)
        d2 = dx * dx + dy * dy
        inside = d2 < (R + 1.0) ** 2
        h = np.sqrt(np.clip(R * R - d2, 0, None))
        z = h + K * s
        win = inside & (z > zbuf[ya:yb, xa:xb])
        if not win.any():
            continue
        # lateral offset across the tube (perpendicular to the tangent)
        t = tang[i]
        lat = dx * -t[1] + dy * t[0]
        lat_c = np.clip(lat / R, -1, 1)
        zb = zbuf[ya:yb, xa:xb]
        zb[win] = z[win]
        nx[ya:yb, xa:xb][win] = (dx / R)[win]
        ny[ya:yb, xa:xb][win] = (dy / R)[win]
        nz[ya:yb, xa:xb][win] = (h / R)[win]
        tu[ya:yb, xa:xb][win] = s
        tv[ya:yb, xa:xb][win] = (np.arcsin(lat_c) * R)[win]
        a = np.clip(R + 0.5 - np.sqrt(d2), 0, 1)
        alpha[ya:yb, xa:xb][win] = np.maximum(alpha[ya:yb, xa:xb][win], a[win])
        if i % 500 == 0:
            print(f"  sweep {i}/{len(centers)}", file=sys.stderr)

    covered = alpha > 0

    # Foam height sampled in surface space so it wraps around the tube.
    foam = foam_texture()
    TS = foam.shape[0]
    scale = 1.0  # texture px per surface px
    iu = (tu * scale).astype(np.int64) % TS
    iv = ((tv + 1000) * scale).astype(np.int64) % TS
    F = np.where(covered, foam[iv, iu], 0.5)

    # Bump-map: perturb the normal by the screen-space gradient of the foam.
    gy, gx = np.gradient(F)
    bump = 1.5
    bx = nx - bump * gx
    by = ny - bump * gy
    bz = nz + 1e-3
    ln = np.sqrt(bx * bx + by * by + bz * bz)
    bx, by, bz = bx / ln, by / ln, bz / ln

    # Lighting
    L = np.array([-0.48, -0.62, 0.62])
    L /= np.linalg.norm(L)
    lambert = np.clip(bx * L[0] + by * L[1] + bz * L[2], 0, 1)
    # Blinn-Phong highlight
    Hh = L + np.array([0, 0, 1.0])
    Hh /= np.linalg.norm(Hh)
    spec = np.clip(bx * Hh[0] + by * Hh[1] + bz * Hh[2], 0, 1) ** 18
    # cool rim on the shadow side
    rim = np.clip(1 - nz, 0, 1) ** 2.4 * np.clip(-(nx * L[0] + ny * L[1]) * 1.4, 0, 1)

    # Solana gradient along the tube's length: purple -> blue -> teal -> green.
    # Each pixel takes the base color of its spot along the path, then is shaded
    # from a deep tone (in shadow) to a light tone (facing the light).
    stops = [
        (0.00, np.array([0.60, 0.27, 1.00])),  # #9945FF
        (0.34, np.array([0.36, 0.42, 1.00])),  # violet-blue
        (0.62, np.array([0.10, 0.72, 0.92])),  # teal
        (1.00, np.array([0.08, 0.95, 0.58])),  # #14F195
    ]
    g = np.clip(tu / max(arclen[-1], 1.0), 0, 1)
    base = np.zeros((H, W, 3))
    for (g0, c0), (g1, c1) in zip(stops, stops[1:]):
        seg = (g >= g0) & (g <= g1)
        f = ((g - g0) / (g1 - g0))[..., None]
        f = f * f * (3 - 2 * f)  # smoothstep, so the hue changes have no hard seams
        base = np.where(seg[..., None], c0 + (c1 - c0) * f, base)

    deep = base * 0.38
    mid = base
    light = base + (1 - base) * 0.42
    t = lambert[..., None]
    col = np.where(t < 0.55, deep + (mid - deep) * (t / 0.55), mid + (light - mid) * ((t - 0.55) / 0.45))

    ao = 0.64 + 0.36 * F  # pores sit darker
    col = col * ao[..., None]
    tint = base + (1 - base) * 0.6  # highlights pick up the local hue
    col += spec[..., None] * tint * 0.38
    col += rim[..., None] * (base + (1 - base) * 0.35) * 0.55
    # bright flecks on the foam tips
    fleck = np.clip((F - 0.8) / 0.2, 0, 1) * lambert
    col += fleck[..., None] * tint * 0.3

    # Soft contact shadow where a later stretch of tube passes over an earlier
    # one: look back toward the light; if a much later segment is there, this
    # pixel sits under it.
    shadow = np.zeros((H, W))
    for k, (ox, oy) in enumerate([(14, 18), (28, 36), (44, 56)]):
        tu_up = np.roll(np.roll(tu, oy, axis=0), ox, axis=1)
        cov_up = np.roll(np.roll(covered, oy, axis=0), ox, axis=1)
        hit = covered & cov_up & (tu_up > tu + 4 * R)
        shadow = np.maximum(shadow, hit * (1.0 - 0.25 * k))
    sh = Image.fromarray((shadow * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(22))
    shadow = np.asarray(sh, dtype=np.float64) / 255 * covered
    col = col * (1 - 0.42 * shadow[..., None])

    col = np.clip(col, 0, 1)
    rgba = np.dstack([col, alpha]) * 255
    img = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "WEBP", quality=88, method=6)
    print("wrote", os.path.abspath(OUT), os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
