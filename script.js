// ! សំខាន់៖ សូមប្តូរ URL នេះជាមួយ Web App URL របស់អ្នក!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzR4O1cBeu6a4GZz6-E7pih2Ux0pODp28YRPY62gOG8vSZIyUMb7RYQFpSQJCHGQyNt/exec';

// --- Element References ---
const saveBtn = document.getElementById('saveButton');
const captureBtn = document.getElementById('captureButton');
const pdfBtn = document.getElementById('pdfButton'); // New PDF button
const statusMsg = document.getElementById('status-message');
const loaderOverlay = document.getElementById('loader-overlay');
const statCompletedEl = document.getElementById('stat-completed');
const statReasonEl = document.getElementById('stat-reason');
const statPendingEl = document.getElementById('stat-pending');
const memberListContainer = document.getElementById('member-list');
const sheetDateDisplay = document.getElementById('sheet-date-display');
const captureArea = document.getElementById('capture-area');

const showLoader = () => loaderOverlay.classList.add('visible');
const hideLoader = () => loaderOverlay.classList.remove('visible');

// --- Core Functions ---
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

// --- HTML Generation ---
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

// --- Event Listeners Setup ---
function addEventListenersToCards() {
    document.querySelectorAll('.member-card').forEach(card => {
        card.querySelector('.member-header').addEventListener('click', (e) => {
            // Prevent toggle when clicking the save button
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

        // New listener for the individual save button
        card.querySelector('.save-single-btn').addEventListener('click', handleSaveSingle);
    });
}

// --- Data Handling ---
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
    button.disabled = true; // Prevent double-clicking
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
        
        // Check if any other cards have changes. If not, disable the main save button.
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

// --- Initial Load ---
async function initializeApp() {
    updateTime();
    setInterval(updateTime, 1000);
    saveBtn.addEventListener('click', handleSaveAll);
    captureBtn.addEventListener('click', handleCapture);
    pdfBtn.addEventListener('click', handleCapturePdf); // New listener for PDF

    showLoader();
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        
        const data = await response.json();
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