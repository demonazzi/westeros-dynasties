"""Сборка: склеивает исходники в одну страницу для публикации и в отдельный HTML-файл."""
import os, pathlib, shutil, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
# куда ещё положить страницу для публикации (необязательно): TREE_PUBLISH=/путь/к/файлу.html
PUBLISH = pathlib.Path(os.environ['TREE_PUBLISH']) if os.environ.get('TREE_PUBLISH') else None
DATA = ['data-meta.js', 'data-people.js']
DATA += [p.name for p in sorted(SRC.glob('data-house-*.js'))]
DATA += [p.name for p in sorted(SRC.glob('data-extra-*.js'))]
DATA += ['data-vassals.js']
APP = ['app-core.js'] + [p.name for p in sorted(SRC.glob('app-mod-*.js'))] + ['app-main.js']
HEAD = '''<title>Династии Вестероса</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;1,400&family=Alegreya+Sans:wght@400;500;700&family=Forum&display=swap">
'''
D3 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>\n'

def read(n): return (SRC / n).read_text(encoding='utf-8')

def build():
    css = read('styles.css')
    body = read('body.html')
    data = '\n'.join(read(n) for n in DATA)
    app = '\n'.join(read(n) for n in APP)
    page = HEAD + '<style>\n' + css + '</style>\n\n' + body + '\n' + D3 + '<script>\n' + data + '\n</script>\n<script>\n' + app + '\n</script>\n'
    DIST.mkdir(exist_ok=True)
    (DIST / 'artifact.html').write_text(page, encoding='utf-8')
    head_end = page.index('</style>') + len('</style>')
    standalone = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                  '<style>:root{color-scheme:dark}body{margin:0;background:#131215;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
                  + page[:head_end] + '\n</head>\n<body>' + page[head_end:] + '\n</body>\n</html>\n')
    (DIST / 'targaryen-tree.html').write_text(standalone, encoding='utf-8')
    if PUBLISH and PUBLISH.parent.exists():
        shutil.copy(DIST / 'artifact.html', PUBLISH)
    print('built', len(page), 'bytes;', 'data:', DATA, 'app:', APP)

if __name__ == '__main__':
    build()
