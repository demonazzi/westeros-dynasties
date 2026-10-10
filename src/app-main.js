/* Запуск: подзаголовок в шапке, дома в легенде, затем старт приложения. */
(function () {
  const order = BANDS.map(b => b.house);
  /* Подзаголовок: сколько всего на древе и какой отрезок истории оно охватывает. */
  const sub = document.getElementById('brand-sub');
  sub.textContent = App.plural(order.length, 'дом', 'дома', 'домов') + ' · ' + App.plural(PEOPLE.length, 'человек', 'человека', 'человек') +
    (typeof DRAGONS !== 'undefined' ? ' · ' + App.plural(DRAGONS.length, 'дракон', 'дракона', 'драконов') : '') + ' · от Исхода Эйнара до Войны пяти королей';
  sub.title = 'Дома: ' + order.map(h => HOUSES[h].band).join(', ') + '. Годы — от Завоевания Эйгона.';
  const legendHouses = order.concat(['bf', 'seed', 'oth']);
  document.getElementById('legend-houses').innerHTML = legendHouses.map(h =>
    '<li class="h-' + h + '"><svg width="30" height="16" aria-hidden="true"><rect class="sw" x="1" y="1" width="28" height="14" rx="4"/></svg><span class="sw-label">' +
    (HOUSES[h].band || (h === 'bf' ? 'Блэкфайры' : h === 'seed' ? 'Семя дракона' : 'Другие дома')) + '</span></li>').join('');
  App.start();
})();
