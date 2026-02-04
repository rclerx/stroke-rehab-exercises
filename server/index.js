'use strict';

var path = require('path');
var express = require('express');
var Database = require('better-sqlite3');
var dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

var PORT = process.env.PORT || 3000;
var DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite3');

// Local network prefixes that are allowed to connect
var LOCAL_PREFIXES = ['127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.',
  '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '::1', '::ffff:127.', '::ffff:10.', '::ffff:192.168.'];

function isLocalAddress(addr) {
  if (!addr) {
    return false;
  }
  var i;
  for (i = 0; i < LOCAL_PREFIXES.length; i++) {
    if (addr.indexOf(LOCAL_PREFIXES[i]) === 0) {
      return true;
    }
  }
  return false;
}

function requireLocalNetwork(req, res, next) {
  var ip = req.ip || req.connection.remoteAddress || '';
  if (isLocalAddress(ip)) {
    return next();
  }
  console.log('Rejected non-local connection from: ' + ip);
  return res.status(403).send('Access denied — local network only');
}

var db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS dashboard_data (\n' +
  '  id INTEGER PRIMARY KEY CHECK (id = 1),\n' +
  '  payload TEXT NOT NULL,\n' +
  '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))\n' +
  ');');

db.prepare('INSERT OR IGNORE INTO dashboard_data (id, payload) VALUES (1, ?)')
  .run(JSON.stringify({}));

var selectStmt = db.prepare('SELECT payload FROM dashboard_data WHERE id = 1');
var updateStmt = db.prepare('UPDATE dashboard_data SET payload = ?, updated_at = datetime(\'now\') WHERE id = 1');

function loadData() {
  var row = selectStmt.get();
  if (!row || !row.payload) {
    return {};
  }
  try {
    return JSON.parse(row.payload);
  } catch (e) {
    return {};
  }
}

function isEmptyObject(value) {
  if (!value || typeof value !== 'object') {
    return true;
  }
  var key;
  for (key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return false;
    }
  }
  return true;
}

function makeId() {
  return 'id-' + String(new Date().getTime()) + '-' + String(Math.floor(Math.random() * 100000));
}

function seedInitialTodos() {
  var data = loadData();
  if (!isEmptyObject(data)) {
    return;
  }
  // Start with empty data - users add their own todos
  data.todos = [];
  data.chores = [];
  updateStmt.run(JSON.stringify(data));
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(target, patch) {
  var output = {};
  var key;
  for (key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      output[key] = target[key];
    }
  }
  for (key in patch) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      if (isPlainObject(output[key]) && isPlainObject(patch[key])) {
        output[key] = mergeDeep(output[key], patch[key]);
      } else {
        output[key] = patch[key];
      }
    }
  }
  return output;
}

var app = express();
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '1mb' }));
app.use(requireLocalNetwork);

seedInitialTodos();

app.get('/api/data', function (req, res) {
  res.json(loadData());
});

app.post('/api/data', function (req, res) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  updateStmt.run(JSON.stringify(req.body));
  return res.json(req.body);
});

app.patch('/api/data', function (req, res) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  var current = loadData();
  var merged = mergeDeep(current, req.body);
  updateStmt.run(JSON.stringify(merged));
  return res.json(merged);
});

app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, function () {
  console.log('Family Dashboard server running on port ' + PORT);
  console.log('Accepting connections from local network only');
});
