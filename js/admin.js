// Handle file upload
async function uploadFiles() {
    const fileInput = document.getElementById('file-upload');
    const statusDiv = document.getElementById('upload-status');
    
    if (!fileInput) {
        alert('File input not found');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select PDF files to upload');
        return;
    }

    // Show selected files
    const fileNames = Array.from(fileInput.files).map(f => f.name).join(', ');
    statusDiv.innerHTML = `<p>Selected: ${fileNames}</p><p>Uploading and parsing PDFs...</p>`;

    try {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }

        console.log('Uploading files:', Array.from(fileInput.files).map(f => f.name));

        const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            let errorMsg = 'Upload failed';
            try {
                const error = await response.json();
                errorMsg = error.error || error.details || 'Upload failed';
            } catch (e) {
                errorMsg = `Server returned ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        
        let html = `<p style="color: green;">✓ Successfully processed ${result.processed} file(s)</p>`;
        html += '<ul style="text-align: left; margin-top: 10px;">';
        
        for (const fileResult of result.results) {
            if (fileResult.success) {
                html += `<li><strong>${fileResult.filename}</strong>: Extracted ${fileResult.extracted} office hour(s)`;
                if (fileResult.metadata?.course_code) {
                    html += ` (${fileResult.metadata.course_code} - ${fileResult.metadata.professor || 'Unknown'})`;
                }
                html += '</li>';
            } else {
                html += `<li style="color: red;"><strong>${fileResult.filename}</strong>: Error - ${fileResult.error}</li>`;
            }
        }
        html += '</ul>';
        html += '<p><small>Page will refresh in 2 seconds...</small></p>';
        
        statusDiv.innerHTML = html;
        
        // Refresh page after 2 seconds to show new data
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (err) {
        let errorMsg = err.message;
        if (err.message === 'Failed to fetch') {
            errorMsg = 'Failed to connect to server. Make sure the server is running on http://localhost:3000';
        }
        statusDiv.innerHTML = `<p style="color: #374151;">✗ Upload failed: ${errorMsg}</p><p><small>Check browser console (F12) for details.</small></p>`;
        console.error('Upload error:', err);
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data.error || data.details || `API ${method} ${path} failed: ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

function profinderIsSuperAdmin() {
    try {
        return sessionStorage.getItem('profinder_is_super_admin') === 'true';
    } catch (e) {
        return false;
    }
}

// Add manual entry
async function addManualEntry(event) {
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
    
    // Save to database via API
    await apiJson('/api/office-hours', 'POST', {
        professor: formData.professor,
        course_code: formData.courseCode,
        course_name: formData.courseName,
        day_name: dayAbbrMap[formData.day] || formData.day,
        start_time: formData.startTime,
        end_time: formData.endTime,
        location: formData.location,
        email: formData.email,
        notes: null
    });
    
    // Reset form
    form.reset();
    
    alert('Office hour added successfully!');
    
    // Refresh filters if on another page
    if (typeof initializeFilters === 'function') {
        await initializeFilters();
    }
}

// Refresh database
async function refreshDatabase() {
    const statusDiv = document.getElementById('db-status');
    statusDiv.innerHTML = '<p>Refreshing database...</p>';
    
    try {
        // Reload the page to refresh all data from the database
        window.location.reload();
    } catch (err) {
        statusDiv.innerHTML = '<p style="color: red;">✗ Failed to refresh database</p>';
        console.error(err);
    }
}

// Export data
async function exportData() {
    const rows = await apiGet('/api/export');
    const dataStr = JSON.stringify(rows, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'office-hours-data.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Clear database
async function clearDatabase() {
    const isSuper = profinderIsSuperAdmin();
    const confirmMsg = isSuper
        ? 'Clear ALL office hours and (if present) related courses and professors? This cannot be undone.'
        : 'Remove only the office hours you uploaded (outlines and manual entries)? Other data stays.';
    if (!confirm(confirmMsg)) return;
    try {
        const result = await apiJson('/api/office-hours', 'DELETE', {});
        const d = result.deleted || {};
        const n = d.officeHours != null ? d.officeHours : 0;
        if (d.scope === 'own_uploads') {
            alert(`Removed ${n} office hour row(s) that you had uploaded.`);
        } else {
            alert(`Full clear done. Removed ${n} office hour row(s) (and related tables where applicable).`);
        }
        window.location.reload();
    } catch (err) {
        alert(err?.message || 'Failed to clear. Check console for details.');
        console.error('Clear database error:', err);
    }
}

// Toggle auto-update
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

// Trigger manual update
function triggerManualUpdate() {
    alert('Manual update triggered. (In a real implementation, this would fetch new course outlines and update the database.)');
    if (typeof refreshDatabase === 'function') {
        refreshDatabase();
    }
}

