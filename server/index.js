'use strict';

var path = require('path');
var crypto = require('crypto');
var express = require('express');
var Database = require('better-sqlite3');
var dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

var PORT = process.env.PORT || 3000;
var DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite3');
var AUTH_USER = process.env.BASIC_AUTH_USER;
var AUTH_PASS = process.env.BASIC_AUTH_PASS;

if (!AUTH_USER || !AUTH_PASS) {
  console.error('Missing BASIC_AUTH_USER or BASIC_AUTH_PASS in .env');
  process.exit(1);
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

function safeEqual(a, b) {
  var aBuf = Buffer.from(String(a));
  var bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function requireAuth(req, res, next) {
  var header = req.headers.authorization || '';
  if (header.indexOf('Basic ') !== 0) {
    res.set('WWW-Authenticate', 'Basic realm="Family Dashboard"');
    return res.status(401).send('Authentication required');
  }

  var encoded = header.slice(6);
  var decoded = Buffer.from(encoded, 'base64').toString('utf8');
  var sepIndex = decoded.indexOf(':');
  var user = sepIndex >= 0 ? decoded.slice(0, sepIndex) : decoded;
  var pass = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : '';

  if (!safeEqual(user, AUTH_USER) || !safeEqual(pass, AUTH_PASS)) {
    res.set('WWW-Authenticate', 'Basic realm="Family Dashboard"');
    return res.status(401).send('Authentication required');
  }

  return next();
}

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
app.use(express.json({ limit: '1mb' }));
app.use(requireAuth);

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
});
