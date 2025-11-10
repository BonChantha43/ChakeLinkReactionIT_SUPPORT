// ! សំខាន់៖ សូមប្តូរ URL នេះជាមួយ Web App URL របស់អ្នក!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzR4O1cBeu6a4GZz6-E7pih2Ux0pODp28YRPY62gOG8vSZIyUMb7RYQFpSQJCHGQyNt/exec';

// --- Element References (Daily Tab) ---
const saveBtn = document.getElementById('saveButton');
const captureBtn = document.getElementById('captureButton');
const pdfBtn = document.getElementById('pdfButton');
const statusMsg = document.getElementById('status-message');
const loaderOverlay = document.getElementById('loader-overlay');
const statCompletedEl = document.getElementById('stat-completed');
const statReasonEl = document.getElementById('stat-reason');
const statPendingEl = document.getElementById('stat-pending');
const memberListContainer = document.getElementById('member-list');
const sheetDateDisplay = document.getElementById('sheet-date-display');
const captureArea = document.getElementById('capture-area');

// --- Element References (New Tabs) ---
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const reportMonthSelect = document.getElementById('month-select');
const reportYearInput = document.getElementById('year-input');
const generateReportBtn = document.getElementById('generateReportBtn');
const reportOutputContainer = document.getElementById('report-output');
const reportStatusMsg = document.getElementById('report-status-message');
const deleteDateInput = document.getElementById('delete-date-input');
const deleteDayBtn = document.getElementById('deleteDayBtn');
const deleteMonthInput = document.getElementById('delete-month-input');
const deleteMonthBtn = document.getElementById('deleteMonthBtn');
const adminStatusMsg = document.getElementById('admin-status-message');

const reportCaptureArea = document.getElementById('report-capture-area');
const reportActionButtons = document.getElementById('report-action-buttons');
const reportPdfBtn = document.getElementById('reportPdfButton');
const reportCaptureBtn = document.getElementById('reportCaptureButton');

const showLoader = () => loaderOverlay.classList.add('visible');
const hideLoader = () => loaderOverlay.classList.remove('visible');

// --- Tab Switching Logic ---
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Deactivate all
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });

        // Activate clicked
        tab.classList.add('active');
        const activeContent = document.getElementById(`${tabName}-content`);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'block';
        }
    });
});

// --- Core Daily Functions (Unchanged) ---
function updateGlobalStats() {
    const allMemberCards = document.querySelectorAll('.member-card');
    let completed = 0, reason = 0, pending = 0;
    
    allMemberCards.forEach(card => {
        const status = card.querySelector('.member-name').dataset.status;
        if (status === 'completed') completed++;
        else if (status === 'reason') reason++;
        else pending++;
    });
    
    statCompletedEl.innerHTML = `<i class="fa-solid fa-user-check"></i> ${completed}`;
    statReasonEl.innerHTML = `<i class="fa-solid fa-file-circle-exclamation"></i> ${reason}`;
    statPendingEl.innerHTML = `<i class="fa-solid fa-user-clock"></i> ${pending}`;
}

function updateRowState(changedElement) {
    const memberCard = changedElement.closest('.member-card');
    if (!memberCard) return;
    
    const memberNameDiv = memberCard.querySelector('.member-name');
    const statusIcon = memberCard.querySelector('.member-status-icon');
    const countInput = memberCard.querySelector('.video-count-input');
    const reasonInput = memberCard.querySelector('.reason-input');
    const count = parseInt(countInput.value) || 0;
    const reason = reasonInput.value.trim();
    
    let newStatus = 'pending', newIconClass = 'fa-regular fa-hourglass-half';

    if (count > 0) {
        newStatus = 'completed'; newIconClass = 'fa-solid fa-circle-check';
    } else if (reason !== '') {
        newStatus = 'reason'; newIconClass = 'fa-solid fa-circle-exclamation';
    }
    
    memberNameDiv.className = 'member-name';
    memberNameDiv.classList.add(newStatus);
    memberNameDiv.dataset.status = newStatus;

    statusIcon.className = `member-status-icon ${newIconClass}`;
    updateGlobalStats();
}

function updateTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${timeString}`;
    }
}

function trackChanges(event) {
    const memberCard = event.target.closest('.member-card');
    if (memberCard && !memberCard.classList.contains('has-changes')) {
        memberCard.classList.add('has-changes');
        saveBtn.disabled = false;
    }
}

function updateLinkInputs(event) {
    const countInput = event.target;
    const newCount = Math.max(0, parseInt(countInput.value) || 0);
    countInput.value = newCount;

    const memberCard = countInput.closest('.member-card');
    const linksContainer = memberCard.querySelector('.links-container');
    const currentCount = linksContainer.querySelectorAll('.link-input').length;

    if (newCount > currentCount) {
        for (let i = currentCount; i < newCount; i++) {
            const newLinkInput = document.createElement('input');
            newLinkInput.type = 'text';
            newLinkInput.className = 'link-input';
            newLinkInput.placeholder = 'Link ' + (i + 1);
            newLinkInput.addEventListener('input', trackChanges);
            linksContainer.appendChild(newLinkInput);
        }
    } else if (newCount < currentCount) {
        for (let i = currentCount; i > newCount; i--) {
            linksContainer.removeChild(linksContainer.lastChild);
        }
    }
}

function createMemberCardHTML(member, index) {
    const countNum = parseInt(member.videoCount) || 0;
    const reasonText = member.reason || '';
    let status = 'pending', iconClass = 'fa-regular fa-hourglass-half';

    if (countNum > 0) {
        status = 'completed'; iconClass = 'fa-solid fa-circle-check';
    } else if (reasonText.trim() !== '') {
        status = 'reason'; iconClass = 'fa-solid fa-circle-exclamation';
    }

    const links = member.link ? String(member.link).split(',') : [];
    let linkInputsHTML = '';
    for (let i = 0; i < countNum; i++) {
        linkInputsHTML += `<input type="text" class="link-input" placeholder="Link ${i + 1}" value="${links[i] || ''}">`;
    }

    return `
        <div class="member-card" data-index="${index}">
            <div class="member-header">
                <div class="member-name ${status}" data-status="${status}"><i class="member-status-icon ${iconClass}"></i></div>
                <div class="member-info">
                    <span class="member-name-text">${member.name}</span>
                    <span class="member-role">(${member.role})</span>
                </div>
                <div class="unsaved-indicator"></div>
                <button class="save-single-btn" title="រក្សាទុកតែម្នាក់នេះ"><i class="fa-solid fa-floppy-disk"></i></button>
                <i class="toggle-icon fa-solid fa-chevron-down"></i>
            </div>
            <div class="collapsible-content">
                <div class="inputs-container">
                    <div class="input-group">
                        <label><i class="fa-solid fa-hashtag"></i> ចំនួនវីដេអូ</label>
                        <input type="number" class="video-count-input" placeholder="0" min="0" value="${countNum}">
                        <div class="links-container">${linkInputsHTML}</div>
                    </div>
                    <div class="input-group">
                        <label><i class="fa-solid fa-comment-dots"></i> មូលហេតុ (បើមិនបានធ្វើ)</label>
                        <textarea class="reason-input" placeholder="...">${reasonText}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function addEventListenersToCards() {
    document.querySelectorAll('.member-card').forEach(card => {
        card.querySelector('.member-header').addEventListener('click', (e) => {
            if (!e.target.closest('.save-single-btn')) {
                card.classList.toggle('expanded');
            }
        });

        card.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', trackChanges);
        });

        card.querySelector('.video-count-input').addEventListener('input', (e) => updateRowState(e.target));
        card.querySelector('.reason-input').addEventListener('input', (e) => updateRowState(e.target));
        card.querySelector('.video-count-input').addEventListener('input', updateLinkInputs);
        card.querySelector('.save-single-btn').addEventListener('click', handleSaveSingle);
    });
}

// --- Data Handling (Daily) ---
async function handleSaveAll() {
    saveBtn.disabled = true;
    showLoader();
    statusMsg.className = '';
    
    const dataToSave = Array.from(document.querySelectorAll('.member-card')).map(card => {
        const count = card.querySelector('.video-count-input').value || 0;
        const links = Array.from(card.querySelectorAll('.link-input')).map(input => input.value).join(',');
        const reason = card.querySelector('.reason-input').value || '';
        return [count, links, reason];
    });
    
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify({ action: 'saveAll', payload: dataToSave })
        });
        onSaveSuccess("ទិន្នន័យទាំងអស់ត្រូវបានបញ្ជូនសម្រាប់រក្សាទុក!");
        document.querySelectorAll('.member-card.has-changes').forEach(card => card.classList.remove('has-changes'));
        saveBtn.disabled = true;
    } catch (error) {
        onSaveFailure(error);
    }
}

async function handleSaveSingle(event) {
    const card = event.target.closest('.member-card');
    const button = card.querySelector('.save-single-btn');
    button.disabled = true;
    showLoader();

    const rowIndex = parseInt(card.dataset.index);
    const count = card.querySelector('.video-count-input').value || 0;
    const links = Array.from(card.querySelectorAll('.link-input')).map(input => input.value).join(',');
    const reason = card.querySelector('.reason-input').value || '';
    const memberData = [count, links, reason];

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify({ action: 'saveSingle', payload: { rowIndex, memberData } })
        });
        hideLoader();
        card.classList.remove('has-changes');
        
        if (document.querySelectorAll('.member-card.has-changes').length === 0) {
            saveBtn.disabled = true;
        }
    } catch (error) {
        onSaveFailure(error);
    } finally {
        button.disabled = false;
    }
}

function handleCapture() {
    showLoader();
    const fileName = `Team-Report-${new Date().toISOString().split('T')[0]}.png`;
    html2canvas(captureArea, { scale: 2, useCORS: true, backgroundColor: '#F3F4F6' })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            hideLoader();
        }).catch(onSaveFailure);
}

function handleCapturePdf() {
    showLoader();
    const fileName = `Team-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    const { jsPDF } = window.jspdf;

    html2canvas(captureArea, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(fileName);
            hideLoader();
        }).catch(onSaveFailure);
}

function onSaveSuccess(message) {
    hideLoader();
    statusMsg.innerText = message;
    statusMsg.className = 'success';
    setTimeout(() => statusMsg.className = '', 3000);
}

function onSaveFailure(error) {
    hideLoader();
    statusMsg.innerText = 'Error: ' + error.message;
    statusMsg.className = 'error';
    saveBtn.disabled = false;
}

// --- NEW: Monthly Report Functions ---

// *** មានការកែប្រែនៅ Function នេះ ***
async function handleGenerateReport() {
    const month = reportMonthSelect.value;
    const year = reportYearInput.value;
    if (!year) {
        showReportMessage('error', 'សូមបញ្ចូលឆ្នាំ។');
        return;
    }
    
    showLoader();
    showReportMessage('loading', `កំពុងទាញរបាយការណ៍សម្រាប់ខែ ${month}/${year}...`);
    
    try {
        // Use ?action=getMonthlyReport
        const response = await fetch(`${WEB_APP_URL}?action=getMonthlyReport&month=${month}&year=${year}`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);

        renderMonthlyReport(data);
        hideLoader();

        // --- កែប្រែ 6 បន្ទាត់ខាងក្រោម ---
        let successMessage = `របាយការណ៍សម្រាប់ខែ ${month}/${year} (ទិន្នន័យ ${data.totalDays} ថ្ងៃ)។`;
        if (data.totalDays > 0 && data.startDate && data.endDate) {
          // បើថ្ងៃដូចគ្នា (ទិន្នន័យតែ១ថ្ងៃ)
          if (data.startDate === data.endDate) {
            successMessage = `របាយការណ៍សម្រាប់ខែ ${month}/${year} (ទិន្នន័យថ្ងៃទី ${data.startDate})។`;
          } else {
            successMessage = `របាយការណ៍សម្រាប់ខែ ${month}/${year} (ទិន្នន័យ ${data.totalDays} ថ្ងៃ) ពីថ្ងៃទី ${data.startDate} ដល់ថ្ងៃទី ${data.endDate}។`;
          }
        }
        showReportMessage('success', successMessage);

    } catch (error) {
        hideLoader();
        showReportMessage('error', `បរាជ័យក្នុងការទាញរបាយការណ៍: ${error.message}`);
    }
}

function renderMonthlyReport(data) {
    const { summary, totalDays } = data;
    const sortedNames = Object.keys(summary).sort();

    // លាក់ប៊ូតុងជាមុនសិន
    reportActionButtons.style.display = 'none';

    if (sortedNames.length === 0) {
        reportOutputContainer.innerHTML = `<p class="error">មិនមានទិន្នន័យសម្រាប់ខែដែលបានជ្រើសរើសទេ។</p>`;
        return;
    }

    let tableHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>ឈ្មោះសមាជិក</th>
                    <th>តួនាទី</th>
                    <th class="completed-col">បានធ្វើ (ថ្ងៃ)</th>
                    <th class="reason-col">សុំច្បាប់ (ថ្ងៃ)</th>
                    <th class="pending-col">អវត្តមាន (ថ្ងៃ)</th>
                    <th class="links-col">Link សរុប</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedNames.forEach(name => {
        const stats = summary[name];
        tableHTML += `
            <tr>
                <td>${name}</td>
                <td>${stats.role}</td>
                <td class="completed-col">${stats.completedDays}</td>
                <td class="reason-col">${stats.reasonDays}</td>
                <td class="pending-col">${stats.pendingDays}</td>
                <td class="links-col">${stats.totalLinks}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    reportOutputContainer.innerHTML = tableHTML;
    
    // បង្ហាញប៊ូតុង នៅពេល Report បង្ហាញរួច
    reportActionButtons.style.display = 'flex';
}

function showReportMessage(type, message) {
    reportStatusMsg.className = `status-message-inline ${type}`;
    reportStatusMsg.innerText = message;
}

function handleCaptureReport() {
    showLoader();
    const fileName = `Monthly-Report-${reportMonthSelect.value}-${reportYearInput.value}.png`;
    html2canvas(reportCaptureArea, { scale: 2, useCORS: true, backgroundColor: '#F3F4F6' })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            hideLoader();
        }).catch(onSaveFailure); // យើងអាចប្រើ onSaveFailure ចាស់បាន
}

function handleCaptureReportPdf() {
    showLoader();
    const fileName = `Monthly-Report-${reportMonthSelect.value}-${reportYearInput.value}.pdf`;
    const { jsPDF } = window.jspdf;

    html2canvas(reportCaptureArea, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(fileName);
            hideLoader();
        }).catch(onSaveFailure); // យើងអាចប្រើ onSaveFailure ចាស់បាន
}


// --- NEW: Admin Functions ---

function showAdminMessage(type, message) {
    adminStatusMsg.className = `status-message-inline ${type}`;
    adminStatusMsg.innerText = message;
    setTimeout(() => adminStatusMsg.className = 'status-message-inline', 5000);
}

async function handleDeleteDay() {
    const dateValue = deleteDateInput.value; // Format: "YYYY-MM-DD"
    if (!dateValue) {
        showAdminMessage('error', 'សូមជ្រើសរើសថ្ងៃដែលត្រូវលុប។');
        return;
    }

    // Convert "YYYY-MM-DD" to "DD-MM-YYYY" to match sheet name
    const [y, m, d] = dateValue.split('-');
    const sheetName = `${d}-${m}-${y}`;

    if (!confirm(`តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់សម្រាប់ថ្ងៃទី ${sheetName} មែនទេ?`)) return;

    const payload = { type: 'day', value: sheetName };
    await postDeleteRequest(payload);
}

async function handleDeleteMonth() {
    const monthValue = deleteMonthInput.value; // Format: "YYYY-MM"
    if (!monthValue) {
        showAdminMessage('error', 'សូមជ្រើសរើសខែដែលត្រូវលុប។');
        return;
    }

    // Convert "YYYY-MM" to "MM-YYYY"
    const [y, m] = monthValue.split('-');
    const monthYearStr = `${m}-${y}`;

    if (!confirm(`តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់សម្រាប់ខែ ${monthYearStr} មែនទេ? នេះមិនអាចមិនត្រឡប់វិញបានទេ!`)) return;

    const payload = { type: 'month', value: monthYearStr };
    await postDeleteRequest(payload);
}

async function postDeleteRequest(payload) {
    showLoader();
    showAdminMessage('loading', 'កំពុងដំណើរការលុប...');

    try {
        // Use 'no-cors' for POST requests to Apps Script (for simple setup)
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'deleteData', payload: payload })
        });
        
        // Since 'no-cors' doesn't give a real response, we assume success
        // A better app would use a proper JSON response, but 'no-cors' blocks reading it
        hideLoader();
        showAdminMessage('success', `សំណើលុបសម្រាប់ "${payload.value}" ត្រូវបានបញ្ជូន។ សូមពិនិត្យមើល Sheet របស់អ្នក។`);
    } catch (error) {
        hideLoader();
        showAdminMessage('error', `បរាជ័យក្នុងការបញ្ជូនសំណើ: ${error.message}`);
    }
}


// --- Initial Load ---
async function initializeApp() {
    // Set default month/year for report
    const now = new Date();
    reportMonthSelect.value = now.getMonth() + 1; // getMonth() is 0-based
    reportYearInput.value = now.getFullYear();
    // Set default month for delete
    deleteMonthInput.value = now.toISOString().slice(0, 7); // "YYYY-MM"
    
    // Daily tab listeners
    updateTime();
    setInterval(updateTime, 1000);
    saveBtn.addEventListener('click', handleSaveAll);
    captureBtn.addEventListener('click', handleCapture);
    pdfBtn.addEventListener('click', handleCapturePdf);

    // Report tab listener
    generateReportBtn.addEventListener('click', handleGenerateReport);
    reportPdfBtn.addEventListener('click', handleCaptureReportPdf);
    reportCaptureBtn.addEventListener('click', handleCaptureReport);
    
    // Admin tab listeners
    deleteDayBtn.addEventListener('click', handleDeleteDay);
    deleteMonthBtn.addEventListener('click', handleDeleteMonth);

    // Fetch data for daily tab
    showLoader();
    try {
        // Use ?action=getToday
        const response = await fetch(`${WEB_APP_URL}?action=getToday`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);

        sheetDateDisplay.textContent = data.sheetDate;
        
        if (data.members && data.members.length > 0) {
            memberListContainer.innerHTML = data.members.map((m, i) => createMemberCardHTML(m, i)).join('');
            addEventListenersToCards();
        } else {
            memberListContainer.innerHTML = '<p class="error">មិនមានទិន្នន័យសមាជិកទេ។</p>';
        }
    } catch (error) {
        memberListContainer.innerHTML = `<p class="error">បរាជ័យក្នុងការទាញទិន្នន័យ: ${error.message}</p>`;
    } finally {
        hideLoader();
        updateGlobalStats();
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
