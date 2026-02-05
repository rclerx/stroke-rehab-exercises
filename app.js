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
        frequency: freq,
        scheduledDay: item.scheduledDay || ''
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
      tabChores.className = 'sidebar-item active';
      tabTodos.className = 'sidebar-item';
      viewChores.className = 'view active';
      viewTodos.className = 'view';
    } else {
      tabChores.className = 'sidebar-item';
      tabTodos.className = 'sidebar-item active';
      viewChores.className = 'view';
      viewTodos.className = 'view active';
    }
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
    menu.className = 'assignee-menu';
    menu.style.display = 'none';

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

    badge.onclick = function () {
      if (openAssigneeMenu === menu && menu.style.display === 'block') {
        closeMenus();
        return;
      }
      openMenuFor(menu, 'assignee');
    };

    wrap.appendChild(badge);
    wrap.appendChild(menu);

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
    if (!container || container !== dragState.container) {
      return;
    }
    var targetItem = closestWithClass(target, 'item');
    if (!targetItem || targetItem === dragState.row) {
      return;
    }
    if (targetItem.parentNode !== container) {
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
    var container = dragState.container;
    if (dragState.placeholder.parentNode) {
      container.insertBefore(dragState.row, dragState.placeholder);
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
      reorderChoresInGroup(currentData, dragState.frequency, dragState.day, orderedIds);
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
