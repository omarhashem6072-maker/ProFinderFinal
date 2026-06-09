// Data layer (MySQL-backed via the local API server)
// The UI calls these functions; no hard-coded office hours live in the browser anymore.

async function apiGet(path) {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`API GET ${path} failed: ${res.status}`);
    return await res.json();
}

async function apiJson(path, method, body) {
    const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
    return await res.json();
}

// Get all unique professors
async function getProfessors() {
    return await apiGet('/api/professors');
}

// Get all unique courses
async function getCourses() {
    return await apiGet('/api/courses');
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
async function filterOfficeHours(filters) {
    const params = new URLSearchParams();
    if (filters.professor) params.set('professor', filters.professor);
    if (filters.course) params.set('course', filters.course);
    if (filters.days && filters.days.length > 0) {
        // Send full day names; API normalizes to Mon/Tue/etc
        params.set('days', filters.days.join(','));
    }
    if (filters.timeFrom) params.set('timeFrom', filters.timeFrom);
    if (filters.timeTo) params.set('timeTo', filters.timeTo);
    if (filters.search) params.set('search', filters.search);

    // Pull a large enough set for the demo; UI paginates client-side.
    params.set('limit', '1000');
    params.set('offset', '0');

    const qs = params.toString();
    return await apiGet(`/api/office-hours${qs ? `?${qs}` : ''}`);
}

// Get upcoming office hours (next 48 hours)
async function getUpcomingOfficeHours() {
    return await apiGet('/api/office-hours/upcoming?limit=6');
}

