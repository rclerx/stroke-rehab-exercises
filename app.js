'use strict';

var STORAGE_KEY = 'strokeRehabExercises';
var EXERCISES_VERSION = 6;
var currentData = null;

// ── Utility ──

function makeId() {
  return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function todayDateString() {
  var d = new Date();
  var yyyy = d.getFullYear();
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return yyyy + '-' + mm + '-' + dd;
}

function formatDate(date) {
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
}

// ── Category metadata ──

var CATEGORIES = {
  'hand-arm': { name: 'Hand & Arm', icon: '\u270B', color: '#0891b2' },
  'leg-balance': { name: 'Leg & Balance', icon: '\uD83E\uDDB5', color: '#7c3aed' },
  'speech-cognitive': { name: 'Speech & Cognitive', icon: '\uD83D\uDDE3\uFE0F', color: '#d97706' },
  'daily-movement': { name: 'Daily Movement', icon: '\uD83D\uDEB6', color: '#059669' }
};

var CATEGORY_ORDER = ['hand-arm', 'daily-movement', 'leg-balance', 'speech-cognitive'];

// ── Default exercises ──

function defaultExercises() {
  return [
    { id: makeId(), text: 'Relax & Open Hand (3x daily)', done: false, category: 'hand-arm', reps: 3, completed: 0 },
    { id: makeId(), text: 'Grip Strengthening (squeeze ball)', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Range of Motion Exercises', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Twin Stim (10 min)', done: false, category: 'hand-arm' },

    { id: makeId(), text: 'Walk Outside (20 min)', done: false, category: 'daily-movement' },
    { id: makeId(), text: 'Stretching Routine (Arms & Legs)', done: false, category: 'daily-movement' },

    { id: makeId(), text: 'Reading Aloud (10 min)', done: false, category: 'speech-cognitive' },
    { id: makeId(), text: 'Aphasia Therapy App (20 min)', done: false, category: 'speech-cognitive' },
    { id: makeId(), text: 'Conversation Practice', done: false, category: 'speech-cognitive' }
  ];
}

function defaultData() {
  return {
    version: EXERCISES_VERSION,
    lastReset: todayDateString(),
    exercises: defaultExercises(),
    history: []
  };
}

// ── Storage ──

function loadData() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultData();
  }
  try {
    var parsed = JSON.parse(raw);
    if (!parsed.exercises || !parsed.exercises.length || parsed.version !== EXERCISES_VERSION) {
      var fresh = defaultData();
      // Preserve history across version upgrades
      if (parsed.history) fresh.history = parsed.history;
      return fresh;
    }
    if (!parsed.history) parsed.history = [];
    return parsed;
  } catch (e) {
    return defaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Daily reset ──

function saveSnapshot(data) {
  if (!data.history) data.history = [];
  // Only snapshot if at least one exercise was done
  var anyDone = false;
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    var ex = data.exercises[i];
    if (ex.done || (ex.reps && (ex.completed || 0) > 0)) {
      anyDone = true;
      break;
    }
  }
  if (!anyDone) return;
  var snapshot = {
    date: data.lastReset,
    exercises: []
  };
  for (i = 0; i < data.exercises.length; i++) {
    var ex = data.exercises[i];
    snapshot.exercises.push({
      text: ex.text,
      category: ex.category,
      done: !!ex.done,
      reps: ex.reps || 0,
      completed: ex.completed || 0
    });
  }
  // Keep max 90 days of history
  data.history.unshift(snapshot);
  if (data.history.length > 90) {
    data.history = data.history.slice(0, 90);
  }
}

function ensureDailyReset(data) {
  var today = todayDateString();
  if (!data.lastReset || data.lastReset < today) {
    // Save yesterday's progress before resetting
    saveSnapshot(data);
    var i;
    for (i = 0; i < data.exercises.length; i++) {
      data.exercises[i].done = false;
      if (data.exercises[i].reps) {
        data.exercises[i].completed = 0;
      }
    }
    data.lastReset = today;
    saveData(data);
  }
}

// ── Stats ──

function getStats(data) {
  var total = 0;
  var done = 0;
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    var ex = data.exercises[i];
    if (ex.reps) {
      total += ex.reps;
      done += ex.completed || 0;
    } else {
      total++;
      if (ex.done) done++;
    }
  }
  return { total: total, done: done };
}

function isAllComplete(data) {
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    var ex = data.exercises[i];
    if (ex.reps) {
      if ((ex.completed || 0) < ex.reps) return false;
    } else {
      if (!ex.done) return false;
    }
  }
  return data.exercises.length > 0;
}

// ── Progress UI ──

function updateProgressUI(data) {
  var stats = getStats(data);
  var percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  var bar = document.getElementById('progress-bar');
  var text = document.getElementById('progress-text');
  if (bar) {
    bar.style.width = percent + '%';
  }
  if (text) {
    text.innerHTML = stats.done + ' / ' + stats.total + ' done (' + percent + '%)';
  }
}

// ── Confetti ──

function spawnConfetti(x, y, baseColor, count, bigMode) {
  var colors = [baseColor, '#fbbf24', '#f59e0b', '#fef3c7'];
  var i;
  for (i = 0; i < count; i++) {
    var particle = document.createElement('div');
    var color = colors[Math.floor(Math.random() * colors.length)];
    var size = bigMode ? 12 + Math.floor(Math.random() * 8) : 8 + Math.floor(Math.random() * 5);
    var dx = (Math.random() * 2 - 1) * (bigMode ? 350 : 160);
    var dy = (Math.random() * 2 - 1) * (bigMode ? 300 : 140);
    var rot = Math.floor(Math.random() * 360) + 'deg';
    var isCircle = Math.random() > 0.5;

    particle.className = 'confetti-particle' + (isCircle ? ' circle' : '') + (bigMode ? ' big' : '');
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.backgroundColor = color;
    particle.style.setProperty('--dx', dx + 'px');
    particle.style.setProperty('--dy', dy + 'px');
    particle.style.setProperty('--rot', rot);

    document.body.appendChild(particle);
    setTimeout(function (node) {
      return function () {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      };
    }(particle), bigMode ? 1400 : 1200);
  }
}

function triggerConfettiBurst(anchorEl, baseColor) {
  if (!anchorEl) return;
  var rect = anchorEl.getBoundingClientRect();
  var x = rect.left + rect.width / 2;
  var y = rect.top + rect.height / 2;
  spawnConfetti(x, y, baseColor, 30, false);
}

// ── Celebration ──

function triggerCelebration() {
  var overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';

  var msg = document.createElement('div');
  msg.className = 'celebration-message';

  var emoji = document.createElement('span');
  emoji.className = 'celebration-emoji';
  emoji.textContent = '\uD83C\uDF89';

  var title = document.createElement('h2');
  title.className = 'celebration-title';
  title.textContent = 'Great job today!';

  var sub = document.createElement('p');
  sub.className = 'celebration-sub';
  sub.textContent = 'All exercises complete';

  msg.appendChild(emoji);
  msg.appendChild(title);
  msg.appendChild(sub);
  overlay.appendChild(msg);
  document.body.appendChild(overlay);

  // Big confetti burst from center
  var cx = window.innerWidth / 2;
  var cy = window.innerHeight / 2;
  spawnConfetti(cx, cy, '#0891b2', 80, true);
  setTimeout(function () {
    spawnConfetti(cx - 100, cy - 50, '#7c3aed', 40, true);
  }, 200);
  setTimeout(function () {
    spawnConfetti(cx + 100, cy + 50, '#059669', 40, true);
  }, 400);

  // Animate message pop
  var startTime = Date.now();
  var duration = 400;
  var interval = setInterval(function () {
    var elapsed = Date.now() - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var scale;
    if (progress < 0.6) {
      scale = 0.5 + (progress / 0.6) * 0.62;
    } else {
      scale = 1.12 - ((progress - 0.6) / 0.4) * 0.12;
    }
    msg.style.opacity = Math.min(progress * 2, 1);
    msg.style.transform = 'scale(' + scale + ')';
    if (progress >= 1) {
      clearInterval(interval);
    }
  }, 16);

  // Dismiss on tap or after 5 seconds
  var dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }
  overlay.onclick = dismiss;
  setTimeout(dismiss, 5000);
}

// ── Render ──

function renderExerciseItem(data, item) {
  var catMeta = CATEGORIES[item.category] || CATEGORIES['daily-movement'];
  var isRep = !!item.reps;
  var row = document.createElement('div');
  var isDone = isRep ? (item.completed || 0) >= item.reps : item.done;
  row.className = isDone ? 'item is-done' : 'item';
  row.setAttribute('data-id', item.id);
  row.style.setProperty('--cat-color', catMeta.color);

  var left = document.createElement('div');
  left.className = 'item-left';

  if (isRep) {
    // Rep counter button
    var counterBtn = document.createElement('button');
    counterBtn.className = 'rep-counter';
    var completed = item.completed || 0;
    counterBtn.setAttribute('data-completed', completed);
    counterBtn.setAttribute('data-reps', item.reps);
    counterBtn.textContent = completed + '/' + item.reps;
    updateRepCounterStyle(counterBtn, completed, item.reps, catMeta.color);

    var title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.text;

    left.appendChild(counterBtn);
    left.appendChild(title);
    row.appendChild(left);

    counterBtn.onclick = function () {
      var wasAllComplete = isAllComplete(data);
      var c = item.completed || 0;
      if (c >= item.reps) {
        // Reset on tap after full
        item.completed = 0;
        item.done = false;
      } else {
        item.completed = c + 1;
        item.done = item.completed >= item.reps;
      }
      counterBtn.textContent = item.completed + '/' + item.reps;
      counterBtn.setAttribute('data-completed', item.completed);
      updateRepCounterStyle(counterBtn, item.completed, item.reps, catMeta.color);
      row.className = item.done ? 'item is-done' : 'item';
      saveData(data);
      if (item.completed > 0 && item.completed <= item.reps) {
        triggerConfettiBurst(counterBtn, catMeta.color);
      }
      updateProgressUI(data);
      renderCategoryBadge(data, item.category);
      if (item.done && !wasAllComplete && isAllComplete(data)) {
        triggerCelebration();
      }
    };
  } else {
    // Standard checkbox
    var checkboxWrap = document.createElement('label');
    checkboxWrap.className = 'checkbox-wrap';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox-input';
    checkbox.checked = item.done;
    var checkboxUi = document.createElement('span');
    checkboxUi.className = 'checkbox-ui';
    checkboxWrap.appendChild(checkbox);
    checkboxWrap.appendChild(checkboxUi);

    var title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.text;

    left.appendChild(checkboxWrap);
    left.appendChild(title);
    row.appendChild(left);

    checkbox.onclick = function () {
      var wasAllComplete = isAllComplete(data);
      item.done = checkbox.checked;
      row.className = item.done ? 'item is-done' : 'item';
      saveData(data);
      if (item.done) {
        triggerConfettiBurst(checkboxUi, catMeta.color);
      }
      updateProgressUI(data);
      renderCategoryBadge(data, item.category);
      if (item.done && !wasAllComplete && isAllComplete(data)) {
        triggerCelebration();
      }
    };
  }

  // Drag handle
  var handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '\u2261';
  row.appendChild(handle);

  // Delete button with confirm
  var deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '\u00D7';
  var confirmTimer = null;
  deleteBtn.onclick = function () {
    if (deleteBtn.className.indexOf('confirming') >= 0) {
      // Confirmed — remove the exercise
      var idx = -1;
      for (var k = 0; k < data.exercises.length; k++) {
        if (data.exercises[k].id === item.id) { idx = k; break; }
      }
      if (idx >= 0) {
        data.exercises.splice(idx, 1);
        saveData(data);
        renderExercises(data);
      }
    } else {
      // First tap — enter confirm state
      deleteBtn.className = 'delete-btn confirming';
      deleteBtn.textContent = 'Delete?';
      confirmTimer = setTimeout(function () {
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '\u00D7';
      }, 3000);
    }
  };
  row.appendChild(deleteBtn);

  return row;
}

function updateRepCounterStyle(btn, completed, reps, catColor) {
  if (completed === 0) {
    btn.style.background = '#f1f5f9';
    btn.style.color = '#64748b';
    btn.style.borderColor = '#cbd5e1';
  } else if (completed < reps) {
    var opacity = 0.15 + (completed / reps) * 0.45;
    btn.style.background = catColor + hexOpacity(opacity);
    btn.style.color = catColor;
    btn.style.borderColor = catColor;
  } else {
    btn.style.background = catColor;
    btn.style.color = '#ffffff';
    btn.style.borderColor = catColor;
  }
}

function hexOpacity(opacity) {
  var val = Math.round(opacity * 255);
  var hex = val.toString(16);
  return hex.length < 2 ? '0' + hex : hex;
}

function getCategoryStats(data, catKey) {
  var done = 0;
  var total = 0;
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    var ex = data.exercises[i];
    if (ex.category === catKey) {
      if (ex.reps) {
        total += ex.reps;
        done += ex.completed || 0;
      } else {
        total++;
        if (ex.done) done++;
      }
    }
  }
  return { done: done, total: total };
}

function renderCategoryBadge(data, catKey) {
  var badges = document.querySelectorAll('.category-badge.' + catKey);
  if (!badges.length) return;
  var stats = getCategoryStats(data, catKey);
  var i;
  for (i = 0; i < badges.length; i++) {
    badges[i].textContent = stats.done + '/' + stats.total;
  }
}

function renderExercises(data) {
  var list = document.getElementById('exercise-list');
  if (!list) return;
  list.innerHTML = '';

  var i, j;
  for (i = 0; i < CATEGORY_ORDER.length; i++) {
    var catKey = CATEGORY_ORDER[i];
    var catMeta = CATEGORIES[catKey];
    var items = [];
    for (j = 0; j < data.exercises.length; j++) {
      if (data.exercises[j].category === catKey) {
        items.push(data.exercises[j]);
      }
    }
    if (items.length === 0) continue;

    var section = document.createElement('div');
    section.className = 'category-section';

    var head = document.createElement('div');
    head.className = 'category-head';

    var icon = document.createElement('span');
    icon.className = 'category-icon';
    icon.textContent = catMeta.icon;

    var name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = catMeta.name;

    var badge = document.createElement('span');
    badge.className = 'category-badge ' + catKey;
    var catStats = getCategoryStats(data, catKey);
    badge.textContent = catStats.done + '/' + catStats.total;

    head.appendChild(icon);
    head.appendChild(name);
    head.appendChild(badge);
    section.appendChild(head);

    var itemContainer = document.createElement('div');
    itemContainer.className = 'drag-container';
    itemContainer.setAttribute('data-category', catKey);
    for (j = 0; j < items.length; j++) {
      itemContainer.appendChild(renderExerciseItem(data, items[j]));
    }
    section.appendChild(itemContainer);

    list.appendChild(section);
  }

  updateProgressUI(data);
}

// ── Date display ──

function setCurrentDate() {
  var el = document.getElementById('current-date');
  if (el) {
    el.textContent = formatDate(new Date());
  }
}

// ── Events ──

function bindEvents() {
  document.getElementById('tab-exercises').onclick = function () { switchTab('exercises'); };
  document.getElementById('tab-history').onclick = function () { switchTab('history'); };

  var addBtn = document.getElementById('exercise-add');
  var addInput = document.getElementById('exercise-input');
  var addCategory = document.getElementById('exercise-category');

  addBtn.onclick = function () {
    if (!currentData) return;
    var text = addInput.value.replace(/^\s+|\s+$/g, '');
    if (!text) return;
    currentData.exercises.push({
      id: makeId(),
      text: text,
      done: false,
      category: addCategory.value
    });
    addInput.value = '';
    saveData(currentData);
    renderExercises(currentData);
  };

  addInput.onkeydown = function (e) {
    if (e.keyCode === 13) {
      addBtn.onclick();
    }
  };
}

// ── Tabs ──

function switchTab(tabName) {
  var tabExercises = document.getElementById('tab-exercises');
  var tabHistory = document.getElementById('tab-history');
  var viewExercises = document.getElementById('view-exercises');
  var viewHistory = document.getElementById('view-history');

  if (tabName === 'history') {
    tabExercises.className = 'tab';
    tabHistory.className = 'tab active';
    viewExercises.className = 'view';
    viewHistory.className = 'view active';
    renderHistory(currentData);
  } else {
    tabExercises.className = 'tab active';
    tabHistory.className = 'tab';
    viewExercises.className = 'view active';
    viewHistory.className = 'view';
  }
}

// ── History ──

function formatHistoryDate(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}

function renderHistory(data) {
  var list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';

  var history = data.history || [];
  if (history.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'No history yet. Completed exercises will appear here tomorrow.';
    list.appendChild(empty);
    return;
  }

  var i, j;
  for (i = 0; i < history.length; i++) {
    var day = history[i];
    var total = 0;
    var done = 0;
    for (j = 0; j < day.exercises.length; j++) {
      var ex = day.exercises[j];
      if (ex.reps) {
        total += ex.reps;
        done += ex.completed || 0;
      } else {
        total++;
        if (ex.done) done++;
      }
    }

    var card = document.createElement('div');
    card.className = 'history-day';

    var head = document.createElement('div');
    head.className = 'history-day-head';

    var dateEl = document.createElement('div');
    dateEl.className = 'history-day-date';
    dateEl.textContent = formatHistoryDate(day.date);

    var statsEl = document.createElement('div');
    statsEl.className = 'history-day-stats' + (done === total ? ' complete' : '');
    statsEl.textContent = done + '/' + total;

    head.appendChild(dateEl);
    head.appendChild(statsEl);
    card.appendChild(head);

    var details = document.createElement('div');
    details.className = 'history-day-details';

    for (j = 0; j < day.exercises.length; j++) {
      var ex = day.exercises[j];
      var exDone = ex.reps ? (ex.completed || 0) >= ex.reps : ex.done;
      var row = document.createElement('div');
      row.className = 'history-exercise' + (exDone ? '' : ' missed');

      var check = document.createElement('span');
      check.className = 'history-check';
      if (ex.reps) {
        check.textContent = (ex.completed || 0) + '/' + ex.reps;
      } else {
        check.textContent = exDone ? '\u2705' : '\u2B1C';
      }

      var text = document.createElement('span');
      text.className = 'history-exercise-text';
      text.textContent = ex.text;

      row.appendChild(check);
      row.appendChild(text);
      details.appendChild(row);
    }

    card.appendChild(details);
    list.appendChild(card);

    // Toggle expand on tap
    (function (cardEl) {
      cardEl.querySelector('.history-day-head').onclick = function () {
        cardEl.className = cardEl.className.indexOf('expanded') >= 0
          ? 'history-day'
          : 'history-day expanded';
      };
    })(card);
  }
}

// ── Wake/visibility ──

function refreshOnWake() {
  if (document.visibilityState === 'visible' && currentData) {
    setCurrentDate();
    ensureDailyReset(currentData);
    renderExercises(currentData);
  }
}

// ── Drag and drop ──

var dragState = null;
var dragPressTimer = null;

function closestWithClass(node, className) {
  var current = node;
  while (current) {
    if (current.className && (' ' + current.className + ' ').indexOf(' ' + className + ' ') > -1) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function beginDrag(row, touch) {
  if (!row || !currentData) return;
  var container = closestWithClass(row, 'drag-container');
  if (!container) return;
  var rect = row.getBoundingClientRect();

  var placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  placeholder.style.height = rect.height + 'px';
  if (row.nextSibling) {
    row.parentNode.insertBefore(placeholder, row.nextSibling);
  } else {
    row.parentNode.appendChild(placeholder);
  }

  var ghost = row.cloneNode(true);
  ghost.className += ' drag-ghost';
  ghost.style.position = 'fixed';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.zIndex = '1000';
  document.body.appendChild(ghost);

  row.className += ' dragging-hidden';

  dragState = {
    active: true,
    row: row,
    ghost: ghost,
    placeholder: placeholder,
    container: container,
    offsetX: touch.clientX - rect.left,
    offsetY: touch.clientY - rect.top
  };
}

function updateDragPosition(touch) {
  if (!dragState || !dragState.active) return;
  dragState.ghost.style.left = (touch.clientX - dragState.offsetX) + 'px';
  dragState.ghost.style.top = (touch.clientY - dragState.offsetY) + 'px';

  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!target) return;

  var targetItem = closestWithClass(target, 'item');
  if (!targetItem || targetItem === dragState.row || targetItem.parentNode !== dragState.container) return;

  var rect = targetItem.getBoundingClientRect();
  if (touch.clientY < rect.top + rect.height / 2) {
    dragState.container.insertBefore(dragState.placeholder, targetItem);
  } else {
    if (targetItem.nextSibling) {
      dragState.container.insertBefore(dragState.placeholder, targetItem.nextSibling);
    } else {
      dragState.container.appendChild(dragState.placeholder);
    }
  }
}

function finishDrag() {
  if (!dragState || !dragState.active) {
    dragState = null;
    return;
  }

  if (dragState.placeholder.parentNode) {
    dragState.placeholder.parentNode.insertBefore(dragState.row, dragState.placeholder);
    dragState.placeholder.parentNode.removeChild(dragState.placeholder);
  }
  if (dragState.ghost && dragState.ghost.parentNode) {
    dragState.ghost.parentNode.removeChild(dragState.ghost);
  }
  dragState.row.className = dragState.row.className.replace(' dragging-hidden', '');

  // Read new order from DOM and reorder data
  var container = dragState.container;
  var catKey = container.getAttribute('data-category');
  var children = container.children;
  var orderedIds = [];
  var i;
  for (i = 0; i < children.length; i++) {
    if (children[i].getAttribute('data-id')) {
      orderedIds.push(children[i].getAttribute('data-id'));
    }
  }

  // Reorder exercises in this category
  var catItems = [];
  var otherItems = [];
  for (i = 0; i < currentData.exercises.length; i++) {
    if (currentData.exercises[i].category === catKey) {
      catItems.push(currentData.exercises[i]);
    }
  }
  var idMap = {};
  for (i = 0; i < catItems.length; i++) {
    idMap[catItems[i].id] = catItems[i];
  }
  var reordered = [];
  for (i = 0; i < orderedIds.length; i++) {
    if (idMap[orderedIds[i]]) {
      reordered.push(idMap[orderedIds[i]]);
    }
  }
  // Rebuild exercises array preserving category order
  var newExercises = [];
  var catIndex = 0;
  for (i = 0; i < currentData.exercises.length; i++) {
    if (currentData.exercises[i].category === catKey) {
      newExercises.push(reordered[catIndex] || currentData.exercises[i]);
      catIndex++;
    } else {
      newExercises.push(currentData.exercises[i]);
    }
  }
  currentData.exercises = newExercises;
  saveData(currentData);
  dragState = null;
}

function initDragAndDrop() {
  document.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length !== 1) return;
    var handle = closestWithClass(e.target, 'drag-handle');
    if (!handle) return;
    var row = closestWithClass(handle, 'item');
    if (!row) return;
    e.preventDefault();
    var touch = e.touches[0];
    dragState = { pending: true, row: row, startX: touch.clientX, startY: touch.clientY };
    if (dragPressTimer) clearTimeout(dragPressTimer);
    dragPressTimer = setTimeout(function () {
      if (dragState && dragState.pending) {
        dragState.pending = false;
        beginDrag(row, touch);
      }
    }, 150);
  }, { passive: false });

  document.addEventListener('touchmove', function (e) {
    if (!dragState) return;
    if (dragState.pending) {
      var touch = e.touches[0];
      var dx = Math.abs(touch.clientX - dragState.startX);
      var dy = Math.abs(touch.clientY - dragState.startY);
      if (dx > 6 || dy > 6) {
        clearTimeout(dragPressTimer);
        dragState = null;
      } else {
        e.preventDefault();
      }
      return;
    }
    if (dragState.active) {
      e.preventDefault();
      updateDragPosition(e.touches[0]);
    }
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (dragState && dragState.pending) {
      clearTimeout(dragPressTimer);
      dragState = null;
      return;
    }
    if (dragState && dragState.active) {
      finishDrag();
    }
  }, false);

  document.addEventListener('touchcancel', function () {
    if (dragState && dragState.pending) {
      clearTimeout(dragPressTimer);
      dragState = null;
      return;
    }
    if (dragState && dragState.active) {
      finishDrag();
    }
  }, false);
}

// ── Init ──

function init() {
  setCurrentDate();
  setInterval(setCurrentDate, 60000);
  document.addEventListener('visibilitychange', refreshOnWake);

  // Prevent iOS long-press text selection and context menu
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('touchstart', function () {}, { passive: true });

  currentData = loadData();
  ensureDailyReset(currentData);
  bindEvents();
  initDragAndDrop();
  renderExercises(currentData);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
