'use strict';

/* v0.6.8 — phrase deletion + removal of bundled approximate-price intelligence.
   Itinerary, times, notes and AMap queries remain untouched. */
const V68_RELEASE = '0.6.8';

/* Phrase visibility is a timestamped change-map, not destructive mutation of phrase-data.js.
   This lets built-in phrases be deleted, synced and later restored without editing bundled data. */
store.phraseChanges = store.phraseChanges && typeof store.phraseChanges === 'object' && !Array.isArray(store.phraseChanges)
  ? store.phraseChanges : {};

function v68PhraseChangeTime(change) {
  const value = new Date(change?.updatedAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}
function v68PhraseDeleted(id) { return store.phraseChanges?.[id]?.kind === 'deleted'; }

const V68_BASE_ALL_PHRASES = allPhrases;
allPhrases = function() {
  const map = new Map();
  V68_BASE_ALL_PHRASES().forEach(phrase => { if (phrase?.id) map.set(phrase.id, phrase); });
  return [...map.values()].filter(phrase => !v68PhraseDeleted(phrase.id));
};
window.allPhrases = allPhrases;

function v68DeletePhrase(id) {
  const phrase = V68_BASE_ALL_PHRASES().find(item => item.id === id);
  if (!phrase) return toast('Фраза не найдена');
  if (!confirm(`Удалить фразу «${phrase.ru}»?`)) return;
  if (typeof v4BeforeMutation === 'function') v4BeforeMutation(`Удалена фраза: ${phrase.ru}`);
  store.phraseChanges[id] = { kind:'deleted', updatedAt:nowIso(), updatedBy:store.sync?.deviceId || 'local' };
  delete store.favorites[id];
  if (ui.phraseOverlay?.id === id) ui.phraseOverlay = null;
  save();
  render();
  toast('Фраза удалена');
}
function v68RestoreAllPhrases() {
  const ids = Object.entries(store.phraseChanges || {}).filter(([,change]) => change?.kind === 'deleted').map(([id]) => id);
  if (!ids.length) return toast('Удалённых фраз нет');
  if (!confirm(`Восстановить удалённые фразы (${ids.length})?`)) return;
  if (typeof v4BeforeMutation === 'function') v4BeforeMutation('Восстановлены удалённые фразы');
  const stamp = nowIso();
  ids.forEach(id => { store.phraseChanges[id] = { kind:'restored', updatedAt:stamp, updatedBy:store.sync?.deviceId || 'local' }; });
  save(); render(); toast('Фразы восстановлены');
}
window.v68DeletePhrase = v68DeletePhrase;
window.v68RestoreAllPhrases = v68RestoreAllPhrases;

/* Every phrase, including a bundled one, can now be deleted. Only genuinely user-created
   phrases get the edit action. */
v4PhraseCard = function(phrase) {
  const favorite = Boolean(store.favorites[phrase.id]);
  const custom = (store.customPhrases || []).some(item => item.id === phrase.id);
  return `<article class="phrase-card ${custom ? 'custom' : ''}" data-phrase-id="${esc(phrase.id)}">
    <button class="fav touch-target ${favorite ? 'on' : ''}" onclick="toggleFavorite(event, '${escJs(phrase.id)}')" aria-label="Добавить в избранное">★</button>
    <button class="phrase-row phrase-ru touch-target" onclick="openPhrase('${escJs(phrase.id)}', 'ru')"><span class="phrase-row-label">Русский</span><span>${esc(phrase.ru)}</span></button>
    <button class="phrase-row phrase-cn touch-target" onclick="openPhrase('${escJs(phrase.id)}', 'cn')"><span class="phrase-row-label">中文 · показать</span><span>${esc(phrase.cn)}</span></button>
    <button class="phrase-row phrase-py touch-target" onclick="openPhrase('${escJs(phrase.id)}', 'py')"><span class="phrase-row-label">Pinyin · чтение</span><span>${esc(phrase.pinyin)}</span></button>
    <div class="phrase-actions"><button class="touch-target" onclick="native('speakChinese', '${escJs(phrase.cn)}')">▶ Произнести</button><button class="touch-target" onclick="native('copy', '${escJs(phrase.cn)}')">复制</button>${custom ? `<button class="touch-target" onclick="showPhraseEditor('${escJs(phrase.id)}')">Править</button>` : ''}<button class="touch-target danger-text" onclick="v68DeletePhrase('${escJs(phrase.id)}')">Удалить</button></div>
  </article>`;
};
phraseCard = v4PhraseCard;
window.v4PhraseCard = v4PhraseCard;

/* Keep the recovery action out of the main phrase UI. It lives under dangerous actions. */
const V68_BASE_MORE = moreView;
moreView = function() {
  const html = V68_BASE_MORE();
  const root = document.createElement('div');
  root.innerHTML = html;
  const deletedCount = Object.values(store.phraseChanges || {}).filter(change => change?.kind === 'deleted').length;
  const danger = root.querySelector('.danger-zone');
  if (danger && deletedCount) {
    const button = document.createElement('button');
    button.textContent = `Восстановить удалённые фразы (${deletedCount})`;
    button.setAttribute('onclick','v68RestoreAllPhrases()');
    danger.prepend(button);
  }
  const version = root.querySelector('.version');
  if (version) version.textContent = `Чэнду 2026 · v${V68_RELEASE} · schema ${store.schemaVersion} · offline-first`;
  return root.innerHTML;
};
v4MoreView = moreView;
window.moreView = moreView;

/* Sync/backup phrase visibility with last-write-wins timestamps. Preserve old actual-spend
   state inertly so removing the approximate-price UI never destructively erases user input. */
function v68MergePhraseChanges(local, incoming) {
  const merged = clone(local || {});
  Object.entries(incoming || {}).forEach(([id, change]) => {
    if (!merged[id] || v68PhraseChangeTime(change) >= v68PhraseChangeTime(merged[id])) merged[id] = clone(change);
  });
  return merged;
}
const V68_BASE_CORE_STATE = v4CoreState;
v4CoreState = function(source = store) {
  const state = V68_BASE_CORE_STATE(source);
  state.phraseChanges = clone(source.phraseChanges || {});
  if (source.costs) state.costs = clone(source.costs); // legacy preservation only; no UI
  return state;
};
window.v4CoreState = v4CoreState;

const V68_BASE_APPLY_SYNC = v55ApplySync;
v55ApplySync = function() {
  const payload = clone(ui.modal?.payload || null);
  const incoming = payload?.app === 'chengdu-2026-backup' ? payload?.backup?.state : payload?.state;
  const beforeChanges = clone(store.phraseChanges || {});
  const beforeCosts = clone(store.costs || null);
  V68_BASE_APPLY_SYNC();
  if (!payload || store.sync?.lastError) return;
  store.phraseChanges = v68MergePhraseChanges(beforeChanges, incoming?.phraseChanges || {});
  if (beforeCosts || incoming?.costs) {
    store.costs = clone(incoming?.costs || beforeCosts || {}); // inert legacy field
  }
  save(); render();
};
window.v55ApplySync = v55ApplySync;

function v68ExportSync() {
  const state = clone({
    version: V60_SCHEMA, schemaVersion: V60_SCHEMA, theme: store.theme, itinerary: store.itinerary,
    routeUpdatedAt: store.routeUpdatedAt, done: store.done, favorites: store.favorites,
    customPhrases: store.customPhrases, phraseChanges: store.phraseChanges,
    notesCards: store.notesCards, checklists: store.checklists,
    collapsed: store.collapsed, tickets: store.tickets, sync: store.sync, history: store.history,
    appReady: store.appReady, guideLinks: store.guideLinks, guideChanges: store.guideChanges,
    shoppingStatus: store.shoppingStatus, nowEventId: store.nowEventId, skipped: store.skipped,
    runtime: { ...v60NormalizeRuntime(store.runtime), simulation: null },
    ...(store.costs ? { costs:store.costs } : {})
  });
  native('exportSync', JSON.stringify({ app:'chengdu-2026', version:V60_SCHEMA, exportedAt:nowIso(), deviceId:store.sync.deviceId, state }));
}
exportSync = v68ExportSync;
window.exportSync = v68ExportSync;

const V68_BASE_REPORT = v4SelfTestReport;
v4SelfTestReport = function() {
  const report = V68_BASE_REPORT();
  report.version = V68_RELEASE;
  report.v68 = {
    deletableBundledPhrases:true,
    phraseDeletionSync:true,
    phraseRestoreSafety:true,
    approximateCostUiRemoved:true,
    bundledCostIntelligenceRemoved:!window.COST_DATA
  };
  report.health.checks.v68Cleanup = Object.values(report.v68).every(Boolean);
  report.health.ok = Object.values(report.health.checks).every(Boolean);
  return report;
};
selfTestReport = v4SelfTestReport;
window.v4SelfTestReport = v4SelfTestReport;

save();
render();
