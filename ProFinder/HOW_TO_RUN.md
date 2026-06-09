# How to Run the Profinder Website

## Quick Start (Easiest Method)

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
│   ├── data.js             # Mock data and data functions
│   ├── app.js              # Main application logic
│   ├── calendar.js         # Calendar functionality
│   └── admin.js            # Admin panel functionality
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

- This is a **frontend-only** demo with mock data
- All data is stored in `js/data.js` (in-memory, resets on page reload)
- In a real implementation, you would connect to a backend API and database
- File uploads in the admin panel are simulated (not actually processed)

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

1. **Backend API** - Create a REST API (Flask/FastAPI/Express)
2. **Database** - Set up SQLite or PostgreSQL
3. **File Parsing** - Implement PDF/Excel parsing (Student A's task)
4. **Database Schema** - Create proper database tables (Student B's task)
5. **E-ink Display** - Add hardware display option (optional)
6. **Notifications** - Implement notification system (optional)




