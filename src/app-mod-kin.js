/* Родство: «Как связаны?» (кем приходятся друг другу двое), вид «Родословная»: песочные часы и веер предков со счётчиком повторов. */
(function () {
  const App = window.App;
  const { byId, esc, state } = App;
  const idOf = r => (/^[a-z_0-9]+/.exec(r) || [''])[0];

  /* ——— Граф родства ——— */
  // Кровные родители: без «официальных» и «по слухам».
  const bioParents = id => {
    const p = byId.get(id); if (!p) return [];
    return p.par.filter(r => !/официально|по слухам/.test(r)).map(idOf).filter(x => x && x !== id && byId.has(x));
  };
  const childrenOf = id => PEOPLE.filter(q => bioParents(q.id).includes(id)).map(q => q.id);
  const spousesOf = id => {
    const s = new Set();
    (byId.get(id).sp || []).forEach(([r, , t]) => { if (byId.has(r)) s.add(r + '|' + (t || 'm')); });
    PEOPLE.forEach(q => (q.sp || []).forEach(([r, , t]) => { if (r === id) s.add(q.id + '|' + (t || 'm')); }));
    const out = new Map();
    s.forEach(k => { const [x, t] = k.split('|'); if (!out.has(x) || t === 'm') out.set(x, t); });
    return out;
  };
  const ancCache = new Map();
  function ancestors(id) {
    if (ancCache.has(id)) return ancCache.get(id);
    const m = new Map([[id, { d: 0, next: null }]]);
    const q = [id];
    while (q.length) {
      const x = q.shift(), dx = m.get(x).d;
      bioParents(x).forEach(p => { if (!m.has(p)) { m.set(p, { d: dx + 1, next: x }); q.push(p); } });
    }
    ancCache.set(id, m);
    return m;
  }

  /* ——— Слова родства ——— */
  const sexOf = id => byId.get(id).sex;
  const g = (sex, m, f, u) => sex === 'f' ? f : sex === 'u' ? (u || m + ' или ' + f) : m;
  const ORD = { 2: 'двоюродн', 3: 'троюродн', 4: 'четвероюродн', 5: 'пятиюродн', 6: 'шестиюродн', 7: 'семиюродн', 8: 'восьмиюродн' };
  const ordAdj = (k, sex) => (ORD[k] || k + '-юродн') + (sex === 'f' ? 'ая' : 'ый');
  const pra = n => 'пра'.repeat(Math.max(0, n));
  function term(m, n, sex, half) {
    if (m === 0 && n === 0) return 'это один человек';
    if (m === 0) return n === 1 ? g(sex, 'отец', 'мать', 'родитель') : g(sex, pra(n - 2) + 'дед', pra(n - 2) + 'бабушка', pra(n - 2) + 'предок');
    if (n === 0) return m === 1 ? g(sex, 'сын', 'дочь', 'ребёнок') : g(sex, pra(m - 2) + 'внук', pra(m - 2) + 'внучка', pra(m - 2) + 'потомок');
    if (m === 1 && n === 1) return half ? (half === 'm' ? g(sex, 'единокровный брат', 'единокровная сестра') : g(sex, 'единоутробный брат', 'единоутробная сестра')) : g(sex, 'брат', 'сестра', 'братья и сёстры');
    if (m === 1) {
      if (n === 2) return g(sex, 'дядя', 'тётя');
      return g(sex, 'двоюродный ' + pra(n - 3) + 'дед', 'двоюродная ' + pra(n - 3) + 'бабушка');
    }
    if (n === 1) {
      if (m === 2) return g(sex, 'племянник', 'племянница');
      const p = m === 3 ? 'внучат' : pra(m - 3) + 'внучат';
      return g(sex, p + 'ый племянник', p + 'ая племянница');
    }
    const k = Math.min(m, n), diff = Math.abs(m - n);
    if (diff === 0) return g(sex, ordAdj(k, 'm') + ' брат', ordAdj(k, 'f') + ' сестра');
    if (m < n) {
      if (diff === 1) return g(sex, ordAdj(k, 'm') + ' дядя', ordAdj(k, 'f') + ' тётя');
      return g(sex, ordAdj(k, 'm') + ' ' + pra(diff - 2) + 'дед', ordAdj(k, 'f') + ' ' + pra(diff - 2) + 'бабушка');
    }
    if (diff === 1) return g(sex, ordAdj(k, 'm') + ' племянник', ordAdj(k, 'f') + ' племянница');
    const p = diff === 2 ? 'внучат' : pra(diff - 2) + 'внучат';
    return g(sex, ordAdj(k, 'm') + ' ' + p + 'ый племянник', ordAdj(k, 'f') + ' ' + p + 'ая племянница');
  }
  const spouseWord = (sex, t) => t === 'b' ? g(sex, 'жених', 'невеста') : t === 'l' ? g(sex, 'возлюбленный', 'возлюбленная') : g(sex, 'муж', 'жена', 'супруг');

  /* ——— Поиск родства ——— */
  function relate(a, b) {
    const A = ancestors(a), B = ancestors(b);
    const commons = [];
    A.forEach((va, x) => { if (B.has(x)) commons.push({ x, m: va.d, n: B.get(x).d }); });
    const res = { a, b, spouse: spousesOf(a).get(b) || null };
    if (commons.length) {
      // Ближайшие общие предки, у которых нет общего потомка среди общих предков
      const lowest = commons.filter(c => !commons.some(o => o.x !== c.x && ancestors(o.x).has(c.x)));
      lowest.sort((p, q) => (p.m + p.n) - (q.m + q.n) || Math.max(p.m, p.n) - Math.max(q.m, q.n));
      const best = lowest[0];
      const pair = lowest.filter(c => c.x !== best.x && c.m === best.m && c.n === best.n && spousesOf(best.x).has(c.x));
      const ancs = [best.x].concat(pair.map(c => c.x));
      let half = null;
      if (best.m === 1 && best.n === 1 && ancs.length === 1) half = sexOf(best.x) === 'f' ? 'f' : 'm';
      const down = (map, from) => { const chain = []; for (let x = map.get(from).next; x; x = map.get(x).next) chain.push(x); return chain; };
      const path = down(A, best.x).reverse().concat([best.x]).concat(down(B, best.x));
      const others = lowest.filter(c => !ancs.includes(c.x)).slice(0, 4);
      res.blood = { m: best.m, n: best.n, ancs, half, path, others, single: ancs.length === 1 && !(best.m === 0 || best.n === 0) };
    }
    if (!res.blood) res.chain = linkChain(a, b);
    return res;
  }
  // Связь через браки: кратчайший путь по родителям, детям, супругам.
  function linkChain(a, b) {
    const prev = new Map([[a, null]]);
    const q = [a];
    while (q.length) {
      const x = q.shift();
      if (x === b) break;
      const steps = [];
      bioParents(x).forEach(p => steps.push([p, 'parent']));
      childrenOf(x).forEach(c => steps.push([c, 'child']));
      spousesOf(x).forEach((t, s) => steps.push([s, 'spouse:' + t]));
      PEOPLE.forEach(o => { if (o.id !== x && bioParents(o.id).some(pp => bioParents(x).includes(pp))) steps.push([o.id, 'sibling']); });
      steps.forEach(([y, how]) => { if (!prev.has(y)) { prev.set(y, [x, how]); q.push(y); } });
    }
    if (!prev.has(b)) return null;
    const out = [];
    for (let y = b; prev.get(y); y = prev.get(y)[0]) out.unshift({ id: y, how: prev.get(y)[1] });
    return out;
  }
  const stepWord = (id, how) => {
    const sex = sexOf(id);
    if (how === 'parent') return g(sex, 'отец', 'мать', 'родители');
    if (how === 'child') return g(sex, 'сын', 'дочь', 'дети');
    if (how === 'sibling') return g(sex, 'брат', 'сестра', 'братья и сёстры');
    return spouseWord(sex, how.split(':')[1]);
  };
  App.relate = relate;
  App.kinTerm = term;

  /* ——— Режим выбора второго человека ——— */
  const pickbar = document.getElementById('pickbar');
  const pickText = document.getElementById('pickbar-text');
  state.relFrom = null; state.rel = null;
  function startPick(id) {
    state.relFrom = id;
    pickText.innerHTML = 'Кем приходится <b>' + esc(byId.get(id).name) + '</b>? Выберите второго человека на древе или в поиске.';
    pickbar.hidden = false;
    if (!(App.views[state.view] || {}).persons) App.setView('people');
  }
  function stopPick() { state.relFrom = null; pickbar.hidden = true; }
  document.getElementById('pickbar-close').addEventListener('click', stopPick);
  App.actions = App.actions || {};
  App.actions.relate = ds => startPick(ds.person);
  App.actions.relpath = () => showPath();
  App.actions.swaprel = () => { if (!state.rel) return; state.rel = relate(state.rel.b, state.rel.a); App.select(state.rel.b, { center: true }); };
  const prevEscape = App.onEscape;
  App.onEscape = () => { if (state.relFrom) { stopPick(); return true; } return prevEscape ? prevEscape() : false; };
  App.hooks.select.push(id => {
    if (state.relFrom && id && id !== state.relFrom) {
      state.rel = relate(state.relFrom, id);
      stopPick();
      App.renderPanel(byId.get(id));
      showPath();
    } else if (state.rel && id !== state.rel.b) state.rel = null;
  });
  function showPath() {
    const r = state.rel; if (!r) return;
    const ids = r.blood ? r.blood.path : r.chain ? [r.a].concat(r.chain.map(s => s.id)) : [r.a, r.b];
    const cls = new Map(ids.map(id => [id, 'relpath']));
    cls.set(r.a, 'rela'); cls.set(r.b, 'relb');
    if (r.blood) r.blood.ancs.forEach(x => cls.set(x, 'relanc'));
    ids.forEach(App.reveal);
    App.setLens({ id: 'rel', ids: new Set(ids.concat(r.blood ? r.blood.ancs : [])), cls, path: ids, pathClass: 'rel-path',
      html: '<b>Как связаны</b><span class="lens-key" data-faction="rela"><i></i>' + esc(byId.get(r.a).name) + '</span><span class="lens-key" data-faction="relb"><i></i>' + esc(byId.get(r.b).name) + '</span>' + (r.blood ? '<span class="lens-key" data-faction="relanc"><i></i>Общие предки</span>' : '') });
    const v = App.views[state.view];
    if (v && v.fitIds) v.fitIds(ids, 0.3);
  }

  /* ——— Раздел карточки ——— */
  const pron = (id, nom) => { const s = sexOf(id); return nom ? g(s, 'Он', 'Она', 'Они') : g(s, 'его', 'её', 'их'); };
  const chipMini = id => '<button type="button" class="chip mini h-' + byId.get(id).house + '" data-id="' + id + '">' + esc(byId.get(id).name) + '</button>';
  App.hooks.panel.unshift(p => {
    const r = state.rel;
    const act = '<div class="panel-actions rel-actions"><button type="button" class="btn" data-action="relate" data-person="' + p.id + '">Как связан' + (p.sex === 'f' ? 'а' : p.sex === 'u' ? 'ы' : '') + ' с…?</button></div>';
    if (!r || r.b !== p.id) return act;
    const A = byId.get(r.a), B = byId.get(r.b);
    let body = '';
    if (r.blood) {
      const t = term(r.blood.m, r.blood.n, A.sex, r.blood.half);
      const back = term(r.blood.n, r.blood.m, B.sex, r.blood.half);
      body += '<p class="rel-term">' + esc(A.name) + ' — ' + esc(t) + ' · ' + esc(B.name) + ' — ' + esc(back) + '</p>';
      body += '<p class="rel-sub">' + (r.blood.m === 0 || r.blood.n === 0 ? 'Прямая линия: ' + App.plural(Math.max(r.blood.m, r.blood.n), 'поколение', 'поколения', 'поколений') + '.'
        : 'Общ' + (r.blood.ancs.length > 1 ? 'ие предки' : (sexOf(r.blood.ancs[0]) === 'f' ? 'ая прародительница' : 'ий предок')) + ': ' + r.blood.ancs.map(chipMini).join(' и ') + (r.blood.single ? ' (родство по одной линии)' : '') + '.') + '</p>';
      body += '<ol class="rel-chain">' + r.blood.path.map(id => '<li>' + chipMini(id) + '</li>').join('') + '</ol>';
      if (r.blood.others.length) body += '<p class="rel-sub">Есть и другие линии родства — через ' + r.blood.others.map(c => chipMini(c.x)).join(', ') + '.</p>';
      if (r.spouse) body += '<p class="rel-sub">Кроме того, ' + g(A.sex, 'он', 'она', 'они') + ' — ' + esc(spouseWord(A.sex, r.spouse)) + '.</p>';
    } else if (r.spouse) {
      body += '<p class="rel-term">' + pron(r.a, true) + ' — ' + esc(spouseWord(A.sex, r.spouse)) + '</p><p class="rel-sub">Кровного родства в известной родословной нет.</p>';
    } else if (r.chain) {
      body += '<p class="rel-term">Кровного родства нет</p><p class="rel-sub">Связь через браки и семьи:</p>';
      body += '<ol class="rel-chain"><li>' + chipMini(r.a) + '</li>' + r.chain.map(s => '<li><span class="rel-step">' + esc(stepWord(s.id, s.how)) + '</span>' + chipMini(s.id) + '</li>').join('') + '</ol>';
    } else body += '<p class="rel-term">Связь не найдена</p><p class="rel-sub">В этих родословных они не связаны ни кровью, ни браками.</p>';
    if ([r.a, r.b].concat(r.blood ? r.blood.path : []).some(id => byId.get(id).unc)) body += '<p class="rel-sub muted-note">Часть пути — родство по слухам или теории.</p>';
    return '<section class="rel-sec"><h3 class="sec-h">Как связаны: ' + esc(A.name) + ' и ' + esc(B.name) + '</h3>' + body +
      '<div class="panel-actions"><button type="button" class="btn" data-action="relpath">Показать путь на древе</button><button type="button" class="btn" data-action="swaprel">Наоборот</button></div></section>' + act;
  });

  /* ——— Вид «Родословная»: песочные часы и веер ——— */
  const el = document.getElementById('kin-svg');
  const ksvg = d3.select(el);
  const kg = ksvg.append('g');
  const kz = d3.zoom().scaleExtent([0.15, 3]).on('zoom', e => kg.attr('transform', e.transform));
  ksvg.call(kz).on('dblclick.zoom', null);
  const modeBtns = [...document.querySelectorAll('#kin-modes [data-kin]')];
  const repBox = document.getElementById('kin-reps');
  state.kinMode = 'hourglass';
  modeBtns.forEach(b => b.addEventListener('click', () => { state.kinMode = b.dataset.kin; drawKin(true); }));
  const centerId = () => state.selected && byId.has(state.selected) ? state.selected : 'rhaenyra';

  const CW = 168, CH = 40;
  function card(gsel, d, opts) {
    const p = d.id ? byId.get(d.id) : null;
    const g0 = gsel.append('g').attr('class', 'kcard ' + (p ? 'h-' + p.house + ' st-' + p.k : 'h-none ext') + (opts && opts.center ? ' center' : '') + (d.rep > 1 ? ' rep' : ''))
      .attr('transform', 'translate(' + (d.x - CW / 2) + ',' + (d.y - CH / 2) + ')');
    if (p) g0.attr('data-id', p.id).attr('tabindex', 0).attr('role', 'button').attr('aria-label', p.full);
    g0.append('rect').attr('class', 'card').attr('width', CW).attr('height', CH).attr('rx', 8);
    g0.append('text').attr('class', 'kname').attr('x', 10).attr('y', p && App.meta(p) ? 16 : 24).text(p ? p.name : d.text);
    if (p && App.meta(p)) g0.append('text').attr('class', 'kmeta').attr('x', 10).attr('y', 31).text(App.meta(p));
    if (d.rep > 1) {
      const b = g0.append('g').attr('class', 'kbadge').attr('transform', 'translate(' + (CW - 16) + ',' + (CH / 2) + ')');
      b.append('circle').attr('r', 11);
      b.append('text').attr('y', 0.5).text('×' + d.rep);
      b.append('title').text(App.t('Встречается в родословной: {n}', { n: App.plural(d.rep, 'раз', 'раза', 'раз') }));
    }
    if (p) g0.append('title').text(p.full + (d.rep > 1 ? ' · ' + App.t('встречается {k}', { k: App.plural(d.rep, 'раз', 'раза', 'раз') }) : ''));
    return g0;
  }
  function pedTree(id, depth) {
    const counts = new Map();
    const build = (pid, text, lvl) => {
      const node = { id: pid, text, children: [] };
      if (pid) counts.set(pid, (counts.get(pid) || 0) + 1);
      if (pid && lvl < depth) {
        const p = byId.get(pid);
        const ps = p.par.filter(r => !/официально/.test(r));
        const ids = ps.map(idOf).filter(x => byId.has(x));
        const father = ids.find(x => sexOf(x) !== 'f'), mother = ids.find(x => sexOf(x) === 'f');
        const texts = ps.filter(r => !byId.has(idOf(r)) && !/назван|родств|неизвест/.test(r));
        const slots = [father || null, mother || null];
        if (!father && texts.length) slots[0] = { text: texts.shift() };
        if (!mother && texts.length) slots[1] = { text: texts.shift() };
        slots.forEach(s => { if (s) node.children.push(typeof s === 'string' ? build(s, null, lvl + 1) : build(null, s.text, lvl + 1)); });
      }
      return node;
    };
    const root = build(id, null, 0);
    return { root, counts };
  }
  function drawHourglass(id) {
    kg.selectAll('*').remove();
    const { root, counts } = pedTree(id, 4);
    const ah = d3.hierarchy(root, d => d.children.length ? d.children : null);
    d3.tree().nodeSize([CH + 12, CW + 64])(ah);
    const desc = { id, children: [] };
    const addKids = (n, lvl) => { if (lvl >= 3) return; childrenOf(n.id).forEach(c => { const k = { id: c, children: [] }; n.children.push(k); addKids(k, lvl + 1); }); };
    addKids(desc, 0);
    const dh = d3.hierarchy(desc, d => d.children.length ? d.children : null);
    d3.tree().nodeSize([CH + 12, CW + 64])(dh);
    const links = kg.append('g').attr('class', 'klinks');
    const cards = kg.append('g');
    // Предки — влево
    ah.each(n => { n.X = -n.y; n.Y = n.x; });
    dh.each(n => { n.X = n.y; n.Y = n.x; });
    ah.links().forEach(l => links.append('path').attr('class', 'link').attr('d', App.linkGen({ source: [l.source.X - CW / 2, l.source.Y], target: [l.target.X + CW / 2, l.target.Y] })));
    dh.links().forEach(l => links.append('path').attr('class', 'link').attr('d', App.linkGen({ source: [l.source.X + CW / 2, l.source.Y], target: [l.target.X - CW / 2, l.target.Y] })));
    ah.descendants().slice(1).forEach(n => card(cards, { id: n.data.id, text: n.data.text, x: n.X, y: n.Y, rep: n.data.id ? counts.get(n.data.id) : 0 }));
    dh.descendants().slice(1).forEach(n => card(cards, { id: n.data.id, x: n.X, y: n.Y }));
    card(cards, { id, x: 0, y: 0 }, { center: true });
    // Супруги — под центральной карточкой
    const sps = [...spousesOf(id).entries()];
    sps.forEach(([s, t], i) => {
      const yy = CH + 30 + i * (CH + 10);
      links.append('path').attr('class', 'union' + (t !== 'm' ? ' t-l' : '')).attr('d', 'M0,' + (yy - CH - 10 + CH / 2) + ' V' + (yy - CH / 2));
      card(cards, { id: s, x: 0, y: yy });
    });
    labels([[-(CW + 64), 'Предки'], [CW + 64, 'Потомки']], ah, dh);
    const reps = [...counts.entries()].filter(([x, c]) => c > 1 && x !== id).sort((a, b) => b[1] - a[1]);
    showReps(reps, counts, 'в 4 поколениях', 4);
    wire();
  }
  function labels(list, ah, dh) {
    const top = Math.min(0, ...ah.descendants().map(n => n.Y), ...dh.descendants().map(n => n.Y)) - 60;
    list.forEach(([x, t]) => kg.append('text').attr('class', 'klabel').attr('x', x).attr('y', top).text(t));
  }
  const RINGS = [0, 72, 72, 72, 96, 104, 112];
  function drawFan(id) {
    kg.selectAll('*').remove();
    const G = RINGS.length;
    const { root, counts } = pedTree(id, G - 1);
    const span = 240 * Math.PI / 180, a0 = -span / 2;
    const R0 = 64;
    const radius = gl => R0 + RINGS.slice(1, gl + 1).reduce((a, b) => a + b, 0);
    const slots = [];
    const walk = (node, gl, i) => {
      if (gl > 0) slots.push({ gl, i, id: node ? node.id : null, text: node ? node.text : null });
      if (gl === G - 1) return;
      const kids = node ? node.children : [];
      // отец — левее, мать — правее
      const f = kids.find(k => k.id ? sexOf(k.id) !== 'f' : kids.indexOf(k) === 0) || null;
      const m = kids.find(k => k !== f) || null;
      walk(f, gl + 1, i * 2); walk(m, gl + 1, i * 2 + 1);
    };
    walk(root, 0, 0);
    const arc = d3.arc();
    const sg = kg.append('g').attr('class', 'fan');
    slots.forEach(s => {
      const n = Math.pow(2, s.gl), w = span / n;
      const st = a0 + s.i * w, en = st + w;
      const r0 = radius(s.gl - 1), r1 = radius(s.gl);
      const p = s.id ? byId.get(s.id) : null;
      const gsl = sg.append('g').attr('class', 'slot ' + (p ? 'h-' + p.house : s.text ? 'h-oth ext' : 'h-none empty') + (p && counts.get(p.id) > 1 ? ' rep' : ''));
      if (p) gsl.attr('data-id', p.id).attr('tabindex', 0).attr('role', 'button').attr('aria-label', p.full);
      gsl.append('path').attr('d', arc({ innerRadius: r0 + 1, outerRadius: r1 - 1, startAngle: st + 0.003, endAngle: en - 0.003 }));
      const label = p ? p.name : (s.text || '');
      if (label) {
        const mid = (st + en) / 2, rm = (r0 + r1) / 2;
        const deg = mid * 180 / Math.PI;
        const arcLen = rm * w;
        const radial = s.gl >= 4;
        const maxLen = radial ? (r1 - r0 - 10) : arcLen - 8;
        const fs = Math.max(7, Math.min(13, radial ? Math.min(13, arcLen * 0.62) : 12.5));
        const t = gsl.append('text').attr('class', 'fan-label').attr('font-size', fs);
        let txt = label;
        const maxChars = Math.max(2, Math.floor(maxLen / (fs * 0.56)));
        if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';
        if (radial) {
          t.attr('transform', 'rotate(' + (deg - 90) + ') translate(' + rm + ',0)' + (deg < 0 ? ' rotate(180)' : '')).attr('dy', '0.35em').text(txt);
        } else {
          const x = Math.sin(mid) * rm, y = -Math.cos(mid) * rm;
          const rot = deg > 90 || deg < -90 ? deg + 180 : deg;
          t.attr('transform', 'translate(' + x + ',' + y + ') rotate(' + rot + ')').attr('dy', '0.35em').text(txt);
        }
        if (p && counts.get(p.id) > 1) {
          const x = Math.sin(mid) * (r1 - 9), y = -Math.cos(mid) * (r1 - 9);
          gsl.append('circle').attr('class', 'rep-dot').attr('cx', x).attr('cy', y).attr('r', 3.5);
        }
      }
      gsl.append('title').text(p ? p.full + (counts.get(p.id) > 1 ? ' · ' + App.t('встречается {k}', { k: App.plural(counts.get(p.id), 'раз', 'раза', 'раз') }) : '') : (App.tData(s.text) || App.t('неизвестно')));
    });
    // Центр
    const c = byId.get(id);
    const cg = kg.append('g').attr('class', 'fan-center h-' + c.house).attr('data-id', id);
    cg.append('circle').attr('r', R0 - 2);
    cg.append('text').attr('class', 'fan-cname').attr('y', -2).text(c.name);
    cg.append('text').attr('class', 'fan-cmeta').attr('y', 16).text(App.meta(c));
    // Поколения
    for (let gl = 1; gl < G; gl++) {
      const r = radius(gl) - RINGS[gl] / 2;
      kg.append('text').attr('class', 'fan-gen').attr('x', 0).attr('y', r + 4).text(gl === 1 ? 'родители' : gl === 2 ? 'деды' : pra(gl - 2) + 'деды');
    }
    const reps = [...counts.entries()].filter(([x, cnt]) => cnt > 1 && x !== id).sort((a, b) => b[1] - a[1]);
    showReps(reps, counts, 'в ' + App.plural(G - 1, 'поколении', 'поколениях', 'поколениях'), G - 1);
    wire();
  }
  /* Окошко «Повторы среди предков»: что считаем, итоговые числа и кто встречается чаще всего. */
  function showReps(reps, counts, scope, depth) {
    const places = Math.pow(2, depth + 1) - 2;
    const known = [...counts.values()].reduce((a, b) => a + b, 0) - 1;
    const distinct = counts.size - 1;
    const extra = reps.reduce((a, [, cnt]) => a + cnt - 1, 0);
    const stat = (t, v, small, tip) => '<div title="' + esc(tip) + '"><dt>' + t + '</dt><dd>' + v + (small ? '<small>' + small + '</small>' : '') + '</dd></div>';
    let html = '<h3>Повторы среди предков</h3>' +
      '<p>Из-за браков между родственниками один человек может занимать в родословной несколько мест. Считаем предков ' + esc(scope) + '.</p>' +
      '<dl class="kin-stats">' +
        stat('Мест', places, '', App.t('Мест для предков в {n} поколениях: родители, деды и так далее', { n: depth })) +
        stat('Известно', known, '', 'Места с известными предками') +
        stat('Разных', distinct, '', 'Число разных предков') +
        stat('Повторов', extra, known && extra ? Math.round(extra / known * 100) + '%' : '', 'Повторные появления предков и их доля среди известных мест') +
      '</dl>';
    if (reps.length) {
      const max = reps[0][1];
      html += '<p class="kin-sub">Чаще всего встречаются</p><ul class="kin-replist">' +
        reps.slice(0, 8).map(([x, cnt]) => '<li><button type="button" class="chip mini h-' + byId.get(x).house + '" data-rep="' + x + '">' + esc(byId.get(x).name) + '</button>' +
          '<span class="kbar" style="width:' + Math.max(12, Math.round(cnt / max * 100)) + '%" aria-hidden="true"></span><span class="cnt">' + App.plural(cnt, 'место', 'места', 'мест') + '</span></li>').join('') + '</ul>' +
        '<p class="kin-tip muted-note">Наведите на имя, чтобы увидеть все его повторы. Нажмите, чтобы открыть родословную этого человека.</p>';
    } else html += '<p class="kin-sub">Повторов нет</p><p>Все известные предки — разные люди.</p>';
    repBox.innerHTML = html;
  }
  function wire() {
    kg.selectAll('[data-id]').on('click', function () { App.select(this.getAttribute('data-id')); })
      .on('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); App.select(this.getAttribute('data-id')); } })
      .on('mouseenter', function () { highlight(this.getAttribute('data-id')); })
      .on('mouseleave', () => highlight(null));
  }
  function highlight(id) { kg.selectAll('[data-id]').classed('same', function () { return !!id && this.getAttribute('data-id') === id; }); }
  repBox.addEventListener('mouseover', e => { const b = e.target.closest('[data-rep]'); highlight(b ? b.dataset.rep : null); });
  repBox.addEventListener('click', e => { const b = e.target.closest('[data-rep]'); if (b) App.select(b.dataset.rep); });

  /* «Назад»: к предыдущему человеку, вокруг которого строилась родословная (та же история, что у карточки и Alt + ←) */
  const backBtn = document.getElementById('kin-back');
  function updateBack() {
    const h = state.history, last = h.length ? h[h.length - 1] : null;
    const ok = !!last && !last.startsWith('d:') && byId.has(last);
    backBtn.hidden = !ok;
    if (ok) { backBtn.textContent = '← ' + App.historyLabel(last); backBtn.setAttribute('aria-label', App.t('Назад: {name}', { name: byId.get(last).full })); }
  }
  backBtn.addEventListener('click', () => App.goBack());
  App.hooks.select.push(() => { if (state.view === 'kin') updateBack(); });

  let lastId = null, lastMode = null;
  function drawKin(force) {
    updateBack();
    const id = centerId();
    if (!force && id === lastId && state.kinMode === lastMode) return;
    lastId = id; lastMode = state.kinMode;
    modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kin === state.kinMode)));
    document.getElementById('kin-title').textContent = byId.get(id).full;
    if (state.kinMode === 'fan') drawFan(id); else drawHourglass(id);
    fitKin(false);
  }
  function fitKin(animate) {
    const box = el.getBoundingClientRect();
    let bb; try { bb = kg.node().getBBox(); } catch (e) { bb = { x: -600, y: -400, width: 1200, height: 800 }; }
    if (!bb.width) bb = { x: -600, y: -400, width: 1200, height: 800 };
    const w = box.width || 1000, h = (box.height || 700) - 60;
    const k = Math.max(0.2, Math.min(1.1, w / (bb.width + 60), h / (bb.height + 60)));
    const t = d3.zoomIdentity.translate(w / 2 - k * (bb.x + bb.width / 2), 60 + h / 2 - k * (bb.y + bb.height / 2)).scale(k);
    if (animate && !App.reduced) ksvg.transition().duration(App.dur).call(kz.transform, t); else ksvg.call(kz.transform, t);
  }
  App.registerView('kin', {
    el, sel: ksvg, tab: document.getElementById('tab-kin'), legend: document.getElementById('kin-legend'), persons: true, links: false, fitLabel: 'По размеру окна',
    hint: 'Нажмите на имя, чтобы открыть его родословную. Наведение подсветит повторяющиеся карточки.',
    zoomBy: k => ksvg.transition().duration(App.reduced ? 0 : 250).call(kz.scaleBy, k),
    fit: () => fitKin(true),
    center: () => {},
    onShow: () => { document.getElementById('kin-ui').hidden = false; drawKin(true); },
    hash: () => 'k:' + centerId()
  });
  App.hooks.view.push(v => { document.getElementById('kin-ui').hidden = v !== 'kin'; document.getElementById('canvas').classList.toggle('in-kin', v === 'kin'); });
  App.hooks.select.push(id => { if (state.view === 'kin' && id) drawKin(); });
  const prevStart = App.startHash;
  App.startHash = h => {
    if (h.startsWith('k:')) { App.render(); const id = h.slice(2); if (byId.has(id)) state.selected = id; App.setView('kin'); return true; }
    return prevStart ? prevStart(h) : false;
  };

  App.smokeKin = () => {
    const out = {};
    const r1 = relate('rhaenyra', 'daemon'); out.rel1 = term(r1.blood.m, r1.blood.n, 'f') + ' / ' + (r1.spouse || '');
    const r2 = relate('jacaerys', 'aegon2'); out.rel2 = r2.blood ? term(r2.blood.m, r2.blood.n, 'm', r2.blood.half) : 'нет';
    const r3 = relate('eddard', 'robert'); out.rel3 = r3.blood ? term(r3.blood.m, r3.blood.n, 'm') : (r3.chain ? r3.chain.map(s => s.id).join('>') : 'нет');
    const r4 = relate('daenerys', 'jon'); out.rel4 = r4.blood ? term(r4.blood.m, r4.blood.n, 'f') : 'нет';
    const r5 = relate('rhaegar', 'viserys3'); out.rel5 = r5.blood ? term(r5.blood.m, r5.blood.n, 'm', r5.blood.half) : 'нет';
    App.select('rhaenyra', { force: true });
    startPick('rhaenyra');
    App.select('aemond');
    out.relSection = (document.querySelector('#panel .rel-term') || {}).textContent;
    App.setLens(null);
    App.setView('kin');
    out.kinCards = document.querySelectorAll('#kin-svg g.kcard').length;
    state.kinMode = 'fan'; drawKin(true);
    out.fanSlots = document.querySelectorAll('#kin-svg g.slot').length;
    out.reps = (document.querySelector('#kin-reps') || {}).textContent.slice(0, 120);
    // «Назад» в обоих видах: веер и часы
    App.select('rhaenyra', { force: true }); App.select('daemon');
    out.kinBack = backBtn.hidden ? 'скрыта' : backBtn.textContent;
    backBtn.click();
    out.kinBackTo = state.selected + ' / ' + document.getElementById('kin-title').textContent;
    state.kinMode = 'hourglass'; drawKin(true);
    App.select('viserys1');
    out.kinBackHourglass = backBtn.hidden ? 'скрыта' : backBtn.textContent;
    App.setView('people');
    return out;
  };
})();
