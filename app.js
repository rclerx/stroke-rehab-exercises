(function () {
  var STORAGE_KEY = 'familyDashboardData';
  var currentData = null;
  var eventsBound = false;
  var apiEnabled = false;

  function todayDateString() {
    var d = new Date();
    return formatDate(d);
  }

  function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return year + '-' + pad(month) + '-' + pad(day);
  }

  function pad(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  function startOfWeekMonday(date) {
    var day = date.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    var monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
    return formatDate(monday);
  }

  function loadLocalData() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultData();
    }
    try {
      var parsed = JSON.parse(raw);
      if (!parsed.chores || !parsed.todos) {
        return defaultData();
      }
      return parsed;
    } catch (e) {
      return defaultData();
    }
  }

  function apiRequest(method, path, payload, done, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.timeout = 3000;
    xhr.setRequestHeader('Accept', 'application/json');
    if (payload) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!xhr.responseText) {
          done({});
          return;
        }
        try {
          done(JSON.parse(xhr.responseText));
        } catch (e) {
          done({});
        }
      } else {
        fail(xhr);
      }
    };
    xhr.onerror = function () {
      fail(xhr);
    };
    xhr.ontimeout = function () {
      fail(xhr);
    };
    try {
      xhr.send(payload ? JSON.stringify(payload) : null);
    } catch (e) {
      fail(xhr);
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (apiEnabled) {
      apiRequest('POST', '/api/data', data, function () {}, function () {
        apiEnabled = false;
      });
    }
  }

  var CHORES_VERSION = 3;

  function defaultChores() {
    return [
      // Daily
      { id: makeId(), text: 'Make bed', done: false, assigned: '', frequency: 'daily', scheduledDay: '' },
      { id: makeId(), text: 'Dishes', done: false, assigned: '', frequency: 'daily', scheduledDay: '' },
      { id: makeId(), text: 'Wipe counters', done: false, assigned: '', frequency: 'daily', scheduledDay: '' },
      // Weekly (from schedule)
      { id: makeId(), text: 'Kids clothes', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Monday' },
      { id: makeId(), text: 'Hot tub', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Monday' },
      { id: makeId(), text: 'Sort clothes', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Tuesday' },
      { id: makeId(), text: 'Monarch $', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Tuesday' },
      { id: makeId(), text: 'Plants', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Wednesday' },
      { id: makeId(), text: 'Grocery order', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Wednesday' },
      { id: makeId(), text: 'Underwear', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Thursday' },
      { id: makeId(), text: 'Bath / Shower', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Thursday' },
      { id: makeId(), text: 'Litter', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Friday' },
      { id: makeId(), text: 'Clean-up', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Friday' },
      { id: makeId(), text: 'Pre-cleaning', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Saturday' },
      { id: makeId(), text: 'Our clothes', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Saturday' },
      { id: makeId(), text: 'Sheets or towels', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Sunday' },
      { id: makeId(), text: 'Mow grass', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Sunday' },
      { id: makeId(), text: 'Leo meds', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Sunday' },
      { id: makeId(), text: 'Art work', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Sunday' },
      { id: makeId(), text: 'Comb cats', done: false, assigned: '', frequency: 'weekly', scheduledDay: 'Sunday' }
    ];
  }

  function defaultKidChores() {
    return [
      { id: makeId(), text: 'Make bed', done: false, kid: 'kayden' },
      { id: makeId(), text: 'Pick up toys', done: false, kid: 'kayden' },
      { id: makeId(), text: 'Put away laundry', done: false, kid: 'kayden' },
      { id: makeId(), text: 'Feed pets', done: false, kid: 'kayden' },
      { id: makeId(), text: 'Clear plate after dinner', done: false, kid: 'kayden' },
      { id: makeId(), text: 'Make bed', done: false, kid: 'oliver' },
      { id: makeId(), text: 'Pick up toys', done: false, kid: 'oliver' },
      { id: makeId(), text: 'Put away laundry', done: false, kid: 'oliver' },
      { id: makeId(), text: 'Help set table', done: false, kid: 'oliver' },
      { id: makeId(), text: 'Put shoes away', done: false, kid: 'oliver' }
    ];
  }

  function defaultData() {
    return {
      lastReset: startOfWeekMonday(new Date()),
      lastDailyReset: todayDateString(),
      lastKidChoresReset: todayDateString(),
      choresVersion: CHORES_VERSION,
      chores: defaultChores(),
      kidChores: defaultKidChores(),
      todos: []
    };
  }

  function makeId() {
    return 'id-' + String(new Date().getTime()) + '-' + String(Math.floor(Math.random() * 100000));
  }

  function ensureWeeklyReset(data) {
    var currentMonday = startOfWeekMonday(new Date());
    if (data.lastReset !== currentMonday) {
      var i;
      for (i = 0; i < data.chores.length; i++) {
        if (data.chores[i].frequency === 'weekly') {
          data.chores[i].done = false;
        }
      }
      data.lastReset = currentMonday;
      saveData(data);
    }
  }

  function ensureDailyReset(data) {
    var today = todayDateString();
    if (!data.lastDailyReset || data.lastDailyReset < today) {
      var i;
      for (i = 0; i < data.chores.length; i++) {
        if (data.chores[i].frequency === 'daily') {
          data.chores[i].done = false;
        }
      }
      data.lastDailyReset = today;
      saveData(data);
    }
  }

  function ensureKidChoresReset(data) {
    var today = todayDateString();
    if (!data.lastKidChoresReset || data.lastKidChoresReset < today) {
      var i;
      for (i = 0; i < data.kidChores.length; i++) {
        data.kidChores[i].done = false;
      }
      data.lastKidChoresReset = today;
      saveData(data);
    }
  }

  function normalizeChores(list) {
    var result = [];
    var i;
    if (!list || !list.length) {
      return result;
    }
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var freq = item.frequency === 'daily' ? 'daily' : 'weekly';
      result.push({
        id: item.id || makeId(),
        text: item.text || '',
        done: !!item.done,
        assigned: item.assigned || '',
        frequency: freq,
        scheduledDay: item.scheduledDay || ''
      });
    }
    return result;
  }

  function normalizeKidChores(list) {
    var result = [];
    var i;
    if (!list || !list.length) {
      return result;
    }
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var kidKey = item.kid === 'oliver' ? 'oliver' : 'kayden';
      result.push({
        id: item.id || makeId(),
        text: item.text || '',
        done: !!item.done,
        kid: kidKey
      });
    }
    return result;
  }

  function normalizeData(data) {
    if (!data || typeof data !== 'object') {
      return defaultData();
    }
    var chores = normalizeChores(data.chores);
    var kidChores = normalizeKidChores(data.kidChores);
    // Migrate chores if version is outdated
    if (!data.choresVersion || data.choresVersion < CHORES_VERSION) {
      chores = defaultChores();
    }
    return {
      lastReset: data.lastReset || startOfWeekMonday(new Date()),
      lastDailyReset: data.lastDailyReset || todayDateString(),
      lastKidChoresReset: data.lastKidChoresReset || todayDateString(),
      choresVersion: CHORES_VERSION,
      chores: chores,
      kidChores: kidChores && kidChores.length ? kidChores : defaultKidChores(),
      todos: data.todos && data.todos.length ? data.todos : []
    };
  }

  function loadInitialData(done) {
    apiRequest('GET', '/api/data', null, function (data) {
      apiEnabled = true;
      done(data);
    }, function () {
      apiEnabled = false;
      done(loadLocalData());
    });
  }

  function setCurrentDate() {
    var el = document.getElementById('current-date');
    if (!el) {
      return;
    }
    var now = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Denver' };
    var dateText;
    try {
      dateText = now.toLocaleDateString('en-US', options);
    } catch (e) {
      dateText = todayDateString();
    }
    el.innerHTML = dateText;
  }

  function switchTab(tabName) {
    var tabChores = document.getElementById('tab-chores');
    var tabTodos = document.getElementById('tab-todos');
    var tabKidChores = document.getElementById('tab-kidchores');
    var viewChores = document.getElementById('view-chores');
    var viewTodos = document.getElementById('view-todos');
    var viewKidChores = document.getElementById('view-kidchores');

    if (tabName === 'chores') {
      tabChores.className = 'sidebar-item active';
      tabTodos.className = 'sidebar-item';
      tabKidChores.className = 'sidebar-item kid-tab';
      viewChores.className = 'view active';
      viewKidChores.className = 'view';
      viewTodos.className = 'view';
    } else if (tabName === 'kidchores') {
      tabChores.className = 'sidebar-item';
      tabTodos.className = 'sidebar-item';
      tabKidChores.className = 'sidebar-item kid-tab kid-active';
      viewChores.className = 'view';
      viewKidChores.className = 'view active';
      viewTodos.className = 'view';
    } else {
      tabChores.className = 'sidebar-item';
      tabTodos.className = 'sidebar-item active';
      tabKidChores.className = 'sidebar-item kid-tab';
      viewChores.className = 'view';
      viewKidChores.className = 'view';
      viewTodos.className = 'view active';
    }
  }

  function renderKidChores(data) {
    closeMenus();
    var listKayden = document.getElementById('kid-list-kayden');
    var listOliver = document.getElementById('kid-list-oliver');
    if (!listKayden || !listOliver) {
      return;
    }
    listKayden.innerHTML = '';
    listOliver.innerHTML = '';
    var i;
    for (i = 0; i < data.kidChores.length; i++) {
      var item = data.kidChores[i];
      if (item.kid === 'oliver') {
        listOliver.appendChild(renderKidChoreItem(data, item));
      } else {
        listKayden.appendChild(renderKidChoreItem(data, item));
      }
    }
    if (!listKayden.children.length) {
      var emptyKayden = document.createElement('div');
      emptyKayden.className = 'empty-category';
      emptyKayden.innerHTML = '—';
      listKayden.appendChild(emptyKayden);
    }
    if (!listOliver.children.length) {
      var emptyOliver = document.createElement('div');
      emptyOliver.className = 'empty-category';
      emptyOliver.innerHTML = '—';
      listOliver.appendChild(emptyOliver);
    }
    updateKidProgressUI(data);
  }

  function kidMetaFor(kid) {
    if (kid === 'oliver') {
      return { name: 'Oliver', color: '#2196F3' };
    }
    return { name: 'Kayden', color: '#4CAF50' };
  }

  function renderKidChoreItem(data, item) {
    var meta = kidMetaFor(item.kid);
    var row = document.createElement('div');
    row.className = item.done ? 'item kid-item is-done' : 'item kid-item';
    row.setAttribute('data-id', item.id);
    row.setAttribute('data-type', 'kidchore');
    row.setAttribute('data-kid', item.kid);
    row.style.setProperty('--kid-accent', meta.color);

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

    var textWrap = document.createElement('div');
    var title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = item.text;
    textWrap.appendChild(title);

    left.appendChild(checkboxWrap);
    left.appendChild(textWrap);
    row.appendChild(left);

    checkbox.onclick = function () {
      var wasComplete = isKidComplete(data, item.kid);
      item.done = checkbox.checked;
      row.className = item.done ? 'item kid-item is-done' : 'item kid-item';
      saveData(data);
      if (item.done) {
        triggerConfettiBurst(checkboxUi, meta.color, 36, false);
      }
      updateKidProgressUI(data);
      if (item.done && !wasComplete && isKidComplete(data, item.kid)) {
        triggerKidCelebration(meta.name, meta.color);
      }
    };

    return row;
  }

  function getKidStats(data, kid) {
    var total = 0;
    var done = 0;
    var i;
    for (i = 0; i < data.kidChores.length; i++) {
      if (data.kidChores[i].kid === kid) {
        total++;
        if (data.kidChores[i].done) {
          done++;
        }
      }
    }
    return { total: total, done: done };
  }

  function isKidComplete(data, kid) {
    var stats = getKidStats(data, kid);
    return stats.total > 0 && stats.done === stats.total;
  }

  function updateKidProgressUI(data) {
    var kids = ['kayden', 'oliver'];
    var i;
    for (i = 0; i < kids.length; i++) {
      var kid = kids[i];
      var stats = getKidStats(data, kid);
      var percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
      var bar = document.getElementById('kid-progress-bar-' + kid);
      var text = document.getElementById('kid-progress-text-' + kid);
      if (bar) {
        bar.style.width = percent + '%';
      }
      if (text) {
        text.innerHTML = stats.done + ' / ' + stats.total + ' done (' + percent + '%)';
      }
    }
  }

  function triggerConfettiBurst(anchorEl, baseColor, count, bigMode) {
    if (!anchorEl) {
      return;
    }
    var rect = anchorEl.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    spawnConfetti(x, y, baseColor, count, bigMode);
  }

  function spawnConfetti(x, y, baseColor, count, bigMode) {
    var colors = [baseColor, '#ffd54f', '#ffca28', '#fff59d'];
    var i;
    for (i = 0; i < count; i++) {
      var particle = document.createElement('div');
      var color = colors[Math.floor(Math.random() * colors.length)];
      var size = bigMode ? 10 + Math.floor(Math.random() * 6) : 6 + Math.floor(Math.random() * 5);
      var dx = (Math.random() * 2 - 1) * (bigMode ? 320 : 140);
      var dy = (Math.random() * 2 - 1) * (bigMode ? 280 : 120);
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
      }(particle), bigMode ? 1300 : 1100);
    }
  }

  function getKidChoreTexts(data, kid) {
    var texts = [];
    var i;
    for (i = 0; i < data.kidChores.length; i++) {
      if (data.kidChores[i].kid === kid) {
        texts.push(data.kidChores[i].text);
      }
    }
    return texts;
  }

  // JS-based animation for iOS 12 compatibility
  function animateTrexChomp(trexImg, duration) {
    var startTime = Date.now();
    var chompInterval = setInterval(function() {
      var elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        clearInterval(chompInterval);
        trexImg.style.transform = 'scale(1) rotate(0deg) translateY(0)';
        return;
      }
      // Combine bounce, chomp (scale), and shake (rotate)
      var t = (elapsed % 600) / 600;
      var bounce = Math.sin(t * Math.PI) * 8;
      var scaleX = 1 + Math.sin(t * Math.PI * 2) * 0.02;
      var scaleY = 1 - Math.sin(t * Math.PI * 2) * 0.02;
      var shake = Math.sin(t * Math.PI * 4) * 1.5;
      trexImg.style.transform = 'translateY(' + (-bounce) + 'px) scale(' + scaleX + ',' + scaleY + ') rotate(' + shake + 'deg)';
    }, 30);
    return chompInterval;
  }

  // JS-based paper fly animation
  function animatePaper(paper, startX, startY, startRot, endX, endY, duration, onDone) {
    var startTime = Date.now();
    paper.style.opacity = '1';
    paper.style.left = '0px';
    paper.style.top = '0px';

    var flyInterval = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out
      var ease = 1 - Math.pow(1 - progress, 3);

      var currentX = startX + (endX - startX) * ease;
      var currentY = startY + (endY - startY) * ease;
      var currentRot = startRot + (90 - startRot) * ease;
      var currentScale = 1 - (0.6 * ease);
      var currentOpacity = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3);

      paper.style.transform = 'translate(' + currentX + 'px,' + currentY + 'px) rotate(' + currentRot + 'deg) scale(' + currentScale + ')';
      paper.style.opacity = String(currentOpacity);

      if (progress >= 1) {
        clearInterval(flyInterval);
        paper.style.opacity = '0';
        if (onDone) {
          onDone();
        }
      }
    }, 30);
  }

  // JS-based message pop animation
  function animateMessagePop(message) {
    var startTime = Date.now();
    var duration = 400;
    message.style.opacity = '1';

    var popInterval = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min(elapsed / duration, 1);

      var scale;
      if (progress < 0.6) {
        scale = 0.5 + (0.62 * (progress / 0.6));
      } else {
        scale = 1.12 - (0.12 * ((progress - 0.6) / 0.4));
      }

      message.style.transform = 'scale(' + scale + ')';
      message.style.opacity = String(progress);

      if (progress >= 1) {
        clearInterval(popInterval);
        message.style.transform = 'scale(1)';
        message.style.opacity = '1';
      }
    }, 20);
  }

  function triggerKidCelebration(kidName, color) {
    var isOliver = kidName === 'Oliver';
    var choreTexts = getKidChoreTexts(currentData, isOliver ? 'oliver' : 'kayden');

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'trex-overlay';
    overlay.style.opacity = '0';

    // Create T-Rex wrapper
    var trexWrap = document.createElement('div');
    trexWrap.className = 'trex-wrap';

    // T-Rex image
    var trexImg = document.createElement('img');
    trexImg.className = 'trex';
    trexImg.src = 'assets/trex-chores-chomp.png';
    trexImg.alt = '';
    trexWrap.appendChild(trexImg);

    // Papers container
    var papersDiv = document.createElement('div');
    papersDiv.className = 'papers';
    trexWrap.appendChild(papersDiv);

    // Message (centered with CSS margin trick for iOS 12)
    var message = document.createElement('div');
    message.className = 'trex-message';
    message.innerHTML = '🦖 Great job, ' + kidName + '!';
    trexWrap.appendChild(message);

    overlay.appendChild(trexWrap);
    document.body.appendChild(overlay);

    // Fade in overlay
    var fadeIn = setInterval(function() {
      var op = parseFloat(overlay.style.opacity) || 0;
      if (op >= 1) {
        clearInterval(fadeIn);
        return;
      }
      overlay.style.opacity = String(op + 0.1);
    }, 30);

    // Paper start positions (scattered around edges)
    var startPositions = [
      { x: -60, y: 350 },
      { x: 280, y: 380 },
      { x: -80, y: 280 },
      { x: 300, y: 320 },
      { x: -40, y: 420 },
      { x: 260, y: 250 },
      { x: -70, y: 200 },
      { x: 290, y: 400 }
    ];

    // Mouth position (relative to trex-wrap)
    var mouthX = 140;
    var mouthY = 120;

    // Create papers
    var papers = [];
    var i;
    for (i = 0; i < choreTexts.length; i++) {
      var paper = document.createElement('div');
      paper.className = 'paper';
      paper.innerHTML = choreTexts[i];
      paper.style.opacity = '0';
      papersDiv.appendChild(paper);
      papers.push(paper);
    }

    // Start chomping
    var chompDuration = (choreTexts.length * 350) + 800;
    var chompInterval = animateTrexChomp(trexImg, chompDuration);

    // Animate papers flying in, staggered
    for (i = 0; i < papers.length; i++) {
      (function(index) {
        var pos = startPositions[index % startPositions.length];
        var startRot = -20 + Math.random() * 40;
        setTimeout(function() {
          animatePaper(papers[index], pos.x, pos.y, startRot, mouthX, mouthY, 800, null);
        }, index * 350);
      })(i);
    }

    // Show message after chomping done
    setTimeout(function() {
      animateMessagePop(message);
    }, chompDuration + 200);

    // Remove overlay (extra 2 seconds to admire)
    setTimeout(function() {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, chompDuration + 4500);
  }

  function renderChores(data) {
    closeMenus();
    var list = document.getElementById('chores-list');
    list.innerHTML = '';
    var i;
    var daily = [];
    var weekly = [];
    for (i = 0; i < data.chores.length; i++) {
      if (data.chores[i].frequency === 'daily') {
        daily.push(data.chores[i]);
      } else {
        weekly.push(data.chores[i]);
      }
    }
    list.appendChild(renderChoreSection('Daily', 'Resets every day', data, daily, 'daily'));
    list.appendChild(renderWeeklyChoreSection('Weekly', 'Resets every Monday', data, weekly));
  }

  function renderChoreSection(title, subtitle, data, items, frequency) {
    var section = document.createElement('div');
    section.className = 'chore-section';

    var header = document.createElement('div');
    header.className = 'chore-section-head';
    var headerTitle = document.createElement('div');
    headerTitle.className = 'chore-section-title';
    headerTitle.innerHTML = title;
    var headerSub = document.createElement('div');
    headerSub.className = 'chore-section-sub';
    headerSub.innerHTML = subtitle;
    header.appendChild(headerTitle);
    header.appendChild(headerSub);
    section.appendChild(header);

    var list = document.createElement('div');
    list.className = 'list drag-container';
    list.setAttribute('data-frequency', frequency || '');
    var i;
    for (i = 0; i < items.length; i++) {
      list.appendChild(renderChoreItem(data, items[i]));
    }
    section.appendChild(list);

    return section;
  }

  function renderWeeklyChoreSection(title, subtitle, data, items) {
    var section = document.createElement('div');
    section.className = 'chore-section';

    var header = document.createElement('div');
    header.className = 'chore-section-head';
    var headerTitle = document.createElement('div');
    headerTitle.className = 'chore-section-title';
    headerTitle.innerHTML = title;
    var headerSub = document.createElement('div');
    headerSub.className = 'chore-section-sub';
    headerSub.innerHTML = subtitle;
    header.appendChild(headerTitle);
    header.appendChild(headerSub);
    section.appendChild(header);

    var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', ''];
    var dayLabels = {
      Monday: 'MONDAY',
      Tuesday: 'TUESDAY',
      Wednesday: 'WEDNESDAY',
      Thursday: 'THURSDAY',
      Friday: 'FRIDAY',
      Saturday: 'SATURDAY',
      Sunday: 'SUNDAY',
      '': 'UNSCHEDULED'
    };

    var d;
    for (d = 0; d < dayOrder.length; d++) {
      var dayKey = dayOrder[d];
      var group = document.createElement('div');
      group.className = 'chore-day-group day-' + (dayKey ? dayKey.toLowerCase() : 'unscheduled');

      var groupHeader = document.createElement('div');
      groupHeader.className = 'chore-day-head';
      groupHeader.innerHTML = dayLabels[dayKey];
      group.appendChild(groupHeader);

      var list = document.createElement('div');
      list.className = 'list drag-container';
      list.setAttribute('data-frequency', 'weekly');
      list.setAttribute('data-day', dayKey);
      var i;
      var hasAny = false;
      for (i = 0; i < items.length; i++) {
        if ((items[i].scheduledDay || '') === dayKey) {
          list.appendChild(renderChoreItem(data, items[i]));
          hasAny = true;
        }
      }
      if (!hasAny) {
        var empty = document.createElement('div');
        empty.className = 'empty-category';
        empty.innerHTML = '—';
        list.appendChild(empty);
      }
      group.appendChild(list);
      section.appendChild(group);
    }

    return section;
  }

  function renderChoreItem(data, item) {
    var row = document.createElement('div');
    row.className = item.done ? 'item is-done' : 'item';
    row.setAttribute('data-id', item.id);
    row.setAttribute('data-type', 'chore');
    row.setAttribute('data-frequency', item.frequency);
    row.setAttribute('data-day', item.scheduledDay || '');

    var left = document.createElement('div');
    left.className = 'item-left';

    var checkboxWrap = document.createElement('label');
    checkboxWrap.className = 'checkbox-wrap';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox-input';
    checkbox.checked = item.done;
    checkbox.onclick = function () {
      item.done = checkbox.checked;
      row.className = item.done ? 'item is-done' : 'item';
      saveData(data);
    };
    var checkboxUi = document.createElement('span');
    checkboxUi.className = 'checkbox-ui';
    checkboxWrap.appendChild(checkbox);
    checkboxWrap.appendChild(checkboxUi);

    var textWrap = document.createElement('div');
    var title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = item.text;
    textWrap.appendChild(title);

    left.appendChild(checkboxWrap);
    left.appendChild(textWrap);

    var right = document.createElement('div');
    right.className = 'item-right';
    right.appendChild(renderAssigneeControl(item, function () {
      saveData(data);
      renderChores(data);
    }));

    var dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '≡';
    right.appendChild(dragHandle);

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  function renderTodos(data) {
    closeMenus();
    var list = document.getElementById('todos-list');
    list.innerHTML = '';
    var categories = ['Home', 'Shopping', 'Projects', 'Rob', 'Other'];
    var i;
    for (i = 0; i < categories.length; i++) {
      var category = categories[i];
      var group = document.createElement('div');
      group.className = 'todo-group';
      group.setAttribute('data-category', category);
      var header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = category.toUpperCase();
      group.appendChild(header);

      var j;
      var hasAny = false;
      var listWrap = document.createElement('div');
      listWrap.className = 'list drag-container';
      listWrap.setAttribute('data-category', category);
      for (j = 0; j < data.todos.length; j++) {
        if (data.todos[j].category === category) {
          listWrap.appendChild(renderTodoItem(data, data.todos[j]));
          hasAny = true;
        }
      }
      if (!hasAny) {
        var empty = document.createElement('div');
        empty.className = 'empty-category';
        empty.innerHTML = '—';
        listWrap.appendChild(empty);
      }
      group.appendChild(listWrap);
      list.appendChild(group);
    }
  }

  function renderTodoItem(data, item) {
    var row = document.createElement('div');
    row.className = item.done ? 'item is-done' : 'item';
    row.setAttribute('data-id', item.id);
    row.setAttribute('data-type', 'todo');
    row.setAttribute('data-category', item.category);

    var left = document.createElement('div');
    left.className = 'item-left';

    var checkboxWrap = document.createElement('label');
    checkboxWrap.className = 'checkbox-wrap';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox-input';
    checkbox.checked = item.done;
    checkbox.onclick = function () {
      item.done = checkbox.checked;
      row.className = item.done ? 'item is-done' : 'item';
      saveData(data);
    };
    var checkboxUi = document.createElement('span');
    checkboxUi.className = 'checkbox-ui';
    checkboxWrap.appendChild(checkbox);
    checkboxWrap.appendChild(checkboxUi);

    var textWrap = document.createElement('div');
    var title = document.createElement('div');
    title.className = 'item-title';
    title.innerHTML = item.text;

    textWrap.appendChild(title);

    left.appendChild(checkboxWrap);
    left.appendChild(textWrap);

    var right = document.createElement('div');
    right.className = 'item-right';
    right.appendChild(renderAssigneeControl(item, function () {
      saveData(data);
      renderTodos(data);
    }));

    var dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '≡';
    right.appendChild(dragHandle);

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  var menuOverlay = null;
  var openAssigneeMenu = null;
  var openDayMenu = null;

  function ensureMenuOverlay() {
    if (menuOverlay) {
      return menuOverlay;
    }
    menuOverlay = document.createElement('div');
    menuOverlay.className = 'assignment-overlay';
    menuOverlay.style.display = 'none';
    menuOverlay.onclick = function () {
      closeMenus();
    };
    document.body.appendChild(menuOverlay);
    return menuOverlay;
  }

  function closeMenus() {
    if (openAssigneeMenu) {
      openAssigneeMenu.style.display = 'none';
      openAssigneeMenu = null;
    }
    if (openDayMenu) {
      openDayMenu.style.display = 'none';
      openDayMenu = null;
    }
    if (menuOverlay) {
      menuOverlay.style.display = 'none';
    }
  }

  function openMenuFor(menu, type) {
    if (openAssigneeMenu && openAssigneeMenu !== menu) {
      openAssigneeMenu.style.display = 'none';
    }
    if (openDayMenu && openDayMenu !== menu) {
      openDayMenu.style.display = 'none';
    }
    ensureMenuOverlay().style.display = 'block';
    menu.style.display = 'block';
    if (type === 'day') {
      openDayMenu = menu;
    } else {
      openAssigneeMenu = menu;
    }
  }

  function renderAssigneeControl(item, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'assignee-control';

    var badge = document.createElement('button');
    badge.className = 'person assignee-badge';
    if (item.assigned === 'Kirsten') {
      badge.className += ' kirsten';
      badge.innerHTML = 'Kirsten';
    } else if (item.assigned === 'Rob') {
      badge.className += ' rob';
      badge.innerHTML = 'Rob';
    } else {
      badge.className += ' unassigned';
      badge.innerHTML = 'Unassigned';
    }

    var menu = document.createElement('div');
    menu.className = 'assignee-menu assignee-menu-portal';
    menu.style.display = 'none';
    menu.style.position = 'fixed';

    var kBtn = document.createElement('button');
    kBtn.className = 'assignee-option kirsten';
    kBtn.innerHTML = 'Kirsten';
    kBtn.onclick = function () {
      item.assigned = 'Kirsten';
      closeMenus();
      onChange();
    };

    var rBtn = document.createElement('button');
    rBtn.className = 'assignee-option rob';
    rBtn.innerHTML = 'Rob';
    rBtn.onclick = function () {
      item.assigned = 'Rob';
      closeMenus();
      onChange();
    };

    menu.appendChild(kBtn);
    menu.appendChild(rBtn);

    // Append menu to body to escape stacking context (iOS Safari fix)
    document.body.appendChild(menu);

    badge.onclick = function () {
      if (openAssigneeMenu === menu && menu.style.display === 'block') {
        closeMenus();
        return;
      }
      // Position menu relative to badge
      var rect = badge.getBoundingClientRect();
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.right = (window.innerWidth - rect.right) + 'px';
      menu.style.left = 'auto';
      openMenuFor(menu, 'assignee');
    };

    wrap.appendChild(badge);

    if (item.assigned) {
      var remove = document.createElement('button');
      remove.className = 'assign-remove';
      remove.innerHTML = '✕';
      remove.onclick = function () {
        item.assigned = '';
        closeMenus();
        onChange();
      };
      wrap.appendChild(remove);
    }

    return wrap;
  }

  function renderDayControl(item, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'day-control';

    var badge = document.createElement('button');
    badge.className = 'person day-badge';
    if (item.scheduledDay) {
      badge.className += ' day-assigned';
      badge.innerHTML = item.scheduledDay.substring(0, 3).toUpperCase();
    } else {
      badge.className += ' day-unassigned';
      badge.innerHTML = 'DAY';
    }

    var menu = document.createElement('div');
    menu.className = 'assignee-menu day-menu';
    menu.style.display = 'none';

    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var i;
    for (i = 0; i < days.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'assignee-option day-option';
      btn.innerHTML = days[i].toUpperCase();
      btn.onclick = function (dayName) {
        return function () {
          item.scheduledDay = dayName;
          closeMenus();
          onChange();
        };
      }(days[i]);
      menu.appendChild(btn);
    }

    var clearBtn = document.createElement('button');
    clearBtn.className = 'assignee-option day-option clear';
    clearBtn.innerHTML = 'UNSCHEDULED';
    clearBtn.onclick = function () {
      item.scheduledDay = '';
      closeMenus();
      onChange();
    };
    menu.appendChild(clearBtn);

    badge.onclick = function () {
      if (openDayMenu === menu && menu.style.display === 'block') {
        closeMenus();
        return;
      }
      openMenuFor(menu, 'day');
    };

    wrap.appendChild(badge);
    wrap.appendChild(menu);
    return wrap;
  }

  function removeItem(list, id) {
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1);
        return;
      }
    }
  }

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

  function getOrderedIds(container) {
    var ids = [];
    var children = container ? container.children : [];
    var i;
    for (i = 0; i < children.length; i++) {
      if (children[i].className && (' ' + children[i].className + ' ').indexOf(' item ') > -1) {
        ids.push(children[i].getAttribute('data-id'));
      }
    }
    return ids;
  }

  function reorderTodosInCategory(data, category, orderedIds) {
    var idMap = {};
    var i;
    for (i = 0; i < data.todos.length; i++) {
      if (data.todos[i].category === category) {
        idMap[data.todos[i].id] = data.todos[i];
      }
    }
    var orderedItems = [];
    for (i = 0; i < orderedIds.length; i++) {
      if (idMap[orderedIds[i]]) {
        orderedItems.push(idMap[orderedIds[i]]);
      }
    }
    var nextIndex = 0;
    for (i = 0; i < data.todos.length; i++) {
      if (data.todos[i].category === category) {
        data.todos[i] = orderedItems[nextIndex] || data.todos[i];
        nextIndex++;
      }
    }
  }

  function reorderChoresInGroup(data, frequency, day, orderedIds) {
    var idMap = {};
    var i;
    for (i = 0; i < data.chores.length; i++) {
      if (data.chores[i].frequency === frequency && (data.chores[i].scheduledDay || '') === (day || '')) {
        idMap[data.chores[i].id] = data.chores[i];
      }
    }
    var orderedItems = [];
    for (i = 0; i < orderedIds.length; i++) {
      if (idMap[orderedIds[i]]) {
        orderedItems.push(idMap[orderedIds[i]]);
      }
    }
    var nextIndex = 0;
    for (i = 0; i < data.chores.length; i++) {
      if (data.chores[i].frequency === frequency && (data.chores[i].scheduledDay || '') === (day || '')) {
        data.chores[i] = orderedItems[nextIndex] || data.chores[i];
        nextIndex++;
      }
    }
  }

  function beginDrag(row, touch) {
    if (!row || !currentData) {
      return;
    }
    closeMenus();
    var container = closestWithClass(row.parentNode, 'drag-container');
    if (!container) {
      return;
    }
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
      currentContainer: container,
      type: row.getAttribute('data-type'),
      category: row.getAttribute('data-category'),
      frequency: row.getAttribute('data-frequency'),
      day: row.getAttribute('data-day'),
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    };
  }

  function updateDragPosition(touch) {
    if (!dragState || !dragState.active) {
      return;
    }
    dragState.ghost.style.left = (touch.clientX - dragState.offsetX) + 'px';
    dragState.ghost.style.top = (touch.clientY - dragState.offsetY) + 'px';

    var target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) {
      return;
    }
    var container = closestWithClass(target, 'drag-container');
    if (!container) {
      return;
    }
    var allowedContainer = false;
    if (dragState.type === 'todo') {
      allowedContainer = container === dragState.container;
    } else if (dragState.type === 'chore') {
      var containerFrequency = container.getAttribute('data-frequency') || '';
      if (dragState.frequency === 'weekly') {
        allowedContainer = containerFrequency === 'weekly';
      } else {
        allowedContainer = container === dragState.container;
      }
    }
    if (!allowedContainer) {
      return;
    }
    if (!dragState.currentContainer) {
      dragState.currentContainer = dragState.container;
    }
    if (container !== dragState.currentContainer) {
      dragState.currentContainer = container;
    }
    var targetItem = closestWithClass(target, 'item');
    if (!targetItem || targetItem === dragState.row || targetItem.parentNode !== container) {
      var empty = null;
      if (container.getElementsByClassName) {
        var emptyNodes = container.getElementsByClassName('empty-category');
        if (emptyNodes && emptyNodes.length) {
          empty = emptyNodes[0];
        }
      }
      if (empty) {
        container.insertBefore(dragState.placeholder, empty);
      } else {
        container.appendChild(dragState.placeholder);
      }
      return;
    }
    var rect = targetItem.getBoundingClientRect();
    if (touch.clientY < rect.top + rect.height / 2) {
      container.insertBefore(dragState.placeholder, targetItem);
    } else {
      if (targetItem.nextSibling) {
        container.insertBefore(dragState.placeholder, targetItem.nextSibling);
      } else {
        container.appendChild(dragState.placeholder);
      }
    }
  }

  function finishDrag() {
    if (!dragState || !dragState.active) {
      dragState = null;
      return;
    }
    var container = dragState.currentContainer || dragState.container;
    if (dragState.placeholder.parentNode) {
      dragState.placeholder.parentNode.insertBefore(dragState.row, dragState.placeholder);
      dragState.placeholder.parentNode.removeChild(dragState.placeholder);
    }
    if (dragState.ghost && dragState.ghost.parentNode) {
      dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    dragState.row.className = dragState.row.className.replace(' dragging-hidden', '');

    var orderedIds = getOrderedIds(container);
    if (dragState.type === 'todo') {
      reorderTodosInCategory(currentData, dragState.category, orderedIds);
      saveData(currentData);
      renderTodos(currentData);
    } else if (dragState.type === 'chore') {
      var newDay = dragState.day;
      if (dragState.frequency === 'weekly' && dragState.currentContainer && dragState.currentContainer !== dragState.container) {
        newDay = dragState.currentContainer.getAttribute('data-day') || '';
        var i;
        for (i = 0; i < currentData.chores.length; i++) {
          if (currentData.chores[i].id == dragState.row.getAttribute('data-id')) {
            currentData.chores[i].scheduledDay = newDay;
            break;
          }
        }
      }
      reorderChoresInGroup(currentData, dragState.frequency, newDay, orderedIds);
      saveData(currentData);
      renderChores(currentData);
    }
    dragState = null;
  }

  var activeTab = 'todos';

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;
    var tabChores = document.getElementById('tab-chores');
    var tabTodos = document.getElementById('tab-todos');
    var tabKidChores = document.getElementById('tab-kidchores');

    tabChores.onclick = function () {
      activeTab = 'chores';
      switchTab('chores');
    };
    tabTodos.onclick = function () {
      activeTab = 'todos';
      switchTab('todos');
    };
    tabKidChores.onclick = function () {
      activeTab = 'kidchores';
      switchTab('kidchores');
    };

    // Overflow menu
    var overflowBtn = document.getElementById('overflow-btn');
    var overflowMenu = document.getElementById('overflow-menu');
    var deleteCheckedBtn = document.getElementById('delete-checked-btn');

    overflowBtn.onclick = function (e) {
      e.stopPropagation();
      if (overflowMenu.style.display === 'block') {
        overflowMenu.style.display = 'none';
      } else {
        overflowMenu.style.display = 'block';
      }
    };

    document.addEventListener('click', function () {
      overflowMenu.style.display = 'none';
    }, false);
    document.addEventListener("touchstart", function (e) {
      var wrap = document.getElementById("overflow-btn").parentNode;
      var target = e.target;
      while (target) {
        if (target === wrap) {
          return;
        }
        target = target.parentNode;
      }
      overflowMenu.style.display = "none";
    }, false);

    overflowMenu.onclick = function (e) {
      e.stopPropagation();
    };

    deleteCheckedBtn.onclick = function () {
      if (!currentData) {
        return;
      }
      overflowMenu.style.display = 'none';
      if (activeTab === 'todos') {
        var kept = [];
        var i;
        for (i = 0; i < currentData.todos.length; i++) {
          if (!currentData.todos[i].done) {
            kept.push(currentData.todos[i]);
          }
        }
        currentData.todos = kept;
        saveData(currentData);
        renderTodos(currentData);
      } else if (activeTab === 'chores') {
        var keptChores = [];
        var j;
        for (j = 0; j < currentData.chores.length; j++) {
          if (!currentData.chores[j].done) {
            keptChores.push(currentData.chores[j]);
          }
        }
        currentData.chores = keptChores;
        saveData(currentData);
        renderChores(currentData);
      } else if (activeTab === 'kidchores') {
        var keptKidChores = [];
        var k;
        for (k = 0; k < currentData.kidChores.length; k++) {
          if (!currentData.kidChores[k].done) {
            keptKidChores.push(currentData.kidChores[k]);
          }
        }
        currentData.kidChores = keptKidChores;
        saveData(currentData);
        renderKidChores(currentData);
      }
    };

    var choreInput = document.getElementById('chore-input');
    var choreAdd = document.getElementById('chore-add');
    var choreFrequency = document.getElementById('chore-frequency');
    choreAdd.onclick = function () {
      if (!currentData) {
        return;
      }
      var text = choreInput.value.replace(/^\s+|\s+$/g, '');
      if (!text) {
        return;
      }
      currentData.chores.push({
        id: makeId(),
        text: text,
        done: false,
        assigned: '',
        frequency: choreFrequency.value,
        scheduledDay: ''
      });
      choreInput.value = '';
      saveData(currentData);
      renderChores(currentData);
    };

    var todoInput = document.getElementById('todo-input');
    var todoAdd = document.getElementById('todo-add');
    var todoCategory = document.getElementById('todo-category');
    todoAdd.onclick = function () {
      if (!currentData) {
        return;
      }
      var text = todoInput.value.replace(/^\s+|\s+$/g, '');
      if (!text) {
        return;
      }
      currentData.todos.push({
        id: makeId(),
        text: text,
        done: false,
        assigned: '',
        category: todoCategory.value
      });
      todoInput.value = '';
      saveData(currentData);
      renderTodos(currentData);
    };

    var kidChoreInput = document.getElementById('kid-chore-input');
    var kidChoreAdd = document.getElementById('kid-chore-add');
    var kidChoreKid = document.getElementById('kid-chore-kid');
    kidChoreAdd.onclick = function () {
      if (!currentData) {
        return;
      }
      var text = kidChoreInput.value.replace(/^\s+|\s+$/g, '');
      if (!text) {
        return;
      }
      currentData.kidChores.push({
        id: makeId(),
        text: text,
        done: false,
        kid: kidChoreKid.value === 'oliver' ? 'oliver' : 'kayden'
      });
      kidChoreInput.value = '';
      saveData(currentData);
      renderKidChores(currentData);
    };

    document.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) {
        return;
      }
      var handle = closestWithClass(e.target, 'drag-handle');
      if (!handle) {
        return;
      }
      var row = closestWithClass(handle, 'item');
      if (!row) {
        return;
      }
      var touch = e.touches[0];
      dragState = {
        pending: true,
        row: row,
        startX: touch.clientX,
        startY: touch.clientY
      };
      if (dragPressTimer) {
        clearTimeout(dragPressTimer);
      }
      dragPressTimer = setTimeout(function () {
        if (dragState && dragState.pending) {
          dragState.pending = false;
          beginDrag(row, touch);
        }
      }, 200);
    }, false);

    document.addEventListener('touchmove', function (e) {
      if (!dragState) {
        return;
      }
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

  function refreshOnWake() {
    if (document.hidden) return;
    setCurrentDate();
    if (currentData) {
      ensureDailyReset(currentData);
      ensureWeeklyReset(currentData);
      ensureKidChoresReset(currentData);
      saveData(currentData);
      renderChores(currentData);
      renderKidChores(currentData);
      renderTodos(currentData);
    }
  }

  function init() {
    setCurrentDate();
    setInterval(setCurrentDate, 60000);
    document.addEventListener('visibilitychange', refreshOnWake);
    loadInitialData(function (data) {
      currentData = normalizeData(data);
      ensureDailyReset(currentData);
      ensureWeeklyReset(currentData);
      ensureKidChoresReset(currentData);
      bindEvents();
      renderChores(currentData);
      renderKidChores(currentData);
      renderTodos(currentData);
      switchTab('todos');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
