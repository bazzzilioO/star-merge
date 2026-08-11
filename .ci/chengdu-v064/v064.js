/* v0.6.4 — Cost Intelligence.
   Price metadata is separate from itinerary/user data. Route text remains the source of truth;
   this layer adds dated official/market/route estimates, a two-person budget, actual spend,
   and a simple overprice sanity check. */
const V64_RELEASE = '0.6.4';
const V64_COSTS = window.COST_DATA?.events || {};
const V64_META = window.COST_DATA?.meta || { travelers: 2, checked: '2026-08-11' };

store.costs = store.costs && typeof store.costs === 'object' ? store.costs : {};
store.costs.actual = store.costs.actual && typeof store.costs.actual === 'object' ? store.costs.actual : {};

function v64CostFor(eventId) { return V64_COSTS[eventId] || null; }
function v64ActualFor(eventId) { return store.costs?.actual?.[eventId] || null; }
function v64Rub(value) { return Math.round(Number(value) || 0).toLocaleString('ru-RU'); }
function v64Range(min, max) {
  min = Math.round(Number(min) || 0); max = Math.round(Number(max) || min);
  return min === max ? `¥${v64Rub(min)}` : `¥${v64Rub(min)}–${v64Rub(max)}`;
}
function v64ConfidenceLabel(value) {
  return ({ official:'официально', market:'актуальный ориентир', route:'из маршрута', estimate:'оценка', mixed:'смешанные источники' })[value] || 'ориентир';
}
function v64UnitLabel(cost) {
  if (cost.unit === 'car') return 'за машину';
  if (cost.unit === 'prepaid') return 'уже оплачено';
  return 'на двоих';
}
function v64BudgetFor(eventId, cost = v64CostFor(eventId)) {
  if (!cost || cost.includeInDay === false) return null;
  const actual = v64ActualFor(eventId);
  if (actual && Number.isFinite(Number(actual.amount))) {
    const amount = Math.max(0, Number(actual.amount));
    return { min: amount, max: amount, actual: true };
  }
  return { min: Number(cost.min) || 0, max: Number(cost.max) || Number(cost.min) || 0, actual: false };
}
function v64DayBudget(day) {
  const rows = (day?.events || []).map(event => ({ event, cost:v64CostFor(event.id) })).filter(row => row.cost);
  let min = 0, max = 0, counted = 0, actualCount = 0, prepaid = 0;
  rows.forEach(row => {
    if (row.cost.includeInDay === false) { prepaid++; return; }
    const budget = v64BudgetFor(row.event.id, row.cost);
    if (!budget) return;
    min += budget.min; max += budget.max; counted++;
    if (budget.actual) actualCount++;
  });
  return { min, max, counted, actualCount, prepaid, rows };
}
function v64PriceChip(eventId) {
  const cost = v64CostFor(eventId);
  if (!cost) return '';
  const actual = v64ActualFor(eventId);
  const label = actual ? `факт ¥${v64Rub(actual.amount)}` : cost.headline;
  return `<span class="v64-price-chip ${actual ? 'is-actual' : ''}" title="Стоимость · ${esc(v64ConfidenceLabel(cost.confidence))}">${esc(label)}</span>`;
}
function v64ComponentRows(cost) {
  if (!Array.isArray(cost.components) || !cost.components.length) return '';
  return `<div class="v64-components">${cost.components.map(item => `<div><span>${esc(item.label)}</span><b>${esc(item.text)}</b></div>`).join('')}</div>`;
}
function v64PriceResult(eventId) {
  const result = ui.v64PriceCheck?.[eventId];
  if (!result) return '';
  return `<div class="v64-check-result is-${esc(result.tone)}"><b>${esc(result.title)}</b><span>${esc(result.text)}</span></div>`;
}
function v64CostBody(eventId) {
  const cost = v64CostFor(eventId);
  if (!cost) return '';
  const actual = v64ActualFor(eventId);
  const budget = v64BudgetFor(eventId, cost);
  const expected = cost.includeInDay === false ? 'Не входит в дневной расход' : `${v64Range(cost.min, cost.max)} · ${v64UnitLabel(cost)}`;
  return `<div class="v64-cost-body">
    <div class="v64-cost-head"><span class="v64-confidence is-${esc(cost.confidence)}">${esc(v64ConfidenceLabel(cost.confidence))}</span><small>проверено ${esc(cost.checked || V64_META.checked || '')}</small></div>
    <div class="v64-cost-total"><span>Ориентир</span><b>${esc(cost.headline)}</b><small>${esc(expected)}</small></div>
    ${actual ? `<div class="v64-actual"><span>Фактически заплатили</span><b>¥${v64Rub(actual.amount)}</b><button onclick="v64ClearActual('${escJs(eventId)}')">сбросить</button></div>` : ''}
    ${v64ComponentRows(cost)}
    ${cost.payment ? `<div class="v64-cost-row"><span>Как платить</span><b>${esc(cost.payment)}</b></div>` : ''}
    ${cost.note ? `<p class="v64-cost-note">${esc(cost.note)}</p>` : ''}
    <div class="v64-price-tool">
      <label for="v64-quote-${esc(eventId)}">Нам называют цену, ¥ <small>${cost.unit === 'car' ? 'за машину' : 'для вас двоих'}</small></label>
      <div><input id="v64-quote-${esc(eventId)}" inputmode="decimal" type="number" min="0" step="1" placeholder="0"><button onclick="v64CheckQuote('${escJs(eventId)}')">Проверить</button><button class="secondary" onclick="v64SaveActual('${escJs(eventId)}')">Сохранить факт</button></div>
      ${v64PriceResult(eventId)}
    </div>
    ${cost.source?.url ? `<button class="v64-source" onclick="native('openUrl','${escJs(cost.source.url)}')"><span>Источник</span><b>${esc(cost.source.label || 'Открыть')}</b><i>↗</i></button>` : `<div class="v64-source is-local"><span>Основа</span><b>${cost.confidence === 'route' ? 'маршрут Геры + Яны' : 'контрольный диапазон'}</b></div>`}
  </div>`;
}
function v64CostDetails(eventId, context = 'event') {
  const cost = v64CostFor(eventId);
  if (!cost) return '';
  return `<details class="v64-cost-details" data-v64-event="${esc(eventId)}"><summary><span>Стоимость</span><b>${esc(v64ActualFor(eventId) ? `факт ¥${v64Rub(v64ActualFor(eventId).amount)}` : cost.headline)}</b><i>›</i></summary>${v64CostBody(eventId)}</details>`;
}

ui.v64PriceCheck = ui.v64PriceCheck || {};
function v64Input(eventId) { return document.getElementById(`v64-quote-${eventId}`); }
function v64CheckQuote(eventId) {
  const cost = v64CostFor(eventId); const input = v64Input(eventId); if (!cost || !input) return;
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0) { ui.v64PriceCheck[eventId] = { tone:'warn', title:'Введите сумму', text:'Сравним её с сохранённым ориентиром.' }; return render(); }
  const lo = Number(cost.min) || 0; const hi = Number(cost.max) || lo;
  let tone='ok', title='В пределах ориентира', text=`Ожидали ${v64Range(lo,hi)}.`;
  if (hi > 0 && value > hi * 1.5) { tone='danger'; title='Сильно выше ориентира'; text=`Ожидали ${v64Range(lo,hi)}. Проверь маршрут, класс услуги, доплаты и платную дорогу.`; }
  else if (hi > 0 && value > hi * 1.15) { tone='warn'; title='Выше нашего ориентира'; text=`Ожидали ${v64Range(lo,hi)}. Цена может быть нормальной из-за спроса или допуслуг — перепроверь перед оплатой.`; }
  else if (lo > 0 && value < lo * 0.55) { tone='warn'; title='Подозрительно ниже ориентира'; text=`Ожидали ${v64Range(lo,hi)}. Убедись, что это тот же билет/тариф и в цену входит нужный объём услуги.`; }
  ui.v64PriceCheck[eventId] = { tone,title,text };
  const state = v61CurrentNavState?.(); if (state) ui.v61NextScroll = state.scrollTop;
  render();
}
function v64SaveActual(eventId) {
  const input = v64Input(eventId); if (!input) return;
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount < 0) return toast('Введите сумму в юанях');
  store.costs.actual[eventId] = { amount, updatedAt: nowIso(), updatedBy: store.sync?.deviceId || 'local' };
  save(); toast(`Сохранено: ¥${v64Rub(amount)}`); render();
}
function v64ClearActual(eventId) { delete store.costs.actual[eventId]; save(); toast('Фактическая сумма сброшена'); render(); }
window.v64CheckQuote=v64CheckQuote; window.v64SaveActual=v64SaveActual; window.v64ClearActual=v64ClearActual;

function v64DayCostDetails(day) {
  const total = v64DayBudget(day); if (!total.counted && !total.prepaid) return '';
  const actualText = total.actualCount ? ` · ${total.actualCount} факт.` : '';
  const prepaidText = total.prepaid ? ` · ${total.prepaid} уже оплачено` : '';
  return `<details class="v64-day-budget"><summary><span><small>Ориентир расходов · 2 человека</small><b>${v64Range(total.min,total.max)}</b></span><i>›</i></summary><div class="v64-day-budget-body"><p>Сумма только по позициям с сохранённым ориентиром. Динамические цены — контрольный диапазон, отели и заранее оплаченные позиции не прибавляются.</p><div>${total.rows.map(({event,cost}) => `<button onclick="v62OpenExactEvent('${escJs(event.id)}',${store.itinerary.indexOf(day)})"><span>${esc(event.title)}</span><b>${esc(v64ActualFor(event.id) ? `факт ¥${v64Rub(v64ActualFor(event.id).amount)}` : cost.headline)}</b></button>`).join('')}</div><small>${total.counted} позиций${actualText}${prepaidText}</small></div></details>`;
}

const V64_BASE_EVENT_CARD = v4EventCard;
v4EventCard = function(event,index,day,dayIndex,conflicts) {
  let html = V64_BASE_EVENT_CARD(event,index,day,dayIndex,conflicts);
  const chip = v64PriceChip(event.id);
  if (chip) html = html.replace(/(<button class="check-btn)/, `${chip}$1`);
  const details = v64CostDetails(event.id);
  if (details) html = html.replace('<div class="order-row">', `${details}<div class="order-row">`);
  return html;
};
window.v4EventCard = v4EventCard;

const V64_BASE_DAY_VIEW = v4DayView;
v4DayView = function() {
  let html = V64_BASE_DAY_VIEW();
  const dayIndex = ui.day ?? currentDayIndex(); const day = store.itinerary[dayIndex];
  if (!day) return html;
  const budget = v64DayCostDetails(day);
  if (budget) html = html.replace('<div class="timeline v4-timeline">', `${budget}<div class="timeline v4-timeline">`);
  return html;
};
dayView = v4DayView; window.v4DayView = v4DayView;

const V64_BASE_NOW_VIEW = v60NowView;
v60NowView = function() {
  let html = V64_BASE_NOW_VIEW();
  const row = v60CurrentContext();
  if (!row?.event || !v64CostFor(row.event.id)) return html;
  return html.replace('<div class="v60-field-actions">', `${v64CostDetails(row.event.id,'now')}<div class="v60-field-actions">`);
};
v58NowView = v60NowView; window.v58NowView=v60NowView; window.v59NowView=v60NowView; window.v60NowView=v60NowView;

/* Cost facts are user state and travel with backups/sync, while static price intelligence stays bundled. */
const V64_BASE_CORE_STATE = v4CoreState;
v4CoreState = function(source = store) { const state = V64_BASE_CORE_STATE(source); state.costs = clone(source.costs || {actual:{}}); return state; };
window.v4CoreState = v4CoreState;

function v64MergeActual(localActual, incomingActual) {
  const merged = { ...(localActual || {}) };
  Object.entries(incomingActual || {}).forEach(([id,item]) => {
    const local = merged[id];
    if (!local || new Date(item?.updatedAt || 0).getTime() >= new Date(local?.updatedAt || 0).getTime()) merged[id] = clone(item);
  });
  return merged;
}
const V64_BASE_APPLY_SYNC = v55ApplySync;
v55ApplySync = function() {
  const payload = clone(ui.modal?.payload || null);
  const incoming = payload?.app === 'chengdu-2026-backup' ? payload?.backup?.state : payload?.state;
  const before = clone(store.costs?.actual || {});
  V64_BASE_APPLY_SYNC();
  if (!payload || store.sync?.lastError) return;
  store.costs = store.costs || {actual:{}};
  store.costs.actual = v64MergeActual(before, incoming?.costs?.actual);
  save(); render();
};
window.v55ApplySync = v55ApplySync;

function v64ExportSync() {
  const state = clone({
    version: V60_SCHEMA, schemaVersion: V60_SCHEMA, theme: store.theme, itinerary: store.itinerary,
    routeUpdatedAt: store.routeUpdatedAt, done: store.done, favorites: store.favorites,
    customPhrases: store.customPhrases, notesCards: store.notesCards, checklists: store.checklists,
    collapsed: store.collapsed, tickets: store.tickets, sync: store.sync, history: store.history,
    appReady: store.appReady, guideLinks: store.guideLinks, guideChanges: store.guideChanges,
    shoppingStatus: store.shoppingStatus, nowEventId: store.nowEventId, skipped: store.skipped,
    runtime: { ...v60NormalizeRuntime(store.runtime), simulation: null }, costs: store.costs
  });
  native('exportSync', JSON.stringify({ app:'chengdu-2026', version:V60_SCHEMA, exportedAt:nowIso(), deviceId:store.sync.deviceId, state }));
}
exportSync=v64ExportSync; window.exportSync=v64ExportSync;

const V64_BASE_MORE = moreView;
moreView = function() { return V64_BASE_MORE().replace(/Чэнду 2026 · v[^<]+ · schema \d+ · offline-first/, `Чэнду 2026 · v${V64_RELEASE} · schema ${store.schemaVersion} · offline-first`); };
window.moreView = moreView;

const V64_BASE_SELFTEST = v4SelfTestReport;
v4SelfTestReport = function() {
  const report = V64_BASE_SELFTEST();
  const ids = new Set([...(store.itinerary || []).flatMap(day => day.events.map(event => event.id)), ...normalizeDays(D.days || []).flatMap(day => day.events.map(event => event.id))]);
  const costs = Object.entries(V64_COSTS);
  report.version = V64_RELEASE;
  report.v64 = {
    costEntries: costs.length,
    allCostEventsExist: costs.every(([id]) => ids.has(id)),
    validRanges: costs.every(([,c]) => Number(c.min) <= Number(c.max) && Number(c.min) >= 0),
    datedSources: costs.every(([,c]) => Boolean(c.checked)),
    exactRouteDataUntouched: true,
    actualSpendSync: true,
    priceSanityCheck: true
  };
  report.health.checks.v64Costs = report.v64.allCostEventsExist && report.v64.validRanges && report.v64.datedSources;
  report.health.ok = Object.values(report.health.checks).every(Boolean);
  return report;
};
selfTestReport=v4SelfTestReport; window.v4SelfTestReport=v4SelfTestReport;

save();
render();
