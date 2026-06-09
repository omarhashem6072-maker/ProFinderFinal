# Profinder Web Dashboard - Website Skeleton Diagram

## Page Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER                                │
│  [Logo]  [Search Bar]              [Nav Menu]           │
├──────────┬──────────────────────────────────────────────┤
│          │                                               │
│ SIDEBAR  │            MAIN CONTENT AREA                  │
│          │                                               │
│ Filters: │  ┌─────────────────────────────────────┐     │
│          │  │                                     │     │
│ • Prof   │  │   Office Hours Display              │     │
│ • Course │  │   (Cards/Table/Calendar)            │     │
│ • Time   │  │                                     │     │
│ • Day    │  │                                     │     │
│          │  │                                     │     │
│ [Clear]  │  └─────────────────────────────────────┘     │
│          │                                               │
├──────────┴──────────────────────────────────────────────┤
│                    FOOTER                                │
└─────────────────────────────────────────────────────────┘
```

## Website Structure & Layout

```mermaid
graph TB
    subgraph "Main Layout"
        HEADER[Header/Navigation Bar]
        SIDEBAR[Sidebar Filters]
        MAIN[Main Content Area]
        FOOTER[Footer]
    end

    subgraph "Header Components"
        LOGO[Profinder Logo]
        SEARCH[Global Search Bar]
        NAV[Navigation Menu]
    end

    subgraph "Sidebar Filter Panel"
        PROF_FILTER[Filter by Professor]
        COURSE_FILTER[Filter by Course]
        TIME_FILTER[Filter by Time/Date]
        DAY_FILTER[Filter by Day of Week]
        CLEAR[Clear Filters Button]
    end

    subgraph "Main Content Pages"
        HOME[Home/Dashboard Page]
        LIST[Office Hours List View]
        CALENDAR[Calendar View]
        DETAIL[Professor Detail Page]
        ADMIN[Admin Panel]
    end

    subgraph "Office Hours Display Components"
        CARD[Office Hour Card]
        TABLE[Office Hours Table]
        CAL_VIEW[Weekly Calendar Grid]
        UPCOMING[Upcoming Office Hours Widget]
    end

    subgraph "Card Components"
        PROF_NAME[Professor Name]
        COURSE_CODE[Course Code]
        TIME_SLOT[Time Slot]
        LOCATION[Location]
        DAY[Day of Week]
    end

    HEADER --> LOGO
    HEADER --> SEARCH
    HEADER --> NAV
    
    MAIN --> HOME
    MAIN --> LIST
    MAIN --> CALENDAR
    MAIN --> DETAIL
    MAIN --> ADMIN
    
    HOME --> UPCOMING
    HOME --> LIST
    
    LIST --> CARD
    LIST --> TABLE
    
    CALENDAR --> CAL_VIEW
    
    CARD --> PROF_NAME
    CARD --> COURSE_CODE
    CARD --> TIME_SLOT
    CARD --> LOCATION
    CARD --> DAY
    
    SIDEBAR --> PROF_FILTER
    SIDEBAR --> COURSE_FILTER
    SIDEBAR --> TIME_FILTER
    SIDEBAR --> DAY_FILTER
    SIDEBAR --> CLEAR
    
    PROF_FILTER -.-> LIST
    COURSE_FILTER -.-> LIST
    TIME_FILTER -.-> LIST
    DAY_FILTER -.-> LIST
    SEARCH -.-> LIST

    style HEADER fill:#4a90e2
    style MAIN fill:#e8f5e9
    style SIDEBAR fill:#fff4e1
    style CARD fill:#f3e5f5
    style HOME fill:#e1f5ff
```

## Website Pages & Routes

### 1. Home/Dashboard Page (`/`)
- **Components:**
  - Welcome message
  - Upcoming office hours widget (next 24-48 hours)
  - Quick stats (total professors, active office hours today)
  - Quick search bar
  - Recent updates notification

### 2. Office Hours List View (`/office-hours`)
- **Components:**
  - Filterable list of all office hours
  - Sortable table or card grid
  - Pagination
  - Active filters display

### 3. Calendar View (`/calendar`)
- **Components:**
  - Weekly calendar grid
  - Time slots displayed
  - Color-coded by professor or course
  - Click to view details

### 4. Professor Detail Page (`/professor/:id`)
- **Components:**
  - Professor information
  - All office hours for this professor
  - Associated courses
  - Contact information (if available)

### 5. Admin Panel (`/admin`)
- **Components:**
  - File upload interface
  - Manual data entry form
  - Database management
  - Update scheduler controls

## Component Breakdown

### Header Component
```
┌──────────────────────────────────────────────────┐
│ [Profinder Logo]  [Search...]  [Home] [Calendar] │
└──────────────────────────────────────────────────┘
```

### Office Hour Card Component
```
┌─────────────────────────────────────┐
│ Prof. John Smith                    │
│ CS 101 - Introduction to Computing  │
│ 📅 Monday, Wednesday                │
│ ⏰ 2:00 PM - 4:00 PM                │
│ 📍 Room 123, Engineering Building   │
└─────────────────────────────────────┘
```

### Filter Sidebar Component
```
┌─────────────────────┐
│ FILTERS             │
├─────────────────────┤
│ Professor:          │
│ [Dropdown/Select]   │
│                     │
│ Course:             │
│ [Dropdown/Select]   │
│                     │
│ Day:                │
│ ☐ Monday            │
│ ☐ Tuesday           │
│ ☐ Wednesday         │
│ ...                 │
│                     │
│ Time Range:         │
│ [From] [To]         │
│                     │
│ [Clear All Filters] │
└─────────────────────┘
```

## Data Flow in Website

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database

    User->>Frontend: Load Home Page
    Frontend->>API: GET /api/office-hours/upcoming
    API->>Database: Query upcoming office hours
    Database-->>API: Return data
    API-->>Frontend: JSON response
    Frontend-->>User: Display office hours

    User->>Frontend: Apply Filter (Professor)
    Frontend->>API: GET /api/office-hours?professor=Smith
    API->>Database: Filtered query
    Database-->>API: Filtered results
    API-->>Frontend: JSON response
    Frontend-->>User: Update display

    User->>Frontend: Search for "CS 101"
    Frontend->>API: GET /api/office-hours?search=CS101
    API->>Database: Search query
    Database-->>API: Search results
    API-->>Frontend: JSON response
    Frontend-->>User: Display results
```

## Responsive Design Structure

### Desktop View (> 1024px)
- Sidebar filters visible
- Multi-column card layout
- Full calendar view

### Tablet View (768px - 1024px)
- Collapsible sidebar
- 2-column card layout
- Scrollable calendar

### Mobile View (< 768px)
- Hamburger menu for filters
- Single column layout
- Stacked cards
- Simplified calendar view

## Technology Stack for Website

- **Frontend Framework**: React, Vue.js, or vanilla HTML/CSS/JS
- **Styling**: CSS3, Tailwind CSS, or Bootstrap
- **State Management**: React Context/Redux or Vuex
- **HTTP Client**: Axios or Fetch API
- **Routing**: React Router or Vue Router
- **Date Handling**: Moment.js or date-fns
- **Charts/Calendar**: FullCalendar, React Big Calendar, or custom

