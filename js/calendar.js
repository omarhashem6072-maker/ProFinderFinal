let currentWeekStart = new Date();

// Initialize calendar
function loadCalendarPage() {
    renderCalendar();
}

// Render calendar
async function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const weekDisplay = document.getElementById('week-display');
    
    if (!calendarGrid) return;

    // Set current week start to Monday
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(currentWeekStart.setDate(diff));
    
    // Update week display
    if (weekDisplay) {
        weekDisplay.textContent = `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    calendarGrid.innerHTML = '';

    // Load all office hours once from the API (then filter client-side for calendar layout)
    const officeHoursData = await filterOfficeHours({
        professor: '',
        course: '',
        days: [],
        timeFrom: '',
        timeTo: '',
        search: ''
    });

    // Create calendar for each day
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        const dayName = dayNames[i];
        const fullDayName = fullDayNames[i];

        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = `${fullDayName} (${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        dayDiv.appendChild(dayHeader);

        // Get office hours for this day (exclude TBA entries — they don't appear on the calendar)
        const isTba = (oh) => oh.notes && (oh.notes.includes('Office hours: TBA') || oh.notes.includes('No office hours detected'));
        const dayHours = officeHoursData.filter(oh => oh.day_name === dayName && !isTba(oh));
        
        dayHours.forEach(hour => {
            const event = document.createElement('div');
            event.className = 'calendar-event';
            event.onclick = () => handleCalendarEventClick(hour);
            event.innerHTML = `
                <strong>${hour.professor}</strong><br>
                ${hour.course_code}<br>
                ${formatTime(hour.start_time)} - ${formatTime(hour.end_time)}<br>
                <small>${hour.location}</small>
            `;
            dayDiv.appendChild(event);
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// Change week
function changeWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    renderCalendar();
}

// Format time
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function handleCalendarEventClick(hour) {
    if (!hour) return;

    if (hour.email) {
        const subject = encodeURIComponent(`Office hours inquiry: ${hour.course_code || ''}`);
        window.location.href = `mailto:${hour.email}?subject=${subject}`;
        return;
    }

    if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn() && typeof openEditModal === 'function') {
        openEditModal(hour);
    }
}

