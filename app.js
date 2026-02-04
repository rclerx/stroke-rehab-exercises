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

  var CHORES_VERSION = 2;

  function defaultChores() {
    return [
      // Daily
      { id: makeId(), text: 'Make bed', done: false, assigned: '', frequency: 'daily' },
      { id: makeId(), text: 'Dishes', done: false, assigned: '', frequency: 'daily' },
      { id: makeId(), text: 'Wipe counters', done: false, assigned: '', frequency: 'daily' },
      // Weekly (from schedule)
      { id: makeId(), text: 'Kids clothes', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Hot tub', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Sort clothes', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Monarch $', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Plants', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Grocery order', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Underwear', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Bath / Shower', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Litter', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Clean-up', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Pre-cleaning', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Our clothes', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Sheets or towels', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Mow grass', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Leo meds', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Art work', done: false, assigned: '', frequency: 'weekly' },
      { id: makeId(), text: 'Comb cats', done: false, assigned: '', frequency: 'weekly' }
    ];
  }

  function defaultData() {
    return {
      lastReset: startOfWeekMonday(new Date()),
      lastDailyReset: todayDateString(),
      choresVersion: CHORES_VERSION,
      chores: defaultChores(),
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
        frequency: freq
      });
    }
    return result;
  }

  function normalizeData(data) {
    if (!data || typeof data !== 'object') {
      return defaultData();
    }
    var chores = normalizeChores(data.chores);
    // Migrate chores if version is outdated
    if (!data.choresVersion || data.choresVersion < CHORES_VERSION) {
      chores = defaultChores();
    }
    return {
      lastReset: data.lastReset || startOfWeekMonday(new Date()),
      lastDailyReset: data.lastDailyReset || todayDateString(),
      choresVersion: CHORES_VERSION,
      chores: chores,
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
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
    var viewChores = document.getElementById('view-chores');
    var viewTodos = document.getElementById('view-todos');

    if (tabName === 'chores') {
      tabChores.className = 'tab active';
      tabTodos.className = 'tab';
      viewChores.className = 'view active';
      viewTodos.className = 'view';
    } else {
      tabChores.className = 'tab';
      tabTodos.className = 'tab active';
      viewChores.className = 'view';
      viewTodos.className = 'view active';
    }
  }

  function renderChores(data) {
    closeAssigneeMenu();
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
    list.appendChild(renderChoreSection('Daily', 'Resets every day', data, daily));
    list.appendChild(renderChoreSection('Weekly', 'Resets every Monday', data, weekly));
  }

  function renderChoreSection(title, subtitle, data, items) {
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
    list.className = 'list';
    var i;
    for (i = 0; i < items.length; i++) {
      list.appendChild(renderChoreItem(data, items[i]));
    }
    section.appendChild(list);

    return section;
  }

  function renderChoreItem(data, item) {
    var row = document.createElement('div');
    row.className = item.done ? 'item is-done' : 'item';

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

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  function renderTodos(data) {
    closeAssigneeMenu();
    var list = document.getElementById('todos-list');
    list.innerHTML = '';
    var categories = ['Home', 'Shopping', 'Projects', 'Rob', 'Other'];
    var i;
    for (i = 0; i < categories.length; i++) {
      var category = categories[i];
      var group = document.createElement('div');
      var header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = category.toUpperCase();
      group.appendChild(header);

      var j;
      var hasAny = false;
      for (j = 0; j < data.todos.length; j++) {
        if (data.todos[j].category === category) {
          group.appendChild(renderTodoItem(data, data.todos[j]));
          hasAny = true;
        }
      }
      if (!hasAny) {
        var empty = document.createElement('div');
        empty.className = 'empty-category';
        empty.innerHTML = '—';
        group.appendChild(empty);
      }
      list.appendChild(group);
    }
  }

  function renderTodoItem(data, item) {
    var row = document.createElement('div');
    row.className = item.done ? 'item is-done' : 'item';

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

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  var assignmentOverlay = null;
  var openAssigneeMenu = null;

  function ensureAssignmentOverlay() {
    if (assignmentOverlay) {
      return assignmentOverlay;
    }
    assignmentOverlay = document.createElement('div');
    assignmentOverlay.className = 'assignment-overlay';
    assignmentOverlay.style.display = 'none';
    assignmentOverlay.onclick = function () {
      closeAssigneeMenu();
    };
    document.body.appendChild(assignmentOverlay);
    return assignmentOverlay;
  }

  function closeAssigneeMenu() {
    if (openAssigneeMenu) {
      openAssigneeMenu.style.display = 'none';
      openAssigneeMenu = null;
    }
    if (assignmentOverlay) {
      assignmentOverlay.style.display = 'none';
    }
  }

  function openAssigneeMenuFor(menu) {
    if (openAssigneeMenu && openAssigneeMenu !== menu) {
      openAssigneeMenu.style.display = 'none';
    }
    ensureAssignmentOverlay().style.display = 'block';
    menu.style.display = 'block';
    openAssigneeMenu = menu;
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
    menu.className = 'assignee-menu';
    menu.style.display = 'none';

    var kBtn = document.createElement('button');
    kBtn.className = 'assignee-option kirsten';
    kBtn.innerHTML = 'Kirsten';
    kBtn.onclick = function () {
      item.assigned = 'Kirsten';
      closeAssigneeMenu();
      onChange();
    };

    var rBtn = document.createElement('button');
    rBtn.className = 'assignee-option rob';
    rBtn.innerHTML = 'Rob';
    rBtn.onclick = function () {
      item.assigned = 'Rob';
      closeAssigneeMenu();
      onChange();
    };

    menu.appendChild(kBtn);
    menu.appendChild(rBtn);

    badge.onclick = function () {
      if (openAssigneeMenu === menu && menu.style.display === 'block') {
        closeAssigneeMenu();
        return;
      }
      openAssigneeMenuFor(menu);
    };

    wrap.appendChild(badge);
    wrap.appendChild(menu);

    if (item.assigned) {
      var remove = document.createElement('button');
      remove.className = 'assign-remove';
      remove.innerHTML = '✕';
      remove.onclick = function () {
        item.assigned = '';
        closeAssigneeMenu();
        onChange();
      };
      wrap.appendChild(remove);
    }

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

  var activeTab = 'todos';

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;
    var tabChores = document.getElementById('tab-chores');
    var tabTodos = document.getElementById('tab-todos');

    tabChores.onclick = function () {
      activeTab = 'chores';
      switchTab('chores');
    };
    tabTodos.onclick = function () {
      activeTab = 'todos';
      switchTab('todos');
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
      } else {
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
        frequency: choreFrequency.value
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
  }

  function init() {
    setCurrentDate();
    loadInitialData(function (data) {
      currentData = normalizeData(data);
      ensureDailyReset(currentData);
      ensureWeeklyReset(currentData);
      bindEvents();
      renderChores(currentData);
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
