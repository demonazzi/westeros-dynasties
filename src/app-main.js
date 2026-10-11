/* Запуск: подзаголовок в шапке, образцы гербов в легенде, затем старт приложения. */
(function () {
  const order = App.bandOrder().filter(b => !b.liege).map(b => b.house);
  /* Подзаголовок: сколько всего на древе и какой отрезок истории оно охватывает. */
  const sub = document.getElementById('brand-sub');
  sub.textContent = App.housesLabel() + ' · ' + App.plural(PEOPLE.length, 'человек', 'человека', 'человек') +
    (typeof DRAGONS !== 'undefined' ? ' · ' + App.plural(DRAGONS.length, 'дракон', 'дракона', 'драконов') : '') + ' · от Исхода Эйнара до Войны пяти королей';
  sub.title = 'Дома: ' + order.map(h => HOUSES[h].band).join(', ') + '. Годы — от Завоевания Эйгона.';
  // Легенда: образцы гербов великого и малого дома (список домов не нужен — цвета видны на полосах и в фильтре)
  const minor1 = App.bandOrder().find(b => b.liege);
  document.getElementById('lg-sig-great').innerHTML = '<svg width="30" height="26" aria-hidden="true">' + App.sigilSVG('targ', 4, 0, 22) + '</svg>';
  if (minor1) document.getElementById('lg-sig-minor').innerHTML = '<svg width="30" height="26" aria-hidden="true">' + App.sigilSVG(minor1.house, 8, 6, 15) + '</svg>';
  else document.getElementById('lg-sig-minor').closest('li').remove();
  App.start();
})();
