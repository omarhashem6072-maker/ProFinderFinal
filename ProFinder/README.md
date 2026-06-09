# Profinder - Automated Office Hour Board

## Project Overview

Profinder is an automated office hour aggregator that displays professor availability, helping students quickly find when professors are available. The system extracts office hour information from course outlines, stores it in a searchable database, and displays it on a web dashboard or physical e-ink display.

## Project Structure

```
skeleton project/
├── ARCHITECTURE.md          # System architecture diagram
├── README.md                # Project documentation
├── data-extraction/         # Student A: Data extraction module
│   ├── parsers/
│   ├── extractors/
│   └── validators/
├── database/                # Student B: Database schema and logic
│   ├── schema.sql
│   ├── models/
│   └── queries/
├── display-interface/       # Student C: Display interface
│   ├── web-dashboard/
│   └── hardware/            # E-ink display (optional)
├── api/                     # Student D: Integration and API
│   ├── routes/
│   ├── services/
│   └── scheduler/
└── tests/                   # Integration tests
```

## Features

1. ✅ Extract office hour information from PDFs and spreadsheets
2. ✅ Store schedules in a searchable database
3. ✅ Display aggregated office hours on web dashboard
4. ✅ Filter by professor or course
5. ✅ Support weekly updates when schedules change
6. 🔄 Optional: Notification system for upcoming office hours

## Team Responsibilities

- **Student A**: Data extraction and parsing
- **Student B**: Database schema and logic
- **Student C**: Display interface (web/hardware)
- **Student D**: Integration, testing, and coordination

## Getting Started

See ARCHITECTURE.md for the complete system architecture diagram.

## Development Phases

1. **Phase 1**: Data extraction and database setup
2. **Phase 2**: Basic web dashboard
3. **Phase 3**: Filtering and search functionality
4. **Phase 4**: Automated updates and scheduling
5. **Phase 5**: Optional features (notifications, e-ink display)




