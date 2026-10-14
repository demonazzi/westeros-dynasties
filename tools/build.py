"""Сборка: склеивает исходники в одну страницу для публикации и в отдельный HTML-файл."""
import os, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
# куда ещё положить страницу для публикации (необязательно): TREE_PUBLISH=/путь/к/файлу.html
PUBLISH = pathlib.Path(os.environ['TREE_PUBLISH']) if os.environ.get('TREE_PUBLISH') else None
APP = ['app-i18n.js', 'app-core.js'] + [p.name for p in sorted(SRC.glob('app-mod-*.js'))] + ['app-main.js']
HEAD = '<title>Династии Вестероса</title>\n'
# шрифты и d3 — внутри страницы, чтобы она работала без сети и под строгой политикой безопасности сайта
# (шрифты — @fontsource, лицензия OFL, src/fonts/; d3 7.8.5 — src/vendor/d3.min.js, лицензия ISC)
FONTS = [  # (семейство, начертание, насыщенность, файл без набора и расширения)
    ('Alegreya', 'normal', 400, 'alegreya-{s}-400-normal'), ('Alegreya', 'normal', 500, 'alegreya-{s}-500-normal'),
    ('Alegreya', 'italic', 400, 'alegreya-{s}-400-italic'),
    ('Alegreya Sans', 'normal', 400, 'alegreya-sans-{s}-400-normal'), ('Alegreya Sans', 'normal', 500, 'alegreya-sans-{s}-500-normal'),
    ('Alegreya Sans', 'normal', 700, 'alegreya-sans-{s}-700-normal'),
    ('Forum', 'normal', 400, 'forum-{s}-400-normal')]
SUBSETS = {
    'cyrillic': 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
    'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}

def fonts_css():
    import base64
    out = []
    for fam, style, weight, name in FONTS:
        for sub, rng in SUBSETS.items():
            b64 = base64.b64encode((SRC / 'fonts' / (name.format(s=sub) + '.woff2')).read_bytes()).decode('ascii')
            out.append("@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;"
                       "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (fam, style, weight, b64, rng))
    return '\n'.join(out) + '\n'

def read(n): return (SRC / n).read_text(encoding='utf-8')

def data_js():
    # данные: data/*.json + texts/*.md → JS с глобальными переменными (tools/data.js)
    chk = subprocess.run(['node', str(ROOT / 'tools' / 'data.js'), '--check'], capture_output=True, text=True)
    if chk.returncode != 0:
        sys.exit('данные не сходятся:\n' + chk.stdout + chk.stderr)
    return subprocess.run(['node', str(ROOT / 'tools' / 'data.js'), '--emit'], capture_output=True, text=True, check=True).stdout

def build():
    css = read('styles.css')
    body = read('body.html')
    data = data_js()
    app = '\n'.join(read(n) for n in APP)
    # словари перевода: src/i18n/<язык>.json → I18N (ключ — русская строка, пустой перевод отбрасывается)
    import json
    langs = {}
    for f in sorted((SRC / 'i18n').glob('*.json')):
        langs[f.stem] = {k: v for k, v in json.loads(f.read_text(encoding='utf-8')).items() if v}
    data += '\nconst I18N = ' + json.dumps(langs, ensure_ascii=False) + ';\n'
    # строки данных: texts/<язык>/data.json → I18N_DATA (только переведённые)
    ddata = {}
    for f in sorted((ROOT / 'texts').glob('*/data.json')):
        ddata[f.parent.name] = {k: v['en'] for k, v in json.loads(f.read_text(encoding='utf-8')).items() if v.get('en')}
    data += 'const I18N_DATA = ' + json.dumps(ddata, ensure_ascii=False) + ';\n'
    d3 = (SRC / 'vendor' / 'd3.min.js').read_text(encoding='utf-8')
    page = HEAD + '<style>\n' + fonts_css() + css + '</style>\n\n' + body + '\n<script>\n' + d3 + '\n</script>\n<script>\n' + data + '\n</script>\n<script>\n' + app + '\n</script>\n'
    DIST.mkdir(exist_ok=True)
    (DIST / 'artifact.html').write_text(page, encoding='utf-8')
    head_end = page.index('</style>') + len('</style>')
    standalone = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                  '<style>:root{color-scheme:dark}body{margin:0;background:#131215;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
                  + page[:head_end] + '\n</head>\n<body>' + page[head_end:] + '\n</body>\n</html>\n')
    (DIST / 'targaryen-tree.html').write_text(standalone, encoding='utf-8')
    # index.html в корне — та же страница для GitLab/GitHub Pages
    (ROOT / 'index.html').write_text(standalone, encoding='utf-8')
    if PUBLISH and PUBLISH.parent.exists():
        shutil.copy(DIST / 'artifact.html', PUBLISH)
    print('built', len(page), 'bytes;', 'app:', APP)

if __name__ == '__main__':
    build()
