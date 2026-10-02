# Makes the caption fonts for frame.html: static Heavy and Black cuts of SF Pro Rounded
# (fonts/SFNSRounded.ttf, copied from the M1 by render.sh) named "Hopwatch Rounded Heavy"
# and "Hopwatch Rounded Black". Chromium rejects Apple's variable font in @font-face, so
# render.sh hands these to it through fontconfig instead. Needs fontTools.
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

fonts = Path(__file__).parent / 'fonts'
for style, wght in (('Heavy', 858.4), ('Black', 1000)):
    font = TTFont(fonts / 'SFNSRounded.ttf')
    # Apple-only tables the instancer and browsers don't need.
    for tag in ('MERG', 'meta', 'trak'):
        if tag in font:
            del font[tag]
    font = instancer.instantiateVariableFont(font, {'wght': wght, 'GRAD': 400})
    name = font['name']
    family = f'Hopwatch Rounded {style}'
    for nid in (16, 17):
        name.removeNames(nameID=nid)
    for nid, value in ((1, family), (2, 'Regular'), (4, family), (6, family.replace(' ', '') + '-Regular')):
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)
    # A "Regular" of its own family, so nothing gets synthesized.
    font['OS/2'].usWeightClass = 400
    font.save(fonts / f'hopwatch-rounded-{style.lower()}.ttf')
