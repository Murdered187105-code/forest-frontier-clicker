"""Рисует 12 боссов подземелья: assets/monster-dungeon-<id>.svg и спрайт получения урона ...-hurt.svg.

Запуск из папки игры: python tools/make_dungeon_bosses.py
Холст 200×175, как у остальных монстров; земля на y≈168.
"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')

GLOW = '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
SOFT = '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>'
HURT = '<filter id="hurt" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1.25 .18 .18 0 .14  .06 .72 .06 0 .03  .06 .06 .72 0 .03  0 0 0 1 0"/></filter>'


def lin(i, *stops, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{i}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rad(i, *stops, cx=.5, cy=.5, r=.6):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


def eye(cx, cy, rx, ry, color, hurt, left, tilt=0, pupil=None):
    """Светящийся глаз; при уроне — зажмуренный «>» или «<»."""
    if hurt:
        d = rx * 1.1
        if left:
            p = f'M{cx - d} {cy - ry - 1}L{cx + d * .7} {cy}L{cx - d} {cy + ry + 1}'
        else:
            p = f'M{cx + d} {cy - ry - 1}L{cx - d * .7} {cy}L{cx + d} {cy + ry + 1}'
        return f'<path d="{p}" fill="none" stroke="{color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>'
    out = f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{color}" transform="rotate({tilt} {cx} {cy})" filter="url(#glow)"/>'
    if pupil:
        out += f'<ellipse cx="{cx}" cy="{cy}" rx="{max(1, rx * .28)}" ry="{ry * .85}" fill="{pupil}"/>'
    out += f'<circle cx="{cx - rx * .3}" cy="{cy - ry * .35}" r="{max(1, min(rx, ry) * .35)}" fill="#fff" opacity=".9"/>'
    return out


def sparks(points, color, hurt):
    """Мелкие искры/частицы вокруг босса; при уроне их больше и они крупнее."""
    out = ''
    for i, (x, y, r) in enumerate(points):
        rr = r * (1.4 if hurt else 1)
        out += f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{color}" opacity="{.55 + (i % 3) * .15}" filter="url(#glow)"/>'
    return out


def svg(name, defs, body, hurt, aura):
    inner = body
    if hurt:
        inner = f'<g filter="url(#hurt)" transform="translate(100 168) rotate(-4) scale(1.04 .96) translate(-100 -168)">{body}</g>'
        inner += '<g opacity=".85" filter="url(#glow)"><path d="M150 30l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#fff"/><path d="M40 52l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#fff"/></g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 175" role="img" aria-label="{name}">'
            f'<defs>{GLOW}{SOFT}{HURT}{defs}</defs>'
            f'<ellipse cx="100" cy="92" rx="88" ry="78" fill="{aura}" opacity=".22" filter="url(#soft)"/>'
            f'{inner}</svg>')


# ── Тьма ────────────────────────────────────────────────────────────────

def dark_knight(h):
    defs = (lin('armor', (0, '#6b6390'), (.45, '#2d2840'), (1, '#120f1b'))
            + lin('cape', (0, '#5b2a8f'), (1, '#1a0b2e'))
            + lin('blade', (0, '#e9e2ff'), (.5, '#8f86b0'), (1, '#3b3552'), x2=1, y2=0)
            + rad('rune', (0, '#fff'), (.4, '#c49bff'), (1, '#6a2bd6')))
    eyes = eye(91, 46, 4, 2.4, '#d6b8ff', h, True) + eye(109, 46, 4, 2.4, '#d6b8ff', h, False)
    body = f'''
<path d="M54 72Q30 120 36 168L48 160 60 168 74 160 88 168 100 160 112 168 126 160 140 168 152 160 164 168Q170 120 146 72Z" fill="url(#cape)" stroke="#0b0614" stroke-width="2.5"/>
<path d="M76 124h20l-2 42H74Z" fill="url(#armor)" stroke="#0b0614" stroke-width="2.5"/><path d="M104 124h20l2 42h-20Z" fill="url(#armor)" stroke="#0b0614" stroke-width="2.5"/>
<path d="M72 146l26-2M102 144l26 2" stroke="#9b7cff" stroke-width="2" opacity=".7"/>
<ellipse cx="85" cy="142" rx="10" ry="6" fill="#3d3656" stroke="#0b0614" stroke-width="2"/><ellipse cx="115" cy="142" rx="10" ry="6" fill="#3d3656" stroke="#0b0614" stroke-width="2"/>
<path d="M68 72Q100 60 132 72L127 126Q100 136 73 126Z" fill="url(#armor)" stroke="#0b0614" stroke-width="3"/>
<path d="M100 70V128M76 100Q100 108 124 100" stroke="#120f1b" stroke-width="2" fill="none" opacity=".8"/>
<path d="M100 84l9 12-9 12-9-12Z" fill="url(#rune)" filter="url(#glow)"/>
<path d="M58 84Q50 108 54 124l12 2 4-36Z" fill="url(#armor)" stroke="#0b0614" stroke-width="2.5"/>
<path d="M142 84Q150 108 146 124l-12 2-4-36Z" fill="url(#armor)" stroke="#0b0614" stroke-width="2.5"/>
<rect x="48" y="118" width="20" height="16" rx="5" fill="#2d2840" stroke="#0b0614" stroke-width="2.5"/>
<path d="M44 70Q62 58 82 72Q80 90 60 92Q44 88 44 70Z" fill="url(#armor)" stroke="#0b0614" stroke-width="3"/><path d="M48 66L38 50 56 62Z" fill="#9b7cff" stroke="#0b0614" stroke-width="2"/>
<path d="M156 70Q138 58 118 72Q120 90 140 92Q156 88 156 70Z" fill="url(#armor)" stroke="#0b0614" stroke-width="3"/><path d="M152 66L162 50 144 62Z" fill="#9b7cff" stroke="#0b0614" stroke-width="2"/>
<rect x="155" y="90" width="11" height="76" rx="2" fill="url(#blade)" stroke="#0b0614" stroke-width="2.5"/><path d="M160.5 96v66" stroke="#fff" stroke-width="1.2" opacity=".6"/>
<rect x="142" y="84" width="38" height="9" rx="3" fill="#3d3656" stroke="#0b0614" stroke-width="2.5"/><rect x="156" y="62" width="9" height="22" rx="3" fill="#2a1d40" stroke="#0b0614" stroke-width="2"/><circle cx="160.5" cy="58" r="6" fill="url(#rune)" stroke="#0b0614" stroke-width="2"/>
<rect x="146" y="66" width="20" height="16" rx="5" fill="#2d2840" stroke="#0b0614" stroke-width="2.5"/>
<path d="M78 30Q100 14 122 30L124 62Q100 74 76 62Z" fill="url(#armor)" stroke="#0b0614" stroke-width="3"/>
<path d="M82 34Q60 24 58 2Q72 18 90 26Z" fill="#2d2840" stroke="#0b0614" stroke-width="2.5"/><path d="M118 34Q140 24 142 2Q128 18 110 26Z" fill="#2d2840" stroke="#0b0614" stroke-width="2.5"/>
<path d="M84 46H116M100 46V62" stroke="#07040c" stroke-width="6" stroke-linecap="round"/>
{eyes}
<path d="M100 18v10" stroke="#9b7cff" stroke-width="2.5" stroke-linecap="round"/>
{sparks([(30, 40, 2), (172, 36, 2.4), (24, 110, 1.8), (182, 120, 2)], '#b88cff', h)}'''
    return svg('Тёмный рыцарь', defs, body, h, '#7a3cff')


def shadow_reaper(h):
    defs = (lin('robe', (0, '#4a3a6e'), (.5, '#211830'), (1, '#0a0712'))
            + lin('scythe', (0, '#f2ecff'), (.6, '#a49cc4'), (1, '#4b4466'), x2=1, y2=1)
            + rad('hood', (0, '#000'), (1, '#120b1d')))
    eyes = eye(90, 62, 5, 2.6, '#cfa6ff', h, True, tilt=12) + eye(110, 62, 5, 2.6, '#cfa6ff', h, False, tilt=-12)
    mouth = ('<ellipse cx="100" cy="78" rx="7" ry="6" fill="#000" stroke="#7a4fc4" stroke-width="1.5"/>' if h else
             '<path d="M92 76l3 3 3-3 3 3 3-3 3 3" fill="none" stroke="#7a4fc4" stroke-width="1.5" opacity=".8"/>')
    body = f'''
<path d="M40 170L160 22" stroke="#3b2a1e" stroke-width="7" stroke-linecap="round"/><path d="M40 170L160 22" stroke="#6b4b33" stroke-width="3" stroke-linecap="round"/>
<path d="M158 22Q118 -4 64 16Q116 12 150 42Z" fill="url(#scythe)" stroke="#16101f" stroke-width="2.5"/><path d="M152 26Q120 8 76 16" fill="none" stroke="#c49bff" stroke-width="2" filter="url(#glow)"/>
<path d="M100 18Q142 26 146 80Q152 128 170 166L152 158 140 170 126 158 113 172 100 158 87 172 74 158 60 170 48 158 30 166Q48 128 54 80Q58 26 100 18Z" fill="url(#robe)" stroke="#07040c" stroke-width="3"/>
<path d="M66 96Q80 120 74 150M134 96Q120 120 126 150M100 100v52" stroke="#07040c" stroke-width="2" opacity=".6" fill="none"/>
<path d="M76 54Q100 26 124 54Q128 82 100 92Q72 82 76 54Z" fill="url(#hood)" stroke="#2a1d40" stroke-width="2"/>
{eyes}{mouth}
<path d="M128 60Q142 70 136 92Q124 96 118 86Q124 74 128 60Z" fill="url(#robe)" stroke="#07040c" stroke-width="2.5"/>
<path d="M118 80l14-14M121 85l15-12M125 89l13-9" stroke="#e8e0d0" stroke-width="2.6" stroke-linecap="round"/>
<path d="M72 60Q58 70 64 96Q76 100 82 90Q76 76 72 60Z" fill="url(#robe)" stroke="#07040c" stroke-width="2.5"/>
<path d="M68 92l-10 10M73 95l-8 12" stroke="#e8e0d0" stroke-width="2.6" stroke-linecap="round"/>
<path d="M28 150Q20 136 30 126Q30 140 40 144M172 140Q182 128 174 116Q172 130 162 134" fill="#8a5cff" opacity=".5" filter="url(#glow)"/>
{sparks([(22, 70, 2.2), (178, 80, 2), (40, 30, 1.6), (184, 150, 2.2), (14, 150, 1.8)], '#b88cff', h)}'''
    return svg('Теневой жнец', defs, body, h, '#6a2bd6')


def void_maw(h):
    defs = (rad('voidb', (0, '#5a3591'), (.65, '#261540'), (1, '#0c0616'), cx=.4, cy=.35, r=.7)
            + rad('iris', (0, '#ffd6ff'), (.45, '#c04cff'), (1, '#4a0f80'))
            + lin('tent', (0, '#3b2263'), (1, '#120a1f')))
    if h:
        eye_svg = ('<path d="M74 68Q100 84 126 68" fill="none" stroke="#e7d6ff" stroke-width="4" stroke-linecap="round"/>'
                   '<path d="M80 72l-4 6M90 76l-2 7M100 77v7M110 76l2 7M120 72l4 6" stroke="#e7d6ff" stroke-width="2.4" stroke-linecap="round"/>')
        mouth = ('<path d="M60 98Q100 150 140 98Q100 120 60 98Z" fill="#05020a" stroke="#c49bff" stroke-width="2"/>'
                 '<path d="M68 104l6 10 4-8 6 12 4-10 6 12 4-12 6 12 4-10 6 10 6-12" fill="none" stroke="#f2ecff" stroke-width="2.4" stroke-linejoin="round"/>')
    else:
        eye_svg = ('<ellipse cx="100" cy="66" rx="27" ry="21" fill="#efe6ff" stroke="#130a20" stroke-width="3"/>'
                   '<circle cx="100" cy="66" r="14" fill="url(#iris)" filter="url(#glow)"/><ellipse cx="100" cy="66" rx="3.6" ry="11" fill="#07030c"/>'
                   '<circle cx="94" cy="60" r="3.4" fill="#fff"/>')
        mouth = ('<path d="M64 100Q100 128 136 100Q100 114 64 100Z" fill="#05020a" stroke="#7a4fc4" stroke-width="2"/>'
                 '<path d="M72 104l4 7 4-6 5 8 4-7 5 8 4-8 5 8 4-7 5 8 4-7 4 6" fill="none" stroke="#f2ecff" stroke-width="2.2" stroke-linejoin="round"/>')
    tents = ''
    for d in ['M72 124Q60 146 40 150Q30 156 34 166', 'M86 132Q82 152 66 160Q60 166 64 170', 'M100 136Q102 154 96 166',
              'M114 132Q120 152 136 160Q142 166 138 170', 'M128 124Q142 146 160 150Q170 156 166 166']:
        tents += f'<path d="{d}" fill="none" stroke="#0a0512" stroke-width="13" stroke-linecap="round"/><path d="{d}" fill="none" stroke="url(#tent)" stroke-width="9" stroke-linecap="round"/>'
    body = f'''{tents}
<circle cx="100" cy="82" r="58" fill="url(#voidb)" stroke="#07030c" stroke-width="3.5"/>
<path d="M58 50Q70 30 92 26" fill="none" stroke="#9b7cff" stroke-width="3" opacity=".5" stroke-linecap="round"/>
<circle cx="66" cy="96" r="3" fill="#8a5cff" opacity=".6"/><circle cx="138" cy="60" r="2.4" fill="#8a5cff" opacity=".6"/><circle cx="132" cy="110" r="3.4" fill="#8a5cff" opacity=".5"/>
<path d="M64 36L56 18 74 30ZM136 36l8-18-18 12ZM100 25l-4-16 10 14Z" fill="#2a1840" stroke="#07030c" stroke-width="2"/>
{eye_svg}{mouth}
{sparks([(24, 40, 2), (178, 44, 2.4), (20, 100, 1.6), (182, 98, 2), (40, 14, 1.4)], '#c49bff', h)}'''
    return svg('Пожиратель бездны', defs, body, h, '#9b3cff')


# ── Огонь ───────────────────────────────────────────────────────────────

def fire_dragon(h):
    defs = (lin('scale', (0, '#ff7a3a'), (.55, '#d1321f'), (1, '#6e1208'))
            + lin('wing', (0, '#a3281a'), (1, '#3d0905'))
            + lin('belly', (0, '#ffe08a'), (1, '#f39a3a'))
            + lin('horn', (0, '#fff3d6'), (1, '#b58a56')))
    eyes = eye(86, 54, 6, 3.2, '#ffe14d', h, True, tilt=18, pupil='#4a1200') + eye(114, 54, 6, 3.2, '#ffe14d', h, False, tilt=-18, pupil='#4a1200')
    mouth = ('<path d="M80 80Q100 104 120 80Q100 90 80 80Z" fill="#3a0703" stroke="#1d0402" stroke-width="2"/><path d="M84 82l3 6 3-5M110 82l3 5 3-6" fill="#fff6e0"/><path d="M92 92Q100 112 108 92" fill="#ff9a2a" filter="url(#glow)"/>'
             if h else '<path d="M80 82Q100 92 120 82" fill="none" stroke="#3a0703" stroke-width="3" stroke-linecap="round"/><path d="M84 83l3 6 3-5M110 83l3 5 3-6" fill="#fff6e0" stroke="#3a0703" stroke-width=".8"/>')
    body = f'''
<path d="M72 80L14 16 28 56 4 62 30 92 12 114 62 110Z" fill="url(#wing)" stroke="#1d0402" stroke-width="3" stroke-linejoin="round"/><path d="M70 82L18 22M66 90L10 64M64 100L18 112" stroke="#ff6a3a" stroke-width="2" opacity=".6"/>
<path d="M128 80L186 16 172 56 196 62 170 92 188 114 138 110Z" fill="url(#wing)" stroke="#1d0402" stroke-width="3" stroke-linejoin="round"/><path d="M130 82L182 22M134 90L190 64M136 100L182 112" stroke="#ff6a3a" stroke-width="2" opacity=".6"/>
<path d="M68 168Q64 112 84 84H116Q136 112 132 168Z" fill="url(#scale)" stroke="#1d0402" stroke-width="3"/>
<path d="M84 102Q100 98 116 102L118 166H82Z" fill="url(#belly)" stroke="#8a3a10" stroke-width="2"/><path d="M84 114H116M83 128H117M82 142H118M82 156H118" stroke="#c46a20" stroke-width="2"/>
<path d="M66 150Q50 156 52 168H76ZM134 150Q150 156 148 168H124Z" fill="url(#scale)" stroke="#1d0402" stroke-width="2.5"/><path d="M54 168l3-6 3 6 3-6 3 6M134 168l3-6 3 6 3-6 3 6" fill="#fff3d6" stroke="#1d0402" stroke-width="1"/>
<path d="M80 32Q66 18 60 2Q74 12 88 26Z" fill="url(#horn)" stroke="#5a3a1a" stroke-width="2"/><path d="M120 32Q134 18 140 2Q126 12 112 26Z" fill="url(#horn)" stroke="#5a3a1a" stroke-width="2"/>
<path d="M70 62Q70 28 100 22Q130 28 130 62Q132 90 112 98H88Q68 90 70 62Z" fill="url(#scale)" stroke="#1d0402" stroke-width="3"/>
<path d="M100 22l-5-12 5 4 5-4Z" fill="url(#horn)" stroke="#5a3a1a" stroke-width="1.5"/><path d="M90 26l-4-8M110 26l4-8" stroke="#5a3a1a" stroke-width="2.5" stroke-linecap="round"/>
<path d="M76 46Q86 40 96 48M124 46Q114 40 104 48" fill="none" stroke="#3a0703" stroke-width="3.2" stroke-linecap="round"/>
{eyes}
<path d="M82 70Q100 62 118 70Q118 88 100 92Q82 88 82 70Z" fill="#e14a2a" stroke="#1d0402" stroke-width="2"/>
<circle cx="93" cy="72" r="2.2" fill="#1d0402"/><circle cx="107" cy="72" r="2.2" fill="#1d0402"/>
{mouth}
<path d="M90 70q-4-8 0-12M110 70q4-8 0-12" stroke="#9a9a9a" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>
{sparks([(30, 130, 2.2), (170, 130, 2.4), (20, 40, 1.8), (182, 36, 2), (100, 6, 1.6)], '#ffb13a', h)}'''
    return svg('Огненный дракон', defs, body, h, '#ff5a1a')


def flame_lord(h):
    defs = (rad('flame', (0, '#fff6c0'), (.35, '#ffc23a'), (.7, '#ff6a1a'), (1, '#b5200c'), cy=.62, r=.62)
            + lin('rock', (0, '#6a2a14'), (1, '#250b05'))
            + rad('core', (0, '#fff'), (.5, '#ffd24a'), (1, '#ff6a1a')))
    eyes = eye(88, 50, 6, 3.4, '#fffbe6', h, True, tilt=20) + eye(112, 50, 6, 3.4, '#fffbe6', h, False, tilt=-20)
    mouth = ('<path d="M86 66Q100 86 114 66Q100 74 86 66Z" fill="#5a1004" stroke="#fff3c0" stroke-width="1.5"/>' if h else
             '<path d="M86 66Q100 76 114 66" fill="none" stroke="#fff3c0" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>')
    body = f'''
<path d="M100 4Q120 28 112 42Q134 28 140 56Q162 70 150 100Q172 122 150 150Q130 172 100 170Q70 172 50 150Q28 122 50 100Q38 70 60 56Q66 28 88 42Q80 26 100 4Z" fill="url(#flame)" stroke="#8a1a06" stroke-width="2.5"/>
<path d="M54 92Q24 92 14 66Q30 78 42 74Q30 60 34 44Q44 66 60 72Z" fill="url(#flame)" stroke="#8a1a06" stroke-width="2"/>
<path d="M146 92Q176 92 186 66Q170 78 158 74Q170 60 166 44Q156 66 140 72Z" fill="url(#flame)" stroke="#8a1a06" stroke-width="2"/>
<path d="M72 84L128 84 136 126Q100 146 64 126Z" fill="url(#rock)" stroke="#160603" stroke-width="3"/>
<path d="M78 92l10 12-4 14M122 92l-8 10 6 16M100 86v10l-8 10 8 12" stroke="#ff9a2a" stroke-width="2.4" fill="none" filter="url(#glow)"/>
<circle cx="100" cy="108" r="9" fill="url(#core)" filter="url(#glow)"/>
<path d="M70 126Q64 150 74 166M130 126Q136 150 126 166" stroke="#ffb13a" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>
<path d="M74 40Q100 30 126 40Q130 62 114 74Q100 80 86 74Q70 62 74 40Z" fill="#ff8a2a" opacity=".55"/>
<path d="M78 42l12 4M122 42l-12 4" stroke="#7a1404" stroke-width="3.4" stroke-linecap="round"/>
{eyes}{mouth}
{sparks([(26, 120, 2.6), (176, 116, 2.4), (40, 22, 2), (164, 22, 2.2), (100, 160, 2), (14, 150, 1.6)], '#ffd24a', h)}'''
    return svg('Владыка пламени', defs, body, h, '#ff6a1a')


def ash_phoenix(h):
    defs = (lin('wingp', (0, '#ffd24a'), (.45, '#ff6a1a'), (.8, '#b5200c'), (1, '#4a3a36'), x2=1, y2=1)
            + lin('wingq', (0, '#ffd24a'), (.45, '#ff6a1a'), (.8, '#b5200c'), (1, '#4a3a36'), x2=0, y2=1)
            + lin('bodyp', (0, '#fff0a8'), (.5, '#ffb13a'), (1, '#d1481f')))
    eyes = eye(93, 42, 3.6, 2.4, '#fff6c0', h, True, tilt=15, pupil='#3a0a02') + eye(107, 42, 3.6, 2.4, '#fff6c0', h, False, tilt=-15, pupil='#3a0a02')
    beak = ('<path d="M95 49L100 62 105 49Q100 52 95 49Z" fill="#ffd24a" stroke="#6b3a0a" stroke-width="1.5"/><path d="M96 55L100 64 104 55" fill="#3a0a02"/>' if h else
            '<path d="M95 49L100 60 105 49Q100 52 95 49Z" fill="#ffd24a" stroke="#6b3a0a" stroke-width="1.5"/>')
    wing_l = 'M92 84Q50 40 6 28Q24 48 12 62Q36 66 24 82Q50 84 40 100Q64 98 66 114Q80 104 88 112Z'
    wing_r = 'M108 84Q150 40 194 28Q176 48 188 62Q164 66 176 82Q150 84 160 100Q136 98 134 114Q120 104 112 112Z'
    body = f'''
<path d="M92 128Q70 150 52 170Q78 162 92 146Q90 160 100 172Q110 160 108 146Q122 162 148 170Q130 150 108 128Z" fill="url(#wingq)" stroke="#5a1404" stroke-width="2.5"/>
<path d="{wing_l}" fill="url(#wingp)" stroke="#5a1404" stroke-width="2.5" stroke-linejoin="round"/>
<path d="{wing_r}" fill="url(#wingp)" stroke="#5a1404" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M86 82Q60 58 26 46M84 92Q58 82 30 78M84 102Q66 98 48 102M114 82Q140 58 174 46M116 92Q142 82 170 78M116 102Q134 98 152 102" stroke="#fff0a8" stroke-width="1.6" opacity=".6" fill="none"/>
<path d="M100 48Q124 58 122 100Q120 130 100 138Q80 130 78 100Q76 58 100 48Z" fill="url(#bodyp)" stroke="#6b2a0a" stroke-width="2.5"/>
<path d="M88 76Q100 84 112 76M86 90Q100 98 114 90M86 104Q100 112 114 104M88 118Q100 124 112 118" stroke="#d1481f" stroke-width="1.8" fill="none" opacity=".7"/>
<path d="M90 30Q86 12 94 4Q94 18 100 22Q102 8 110 2Q108 18 112 30Z" fill="url(#bodyp)" stroke="#6b2a0a" stroke-width="2"/>
<circle cx="100" cy="42" r="15" fill="url(#bodyp)" stroke="#6b2a0a" stroke-width="2.5"/>
{eyes}{beak}
<path d="M90 36l8 3M110 36l-8 3" stroke="#6b2a0a" stroke-width="2.4" stroke-linecap="round"/>
{sparks([(20, 110, 2.2), (182, 112, 2.4), (60, 20, 1.8), (142, 18, 2), (30, 150, 2), (172, 152, 1.8)], '#ffd24a', h)}'''
    return svg('Пепельный феникс', defs, body, h, '#ff7a2a')


# ── Свет ────────────────────────────────────────────────────────────────

def light_spawn(h):
    defs = (lin('crys', (0, '#ffffff'), (.5, '#fff1b0'), (1, '#e3a82a'), x2=1, y2=1)
            + rad('lglow', (0, '#fffbe6'), (1, '#ffd75e')))
    rays = ''
    for i in range(12):
        a = i * 30
        rays += f'<path d="M100 80L97 {80 - (58 if not h else 46)}L103 {80 - (58 if not h else 46)}Z" fill="#fff4c0" opacity=".55" transform="rotate({a} 100 80)"/>'
    if h:
        eye_svg = '<path d="M84 80Q100 90 116 80" fill="none" stroke="#9a6a10" stroke-width="3.4" stroke-linecap="round"/><path d="M86 74l6 3M114 74l-6 3" stroke="#9a6a10" stroke-width="2.4" stroke-linecap="round"/>'
        cracks = '<path d="M100 32l-6 18 8 6-6 16M120 86l-10 8 4 14M80 92l8 10-6 12" stroke="#fff" stroke-width="2" fill="none"/>'
    else:
        eye_svg = ('<path d="M80 80Q100 64 120 80Q100 96 80 80Z" fill="#fffef6" stroke="#9a6a10" stroke-width="2"/>'
                   '<circle cx="100" cy="80" r="7.5" fill="#ffb92a" filter="url(#glow)"/><circle cx="100" cy="80" r="3" fill="#5a3a06"/><circle cx="97" cy="77" r="1.8" fill="#fff"/>')
        cracks = ''
    body = f'''
<g filter="url(#glow)">{rays}</g>
<ellipse cx="100" cy="80" rx="76" ry="22" fill="none" stroke="#ffd75e" stroke-width="3" transform="rotate(-18 100 80)" opacity=".85"/>
<ellipse cx="100" cy="80" rx="70" ry="18" fill="none" stroke="#fff6d0" stroke-width="2" transform="rotate(24 100 80)" opacity=".7"/>
<path d="M100 18L138 80 100 152 62 80Z" fill="url(#crys)" stroke="#9a6a10" stroke-width="3" stroke-linejoin="round"/>
<path d="M100 18L112 80 100 152M100 18L88 80 100 152M62 80H138" stroke="#fff" stroke-width="1.5" opacity=".7" fill="none"/>
<path d="M100 18L88 80 62 80Z" fill="#fff" opacity=".35"/>
{eye_svg}{cracks}
<path d="M40 40l6 10-6 10-6-10Z" fill="url(#crys)" stroke="#9a6a10" stroke-width="1.6"/><path d="M162 46l5 9-5 9-5-9Z" fill="url(#crys)" stroke="#9a6a10" stroke-width="1.6"/>
<path d="M32 124l5 8-5 8-5-8Z" fill="url(#crys)" stroke="#9a6a10" stroke-width="1.6"/><path d="M170 126l6 10-6 10-6-10Z" fill="url(#crys)" stroke="#9a6a10" stroke-width="1.6"/>
<ellipse cx="100" cy="166" rx="34" ry="5" fill="#ffd75e" opacity=".35" filter="url(#glow)"/>
{sparks([(22, 80, 2.4), (178, 84, 2.2), (60, 150, 1.8), (142, 150, 2), (100, 8, 2)], '#fff6c0', h)}'''
    return svg('Порождение света', defs, body, h, '#ffd75e')


def radiant_guardian(h):
    defs = (lin('gold', (0, '#fff6d0'), (.45, '#f2c24a'), (1, '#9a6a10'))
            + lin('wingw', (0, '#ffffff'), (1, '#d8dcef'))
            + rad('sun', (0, '#fff'), (.5, '#ffe58a'), (1, '#e3a82a')))
    eyes = eye(92, 46, 3.6, 2, '#bfe9ff', h, True) + eye(108, 46, 3.6, 2, '#bfe9ff', h, False)
    wing = 'M70 72Q40 40 10 34Q24 50 14 60Q36 62 24 76Q46 78 36 92Q58 90 56 104Q66 96 74 100Z'
    body = f'''
<path d="{wing}" fill="url(#wingw)" stroke="#8a8fb0" stroke-width="2.5" stroke-linejoin="round"/>
<path d="{wing}" fill="url(#wingw)" stroke="#8a8fb0" stroke-width="2.5" stroke-linejoin="round" transform="translate(200 0) scale(-1 1)"/>
<ellipse cx="100" cy="14" rx="20" ry="6" fill="none" stroke="#ffe58a" stroke-width="3.5" filter="url(#glow)"/>
<path d="M156 20V168" stroke="#8a5a1a" stroke-width="5" stroke-linecap="round"/><path d="M156 4l8 18h-16Z" fill="url(#gold)" stroke="#6b4a10" stroke-width="2"/>
<path d="M78 124h18l-2 42H76ZM104 124h18l2 42h-20Z" fill="url(#gold)" stroke="#6b4a10" stroke-width="2.5"/>
<path d="M70 72Q100 60 130 72L126 126Q100 136 74 126Z" fill="url(#gold)" stroke="#6b4a10" stroke-width="3"/>
<path d="M100 70V128" stroke="#9a6a10" stroke-width="2" opacity=".6"/>
<path d="M46 70Q64 58 82 72Q80 88 62 90Q46 86 46 70ZM154 70Q136 58 118 72Q120 88 138 90Q154 86 154 70Z" fill="url(#gold)" stroke="#6b4a10" stroke-width="2.5"/>
<rect x="146" y="78" width="18" height="15" rx="5" fill="url(#gold)" stroke="#6b4a10" stroke-width="2.5"/>
<path d="M40 86Q66 80 80 88L78 126Q62 148 46 132Q36 112 40 86Z" fill="url(#wingw)" stroke="#6b4a10" stroke-width="3"/>
<circle cx="60" cy="110" r="12" fill="url(#sun)" filter="url(#glow)"/><path d="M60 92v6M60 122v6M42 110h6M72 110h6M47 97l4 4M69 119l4 4M73 97l-4 4M51 119l-4 4" stroke="#e3a82a" stroke-width="2.2" stroke-linecap="round"/>
<path d="M80 30Q100 16 120 30L122 60Q100 72 78 60Z" fill="url(#gold)" stroke="#6b4a10" stroke-width="3"/>
<path d="M80 34Q64 24 60 12Q70 20 84 26ZM120 34Q136 24 140 12Q130 20 116 26Z" fill="url(#wingw)" stroke="#8a8fb0" stroke-width="2"/>
<path d="M86 46H114" stroke="#3a2a06" stroke-width="6" stroke-linecap="round"/>
{eyes}
{sparks([(24, 120, 2.2), (182, 126, 2), (40, 20, 1.8), (170, 50, 2), (12, 90, 1.6)], '#fff6c0', h)}'''
    return svg('Сияющий страж', defs, body, h, '#ffe58a')


def seraph(h):
    defs = (lin('feather', (0, '#ffffff'), (.6, '#fff1c4'), (1, '#e3b64a'))
            + rad('face', (0, '#fffdf2'), (.7, '#ffe9a8'), (1, '#d9a53a')))
    w = 'M100 84Q66 60 22 56Q36 66 30 74Q52 74 44 86Q64 86 60 96Q78 92 100 96Z'
    wings = ''
    for rot in (-34, 0, 34):
        wings += f'<path d="{w}" fill="url(#feather)" stroke="#a7893a" stroke-width="2.2" stroke-linejoin="round" transform="rotate({rot} 100 88)"/>'
        wings += f'<path d="{w}" fill="url(#feather)" stroke="#a7893a" stroke-width="2.2" stroke-linejoin="round" transform="translate(200 0) scale(-1 1) rotate({rot} 100 88)"/>'
    if h:
        face = ('<path d="M84 84l9 4-9 4M116 84l-9 4 9 4" fill="none" stroke="#8a5a10" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
                '<ellipse cx="100" cy="104" rx="6" ry="5" fill="#8a5a10"/><path d="M95 70l10 6M105 70l-10 6" stroke="#8a5a10" stroke-width="2.6" stroke-linecap="round"/>')
    else:
        face = (eye(90, 88, 5, 3, '#ffffff', False, True, pupil='#d9a53a') + eye(110, 88, 5, 3, '#ffffff', False, False, pupil='#d9a53a')
                + '<path d="M93 104Q100 108 107 104" fill="none" stroke="#a7893a" stroke-width="2" stroke-linecap="round"/>'
                + '<ellipse cx="100" cy="72" rx="4" ry="5.5" fill="#fff" stroke="#d9a53a" stroke-width="1.6" filter="url(#glow)"/><circle cx="100" cy="72" r="2" fill="#d9a53a"/>')
    body = f'''{wings}
<ellipse cx="100" cy="90" rx="46" ry="46" fill="none" stroke="#ffd75e" stroke-width="3" opacity=".85" filter="url(#glow)"/>
<ellipse cx="100" cy="90" rx="52" ry="16" fill="none" stroke="#fff6d0" stroke-width="2.4" transform="rotate(-25 100 90)"/>
<circle cx="100" cy="90" r="30" fill="url(#face)" stroke="#a7893a" stroke-width="3"/>
{face}
<path d="M70 150Q100 138 130 150L120 170H80Z" fill="url(#feather)" stroke="#a7893a" stroke-width="2.2"/>
<path d="M100 120v22" stroke="#ffd75e" stroke-width="3" filter="url(#glow)"/>
{sparks([(18, 30, 2), (182, 28, 2.2), (14, 150, 1.8), (186, 150, 2), (100, 10, 2.2)], '#fff6c0', h)}'''
    return svg('Небесный серафим', defs, body, h, '#ffd75e')


# ── Лёд ─────────────────────────────────────────────────────────────────

def ice_golem(h):
    defs = (lin('ice', (0, '#e6fbff'), (.4, '#8fdcff'), (1, '#2a6fb5'), x2=1, y2=1)
            + lin('icedark', (0, '#8fdcff'), (1, '#1d4f8a'), x2=1, y2=1))
    eyes = eye(90, 40, 5, 2.6, '#c8f6ff', h, True, tilt=10) + eye(110, 40, 5, 2.6, '#c8f6ff', h, False, tilt=-10)
    mouth = ('<path d="M88 50l4 5 4-4 4 5 4-5 4 4 4-5" fill="none" stroke="#c8f6ff" stroke-width="2"/><path d="M90 50Q100 62 110 50" fill="#0b2a4a"/>' if h else
             '<path d="M90 51l4 3 4-3 4 3 4-3 4 3" fill="none" stroke="#0b2a4a" stroke-width="2.2"/>')
    body = f'''
<path d="M70 130L62 168H90L94 132ZM130 130L138 168H110L106 132Z" fill="url(#icedark)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M48 72L80 52H120L152 72 146 130 100 144 54 130Z" fill="url(#ice)" stroke="#0b2a4a" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M80 52L100 96 120 52M54 130L100 96 146 130M48 72L100 96 152 72" stroke="#ffffff" stroke-width="1.6" opacity=".55" fill="none"/>
<path d="M100 84l12 12-12 12-12-12Z" fill="#c8f6ff" stroke="#2a6fb5" stroke-width="2" filter="url(#glow)"/>
<path d="M46 74L22 92 18 130 38 138 52 112Z" fill="url(#icedark)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M154 74L178 92 182 130 162 138 148 112Z" fill="url(#icedark)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M12 128L22 120 44 124 46 146 30 154 12 146Z" fill="url(#ice)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M188 128L178 120 156 124 154 146 170 154 188 146Z" fill="url(#ice)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M50 70L40 46 62 62ZM62 60L58 36 76 54ZM150 70L160 46 138 62ZM138 60L142 36 124 54Z" fill="url(#ice)" stroke="#0b2a4a" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M80 18L120 18 126 48 100 60 74 48Z" fill="url(#ice)" stroke="#0b2a4a" stroke-width="3" stroke-linejoin="round"/>
<path d="M80 32H120" stroke="#0b2a4a" stroke-width="5" stroke-linecap="round"/>
{eyes}{mouth}
<path d="M86 18L90 4 96 18M104 18L110 2 116 18" fill="url(#ice)" stroke="#0b2a4a" stroke-width="2"/>
{sparks([(30, 40, 2), (172, 42, 2.2), (100, 160, 1.6), (12, 100, 1.8), (190, 100, 1.8)], '#c8f6ff', h)}'''
    return svg('Ледяной голем', defs, body, h, '#5ec8ff')


def frost_witch(h):
    defs = (lin('robew', (0, '#bfe9ff'), (.5, '#4a8fd6'), (1, '#16305e'))
            + lin('hair', (0, '#ffffff'), (1, '#9fd2ff'))
            + lin('skin', (0, '#eaf7ff'), (1, '#b7d8f0'))
            + rad('orb', (0, '#fff'), (.5, '#9fe6ff'), (1, '#2a7fd6')))
    eyes = eye(92, 44, 4, 2.2, '#5ef0ff', h, True, tilt=12) + eye(108, 44, 4, 2.2, '#5ef0ff', h, False, tilt=-12)
    mouth = ('<ellipse cx="100" cy="56" rx="4" ry="4.5" fill="#1d2a55"/>' if h else '<path d="M95 56Q100 59 105 56" fill="none" stroke="#3a4a8a" stroke-width="2" stroke-linecap="round"/>')
    body = f'''
<path d="M78 30Q60 60 58 120Q70 130 80 122L82 60ZM122 30Q140 60 142 120Q130 130 120 122L118 60Z" fill="url(#hair)" stroke="#6a9ccc" stroke-width="2"/>
<path d="M162 20V168" stroke="#2a3a6a" stroke-width="5" stroke-linecap="round"/><path d="M162 4l9 14-9 14-9-14Z" fill="url(#orb)" stroke="#1d4f8a" stroke-width="2" filter="url(#glow)"/>
<path d="M84 64Q100 58 116 64L132 120Q150 150 156 168H44Q50 150 68 120Z" fill="url(#robew)" stroke="#0e1d3d" stroke-width="3"/>
<path d="M100 66V168M78 110l22 14 22-14M68 140l32 16 32-16" stroke="#dff6ff" stroke-width="1.6" opacity=".55" fill="none"/>
<path d="M84 70Q66 78 56 96Q48 104 40 98" fill="none" stroke="#0e1d3d" stroke-width="10" stroke-linecap="round"/><path d="M84 70Q66 78 56 96Q48 104 40 98" fill="none" stroke="url(#robew)" stroke-width="6" stroke-linecap="round"/>
<circle cx="36" cy="90" r="11" fill="url(#orb)" filter="url(#glow)"/><path d="M36 74v32M20 90h32M25 79l22 22M47 79l-22 22" stroke="#e6fbff" stroke-width="1.4" opacity=".7"/>
<path d="M116 70Q138 80 156 90" fill="none" stroke="#0e1d3d" stroke-width="10" stroke-linecap="round"/><path d="M116 70Q138 80 156 90" fill="none" stroke="url(#robew)" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="100" cy="46" rx="16" ry="19" fill="url(#skin)" stroke="#6a9ccc" stroke-width="2"/>
<path d="M84 40Q86 24 100 22Q114 24 116 40Q108 30 100 32Q92 30 84 40Z" fill="url(#hair)" stroke="#6a9ccc" stroke-width="1.6"/>
<path d="M84 26L88 10 94 22 100 4 106 22 112 10 116 26Z" fill="#c8f6ff" stroke="#2a6fb5" stroke-width="2" stroke-linejoin="round" filter="url(#glow)"/>
<path d="M86 40l9 2M114 40l-9 2" stroke="#2a3a6a" stroke-width="2" stroke-linecap="round"/>
{eyes}{mouth}
{sparks([(24, 130, 2), (178, 120, 2.2), (30, 40, 1.8), (140, 10, 2), (186, 60, 1.6)], '#c8f6ff', h)}'''
    return svg('Морозная ведьма', defs, body, h, '#5ec8ff')


def frost_wolf(h):
    defs = (lin('fur', (0, '#ffffff'), (.45, '#c5e6ff'), (1, '#5a8fc4'))
            + lin('furdark', (0, '#9fc6e6'), (1, '#2f5a8a'))
            + lin('icef', (0, '#ffffff'), (1, '#6fc8ff')))
    eyes = eye(84, 62, 6, 3, '#5ef0ff', h, True, tilt=22, pupil='#05304a') + eye(116, 62, 6, 3, '#5ef0ff', h, False, tilt=-22, pupil='#05304a')
    if h:
        mouth = ('<path d="M82 98Q100 128 118 98Q100 106 82 98Z" fill="#1d1a3a" stroke="#0b1d33" stroke-width="2"/>'
                 '<path d="M86 100l3 7 3-6M108 100l3 6 3-7" fill="#fff"/><path d="M96 112Q100 120 104 112" fill="#e66a8a"/>')
    else:
        mouth = ('<path d="M84 100Q100 110 116 100" fill="none" stroke="#0b1d33" stroke-width="3" stroke-linecap="round"/>'
                 '<path d="M88 101l3 8 3-6M106 101l3 6 3-8" fill="#fff" stroke="#0b1d33" stroke-width=".8"/>')
    body = f'''
<path d="M56 120Q48 150 54 168H80L82 128ZM144 120Q152 150 146 168H120L118 128Z" fill="url(#furdark)" stroke="#0b1d33" stroke-width="3"/>
<path d="M54 168l4-7 4 7 4-7 4 7 4-7 4 7M120 168l4-7 4 7 4-7 4 7 4-7 4 7" fill="#eaf7ff" stroke="#0b1d33" stroke-width="1.2"/>
<path d="M40 100Q36 70 58 56L100 70 142 56Q164 70 160 100Q170 120 150 136Q160 150 140 152Q120 160 100 150Q80 160 60 152Q40 150 50 136Q30 120 40 100Z" fill="url(#fur)" stroke="#0b1d33" stroke-width="3"/>
<path d="M60 120l10 10-2 12M140 120l-10 10 2 12M100 128v16" stroke="#7aa6cf" stroke-width="2" fill="none" opacity=".7"/>
<path d="M62 48L54 6 82 36ZM138 48L146 6 118 36Z" fill="url(#furdark)" stroke="#0b1d33" stroke-width="3" stroke-linejoin="round"/><path d="M64 40L58 16 76 34ZM136 40L142 16 124 34Z" fill="#e6a7c4" opacity=".55"/>
<path d="M58 54Q60 30 100 28Q140 30 142 54Q150 86 120 104Q100 112 80 104Q50 86 58 54Z" fill="url(#fur)" stroke="#0b1d33" stroke-width="3"/>
<path d="M78 34L84 16 92 32 100 12 108 32 116 16 122 34" fill="url(#icef)" stroke="#2a6fb5" stroke-width="2" stroke-linejoin="round"/>
<path d="M72 54Q82 48 92 56M128 54Q118 48 108 56" fill="none" stroke="#0b1d33" stroke-width="3.4" stroke-linecap="round"/>
{eyes}
<path d="M84 80Q100 72 116 80Q118 98 100 102Q82 98 84 80Z" fill="#eaf7ff" stroke="#0b1d33" stroke-width="2"/>
<path d="M92 80Q100 74 108 80Q106 88 100 88Q94 88 92 80Z" fill="#14213d"/>
{mouth}
<path d="M40 70L28 60 42 62ZM160 70L172 60 158 62ZM46 92L30 92 44 84ZM154 92L170 92 156 84Z" fill="url(#icef)" stroke="#2a6fb5" stroke-width="1.6"/>
{sparks([(20, 40, 2), (182, 38, 2.2), (22, 150, 1.8), (178, 150, 2), (100, 8, 1.8)], '#c8f6ff', h)}'''
    return svg('Морозный волк-исполин', defs, body, h, '#5ec8ff')


BOSSES = {
    'dark-knight': dark_knight, 'shadow-reaper': shadow_reaper, 'void-maw': void_maw,
    'fire-dragon': fire_dragon, 'flame-lord': flame_lord, 'ash-phoenix': ash_phoenix,
    'light-spawn': light_spawn, 'radiant-guardian': radiant_guardian, 'seraph': seraph,
    'ice-golem': ice_golem, 'frost-witch': frost_witch, 'frost-wolf': frost_wolf,
}

if __name__ == '__main__':
    for key, draw in BOSSES.items():
        for hurt in (False, True):
            path = os.path.join(OUT, f'monster-dungeon-{key}{"-hurt" if hurt else ""}.svg')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(draw(hurt))
    print('ok', len(BOSSES) * 2)
