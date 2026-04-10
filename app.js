'use strict';

var STORAGE_KEY = 'strokeRehabExercises';
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

var CATEGORY_ORDER = ['hand-arm', 'leg-balance', 'speech-cognitive', 'daily-movement'];

// ── Default exercises ──

function defaultExercises() {
  return [
    { id: makeId(), text: 'Finger stretches (open & close)', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Wrist rotations (10 each way)', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Arm raises (10 reps)', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Grip strengthening (squeeze ball)', done: false, category: 'hand-arm' },
    { id: makeId(), text: 'Reach and grasp practice', done: false, category: 'hand-arm' },

    { id: makeId(), text: 'Ankle pumps (15 reps)', done: false, category: 'leg-balance' },
    { id: makeId(), text: 'Seated marching (1 minute)', done: false, category: 'leg-balance' },
    { id: makeId(), text: 'Heel raises (10 reps)', done: false, category: 'leg-balance' },
    { id: makeId(), text: 'Weight shifting (side to side)', done: false, category: 'leg-balance' },
    { id: makeId(), text: 'Standing balance (30 seconds)', done: false, category: 'leg-balance' },

    { id: makeId(), text: 'Reading aloud (5 minutes)', done: false, category: 'speech-cognitive' },
    { id: makeId(), text: 'Word finding practice', done: false, category: 'speech-cognitive' },
    { id: makeId(), text: 'Counting exercises', done: false, category: 'speech-cognitive' },
    { id: makeId(), text: 'Conversation practice', done: false, category: 'speech-cognitive' },

    { id: makeId(), text: 'Guided walking (10 minutes)', done: false, category: 'daily-movement' },
    { id: makeId(), text: 'Stretching routine', done: false, category: 'daily-movement' },
    { id: makeId(), text: 'Posture check-ins (3x today)', done: false, category: 'daily-movement' }
  ];
}

function defaultData() {
  return {
    lastReset: todayDateString(),
    exercises: defaultExercises()
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
    if (!parsed.exercises || !parsed.exercises.length) {
      return defaultData();
    }
    return parsed;
  } catch (e) {
    return defaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Daily reset ──

function ensureDailyReset(data) {
  var today = todayDateString();
  if (!data.lastReset || data.lastReset < today) {
    var i;
    for (i = 0; i < data.exercises.length; i++) {
      data.exercises[i].done = false;
    }
    data.lastReset = today;
    saveData(data);
  }
}

// ── Stats ──

function getStats(data) {
  var total = data.exercises.length;
  var done = 0;
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].done) {
      done++;
    }
  }
  return { total: total, done: done };
}

function isAllComplete(data) {
  var stats = getStats(data);
  return stats.total > 0 && stats.done === stats.total;
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
  var row = document.createElement('div');
  row.className = item.done ? 'item is-done' : 'item';
  row.setAttribute('data-id', item.id);

  var left = document.createElement('div');
  left.className = 'item-left';

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
    // Update category badge count
    renderCategoryBadge(data, item.category);
    if (item.done && !wasAllComplete && isAllComplete(data)) {
      triggerCelebration();
    }
  };

  return row;
}

function renderCategoryBadge(data, catKey) {
  var badges = document.querySelectorAll('.category-badge.' + catKey);
  if (!badges.length) return;
  var done = 0;
  var total = 0;
  var i;
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].category === catKey) {
      total++;
      if (data.exercises[i].done) done++;
    }
  }
  for (i = 0; i < badges.length; i++) {
    badges[i].textContent = done + '/' + total;
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
    var catDone = 0;
    for (j = 0; j < items.length; j++) {
      if (items[j].done) catDone++;
    }
    badge.textContent = catDone + '/' + items.length;

    head.appendChild(icon);
    head.appendChild(name);
    head.appendChild(badge);
    section.appendChild(head);

    for (j = 0; j < items.length; j++) {
      section.appendChild(renderExerciseItem(data, items[j]));
    }

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

// ── Wake/visibility ──

function refreshOnWake() {
  if (document.visibilityState === 'visible' && currentData) {
    setCurrentDate();
    ensureDailyReset(currentData);
    renderExercises(currentData);
  }
}

// ── Init ──

function init() {
  setCurrentDate();
  setInterval(setCurrentDate, 60000);
  document.addEventListener('visibilitychange', refreshOnWake);

  currentData = loadData();
  ensureDailyReset(currentData);
  bindEvents();
  renderExercises(currentData);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
