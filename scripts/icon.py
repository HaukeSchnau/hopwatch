#!/usr/bin/env python3
"""Generates the app icon: the pink jelly mascot from Settings sitting in the candy dial
from Now, as an Icon Composer document (assets/hopwatch.icon), plus the splash image and the
Android launcher and notification icons.

    scripts/icon.py            writes assets/hopwatch.icon, assets/images/splash-icon.png,
                               assets/images/android-*.png and notification-icon.png

assets/images/android-icon.png (512 px) is also the hi-res icon for the Play listing.

Shapes and colors follow src/jelly: the blob body and tuft from character/bodies.ts and
toppers.tsx, the shiny eyes from face.tsx, candy hues and the cream/plum backgrounds from
theme.ts. The system adds the Liquid Glass look to the body and the dial beans.

Preview a rendition on the M1 builder with Icon Composer's ictool, e.g.:
    ictool assets/hopwatch.icon --export-image --output-file out.png --platform iOS \\
      --rendition Dark --width 1024 --height 1024 --scale 1
(ictool lives in Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables.)

Android has no Liquid Glass, so its adaptive icon is the same drawing, flat, on the cream
ground. Android has no dark launcher icon either; themed icons (Android 13+) use the
monochrome layer instead.
"""
import json
import math
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / 'assets/hopwatch.icon'
SPLASH = ROOT / 'assets/images/splash-icon.png'
IMAGES = ROOT / 'assets/images'

INK = '#2B1B3D'
PINK = {'light': '#FFA9D3', 'fill': '#FF6FB5', 'deep': '#DC3F8A'}
CANDY = {'blue': '#4B8BFF', 'pink': '#FF6FB5', 'amber': '#FFC53D', 'green': '#34C97E', 'violet': '#A36AFF'}
# A day on the dial, clockwise from the top in degrees; the jelly covers the bottom.
DIAL = [('blue', 14, 84), ('pink', 96, 128), ('amber', 232, 270), ('green', 282, 316), ('violet', 328, 350)]
DIAL_RADIUS, DIAL_WIDTH = 384, 92
# The mascot's centre and scale (unit space -> icon points) on the 1024 canvas.
JELLY = (512, 585, 7.2)
# The tuft from toppers.tsx, in the mascot's unit space.
TUFT = 'M 0 1 C -0.5 -6 5 -11 9.5 -8.6 C 13 -6.6 10.6 -2 7.4 -3.6'
# Face centre and scale: 1.3 times the in-app size so it reads on the home screen.
FACE = (50, 62, 1.12 * 1.3)


def svg(body: str, defs: str = '') -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>{defs}</defs>{body}</svg>'


def blob_path(n: int = 72) -> str:
    """bodies.ts's classic blob without the seeded lumps, as a smooth closed spline."""
    pts = []
    for i in range(n):
        th = -math.pi / 2 + 2 * math.pi * i / n
        c, s = math.cos(th), math.sin(th)
        ux = math.copysign(abs(c) ** (2 / 2.6), c)
        uy = math.copysign(abs(s) ** (2 / 2.6), s)
        pear = 1 + 0.07 * uy
        if uy > 0:
            uy *= 0.95
        pts.append((50 + ux * 37 * pear, 61 + uy * 30))
    d = f'M {pts[0][0]:.3f} {pts[0][1]:.3f} '
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C {c1[0]:.3f} {c1[1]:.3f} {c2[0]:.3f} {c2[1]:.3f} {p2[0]:.3f} {p2[1]:.3f} '
    return d + 'Z'


def jelly_group() -> str:
    """The attributes that place the mascot's unit space on the canvas."""
    cx, cy, s = JELLY
    return f'transform="translate({cx - 50 * s:.1f} {cy - 60 * s:.1f}) scale({s})"'


def tuft(stroke: str) -> str:
    return (
        f'<path d="{TUFT}" transform="translate(51 33.5) scale(1.25)" fill="none" stroke="{stroke}" '
        'stroke-width="3.6" stroke-linecap="round"/>'
    )


def eye(x: float, fill: str) -> str:
    fy, f = FACE[1], FACE[2]
    return f'<ellipse cx="{x:.2f}" cy="{fy - 1:.2f}" rx="{4.6 * f:.2f}" ry="{5.6 * f:.2f}" fill="{fill}"/>'


def smile(stroke: str) -> str:
    fx, fy, f = FACE
    return (
        f'<path d="M {fx - 4 * f:.2f} {fy + 4.6 * f:.2f} Q {fx:.2f} {fy + 9 * f:.2f} {fx + 4 * f:.2f} {fy + 4.6 * f:.2f}" '
        f'fill="none" stroke="{stroke}" stroke-width="{2.1 * f:.2f}" stroke-linecap="round"/>'
    )


def mascot() -> dict[str, tuple[str, str]]:
    """The jelly's layers as (body, defs): body with tuft, gloss, face."""
    g = jelly_group()
    defs = (
        f'<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{PINK["light"]}"/>'
        f'<stop offset="0.55" stop-color="{PINK["fill"]}"/><stop offset="1" stop-color="{PINK["deep"]}"/></linearGradient>'
        f'<linearGradient id="tuft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{PINK["fill"]}"/>'
        f'<stop offset="1" stop-color="{PINK["deep"]}"/></linearGradient>'
    )
    body = f'<g {g}>{tuft("url(#tuft)")}<path d="{blob_path()}" fill="url(#body)"/></g>'
    gloss = (
        f'<g {g}><rect x="-8" y="-2.9" width="16" height="5.8" rx="2.9" fill="white" opacity="0.62" '
        f'transform="translate(30 41) rotate(-36)"/><circle cx="19.5" cy="57" r="2.3" fill="white" opacity="0.45"/></g>'
    )
    # Shiny eyes, blush and a smile.
    fx, fy, f = FACE
    ex = 12.5 * f
    face = f'<g {g}>'
    for side in (-1, 1):
        x = fx + side * ex
        face += (
            eye(x, INK) +
            f'<circle cx="{x - 1.5 * f:.2f}" cy="{fy - 1 - 2.3 * f:.2f}" r="{1.9 * f:.2f}" fill="white"/>'
            f'<circle cx="{x + 1.7 * f:.2f}" cy="{fy - 1 + 2.3 * f:.2f}" r="{0.95 * f:.2f}" fill="white" opacity="0.9"/>'
            f'<ellipse cx="{fx + side * (ex + 3.5 * f):.2f}" cy="{fy + 6.8 * f:.2f}" rx="{4.4 * f:.2f}" ry="{2.5 * f:.2f}" '
            f'fill="#FF3D7F" opacity="0.34"/>'
        )
    face += smile(INK) + '</g>'
    return {'body': (body, defs), 'gloss': (gloss, ''), 'face': (face, '')}


def arc(a0: float, a1: float) -> str:
    point = lambda a: (512 + DIAL_RADIUS * math.sin(math.radians(a)), 512 - DIAL_RADIUS * math.cos(math.radians(a)))
    (x0, y0), (x1, y1) = point(a0), point(a1)
    return f'M {x0:.1f} {y0:.1f} A {DIAL_RADIUS} {DIAL_RADIUS} 0 {int(a1 - a0 > 180)} 1 {x1:.1f} {y1:.1f}'


def beans(paint: str | None = None, inset: float = 0) -> str:
    """The dial's candy arcs, each in its hue, or all in `paint`, shortened by `inset` degrees
    at both ends (neighbours overlap a little, which only shows when they share a colour)."""
    return ''.join(
        f'<path d="{arc(a0 + inset, a1 - inset)}" fill="none" stroke="{paint or CANDY[hue]}" stroke-width="{DIAL_WIDTH}" stroke-linecap="round"/>'
        for hue, a0, a1 in DIAL
    )


def color(hex_: str) -> str:
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return f'srgb:{r:.5f},{g:.5f},{b:.5f},1.00000'


def gradient(top: str, bottom: str) -> dict:
    return {'linear-gradient': [color(top), color(bottom)], 'orientation': {'start': {'x': 0.5, 'y': 0}, 'stop': {'x': 0.5, 'y': 1}}}


def write_icon() -> None:
    shutil.rmtree(ICON, ignore_errors=True)
    (ICON / 'Assets').mkdir(parents=True)
    layers = {name: svg(*parts) for name, parts in mascot().items()}
    layers['dial'] = svg(beans())
    layers['track'] = svg(f'<circle cx="512" cy="512" r="{DIAL_RADIUS}" fill="none" stroke="#B88A66" stroke-width="{DIAL_WIDTH}"/>')
    for name, content in layers.items():
        (ICON / 'Assets' / f'{name}.svg').write_text(content)

    layer = lambda name, glass=True, **extra: {'image-name': f'{name}.svg', 'name': name, 'glass': glass, **extra}
    doc = {
        # Cream by day, night plum after dark, like the app.
        'fill-specializations': [
            {'value': gradient('#FFF8F0', '#FFE3CC')},
            {'appearance': 'dark', 'value': gradient('#2E2140', '#150F1D')},
        ],
        'groups': [
            {
                # The face and its gloss stay crisp; only the body turns to glass.
                'layers': [layer('face', glass=False), layer('gloss', glass=False), layer('body')],
                'shadow': {'kind': 'layer-color', 'opacity': 0.55},
                'translucency': {'enabled': True, 'value': 0.12},
            },
            {
                'layers': [layer('dial'), layer('track', glass=False, opacity=0.16)],
                'shadow': {'kind': 'layer-color', 'opacity': 0.4},
                'translucency': {'enabled': True, 'value': 0.2},
            },
        ],
        'supported-platforms': {'circles': ['watchOS'], 'squares': 'shared'},
    }
    (ICON / 'icon.json').write_text(json.dumps(doc, indent=2) + '\n')


def rasterize(content: str, out: Path, size: int = 1024, magick: str = '') -> None:
    """Renders SVG markup to a size x size PNG, optionally passing it through ImageMagick."""
    source = out.with_suffix('.svg')
    source.write_text(content)
    render = f'rsvg-convert -w {size} -h {size} "{source}"'
    command = f'{render} | magick - {magick} "{out}"' if magick else f'{render} -o "{out}"'
    try:
        subprocess.run(['nix', 'shell', 'nixpkgs#librsvg', 'nixpkgs#imagemagick', '-c', 'sh', '-c', command], check=True)
    finally:
        source.unlink()


def write_splash() -> None:
    """The dial and mascot on transparent ground; the splash screen supplies cream or plum."""
    parts = mascot()
    content = svg(beans() + parts['body'][0] + parts['gloss'][0] + parts['face'][0], parts['body'][1])
    rasterize(content, SPLASH, magick='-trim +repage -resize 600x600 -gravity center -background none -extent 600x600')


# Android draws adaptive icon layers at 108 dp and masks them to at most the central 72 dp,
# so the iOS drawing shrinks by 72/108 to fill the visible part the way it fills the iOS
# squircle. The dial (860 of 1024) then stays inside the 66 dp safe zone (626 of 1024).
ANDROID_SCALE = 72 / 108


def android_layer(body: str, defs: str = '') -> str:
    return svg(f'<g transform="translate(512 512) scale({ANDROID_SCALE:.5f}) translate(-512 -512)">{body}</g>', defs)


def silhouette(with_dial: bool) -> tuple[str, str]:
    """The mascot in solid white with its eyes and smile cut out, for themed and notification
    icons, which only keep the alpha channel. The dial, if drawn, leaves a gap around the jelly."""
    g, blob = jelly_group(), blob_path()
    fx, f = FACE[0], FACE[2]
    cutouts = eye(fx - 12.5 * f, 'black') + eye(fx + 12.5 * f, 'black') + smile('black')
    defs = (
        f'<mask id="jelly"><g {g}>{tuft("white")}<path d="{blob}" fill="white"/>{cutouts}</g></mask>'
        f'<mask id="gap"><rect width="1024" height="1024" fill="white"/>'
        f'<g {g}>{tuft("black")}<path d="{blob}" fill="black" stroke="black" stroke-width="5"/></g></mask>'
    )
    body = '<rect width="1024" height="1024" fill="white" mask="url(#jelly)"/>'
    if with_dial:
        body = f'<g mask="url(#gap)">{beans("white", inset=2.5)}</g>{body}'
    return body, defs


def cream(top: float, bottom: float) -> tuple[str, str]:
    """The iOS icon's cream ground as (body, defs), running from y=top to y=bottom."""
    defs = (
        f'<linearGradient id="ground" gradientUnits="userSpaceOnUse" x1="0" y1="{top:.1f}" x2="0" y2="{bottom:.1f}">'
        '<stop offset="0" stop-color="#FFF8F0"/><stop offset="1" stop-color="#FFE3CC"/></linearGradient>'
    )
    return '<rect width="1024" height="1024" fill="url(#ground)"/>', defs


def write_android() -> None:
    """Adaptive icon layers (foreground, background, monochrome), a flat full-bleed icon for
    Android 7 launchers and the Play listing (Play rounds the corners), and the notification icon."""
    parts = mascot()
    track = f'<circle cx="512" cy="512" r="{DIAL_RADIUS}" fill="none" stroke="#B88A66" stroke-opacity="0.16" stroke-width="{DIAL_WIDTH}"/>'
    drawing, defs = track + beans() + parts['body'][0] + parts['gloss'][0] + parts['face'][0], parts['body'][1]
    rasterize(android_layer(drawing, defs), IMAGES / 'android-icon-foreground.png')
    # Stretched so the gradient runs top to bottom across the visible 72 dp.
    rasterize(svg(*cream(512 - 512 * ANDROID_SCALE, 512 + 512 * ANDROID_SCALE)), IMAGES / 'android-icon-background.png')
    rasterize(android_layer(*silhouette(with_dial=True)), IMAGES / 'android-icon-monochrome.png')
    ground, ground_defs = cream(0, 1024)
    rasterize(svg(ground + drawing, ground_defs + defs), IMAGES / 'android-icon.png', size=512)
    # Status bar icons are tiny, so the notification icon is the jelly alone, cropped to it.
    body, mask = silhouette(with_dial=False)
    jelly = f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="172 206 680 680"><defs>{mask}</defs>{body}</svg>'
    rasterize(jelly, IMAGES / 'notification-icon.png', size=96)


if __name__ == '__main__':
    write_icon()
    write_splash()
    write_android()
    print(f'wrote {ICON.relative_to(ROOT)}, {SPLASH.relative_to(ROOT)} and the Android icons in {IMAGES.relative_to(ROOT)}')
