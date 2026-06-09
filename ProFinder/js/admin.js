// Handle file upload
function uploadFiles() {
    const fileInput = document.getElementById('file-upload');
    const statusDiv = document.getElementById('upload-status');
    
    if (!fileInput || !fileInput.files.length) {
        alert('Please select files to upload');
        return;
    }

    statusDiv.innerHTML = '<p>Uploading files... </p>';
    
    // Simulate upload
    setTimeout(() => {
        statusDiv.innerHTML = `<p style="color: green;">✓ Successfully uploaded ${fileInput.files.length} file(s)</p>
                               <p><small>Note: In a real implementation, files would be parsed and data extracted.</small></p>`;
    }, 1500);
}

function addManualEntry(event) {
    event.preventDefault();
    
    const form = document.getElementById('manual-entry-form');
    const formData = {
        professor: document.getElementById('prof-name').value,
        courseCode: document.getElementById('course-code').value,
        courseName: document.getElementById('course-name').value,
        day: document.getElementById('day').value,
        startTime: document.getElementById('time-start').value,
        endTime: document.getElementById('time-end').value,
        location: document.getElementById('location').value,
        email: (document.getElementById('email')?.value || '').trim().toLowerCase() || null
    };

    // Convert full day name to abbreviation
    const dayAbbrMap = {
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Saturday': 'Sat',
        'Sunday': 'Sun'
    };
    
    // Add to data
    const newEntry = {
        id: officeHoursData.length + 1,
        professor: formData.professor,
        course_code: formData.courseCode,
        course_name: formData.courseName,
        day_name: dayAbbrMap[formData.day] || formData.day,
        start_time: formData.startTime,
        end_time: formData.endTime,
        location: formData.location,
        email: formData.email,
        notes: null
    };

    officeHoursData.push(newEntry);
    form.reset();
    alert('Office hour added successfully!');
    if (typeof initializeFilters === 'function') {
        initializeFilters();
    }
}

function refreshDatabase() {
    const statusDiv = document.getElementById('db-status');
    statusDiv.innerHTML = '<p>Refreshing database...</p>';
    
    setTimeout(() => {
        statusDiv.innerHTML = '<p style="color: green;">✓ Database refreshed successfully</p>';
        if (typeof updateStats === 'function') {
            updateStats();
        }
    }, 1000);
}

// Export data
function exportData() {
    const dataStr = JSON.stringify(officeHoursData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'office-hours-data.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Clear database
function clearDatabase() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        officeHoursData = [];
        alert('Database cleared. ');
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
    }
}

(function initWelcome() {
    if (typeof window.refreshProfinderWelcomeBanner === 'function') {
        window.refreshProfinderWelcomeBanner();
    } else {
        const el = document.getElementById('welcome-name');
        if (!el) return;
        let first = null;
        try { first = sessionStorage.getItem('profinder_admin_first_name'); } catch (e) {}
        el.textContent = first ? `, ${first}` : '';
    }
})();

function toggleAutoUpdate() {
    const checkbox = document.getElementById('auto-update');
    const nextUpdate = document.getElementById('next-update');
    
    if (checkbox.checked) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextUpdate.textContent = nextWeek.toLocaleDateString();
    } else {
        nextUpdate.textContent = 'Not scheduled';
    }
}

function triggerManualUpdate() {
    alert('Manual update triggered.');
    if (typeof refreshDatabase === 'function') {
        refreshDatabase();
    }
}