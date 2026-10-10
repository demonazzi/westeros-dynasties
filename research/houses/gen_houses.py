"""Историческое (данные с тех пор переехали в data/ и texts/, файлы домов правились руками): собирал src/data-house-tyr.js и src/data-house-gry.js из house_tyr.json / house_gry.json (сбор по AWOIAF и 7kingdoms).
Тексты t и отличия df помечены ai: 1 — это черновики Claude, их правит автор."""
import json, re, sys

V2 = '/tmp/claude-0/-home-claude/056a4095-04bb-5f30-874a-1e43dabcb0a1/scratchpad/v2/'
SRC = '/home/claude/tree2/src/'

def lit(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ') + "'"

def years(s):
    if s is None: return None
    s = str(s).strip()
    if not s: return None
    s = re.sub(r'^≤\s*', 'не позднее ', s)
    s = re.sub(r'(\d+) или (\d+)', r'\1/\2', s)
    return s

# ——— правки по сверке с вики и по устройству древа ———
FIX_T = {
    'harlen': 'Верховный стюард последнего короля Простора Мерна IX Гарденера. После гибели Мерна на Пламенном поле сдал Эйгону I Хайгарден без боя, вручил ему ключи от замка и заверил в преданности, за что Эйгон оставил ему и его потомкам власть над Простором. В Первой Дорнийской войне повёл войско в Дорн. В 5 году после Завоевания пропал вместе со всем войском в песках к востоку от Адова Холма.',
    'theo': 'Сын Харлена Тирелла и его преемник на посту лорда Хайгардена. Унаследовал власть в 5 году после Завоевания, когда отец пропал вместе с войском в Дорне. Правил Простором в годы Первой Дорнийской войны и мира, заключённого после неё. О его дальнейшей жизни известно немного.',
    'aeron': None,  # см. ниже: заменяется опечатка
}
DROP = {'euron_sons'}
KIND = {'toron': 'T', 'rodrik_d': 'T'}            # соляные сыновья — законные дети по обычаю островов, не бастарды
SALT_NOTE = {'toron': 'соляной сын', 'rodrik_d': 'соляной сын'}
DROP_SP = {('willas', 'sansa')}                   # план Оленны, а не помолвка

HOUSE = {
    'tyr': dict(name='Дом Тиреллов', band='Тиреллы', motto='Хайгарден · «Вырастая — крепнем»'),
    'gry': dict(name='Дом Грейджоев', band='Грейджои', motto='Пайк · «Мы не сеем»'),
}
# безымянные звенья, через которые идут известные родственные связи (как «Лорд Талли, отец Хостера и Бриндена»)
PLACEHOLDERS = {
    'tyr': [
        dict(id='tyr_lord17', name='Лорд Тирелл', full='Лорд Тирелл, отец Лютора и его братьев', fem=False,
             t='Безымянный отец Лютора Тирелла и его братьев — Гарта Тучного, Морина и мейстера Гормона. Через его сыновей идут главная линия Хайгардена и младшие ветви дома времён Войны пяти королей. О нём самом в книгах ничего не сказано.'),
    ],
    'gry': [
        dict(id='gry_lord10', name='Лорд Грейджой', full='Лорд Грейджой, отец Дальтона', fem=False,
             t='Безымянный лорд Пайка, отец Дальтона Красного Кракена и Верона. Умер в 127 или 128 году, оставив острова пятнадцатилетнему Дальтону. Ни имени, ни подробностей его правления в книгах нет.'),
        dict(id='gry_lord17', name='Сын Дагона', full='Сын Дагона Грейджоя, отец Квеллона', fem=False,
             t='Безымянный сын Дагона Последнего Разорителя и отец лорда Квеллона Грейджоя. Через него идёт линия от Дагона к Квеллону и его девяти сыновьям. Правил ли он островами, в книгах не сказано.'),
    ],
}
# место на древе: дерево-родитель (p) и корни полос [id, колонка поколения]
TREE_P = {
    'luthor': 'tyr_lord17', 'garth_t': 'tyr_lord17', 'moryn': 'tyr_lord17', 'gormon': 'tyr_lord17',
    'dalton': 'gry_lord10', 'veron': 'gry_lord10', 'quellon': 'gry_lord17',
}
ROOTS = {
    'tyr': [['harlen', 6], ['bertrand', 7], ['matthos', 9], ['lyonel_t', 12], ['leo_t', 15], ['tyr_lord17', 17], ['olenna', 18],
            ['quentin', 18], ['victor_t', 18], ['normund', 19]],
    'gry': [['vickon', 6], ['gry_lord10', 10], ['alton', 13], ['torwyn', 14], ['loron', 15], ['dagon', 16], ['alannys', 19],
            ['quenton_c', 19], ['dagon_d', 19]],
}
COUSIN_PAR = {
    'quentin': ['родственник Мейса; общий предок с главной линией не назван'],
    'victor_t': ['дальний родственник Мейса; общий предок не назван'],
    'normund': ['родственник Мейса; через кого именно — не сказано'],
    'alton': ['родство с Тороном и Торвином не названо'], 'torwyn': ['родство с Алтоном и Лороном не названо'],
    'loron': ['родство с Торвином и Дагоном не названо'], 'dagon': ['родство с прежними лордами не названо'],
    'quenton_c': ['дальний родственник Аши; степень родства не названа'], 'dagon_d': ['дальний родственник Аши; степень родства не названа'],
    'harlen': [], 'bertrand': ['родство с Тео не названо'], 'matthos': ['родство с Бертрандом не названо'],
    'lyonel_t': ['отец не назван; мать правила Простором как регент'], 'leo_t': ['родство с Лионелем не названо'], 'vickon': [],
}
GAPS = {
    'tyr': [
        ('theo', 'bertrand', '≈ 40 лет', 'лорды Хайгардена между Тео и Бертрандом в книгах не названы'),
        ('bertrand', 'matthos', '≈ 40 лет', 'после Бертранда лордом стал его старший сын, имя не названо; родство Маттоса с ними не указано'),
        ('matthos', 'lyonel_t', '', 'отец Лионеля не назван, родство с Маттосом не указано'),
        ('lyonel_t', 'leo_t', '≈ 35 лет', 'лорды Хайгардена между Лионелем и Лео Длинным Шипом не названы'),
        ('leo_t', 'tyr_lord17', '≈ 25 лет', 'кто правил Хайгарденом между Лео Длинным Шипом и отцом Лютора, в книгах не сказано'),
    ],
    'gry': [
        ('goren', 'gry_lord10', '≈ 75 лет', 'лорды Железных островов между Гореном и отцом Дальтона не названы'),
        ('toron', 'alton', '', 'Алтон, Торвин, Лорон и Дагон названы после Торона списком, без дат и родства'),
        ('alton', 'torwyn', '', 'порядок лордов дан списком без дат; родство не названо'),
        ('torwyn', 'loron', '', 'порядок лордов дан списком без дат; родство не названо'),
        ('loron', 'dagon', '', 'порядок лордов дан списком без дат; родство не названо'),
    ],
}

def build(h):
    d = json.load(open(V2 + 'house_' + h + '.json', encoding='utf-8'))
    people = [p for p in d['people'] if p['id'] not in DROP]
    ids = {p['id'] for p in people} | {x['id'] for x in PLACEHOLDERS[h]}
    existing = {p['id'] for p in people if p.get('existing')}
    fem, wiki, screen, out = [], {}, {}, []
    roots = {r[0] for r in ROOTS[h]}
    for ph in PLACEHOLDERS[h]:
        pass
    lines = []
    def ref(x):
        if x is None: return None
        x = str(x).strip()
        return x
    for p in people:
        pid = p['id']
        if p.get('existing'):
            continue
        father, mother = ref(p.get('father')), ref(p.get('mother'))
        fid = father if father in ids or father in EXIST else None
        mid = mother if mother in ids or mother in EXIST else None
        tp = TREE_P.get(pid) or (father if father in ids else None) or (mother if mother in ids else None)
        if pid in roots: tp = None
        par = []
        if father: par.append(father if (father in ids or father in EXIST) else father)
        if mother: par.append(mother)
        if pid in COUSIN_PAR and not par: par = COUSIN_PAR[pid]
        # безымянный родитель — звено на древе
        if pid in ('luthor', 'garth_t', 'moryn', 'gormon'): par = ['tyr_lord17']
        if pid in ('dalton', 'veron'): par = ['gry_lord10']
        if pid == 'quellon': par = ['gry_lord17']
        if pid == 'toron': par = ['dalton', 'соляная жена Дальтона']
        if pid == 'rodrik_d': par = ['dalton', 'соляная жена Дальтона']
        o = {'id': pid}
        if tp: o['p'] = tp
        if par: o['par'] = par
        if pid in ('olenna', 'alannys'):
            o['hs'] = 'oth'; o['h'] = 'Редвинов' if pid == 'olenna' else 'Харлоу'
        else:
            o['hs'] = h
        if p.get('fem'): o['fem'] = 1; fem.append(pid)
        o['name'] = p['ru']
        full = (p.get('full') or '').strip()
        if full and full != p['ru']: o['full'] = full
        o['en'] = p['en']
        al = [a for a in (p.get('al') or []) if a]
        if al: o['al'] = al
        o['k'] = KIND.get(pid, p.get('k') or 'T')
        b, dd = years(p.get('b')), years(p.get('d'))
        if b: o['b'] = b
        if dd: o['d'] = dd
        sp = []
        for s in p.get('spouses') or []:
            who = ref(s.get('who'))
            if not who or (pid, who) in DROP_SP: continue
            item = [who]
            note, typ = (s.get('note') or '').strip(), (s.get('type') or 'm')
            if note or typ != 'm': item.append(note)
            if typ != 'm': item.append(typ)
            sp.append(item)
        if sp: o['sp'] = sp
        if p.get('unc'): o['unc'] = 1
        t = FIX_T.get(pid) or p.get('t') or ''
        t = t.replace('держали в плену ланнистеры', 'держали в плену Ланнистеры')
        o['t'] = t
        o['ai'] = 1
        out.append(o)
        page = p.get('page') or ''
        if page and page.replace('_', ' ') != p['en']: wiki[pid] = page.replace('_', ' ')
        if p.get('screen'):
            sc = p['screen']
            screen[pid] = {'a': sc.get('a') or [], 'df': sc.get('df') or '', 'ai': 1}
    # звенья
    for ph in PLACEHOLDERS[h]:
        o = {'id': ph['id'], 'hs': h, 'name': ph['name'], 'full': ph['full'], 'k': 'T', 't': ph['t'], 'ai': 1}
        if ph['id'] == 'gry_lord17': o['p'] = 'dagon'
        out.insert(0, o)
    # перенос существующих детей Мейса под отца
    exist_updates = {p['existing']: p for p in people if p.get('existing')}
    return d, out, fem, wiki, screen, exist_updates

def js_val(v):
    if isinstance(v, str): return lit(v)
    if isinstance(v, bool): return '1' if v else '0'
    if isinstance(v, int): return str(v)
    if isinstance(v, list): return '[' + ', '.join(js_val(x) for x in v) + ']'
    if isinstance(v, dict): return '{ ' + ', '.join(k + ': ' + js_val(x) for k, x in v.items()) + ' }'
    raise ValueError(v)

def person_js(o):
    head = ', '.join(k + ': ' + js_val(v) for k, v in o.items() if k != 't')
    return '  { ' + head + ',\n    t: ' + lit(o['t']) + ' }'

EXIST = set(l.split(' | ')[0] for l in open(V2 + 'existing_ids.txt', encoding='utf-8').read().splitlines())

if __name__ == '__main__':
    report = {}
    for h in ['tyr', 'gry']:
        d, out, fem, wiki, screen, exist_updates = build(h)
        title = {'tyr': 'Дом Тиреллов (Хайгарден)', 'gry': 'Дом Грейджоев (Пайк)'}[h]
        js = '/* ' + title + '. Собрано по A Wiki of Ice and Fire, русские имена — 7kingdoms.ru.\n   ai: 1 — текст написал Claude (черновик для правки). */\nPEOPLE.push(\n' + \
             ',\n'.join(person_js(o) for o in out) + '\n);\n'
        if h == 'tyr':
            js += '/* Дети Мейса и Алерии (раньше стояли в полосе Хайтауэров) переносятся под отца — см. data-house-hgt.js. */\n'
        if wiki: js += 'Object.assign(WIKI, ' + js_val(wiki) + ');\n'
        open(SRC + 'data-house-' + h + '.js', 'w', encoding='utf-8').write(js)
        report[h] = {'people': len(out), 'fem': fem, 'wiki': wiki, 'screen': list(screen), 'exist': {k: (v.get('father'), v.get('mother'), v.get('b'), [s.get('who') for s in v.get('spouses') or []]) for k, v in exist_updates.items()}}
        json.dump({'screen': screen, 'gaps': GAPS[h], 'roots': ROOTS[h], 'house': HOUSE[h]}, open(V2 + 'gen_' + h + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))
