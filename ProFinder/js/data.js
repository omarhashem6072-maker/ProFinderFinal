// Office Hours Data (matching database table structure) — empty until loaded from API or admin.
let officeHoursData = [];

// Get all unique professors
function getProfessors() {
    return [...new Set(officeHoursData.map(oh => oh.professor))].sort();
}

// Get all unique courses
function getCourses() {
    return [...new Set(officeHoursData.map(oh => oh.course_code))].sort();
}

// Helper function to convert day_name to full day name for filtering
function getFullDayName(dayName) {
    const dayMap = {
        'Mon': 'Monday',
        'Tue': 'Tuesday',
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
    };
    return dayMap[dayName] || dayName;
}

// Filter office hours based on criteria
function filterOfficeHours(filters) {
    let filtered = [...officeHoursData];

    if (filters.professor) {
        filtered = filtered.filter(oh => oh.professor === filters.professor);
    }

    if (filters.course) {
        filtered = filtered.filter(oh => oh.course_code === filters.course);
    }

    if (filters.days && filters.days.length > 0) {
        // Convert full day names to abbreviations for comparison
        const dayAbbrMap = {
            'Monday': 'Mon',
            'Tuesday': 'Tue',
            'Wednesday': 'Wed',
            'Thursday': 'Thu',
            'Friday': 'Fri',
            'Saturday': 'Sat',
            'Sunday': 'Sun'
        };
        const dayAbbrs = filters.days.map(d => dayAbbrMap[d] || d);
        filtered = filtered.filter(oh => dayAbbrs.includes(oh.day_name));
    }

    if (filters.timeFrom) {
        filtered = filtered.filter(oh => oh.start_time >= filters.timeFrom);
    }

    if (filters.timeTo) {
        filtered = filtered.filter(oh => oh.end_time <= filters.timeTo);
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(oh => 
            oh.professor.toLowerCase().includes(searchLower) ||
            oh.course_code.toLowerCase().includes(searchLower) ||
            oh.course_name.toLowerCase().includes(searchLower) ||
            (oh.notes && oh.notes.toLowerCase().includes(searchLower))
        );
    }

    return filtered;
}

// Get upcoming office hours (next 48 hours)
function getUpcomingOfficeHours() {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];
    const tomorrow = dayNames[(now.getDay() + 1) % 7];
    
    return officeHoursData.filter(oh => {
        return oh.day_name === today || oh.day_name === tomorrow;
    }).slice(0, 6); // Limit to 6 results
}

