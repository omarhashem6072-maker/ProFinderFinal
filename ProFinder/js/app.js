// Global variables
let currentPage = 1;
const itemsPerPage = 9;
let currentView = 'cards';
let currentEditOriginal = null;
let currentFilters = {
    professor: '',
    course: '',
    days: [],
    timeFrom: '',
    timeTo: '',
    search: ''
};

function isBoilerplateOfficeHoursNote(notes) {
    const s = String(notes ?? "").trim().toLowerCase().replace(/\u2014|\u2013/g, "-");
    if (!s) return false;
    if (s === "office hours: tba" || s === "office hours: tbd") return true;
    if (s.startsWith("no office hours detected")) return true;
    return false;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeFilters();
    loadPageContent();
    updateStats();
});

// Initialize filter dropdowns
function initializeFilters() {
    const professorFilter = document.getElementById('professor-filter');
    const courseFilter = document.getElementById('course-filter');

    if (professorFilter) {
        const professors = getProfessors();
        professors.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof;
            option.textContent = prof;
            professorFilter.appendChild(option);
        });
    }

    if (courseFilter) {
        const courses = getCourses();
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course;
            option.textContent = course;
            courseFilter.appendChild(option);
        });
    }
}

// Load page-specific content
function loadPageContent() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    if (page === 'index.html' || page === '') {
        loadHomePage();
    } else if (page === 'office-hours.html') {
        loadOfficeHoursPage();
    } else if (page === 'calendar.html') {
        loadCalendarPage();
    }
}

// Load home page content
function loadHomePage() {
    const upcomingContainer = document.getElementById('upcoming-hours');
    if (upcomingContainer) {
        const upcoming = getUpcomingOfficeHours();
        displayOfficeHours(upcoming, upcomingContainer);
    }

    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString();
    }
}


function loadOfficeHoursPage() {
    applyFilters();
}


function loadCalendarPage() {
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
}

// Update statistics
function updateStats() {
    const totalProfessors = document.getElementById('total-professors');
    const activeToday = document.getElementById('active-today');
    const upcomingCount = document.getElementById('upcoming-count');

    if (totalProfessors) {
        totalProfessors.textContent = getProfessors().length;
    }

    if (activeToday) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = dayNames[new Date().getDay()];
        const todayHours = officeHoursData.filter(oh => oh.day_name === today).length;
        activeToday.textContent = todayHours;
    }

    if (upcomingCount) {
        upcomingCount.textContent = getUpcomingOfficeHours().length;
    }
}

// Apply filters
function applyFilters() {
    // Get filter values
    const professorFilter = document.getElementById('professor-filter');
    const courseFilter = document.getElementById('course-filter');
    const dayCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
    const timeFrom = document.getElementById('time-from');
    const timeTo = document.getElementById('time-to');
    const searchInput = document.getElementById('global-search');

    currentFilters = {
        professor: professorFilter ? professorFilter.value : '',
        course: courseFilter ? courseFilter.value : '',
        days: Array.from(dayCheckboxes).map(cb => cb.value),
        timeFrom: timeFrom ? timeFrom.value : '',
        timeTo: timeTo ? timeTo.value : '',
        search: searchInput ? searchInput.value : ''
    };


    const filtered = filterOfficeHours(currentFilters);

    
    displayActiveFilters();

    // Display results
    const container = document.getElementById('office-hours-container') || 
                     document.getElementById('upcoming-hours');
    if (container) {
        if (currentView === 'cards') {
            displayOfficeHours(filtered, container);
        } else {
            displayOfficeHoursTable(filtered, container);
        }
    }

    
    updatePagination(filtered.length);
}

// Display office hours as cards
function displayOfficeHours(hours, container) {
    container.innerHTML = '';

    if (hours.length === 0) {
        container.innerHTML = '<p>No office hours found matching your filters.</p>';
        return;
    }

    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedHours = hours.slice(start, end);

    paginatedHours.forEach(hour => {
        const card = document.createElement('div');
        card.className = 'office-hour-card';
        card.onclick = () => handleHourClick(hour);
        
        const isTba = hour.notes && (hour.notes.includes('Office hours: TBA') || hour.notes.includes('No office hours detected'));
        const dayDisplay = isTba ? 'TBA' : hour.day_name;
        const timeDisplay = isTba ? 'TBA' : `${formatTime(hour.start_time)} - ${formatTime(hour.end_time)}`;
        const contactHtml = hour.email
            ? `<a href="mailto:${hour.email}?subject=${encodeURIComponent(`Office hours inquiry: ${hour.course_code}`)}" onclick="event.stopPropagation()" style="display:inline-block; margin-top:0.75rem; padding:0.4rem 0.7rem; background:#4a90e2; color:#fff; border-radius:4px; text-decoration:none; font-size:0.85rem;">Contact</a>`
            : '';
        const notesHtml =
            hour.notes && !isBoilerplateOfficeHoursNote(hour.notes)
                ? `<div class="info">📝 ${hour.notes}</div>`
                : "";
        card.innerHTML = `
            <h3>${hour.professor}</h3>
            <div class="course">${hour.course_code} - ${hour.course_name}</div>
            <div class="info">📅 ${dayDisplay}</div>
            <div class="info">⏰ ${timeDisplay}</div>
            <div class="info">📍 ${hour.location}</div>
            ${notesHtml}
            ${contactHtml}
        `;
        
        container.appendChild(card);
    });
}

// Display office hours as table
function displayOfficeHoursTable(hours, container) {
    container.innerHTML = '';

    if (hours.length === 0) {
        container.innerHTML = '<p>No office hours found matching your filters.</p>';
        return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '0.85rem';
    table.innerHTML = `
        <thead>
            <tr style="background-color: #4a90e2; color: white;">
                <th style="padding: 0.45rem 0.5rem; text-align: left;">Professor</th>
                <th style="padding: 0.45rem 0.5rem; text-align: left;">Course</th>
                <th style="padding: 0.45rem 0.5rem; text-align: left;">Day</th>
                <th style="padding: 0.45rem 0.5rem; text-align: left;">Time</th>
                <th style="padding: 0.45rem 0.5rem; text-align: left;">Location</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    hours.forEach(hour => {
        const isTba = hour.notes && (hour.notes.includes('Office hours: TBA') || hour.notes.includes('No office hours detected'));
        const dayDisplay = isTba ? 'TBA' : hour.day_name;
        const timeDisplay = isTba ? 'TBA' : `${formatTime(hour.start_time)} - ${formatTime(hour.end_time)}`;
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #ddd';
        tr.style.cursor = 'pointer';
        tr.onclick = () => handleHourClick(hour);
        tr.innerHTML = `
            <td style="padding: 0.45rem 0.5rem;">${hour.professor}</td>
            <td style="padding: 0.45rem 0.5rem;">${hour.course_code} - ${hour.course_name}</td>
            <td style="padding: 0.45rem 0.5rem;">${dayDisplay}</td>
            <td style="padding: 0.45rem 0.5rem;">${timeDisplay}</td>
            <td style="padding: 0.45rem 0.5rem;">${hour.location}</td>
        `;
        tbody.appendChild(tr);
    });
    container.appendChild(table);
}

// Display active filters
function displayActiveFilters() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;

    activeFiltersContainer.innerHTML = '';

    if (currentFilters.professor) {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `Professor: ${currentFilters.professor}`;
        activeFiltersContainer.appendChild(tag);
    }

    if (currentFilters.course) {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `Course: ${currentFilters.course}`;
        activeFiltersContainer.appendChild(tag);
    }

    if (currentFilters.days.length > 0) {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `Days: ${currentFilters.days.join(', ')}`;
        activeFiltersContainer.appendChild(tag);
    }

    if (currentFilters.search) {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `Search: ${currentFilters.search}`;
        activeFiltersContainer.appendChild(tag);
    }
}

// Clear all filters
function clearFilters() {
    const professorFilter = document.getElementById('professor-filter');
    const courseFilter = document.getElementById('course-filter');
    const dayCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    const timeFrom = document.getElementById('time-from');
    const timeTo = document.getElementById('time-to');
    const searchInput = document.getElementById('global-search');

    if (professorFilter) professorFilter.value = '';
    if (courseFilter) courseFilter.value = '';
    dayCheckboxes.forEach(cb => cb.checked = false);
    if (timeFrom) timeFrom.value = '';
    if (timeTo) timeTo.value = '';
    if (searchInput) searchInput.value = '';

    currentFilters = {
        professor: '',
        course: '',
        days: [],
        timeFrom: '',
        timeTo: '',
        search: ''
    };

    applyFilters();
}


function handleSearch() {
    applyFilters();
}

// Set view mode
function setView(view, ev) {
    currentView = view;
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => btn.classList.remove('active'));
    if (ev && ev.target) ev.target.classList.add('active');
    applyFilters();
}

// Change page
function changePage(direction) {
    const filtered = filterOfficeHours(currentFilters);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    applyFilters();
}

// Update pagination info
function updatePagination(totalItems) {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    }
}

// Format time
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function handleHourClick(hour) {
    if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) {
        openEditModal(hour);
    }
}

function openEditModal(hour) {
    if (!hour) return;
    let modal = document.getElementById('edit-office-hour-modal');
    if (modal && modal.getAttribute('data-modal-layout') !== 'scroll-backdrop') {
        modal.remove();
        modal = null;
    }
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-office-hour-modal';
        modal.setAttribute('data-modal-layout', 'scroll-backdrop');
        modal.style.cssText =
            'display:none; position:fixed; left:0; top:0; right:0; bottom:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding:12px; box-sizing:border-box; background:rgba(0,0,0,0.5); z-index:9999;';
        modal.innerHTML = `
            <div style="max-width:340px; width:100%; margin:12px auto 24px; background:white; padding:0.75rem 0.85rem; border-radius:6px; box-sizing:border-box; font-size:13px; line-height:1.35; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
                <h3 style="margin:0 0 0.5rem; font-size:0.95rem;">Edit Office Hour</h3>
                <form id="edit-office-hour-form">
                    <input type="hidden" id="edit-oh-id">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Professor</label>
                    <input type="text" id="edit-oh-professor" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Course code</label>
                    <input type="text" id="edit-oh-course-code" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Course name</label>
                    <input type="text" id="edit-oh-course-name" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Day</label>
                    <select id="edit-oh-day" style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                        <option value="Mon">Monday</option><option value="Tue">Tuesday</option><option value="Wed">Wednesday</option>
                        <option value="Thu">Thursday</option><option value="Fri">Friday</option><option value="Sat">Saturday</option><option value="Sun">Sunday</option>
                    </select>
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Start time (HH:MM)</label>
                    <input type="text" id="edit-oh-start" placeholder="09:00" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">End time (HH:MM)</label>
                    <input type="text" id="edit-oh-end" placeholder="17:00" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Location</label>
                    <input type="text" id="edit-oh-location" required style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Email</label>
                    <input type="email" id="edit-oh-email" placeholder="professor@torontomu.ca" style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.45rem; box-sizing:border-box; font-size:13px;">
                    <label style="display:block; margin-bottom:0.12rem; font-size:12px;">Notes (optional)</label>
                    <input type="text" id="edit-oh-notes" style="width:100%; padding:0.3rem 0.45rem; margin-bottom:0.55rem; box-sizing:border-box; font-size:13px;">
                    <div style="display:flex; gap:0.4rem; justify-content:flex-end;">
                        <button type="button" id="edit-oh-cancel" style="padding:0.35rem 0.75rem; font-size:13px;">Cancel</button>
                        <button type="submit" id="edit-oh-save" style="padding:0.35rem 0.75rem; font-size:13px; background:#4a90e2; color:white; border:none; border-radius:4px;">Save</button>
                    </div>
                </form>
            </div>
        `;
        modal.style.display = 'block';
        document.body.appendChild(modal);
        document.getElementById('edit-office-hour-form').onsubmit = (e) => {
            e.preventDefault();
            saveEditOfficeHour();
        };
        document.getElementById('edit-oh-cancel').onclick = () => { modal.style.display = 'none'; };
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }
    const hasId = !!(hour.id != null && hour.id !== '');
    currentEditOriginal = {
        professor: hour.professor || '',
        course_code: hour.course_code || '',
        day_name: hour.day_name || '',
        start_time: hour.start_time || '',
        end_time: hour.end_time || '',
        location: hour.location || ''
    };
    document.getElementById('edit-oh-id').value = hour.id != null ? hour.id : '';
    // no banner
    const saveBtn = document.getElementById('edit-oh-save');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    }
    document.getElementById('edit-oh-professor').value = hour.professor || '';
    document.getElementById('edit-oh-course-code').value = hour.course_code || '';
    document.getElementById('edit-oh-course-name').value = hour.course_name || '';
    document.getElementById('edit-oh-day').value = hour.day_name || 'Mon';
    document.getElementById('edit-oh-start').value = hour.start_time || '';
    document.getElementById('edit-oh-end').value = hour.end_time || '';
    document.getElementById('edit-oh-location').value = hour.location || '';
    document.getElementById('edit-oh-email').value = hour.email || '';
    document.getElementById('edit-oh-notes').value = hour.notes || '';
    modal.style.display = 'block';
}

async function saveEditOfficeHour() {
    const idRaw = (document.getElementById('edit-oh-id').value || '').toString().trim();
    const id = /^\d+$/.test(idRaw) && Number(idRaw) > 0 ? idRaw : '';
    const base = (typeof getApiBase === 'function') ? getApiBase() : '';
    const body = {
        professor: document.getElementById('edit-oh-professor').value.trim(),
        course_code: document.getElementById('edit-oh-course-code').value.trim(),
        course_name: document.getElementById('edit-oh-course-name').value.trim(),
        day_name: document.getElementById('edit-oh-day').value,
        start_time: document.getElementById('edit-oh-start').value.trim(),
        end_time: document.getElementById('edit-oh-end').value.trim(),
        location: document.getElementById('edit-oh-location').value.trim(),
        email: document.getElementById('edit-oh-email').value.trim().toLowerCase() || null,
        notes: document.getElementById('edit-oh-notes').value.trim() || null
    };
    try {
        const url = id ? (base + '/api/office-hours/' + id) : (base + '/api/office-hours/by-match');
        const payload = id ? body : { original: currentEditOriginal || {}, updates: body };
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (!res.ok) {
            let msg = 'Update failed';
            try {
                const j = await res.json();
                msg = j?.error || j?.details || msg;
            } catch (e) {}
            throw new Error(msg);
        }
        document.getElementById('edit-office-hour-modal').style.display = 'none';
        applyFilters();
        if (typeof updateStats === 'function') updateStats();
    } catch (err) {
        alert(err?.message || 'Failed to update.');
    }
}


function viewProfessorDetail(professorName) {
    // Placeholder kept intentionally; card click no longer uses this.
    return;
}

