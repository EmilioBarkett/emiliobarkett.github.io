#!/usr/bin/env python3
"""Build the photos page's image assets and data manifest.

Usage: python3 tools/make_photos.py <source_dir> <out_img_dir> <out_yaml>

For each image in <source_dir>:
  - exports WebP at widths 800/1600/2400 (capped to the original width) into
    <out_img_dir>, named <slug>-<width>.webp
  - records natural width/height
  - appends an entry to _data/photos.yml-style YAML at <out_yaml>

Re-run safe: re-processes every file in source_dir each time (no incremental
caching) - fine for the handful-to-low-hundreds of photos this page holds.

Size ("B"/"M"/"S") is auto-assigned in a repeating pattern for variety. Order
is shuffled (deterministically, so re-runs are stable) so photos don't stay
grouped by camera/source the way the source folder's filenames are. Hand-edit
the generated YAML afterward to fine-tune any of this - that's the normal
workflow, same as editing any other _data file on this site.
"""
import hashlib
import random
import subprocess
import sys
from pathlib import Path

WIDTHS = [800, 1600, 2400]
SHUFFLE_SEED = 42

# Repeating pattern: one big every 5. Two things shaped the ordering here,
# both about what ends up adjacent to the big photo that starts each cycle:
# - B immediately followed by M forms a wide "bigmed" row spanning most of
#   the canvas (B followed by S instead forms a narrower "bigsmall" row,
#   which - with nothing else on the page yet to constrain where the next
#   group leans - tends to leave a large gap right after the first row).
# - Whatever lands right before the NEXT cycle's B can't pair with it (B
#   only looks forward for its own trio/bigsmall companions), so it renders
#   alone. A lone "S" only gets up to 30% of the gallery width on desktop -
#   genuinely tiny. A lone "M" gets up to 50%, which reads fine. So the
#   pattern ends in M, and the two S's pair with each other (as "ss") in
#   the middle instead of ending up stranded alone.
SIZE_PATTERN = ["B", "M", "S", "S", "M"]


def natural_size(path):
    out = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    w = int(next(l for l in out.splitlines() if "pixelWidth" in l).split(":")[1])
    h = int(next(l for l in out.splitlines() if "pixelHeight" in l).split(":")[1])
    return w, h


def make_webp(src, out_path, width):
    subprocess.run(
        ["cwebp", "-quiet", "-q", "82", "-resize", str(width), "0", str(src), "-o", str(out_path)],
        check=True,
    )


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    src_dir, out_img_dir, out_yaml = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out_img_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(
        p for p in src_dir.iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".tif", ".tiff")
    )
    if not files:
        print(f"No images found in {src_dir}")
        sys.exit(1)

    rng = random.Random(SHUFFLE_SEED)
    rng.shuffle(files)  # deterministic (fixed seed), but breaks up camera/source grouping

    photos = []
    for i, src in enumerate(files):
        w, h = natural_size(src)
        photos.append({"src": src, "w": w, "h": h, "size": SIZE_PATTERN[i % len(SIZE_PATTERN)]})

    # A portrait photo labeled "S" is the single worst combination here: "S"
    # photos regularly get squeezed into a narrow leftover strip beside a
    # bigger neighbor (that's the "Woven" look filling gaps efficiently), and
    # a width squeeze hurts a portrait image far more than a landscape one -
    # height = width / aspect_ratio, and a portrait's aspect ratio is well
    # under 1, so the same width cut shrinks its height by proportionally
    # more. Landscape "S" photos hold up fine under the same squeeze; portrait
    # ones end up genuinely tiny. So portraits simply never get labeled "S".
    for p in photos:
        if p["size"] == "S" and p["w"] / p["h"] < 0.8:
            p["size"] = "M"

    # Guard the opening row specifically: a big photo immediately followed by
    # a small one forms a narrow row with nothing yet on the page to anchor
    # it, which tends to leave a large gap. Big-then-medium forms a wide row
    # instead. See the layout algorithm notes in style.css for the full story.
    if len(photos) >= 2 and photos[0]["size"] == "B" and photos[1]["size"] == "S":
        photos[1]["size"] = "M"

    # Two adjacent "S" photos pair up into one half-canvas-wide slot shared
    # between them. That's fine when at least one is portrait (its narrower
    # aspect ratio leaves height to spare), but if BOTH are landscape, fitting
    # two wide images side by side into half the canvas forces the height
    # down hard - this is what actually produces "super small" photos, not
    # the size label itself. Promote one to "M" so it pairs more generously
    # instead (an "M"+"S" pair gets nearly the full canvas width, not half).
    for i in range(len(photos) - 1):
        a, b = photos[i], photos[i + 1]
        if a["size"] == "S" and b["size"] == "S":
            ar_a, ar_b = a["w"] / a["h"], b["w"] / b["h"]
            if ar_a >= 1.3 and ar_b >= 1.3:
                b["size"] = "M"

    lines = [
        "# Photos page manifest. size: B/M/S controls layout weight; side:",
        "# left/right/auto leans a big photo's companions. Hand-edit freely -",
        "# regenerating with tools/make_photos.py overwrites this file, so make",
        "# size/side edits here only after you're happy with the photo set.",
        "",
    ]
    for i, p in enumerate(photos):
        src, w, h, size = p["src"], p["w"], p["h"], p["size"]
        digest = hashlib.md5(src.name.encode()).hexdigest()[:8]
        slug = str(i + 1)
        base = f"p-{digest}"

        widths_used = []
        for width in WIDTHS:
            target = min(width, w)
            out_path = out_img_dir / f"{base}-{width}.webp"
            make_webp(src, out_path, target)
            widths_used.append(target)

        lines.append(f'- slug: "{slug}"')
        lines.append(f'  base: "{base}"')
        lines.append(f"  w: {w}")
        lines.append(f"  h: {h}")
        lines.append(f'  widths: [{", ".join(str(x) for x in widths_used)}]')
        lines.append(f'  size: "{size}"')
        lines.append('  side: "auto"')
        lines.append(f'  # source: {src.name}')
        print(f"  {src.name} -> {base} ({w}x{h}, ar={w/h:.2f}, size={size})")

    out_yaml.parent.mkdir(parents=True, exist_ok=True)
    out_yaml.write_text("\n".join(lines) + "\n")
    print(f"\nWrote {len(photos)} photos to {out_yaml}")


if __name__ == "__main__":
    main()
