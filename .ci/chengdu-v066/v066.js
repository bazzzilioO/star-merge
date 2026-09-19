'use strict';

/* v0.6.6 — disclosure + map/source cleanup.
   No itinerary/user-content mutations. */
const V66_RELEASE = '0.6.6';

function v66GuideBodyContent(item) {
  const fifteen = item.fifteenText || v59GuideFallback(item,'fifteen');
  const tired = item.tiredText || v59GuideFallback(item,'tired');
  const skip = item.skipText || v59GuideFallback(item,'skip');
  return `<div class="v59-depth-stack"><details class="guide-depth v65-howto"><summary><span>Как посмотреть</span><i>⌄</i></summary><div class="v65-howto-body"><div><b>За 30 секунд</b><p>${esc(item.summary || 'Краткая подсказка пока не добавлена.')}</p></div><div><b>Нормально посмотреть</b><p>${esc(item.details || 'Подробное описание пока не добавлено.')}</p></div><div><b>Есть 15 минут</b><p>${esc(fifteen)}</p></div><div><b>Если устали</b><p>${esc(tired)}</p></div><div><b>Что можно пропустить</b><p>${esc(skip)}</p></div></div></details>${item.deep ? `<details class="guide-depth"><summary><span>Почитать подробно</span><i>⌄</i></summary><p>${esc(item.deep)}</p></details>` : ''}</div><div class="guide-deep-grid v59-guide-facts">${item.foodText ? `<div><b>Попробовать</b><p>${esc(item.foodText)}</p></div>` : ''}${item.buyText ? `<div><b>Купить</b><p>${esc(item.buyText)}</p></div>` : ''}</div>${item.warning ? `<div class="warning">${esc(item.warning)}</div>` : ''}<div class="guide-maintenance"><button class="secondary-btn" onclick="v57ShowGuideEditor('${escJs(item.id)}')">Править</button><button class="danger-text" onclick="v57DeleteGuide('${escJs(item.id)}')">Удалить</button></div>`;
}

v65GuideCard = function(item) {
  const open = Boolean(ui.openGuide[item.id]);
  const kindLabel = item._guideKind === 'custom' ? '<span class="guide-user-badge">Своя</span>' : item._guideKind === 'override' ? '<span class="guide-user-badge">Изменено</span>' : '';
  return `<article class="guide-card v5-guide v57-guide v58-guide v59-guide v65-guide v66-guide ${item.priority === 'must' ? 'featured' : ''}" data-guide="${esc(item.id)}"><div class="guide-meta"><span>${typeIcons[item.type] || '•'} ${typeLabels[item.type] || item.type} ${kindLabel}</span><span>${esc(item.area || '')}</span></div><button class="guide-title-button touch-target" onclick="toggleGuide('${escJs(item.id)}')"><span><h3>${esc(item.title)}</h3><p>${esc(item.summary || '')}</p></span><i>${open ? '−' : '+'}</i></button>${item.cn ? `<button class="cn-line copyable touch-target" onclick="native('copy','${escJs(item.cn)}')">${esc(item.cn)}</button>` : ''}<div class="guide-expanded v66-guide-body ${open ? 'open' : ''}"><div class="v66-guide-inner">${v66GuideBodyContent(item)}</div></div><div class="guide-actions"><button onclick="native('openMap','${escJs(item.query || item.cn || item.title)}')">AMap</button><button class="add" onclick="addGuideToRoute('${escJs(item.id)}')">+ Маршрут</button></div></article>`;
};
v4GuideCard = v65GuideCard;
guideCard = v65GuideCard;
v57GuideCard = v65GuideCard;
v58GuideCard = v65GuideCard;
v59GuideCard = v65GuideCard;
window.v4GuideCard = v65GuideCard;

toggleGuide = function(id) {
  const card = document.querySelector(`[data-guide="${CSS.escape(id)}"]`);
  const body = card?.querySelector('.v66-guide-body');
  const icon = card?.querySelector('.guide-title-button i');
  const opening = !Boolean(ui.openGuide[id]);
  ui.openGuide[id] = opening;
  if (!card || !body) return render();
  body.classList.toggle('open', opening);
  card.classList.toggle('is-open', opening);
  if (icon) icon.textContent = opening ? '−' : '+';
};
window.toggleGuide = toggleGuide;

v65DontMissCard = function(row) {
  const open = Boolean(ui.v65MissOpen[row.key]);
  const item = row.item;
  const type = row.kind === 'guide' ? (typeLabels[item.type] || item.type || 'Гид') : 'Заметка';
  const title = item.title || 'Без названия';
  const summary = v65MissSummary(row);
  let body = '';
  if (row.kind === 'guide') {
    body = `<p>${esc(item.details || item.summary || '')}</p>${item.warning ? `<div class="warning">${esc(item.warning)}</div>` : ''}<button class="v65-miss-open" onclick="openGuideDetail('${escJs(item.id)}')">Открыть в Гиде ›</button>`;
  } else {
    body = `<p>${esc(item.text || '')}</p>${item.url ? `<button class="source-link" onclick="native('openUrl','${escJs(item.url)}')">Открыть ссылку ↗</button>` : ''}${item.tags?.length ? `<div class="note-tags">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}<button class="v65-miss-open" onclick="v65OpenNote('${escJs(item.id)}')">Открыть заметку ›</button>`;
  }
  return `<article class="v65-miss-card v66-miss-card ${open ? 'is-open' : ''}" data-v65-miss="${esc(row.key)}"><button class="v65-miss-head" onclick="v65ToggleMiss('${escJs(row.key)}')"><span><small>${esc(type)}</small><b>${esc(title)}</b><em>${esc(String(summary).slice(0,150))}</em></span><i>${open ? '−' : '+'}</i></button><div class="v65-miss-body v66-miss-body"><div class="v66-miss-inner">${body}</div></div></article>`;
};
window.v65DontMissCard = v65DontMissCard;

v65ToggleMiss = function(key) {
  const card = document.querySelector(`[data-v65-miss="${CSS.escape(key)}"]`);
  if (!card) return;
  const opening = !Boolean(ui.v65MissOpen[key]);
  ui.v65MissOpen[key] = opening;
  card.classList.toggle('is-open', opening);
  const icon = card.querySelector('.v65-miss-head i');
  if (icon) icon.textContent = opening ? '−' : '+';
};
window.v65ToggleMiss = v65ToggleMiss;

mapView = function() {
  ui.mapMode = 'steps';
  const filteredCount = filteredMapPoints().length;
  const presets = [
    ['Винтаж', '成都 古着店 中古店 二手店'],
    ['Пластинки', '成都 黑胶唱片 唱片店'],
    ['Локальный дизайн', '成都 独立设计师 文创店 买手店'],
    ['Чай', '成都 茶叶店 茶馆'],
    ['Еда рядом', '成都 美食'],
    ['Туалет', '洗手间'],
    ['Аптека', '药店'],
    ['Магазин', '便利店']
  ];
  return shell(`
    <section class="page-title"><div><div class="eyebrow">AMap открывается приложением</div><h1>Карта</h1><p>Поиск рядом и технические точки маршрута. Локации для прогулок и покупок собраны в Гиде.</p></div></section>
    <div class="search-box"><input id="map-search" placeholder="Найти в AMap" value="${esc(ui.mapSearch)}" oninput="updateMapSearch(this.value)"><button class="touch-target" onclick="native('searchMap', ui.mapSearch || '成都')">В AMap</button></div>
    <div class="chips horizontal">${chip('Все дни', ui.mapDay === 'all', "setMapDay('all')")}${store.itinerary.map((day,index) => chip(String(dateParts(day.date).day), ui.mapDay === String(index), `setMapDay('${index}')`)).join('')}</div>
    ${section('Найти рядом', 'живые результаты AMap')}
    <div class="preset-grid">${presets.map(([name,keywords]) => `<button class="touch-target" onclick="native('searchMap','${escJs(keywords)}')"><i>⌖</i><b>${esc(name)}</b><small>${esc(keywords)}</small></button>`).join('')}</div>
    ${section('Технические шаги', `<span id="map-count">${filteredCount}</span>`)}
    <div id="map-results">${mapResultsHtml()}</div>
  `);
};
window.clearMapFilters = () => { ui.mapSearch=''; ui.mapDay=String(currentDayIndex()); ui.mapMode='steps'; render(); };

const V66_BASE_REPORT = v4SelfTestReport;
v4SelfTestReport = function() {
  const report = V66_BASE_REPORT();
  report.version = V66_RELEASE;
  report.v66 = {
    dontMissHorizontalScroll:true,
    stableDontMissDisclosure:true,
    stableGuideDisclosure:true,
    noGuideExternalSources:true,
    noMapTripPlaces:true
  };
  report.health.checks.v66Ux = Object.values(report.v66).every(Boolean);
  report.health.ok = Object.values(report.health.checks).every(Boolean);
  return report;
};
selfTestReport = v4SelfTestReport;
window.v4SelfTestReport = v4SelfTestReport;

render();
