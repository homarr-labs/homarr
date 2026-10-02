"""Builds assets/ and assets.js for the reel.

Fonts (OFL) come from Fontsource and Google Fonts, integration icons from each integration's iconUrl, UI icons from
@tabler/icons in the repo's node_modules. three.js is fetched with `npm pack` and bundled with the repo's esbuild.
Downloads are skipped when the file already exists; delete assets/ to refetch.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import tarfile
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(HERE, 'assets')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
THREE_VERSION = '0.180.0'
TABLER = ['activity', 'air-balloon', 'api', 'arrow-back-up', 'arrow-right', 'arrow-up', 'arrows-diagonal', 'arrows-maximize',
          'bell', 'bell-ringing', 'bolt', 'box', 'braces', 'brand-docker', 'brand-github', 'calendar', 'chart-bar', 'check',
          'chevron-down', 'chevron-right', 'circle-check', 'clock', 'cloud', 'code', 'coin', 'command', 'components', 'cpu',
          'cube', 'database', 'device-desktop', 'device-mobile', 'device-tv', 'door', 'download', 'eye-off', 'flame',
          'grip-vertical', 'hand-grab', 'heart', 'hourglass', 'icons', 'key', 'language', 'layout-grid', 'layout-navbar',
          'layout-sidebar-right', 'list-details', 'loader-2', 'lock', 'lock-access', 'lock-open', 'message', 'palette',
          'player-play', 'plug', 'plus', 'pointer', 'puzzle', 'refresh', 'robot', 'route', 'search', 'server', 'settings',
          'shield-check', 'shield-lock', 'sparkles', 'stack-2', 'sun', 'thumb-up', 'user-shield', 'users', 'wand', 'wifi',
          'world', 'world-www', 'x']
# welcome messages shown by the language reel, in order
LANGS = ['fr', 'de', 'ja', 'es', 'ko', 'it', 'ru', 'nl', 'zh', 'el', 'pl', 'sv', 'cn', 'tr', 'uk', 'pt', 'cs', 'he', 'vi', 'en']


def get(url, dest):
    if os.path.exists(dest):
        return
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})) as r:
        data = r.read()
    with open(dest, 'wb') as f:
        f.write(data)


def welcome():
    out = []
    for code in LANGS:
        d = json.load(open(f'{REPO}/packages/translation/src/lang/{code}.json'))
        for k in 'board.error.noBoard.title'.split('.'):
            d = d.get(k) if isinstance(d, dict) else None
        if d:
            out.append({'code': code, 'text': d})
    return out


def fonts(texts):
    os.makedirs(f'{ASSETS}/fonts', exist_ok=True)
    fs = 'https://cdn.jsdelivr.net/npm/@fontsource-variable'
    for subset, name in (('latin', 'inter'), ('latin-ext', 'inter-ext'), ('cyrillic', 'inter-cyr'), ('greek', 'inter-greek'), ('vietnamese', 'inter-viet')):
        get(f'{fs}/inter/files/inter-{subset}-wght-normal.woff2', f'{ASSETS}/fonts/{name}.woff2')
    get(f'{fs}/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', f'{ASSETS}/fonts/jbmono.woff2')
    text = ''.join(sorted(set(''.join(texts) + 'Homarr ↓')))
    for family, name in (('Noto Sans JP', 'jp'), ('Noto Sans KR', 'kr'), ('Noto Sans SC', 'sc'), ('Noto Sans TC', 'tc'), ('Noto Sans Hebrew', 'he')):
        dest = f'{ASSETS}/fonts/{name}.woff2'
        if os.path.exists(dest):
            continue
        q = urllib.parse.urlencode({'family': f'{family}:wght@800', 'text': text})
        css = urllib.request.urlopen(urllib.request.Request(f'https://fonts.googleapis.com/css2?{q}', headers={'User-Agent': UA})).read().decode()
        get(re.search(r'url\(([^)]+)\)', css).group(1), dest)


def integrations():
    """Every integration except the mock one, with its icon, from packages/definitions."""
    src = open(f'{REPO}/packages/definitions/src/integration.ts').read()
    block = src[src.index('export const integrationDefs'):]
    block = block[:block.index('\n} as const')]
    out = []
    for part in re.split(r'\n  (?=[a-zA-Z0-9]+: \{)', block)[1:]:
        kind = re.match(r'([a-zA-Z0-9]+):', part).group(1)
        if kind == 'mock':
            continue
        name = re.search(r'\n    name: "([^"]+)"', part)
        icon = re.search(r'iconUrl: "([^"]+)"', part).group(1)
        out.append({'kind': kind, 'name': name.group(1) if name else kind, 'file': f"icons/{kind}.{icon.rsplit('.', 1)[1]}", 'url': icon})
    os.makedirs(f'{ASSETS}/icons', exist_ok=True)
    with ThreadPoolExecutor(12) as ex:
        list(ex.map(lambda o: get(o['url'], f"{ASSETS}/{o['file']}"), out))
    return [{k: o[k] for k in ('kind', 'name', 'file')} for o in out]


def tabler():
    icons = {}
    base = f'{REPO}/node_modules/@tabler/icons/icons'
    for name in TABLER + ['pointer-filled']:
        path = f'{base}/filled/pointer.svg' if name == 'pointer-filled' else f'{base}/outline/{name}.svg'
        s = open(path).read()
        s = re.sub(r'\s*class="[^"]*"', '', s)
        s = re.sub(r'<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*/>', '', s)
        icons[name] = re.sub(r'\s+', ' ', s).strip()
    return icons


def three():
    pkg = os.path.join(HERE, 'node_modules', 'three')
    if not os.path.exists(pkg):
        cache = os.path.join(HERE, '.cache')
        os.makedirs(cache, exist_ok=True)
        tgz = subprocess.run(['npm', 'pack', f'three@{THREE_VERSION}', '--silent'], cwd=cache, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1]
        with tarfile.open(os.path.join(cache, tgz)) as t:
            t.extractall(cache, filter='data')
        os.makedirs(os.path.dirname(pkg), exist_ok=True)
        shutil.move(os.path.join(cache, 'package'), pkg)
        shutil.rmtree(cache)
    subprocess.run([f'{REPO}/node_modules/.bin/esbuild', 'three/entry.ts', '--bundle', '--format=iife', '--minify', f'--outfile={ASSETS}/three.bundle.js'],
                   cwd=HERE, check=True)


if __name__ == '__main__':
    os.makedirs(ASSETS, exist_ok=True)
    shutil.copy(f'{REPO}/apps/docs/public/img/logo.svg', f'{ASSETS}/logo.svg')
    A = {'integrations': integrations(), 'tabler': tabler()}
    A['logoPaths'] = re.findall(r'<path class="cls-1" d="([^"]+)"', open(f'{ASSETS}/logo.svg').read())
    A['welcome'] = welcome()
    fonts([w['text'] for w in A['welcome']])
    A['lobsterSvg'] = open(f'{HERE}/three/homarr.svg').read()
    A['wordmarkSvg'] = open(f'{HERE}/three/homarr-wordmark-rig.svg').read()
    three()
    with open(f'{HERE}/assets.js', 'w') as f:
        f.write('window.ASSETS=' + json.dumps(A, ensure_ascii=False) + ';\n')
    print(len(A['integrations']), 'integrations,', len(A['tabler']), 'icons,', len(A['welcome']), 'welcome messages,', len(glob.glob(f'{ASSETS}/fonts/*')), 'fonts')
