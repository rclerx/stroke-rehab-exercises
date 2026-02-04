# Family Dashboard

A simple, offline-first family dashboard built for a wall-mounted iPad (iOS 12.5.7 compatible).

## Files
- `index.html`
- `styles.css`
- `app.js`
- `server/index.js`

## Features
- Weekly chores with checkboxes and assignments
- To do list with categories
- Large touch targets, tabbed navigation, and dark-friendly design
- LocalStorage persistence with API sync when available
- Chores reset every Monday

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Create your `.env` file from the example:
   ```sh
   cp .env.example .env
   ```
3. Edit `.env` with your credentials:
   - `BASIC_AUTH_USER` — username for dashboard access
   - `BASIC_AUTH_PASS` — password for dashboard access
   - `PORT` — server port (default 3000)
   - `DB_PATH` — SQLite database path

## Run (local server)
```sh
npm run server
```

Open the dashboard in your browser and authenticate when prompted:
```
http://localhost:3000
```

## Notes
- JavaScript is ES5-only for iOS 12 compatibility.
- Data is stored in `localStorage` under the key `familyDashboardData`.
- The server stores a single JSON row in SQLite and supports:
  - `GET /api/data`
  - `POST /api/data` (replace)
  - `PATCH /api/data` (partial merge)
