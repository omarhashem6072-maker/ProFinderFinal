# How to Run the Profinder Website

## Recommended: Run with MySQL (Full Version)

This project now loads data from a **MySQL 8.0** database via a small local API server.

### Prerequisites

- MySQL Community Edition 8.0 running locally
- Node.js (recommended: 18+)

### 1) Configure DB connection

1. In `server/`, copy `server/.env.example` to `server/.env`
2. Edit `server/.env` and set:
   - `PROFINDER_DB_USER`
   - `PROFINDER_DB_PASSWORD`
   - `PROFINDER_DB_HOST` / `PROFINDER_DB_PORT` (if not default)
   - `PROFINDER_DB_NAME` (default `profinder`)

### 2) Install server dependencies + create tables + seed data

Open PowerShell in the project folder and run:

```bash
cd server
npm install
npm run db:init
```

### 3) Start the server (serves both the website + API)

```bash
cd server
npm start
```

Then open: `http://localhost:3000`

## Quick Start (Frontend Only / Not Recommended)

### Option 1: Open Directly in Browser
1. Simply double-click on `index.html` in your file explorer
2. The website will open in your default web browser
3. Navigate between pages using the navigation menu

### Option 2: Using a Local Server (Recommended)

#### Using Python (if installed):
1. Open PowerShell or Command Prompt in the project folder
2. Run one of these commands:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

3. Open your browser and go to: `http://localhost:8000`

#### Using Node.js (if installed):
1. Install a simple HTTP server:
```bash
npx http-server
```

2. Open your browser and go to the URL shown (usually `http://localhost:8080`)

#### Using VS Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Project Structure

```
skeleton project/
├── index.html              # Home page
├── office-hours.html       # Office hours list page
├── calendar.html           # Calendar view page
├── admin.html              # Admin panel
├── css/
│   └── styles.css          # All styling
├── js/
│   ├── data.js             # Data layer (calls the API)
│   ├── app.js              # Main application logic
│   ├── calendar.js         # Calendar functionality
│   └── admin.js            # Admin panel functionality
├── server/                 # Express API server (MySQL-backed)
└── HOW_TO_RUN.md          # This file
```

## Features

✅ **Home Page** - Shows upcoming office hours and statistics
✅ **Office Hours List** - View all office hours with filtering
✅ **Calendar View** - Weekly calendar display
✅ **Admin Panel** - Upload files and manage data
✅ **Search & Filter** - Filter by professor, course, day, time
✅ **Responsive Design** - Works on desktop, tablet, and mobile

## Notes

- The website expects the API server to be running (see “Recommended: Run with MySQL” above).
- File uploads in the admin panel are still simulated (not actually processed), but **manual entry / export / clear** now talk to the database.

## Troubleshooting

**If pages don't load:**
- Make sure all files are in the correct folders
- Check browser console for errors (F12)
- Try using a local server instead of opening files directly

**If styles don't appear:**
- Check that `css/styles.css` exists
- Verify file paths in HTML files are correct

**If JavaScript doesn't work:**
- Check browser console for errors (F12)
- Make sure all JS files are in the `js/` folder
- Verify scripts are loaded in the correct order

## Next Steps for Full Implementation

1. **Authentication** - Protect admin endpoints
2. **Database** - Add separate `professors` / `courses` tables (normalized schema)
3. **File Parsing** - Implement PDF/Excel parsing (Student A's task)
4. **Database Schema** - Create proper database tables (Student B's task)
5. **E-ink Display** - Add hardware display option (optional)
6. **Notifications** - Implement notification system (optional)




