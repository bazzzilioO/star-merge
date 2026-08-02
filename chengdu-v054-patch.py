from pathlib import Path
import sys

root = Path(sys.argv[1])

build = root / 'app/build.gradle.kts'
text = build.read_text(encoding='utf-8')
text = text.replace('versionCode = 8', 'versionCode = 9')
text = text.replace('versionName = "0.5.3"', 'versionName = "0.5.4"')
build.write_text(text, encoding='utf-8')

styles = root / 'app/src/main/assets/styles.css'
text = styles.read_text(encoding='utf-8')
text = text.replace('body{overscroll-behavior:none}', 'html,body{touch-action:auto;overscroll-behavior-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}body{overscroll-behavior-x:none}')
text = text.replace('button{touch-action:manipulation}', 'button{touch-action:auto}')
text = text.replace('.drag-handle{width:40px;min-width:40px;height:40px;min-height:40px;padding:0;border-radius:10px;background:var(--surface2);color:var(--muted);font-size:20px;cursor:grab;touch-action:none}', '.drag-handle{width:40px;min-width:40px;height:40px;min-height:40px;padding:0;border-radius:10px;background:var(--surface2);color:var(--muted);font-size:20px;cursor:grab;touch-action:pan-y}')
text += '''
/* v0.5.4 touch-scroll reliability */
html,body,#app,.app,.content{touch-action:pan-y;}
button,a,[role="button"]{touch-action:pan-y;}
.horizontal,.chips.horizontal,.guide-strip,.diet-quick,.v053-quick-strip{touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;}
.drag-handle{touch-action:pan-y;-webkit-user-select:none;user-select:none;}
body.is-dragging,body.is-dragging #app{touch-action:none;}
'''
styles.write_text(text, encoding='utf-8')

v04 = root / 'app/src/main/assets/v04.js'
text = v04.read_text(encoding='utf-8')
start = text.index('function v4AfterRender()')
end = text.index('function v4ApplyShift(', start)
replacement = r'''function v4AfterRender() {
  $$('.drag-handle').forEach(handle => {
    handle.addEventListener('mousedown', v4MouseDragStart);
    handle.addEventListener('touchstart', v4TouchDragStart, { passive: true });
  });
}

let v4TouchPending = null;

function v4DragMetaFromHandle(handle) {
  const card = handle.closest('.v4-event');
  if (!card) return null;
  const dayIndex = Number(card.dataset.dayIndex);
  const eventId = card.dataset.eventId;
  const day = store.itinerary[dayIndex];
  const fromIndex = day?.events.findIndex(item => item.id === eventId) ?? -1;
  if (fromIndex < 0) return null;
  return { handle, card, dayIndex, eventId, fromIndex };
}

function v4StartActiveDrag(meta, x, y, inputType) {
  ui.dragState = {
    dayIndex: meta.dayIndex,
    eventId: meta.eventId,
    fromIndex: meta.fromIndex,
    targetId: meta.eventId,
    lastX: x,
    lastY: y,
    inputType
  };
  meta.card.classList.add('dragging');
  document.body.classList.add('is-dragging');
  try { navigator.vibrate?.(18); } catch (_) {}
}

function v4UpdateDragAt(x, y) {
  if (!ui.dragState) return;
  ui.dragState.lastX = x;
  ui.dragState.lastY = y;
  if (y < 110) window.scrollBy(0, -18);
  if (y > window.innerHeight - 130) window.scrollBy(0, 18);
  const target = document.elementFromPoint(x, y)?.closest('.v4-event');
  $$('.v4-event.drag-over').forEach(element => element.classList.remove('drag-over'));
  if (target && Number(target.dataset.dayIndex) === ui.dragState.dayIndex) {
    ui.dragState.targetId = target.dataset.eventId;
    if (target.dataset.eventId !== ui.dragState.eventId) target.classList.add('drag-over');
  }
}

function v4FinishActiveDrag() {
  document.body.classList.remove('is-dragging');
  $$('.v4-event').forEach(element => element.classList.remove('dragging', 'drag-over'));
  const drag = ui.dragState;
  ui.dragState = null;
  if (!drag || !drag.targetId || drag.targetId === drag.eventId) return;
  const day = store.itinerary[drag.dayIndex];
  const from = day.events.findIndex(item => item.id === drag.eventId);
  const to = day.events.findIndex(item => item.id === drag.targetId);
  if (from < 0 || to < 0 || from === to) return;
  v4BeforeMutation(`Перестановка: ${day.events[from].title}`);
  const [moved] = day.events.splice(from, 1);
  day.events.splice(to, 0, moved);
  moved.updatedAt = nowIso();
  moved.updatedBy = store.sync.deviceId;
  store.routeUpdatedAt = nowIso();
  ui.modal = { type: 'reorder', dayIndex: drag.dayIndex, eventId: moved.id, fromIndex: from, toIndex: to };
  save();
  render();
}

function v4MouseDragStart(event) {
  if (event.button !== 0) return;
  const meta = v4DragMetaFromHandle(event.currentTarget);
  if (!meta) return;
  event.preventDefault();
  v4StartActiveDrag(meta, event.clientX, event.clientY, 'mouse');
  const move = moveEvent => {
    moveEvent.preventDefault();
    v4UpdateDragAt(moveEvent.clientX, moveEvent.clientY);
  };
  const end = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', end);
    v4FinishActiveDrag();
  };
  window.addEventListener('mousemove', move, { passive: false });
  window.addEventListener('mouseup', end, { once: true });
}

function v4TouchPoint(event, identifier) {
  return [...event.touches, ...event.changedTouches].find(touch => touch.identifier === identifier) || null;
}

function v4TouchDragStart(event) {
  if (event.touches.length !== 1) return;
  const meta = v4DragMetaFromHandle(event.currentTarget);
  if (!meta) return;
  v4CancelTouchDrag();
  const touch = event.touches[0];
  const pending = {
    ...meta,
    identifier: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    lastY: touch.clientY,
    active: false,
    timer: null
  };
  v4TouchPending = pending;
  pending.timer = setTimeout(() => {
    if (v4TouchPending !== pending) return;
    pending.active = true;
    v4StartActiveDrag(pending, pending.lastX, pending.lastY, 'touch');
  }, 480);
  window.addEventListener('touchmove', v4TouchDragMove, { passive: false });
  window.addEventListener('touchend', v4TouchDragEnd, { passive: false });
  window.addEventListener('touchcancel', v4TouchDragCancel, { passive: false });
}

function v4TouchDragMove(event) {
  const pending = v4TouchPending;
  if (!pending) return;
  const touch = v4TouchPoint(event, pending.identifier);
  if (!touch) return;
  pending.lastX = touch.clientX;
  pending.lastY = touch.clientY;
  if (!pending.active) {
    const distance = Math.hypot(touch.clientX - pending.startX, touch.clientY - pending.startY);
    if (distance > 9) v4CancelTouchDrag();
    return;
  }
  event.preventDefault();
  v4UpdateDragAt(touch.clientX, touch.clientY);
}

function v4TouchDragEnd(event) {
  const pending = v4TouchPending;
  if (!pending) return;
  const touch = v4TouchPoint(event, pending.identifier);
  if (!touch && event.touches.length) return;
  if (pending.active) event.preventDefault();
  const wasActive = pending.active;
  v4DetachTouchDrag();
  if (wasActive) v4FinishActiveDrag();
}

function v4TouchDragCancel() {
  const wasActive = !!v4TouchPending?.active;
  v4DetachTouchDrag();
  if (wasActive) {
    document.body.classList.remove('is-dragging');
    $$('.v4-event').forEach(element => element.classList.remove('dragging', 'drag-over'));
    ui.dragState = null;
  }
}

function v4DetachTouchDrag() {
  if (v4TouchPending?.timer) clearTimeout(v4TouchPending.timer);
  v4TouchPending = null;
  window.removeEventListener('touchmove', v4TouchDragMove);
  window.removeEventListener('touchend', v4TouchDragEnd);
  window.removeEventListener('touchcancel', v4TouchDragCancel);
}

function v4CancelTouchDrag() {
  v4DetachTouchDrag();
}

'''
text = text[:start] + replacement + text[end:]
text = text.replace('0.5.3', '0.5.4')
v04.write_text(text, encoding='utf-8')

for filename in ['app.js', 'v05.js', 'v053.js']:
    path = root / 'app/src/main/assets' / filename
    path.write_text(path.read_text(encoding='utf-8').replace('0.5.3', '0.5.4'), encoding='utf-8')

print('Applied Chengdu v0.5.4 touch patch')
