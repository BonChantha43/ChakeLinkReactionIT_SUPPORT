// ! សំខាន់៖ សូមប្តូរ URL នេះជាមួយ Web App URL របស់អ្នក!
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzR4O1cBeu6a4GZz6-E7pih2Ux0pODp28YRPY62gOG8vSZIyUMb7RYQFpSQJCHGQyNt/exec";

// --- Element References ---
const saveBtn = document.getElementById("saveButton");
const captureBtn = document.getElementById("captureButton");
const pdfBtn = document.getElementById("pdfButton");
const statusMsg = document.getElementById("status-message");
const loaderOverlay = document.getElementById("loader-overlay");
const statCompletedEl = document.getElementById("stat-completed");
const statReasonEl = document.getElementById("stat-reason");
const statPendingEl = document.getElementById("stat-pending");
const memberListContainer = document.getElementById("member-list");
const sheetDateDisplay = document.getElementById("sheet-date-display");
const captureArea = document.getElementById("capture-area");

const navTabs = document.querySelectorAll(".nav-tab");
const tabContents = document.querySelectorAll(".tab-content");

// Report Controls
const reportTypeSelect = document.getElementById("report-type-select");
const monthInputGroup = document.getElementById("month-input-group");
const dateInputGroup = document.getElementById("date-input-group");
const specificDateInput = document.getElementById("specific-date-input");
const reportMonthSelect = document.getElementById("month-select");
const reportYearInput = document.getElementById("year-input");
const generateReportBtn = document.getElementById("generateReportBtn");
const reportOutputContainer = document.getElementById("report-output");
const reportStatusMsg = document.getElementById("report-status-message");
const reportCaptureArea = document.getElementById("report-capture-area");
const reportActionButtons = document.getElementById("report-action-buttons");
const reportPdfBtn = document.getElementById("reportPdfButton");
const reportCaptureBtn = document.getElementById("reportCaptureButton");

// Admin Controls
const deleteDateInput = document.getElementById("delete-date-input");
const deleteDayBtn = document.getElementById("deleteDayBtn");
const deleteMonthInput = document.getElementById("delete-month-input");
const deleteMonthBtn = document.getElementById("deleteMonthBtn");
const adminStatusMsg = document.getElementById("admin-status-message");

const showLoader = () => loaderOverlay.classList.add("visible");
const hideLoader = () => loaderOverlay.classList.remove("visible");

// --- Tab Switching Logic ---
navTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    navTabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((c) => {
      c.classList.remove("active");
      c.style.display = "none";
    });
    tab.classList.add("active");
    const activeContent = document.getElementById(`${tabName}-content`);
    if (activeContent) {
      activeContent.classList.add("active");
      activeContent.style.display = "block";
    }
  });
});

// --- Report Type Logic (Month vs Day) ---
if (reportTypeSelect) {
  reportTypeSelect.addEventListener("change", () => {
    if (reportTypeSelect.value === "month") {
      monthInputGroup.style.display = "flex";
      dateInputGroup.style.display = "none";
    } else {
      monthInputGroup.style.display = "none";
      dateInputGroup.style.display = "block";
      if (!specificDateInput.value) {
        specificDateInput.value = new Date().toISOString().split("T")[0];
      }
    }
  });
}

// --- Core Daily Functions ---
function updateGlobalStats() {
  const allMemberCards = document.querySelectorAll(".member-card");
  let completed = 0,
    reason = 0,
    pending = 0;
  allMemberCards.forEach((card) => {
    const status = card.querySelector(".member-name").dataset.status;
    if (status === "completed") completed++;
    else if (status === "reason") reason++;
    else pending++;
  });
  statCompletedEl.innerHTML = `<i class="fa-solid fa-user-check"></i> ${completed}`;
  statReasonEl.innerHTML = `<i class="fa-solid fa-file-circle-exclamation"></i> ${reason}`;
  statPendingEl.innerHTML = `<i class="fa-solid fa-user-clock"></i> ${pending}`;
}

function updateRowState(changedElement) {
  const memberCard = changedElement.closest(".member-card");
  if (!memberCard) return;

  const memberNameDiv = memberCard.querySelector(".member-name");
  const statusIcon = memberCard.querySelector(".member-status-icon");
  const countInput = memberCard.querySelector(".video-count-input");
  const reasonInput = memberCard.querySelector(".reason-input");
  const count = parseInt(countInput.value) || 0;
  const reason = reasonInput.value.trim();

  let newStatus = "pending",
    newIconClass = "fa-regular fa-hourglass-half";
  if (count > 0) {
    newStatus = "completed";
    newIconClass = "fa-solid fa-circle-check";
  } else if (reason !== "") {
    newStatus = "reason";
    newIconClass = "fa-solid fa-circle-exclamation";
  }

  memberNameDiv.className = "member-name";
  memberNameDiv.classList.add(newStatus);
  memberNameDiv.dataset.status = newStatus;
  statusIcon.className = `member-status-icon ${newIconClass}`;
  updateGlobalStats();
}

function updateTime() {
  const timeEl = document.getElementById("current-time");
  if (timeEl) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${timeString}`;
  }
}

function trackChanges(event) {
  const memberCard = event.target.closest(".member-card");
  if (memberCard && !memberCard.classList.contains("has-changes")) {
    memberCard.classList.add("has-changes");
    saveBtn.disabled = false;
  }
}

function updateLinkInputs(event) {
  const countInput = event.target;
  const newCount = Math.max(0, parseInt(countInput.value) || 0);
  countInput.value = newCount;
  const memberCard = countInput.closest(".member-card");
  const linksContainer = memberCard.querySelector(".links-container");
  const currentCount = linksContainer.querySelectorAll(".link-input").length;
  if (newCount > currentCount) {
    for (let i = currentCount; i < newCount; i++) {
      const newLinkInput = document.createElement("input");
      newLinkInput.type = "text";
      newLinkInput.className = "link-input";
      newLinkInput.placeholder = "Link " + (i + 1);
      newLinkInput.addEventListener("input", trackChanges);
      linksContainer.appendChild(newLinkInput);
    }
  } else if (newCount < currentCount) {
    for (let i = currentCount; i > newCount; i--)
      linksContainer.removeChild(linksContainer.lastChild);
  }
}

function createMemberCardHTML(member, index) {
  const countNum = parseInt(member.videoCount) || 0;
  const reasonText = member.reason || "";
  let status = "pending",
    iconClass = "fa-regular fa-hourglass-half";
  if (countNum > 0) {
    status = "completed";
    iconClass = "fa-solid fa-circle-check";
  } else if (reasonText.trim() !== "") {
    status = "reason";
    iconClass = "fa-solid fa-circle-exclamation";
  }

  const links = member.link ? String(member.link).split(",") : [];
  let linkInputsHTML = "";
  for (let i = 0; i < countNum; i++) {
    linkInputsHTML += `<input type="text" class="link-input" placeholder="Link ${
      i + 1
    }" value="${links[i] || ""}">`;
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
  document.querySelectorAll(".member-card").forEach((card) => {
    card.querySelector(".member-header").addEventListener("click", (e) => {
      if (!e.target.closest(".save-single-btn")) {
        card.classList.toggle("expanded");
      }
    });
    card.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("input", trackChanges);
    });
    card
      .querySelector(".video-count-input")
      .addEventListener("input", (e) => updateRowState(e.target));
    card
      .querySelector(".reason-input")
      .addEventListener("input", (e) => updateRowState(e.target));
    card
      .querySelector(".video-count-input")
      .addEventListener("input", updateLinkInputs);
    card
      .querySelector(".save-single-btn")
      .addEventListener("click", handleSaveSingle);
  });
}

// --- Data Handling ---
async function handleSaveAll() {
  saveBtn.disabled = true;
  showLoader();
  statusMsg.className = "";
  const dataToSave = Array.from(document.querySelectorAll(".member-card")).map(
    (card) => {
      const count = card.querySelector(".video-count-input").value || 0;
      const links = Array.from(card.querySelectorAll(".link-input"))
        .map((input) => input.value)
        .join(",");
      const reason = card.querySelector(".reason-input").value || "";
      return [count, links, reason];
    }
  );
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action: "saveAll", payload: dataToSave }),
    });
    onSaveSuccess("ទិន្នន័យទាំងអស់ត្រូវបានបញ្ជូនសម្រាប់រក្សាទុក!");
    document
      .querySelectorAll(".member-card.has-changes")
      .forEach((card) => card.classList.remove("has-changes"));
    saveBtn.disabled = true;
  } catch (error) {
    onSaveFailure(error);
  }
}

async function handleSaveSingle(event) {
  const card = event.target.closest(".member-card");
  const button = card.querySelector(".save-single-btn");
  button.disabled = true;
  showLoader();
  const rowIndex = parseInt(card.dataset.index);
  const count = card.querySelector(".video-count-input").value || 0;
  const links = Array.from(card.querySelectorAll(".link-input"))
    .map((input) => input.value)
    .join(",");
  const reason = card.querySelector(".reason-input").value || "";
  const memberData = [count, links, reason];
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        action: "saveSingle",
        payload: { rowIndex, memberData },
      }),
    });
    hideLoader();
    card.classList.remove("has-changes");
    if (document.querySelectorAll(".member-card.has-changes").length === 0)
      saveBtn.disabled = true;
  } catch (error) {
    onSaveFailure(error);
  } finally {
    button.disabled = false;
  }
}

function handleCapture() {
  showLoader();
  const fileName = `Team-Report-${new Date().toISOString().split("T")[0]}.png`;
  html2canvas(captureArea, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#F3F4F6",
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
      hideLoader();
    })
    .catch(onSaveFailure);
}

function handleCapturePdf() {
  showLoader();
  const fileName = `Team-Report-${new Date().toISOString().split("T")[0]}.pdf`;
  const { jsPDF } = window.jspdf;
  html2canvas(captureArea, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FFFFFF",
  })
    .then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(fileName);
      hideLoader();
    })
    .catch(onSaveFailure);
}

function onSaveSuccess(message) {
  hideLoader();
  statusMsg.innerText = message;
  statusMsg.className = "success";
  setTimeout(() => (statusMsg.className = ""), 3000);
}

function onSaveFailure(error) {
  hideLoader();
  statusMsg.innerText = "Error: " + error.message;
  statusMsg.className = "error";
  saveBtn.disabled = false;
}

// --- NEW REPORT FUNCTIONS ---

async function handleGenerateReport() {
  const type = reportTypeSelect.value;
  let url = `${WEB_APP_URL}?action=getReport&type=${type}`;
  let displayInfo = "";

  if (type === "month") {
    const month = reportMonthSelect.value;
    const year = reportYearInput.value;
    if (!year) {
      showReportMessage("error", "សូមបញ្ចូលឆ្នាំ។");
      return;
    }
    url += `&month=${month}&year=${year}`;
    displayInfo = `ខែ ${month}/${year}`;
  } else {
    const dateVal = specificDateInput.value;
    if (!dateVal) {
      showReportMessage("error", "សូមជ្រើសរើសកាលបរិច្ឆេទ។");
      return;
    }
    url += `&date=${dateVal}`;
    const [y, m, d] = dateVal.split("-");
    displayInfo = `ថ្ងៃទី ${d}-${m}-${y}`;
  }

  showLoader();
  showReportMessage("loading", `កំពុងទាញរបាយការណ៍សម្រាប់ ${displayInfo}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
    const data = await response.json();
    if (data.status === "error") throw new Error(data.message);

    renderMonthlyReport(data);
    hideLoader();

    let successMessage = `របាយការណ៍សម្រាប់ ${displayInfo} (ទិន្នន័យ ${data.totalDays} ថ្ងៃ)។`;
    if (data.type === "day") {
      if (data.totalDays === 0)
        successMessage = `មិនមានទិន្នន័យសម្រាប់ ${displayInfo} ទេ។`;
      else successMessage = `របាយការណ៍ជោគជ័យសម្រាប់ ${displayInfo}។`;
    }
    showReportMessage("success", successMessage);
  } catch (error) {
    hideLoader();
    showReportMessage("error", `បរាជ័យក្នុងការទាញរបាយការណ៍: ${error.message}`);
  }
}

function renderMonthlyReport(data) {
  const { summary, totalDays } = data;
  const sortedNames = Object.keys(summary).sort();

  reportActionButtons.style.display = "none";

  if (sortedNames.length === 0) {
    reportOutputContainer.innerHTML = `<p class="error">មិនមានទិន្នន័យសម្រាប់កាលបរិច្ឆេទដែលបានជ្រើសរើសទេ។</p>`;
    return;
  }

  // Generate Table HTML
  let tableHTML = `
        <div class="report-table-wrapper">
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 50px;">L.R</th>
                    <th>ឈ្មោះសមាជិក</th>
                    <th>តួនាទី</th>
                    <th class="text-center">បានធ្វើ</th>
                    <th class="text-center">សុំច្បាប់</th>
                    <th class="text-center">អវត្តមាន</th>
                    <th>ថ្ងៃអវត្តមាន (កាលបរិច្ឆេទ)</th> 
                    <th class="text-center">Link សរុប</th>
                </tr>
            </thead>
            <tbody>
    `;

  sortedNames.forEach((name, index) => {
    const stats = summary[name];

    // Handle Absent Dates (Day Only)
    let absentDatesStr = "-";
    if (stats.absentDateList && stats.absentDateList.length > 0) {
      // "14-11-2025" -> "14"
      const daysOnly = stats.absentDateList.map((date) => date.split("-")[0]);
      absentDatesStr = `<span style="color:#DC2626; font-size:0.85em;">${daysOnly.join(
        ", "
      )}</span>`;
    }

    tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><div style="font-weight:bold;">${name}</div></td>
                <td><span style="color:#64748b; font-size:0.9em;">${
                  stats.role
                }</span></td>
                <td class="text-center"><span class="badge completed">${
                  stats.completedDays
                }</span></td>
                <td class="text-center"><span class="badge reason">${
                  stats.reasonDays
                }</span></td>
                <td class="text-center"><span class="badge pending">${
                  stats.pendingDays
                }</span></td>
                <td class="absent-dates-col">${absentDatesStr}</td>
                <td class="text-center"><span class="badge links">${
                  stats.totalLinks
                }</span></td>
            </tr>
        `;
  });

  // *** បានលុបផ្នែក <tfoot> (សរុបរួម) ចេញនៅត្រង់នេះហើយ ***

  tableHTML += `
            </tbody>
        </table>
        </div>
    `;

  reportOutputContainer.innerHTML = tableHTML;
  reportActionButtons.style.display = "flex";
}

function showReportMessage(type, message) {
  reportStatusMsg.className = `status-message-inline ${type}`;
  reportStatusMsg.innerText = message;
}

// --- FIX FOR CLIPPING & PDF (NUCLEAR OPTION) ---
function handleCaptureReport() {
  showLoader();
  const fileName = `Report-Analytics-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;

  html2canvas(reportCaptureArea, {
    scale: 3, // High quality
    useCORS: true,
    backgroundColor: "#F3F4F6",
    windowWidth: 1600, // Force Desktop Layout
    onclone: (clonedDoc) => {
      // បង្ខំឱ្យពង្រីក Padding ខ្លាំង ពេលកំពុងថត ដើម្បីកុំឱ្យដាច់អក្សរ
      const allCells = clonedDoc.querySelectorAll(
        ".report-table th, .report-table td"
      );
      allCells.forEach((cell) => {
        cell.style.paddingTop = "18px";
        cell.style.paddingBottom = "18px";
        cell.style.lineHeight = "2.2"; // បង្កើនគម្លាតបន្ទាត់ខ្លាំង
        cell.style.whiteSpace = "nowrap"; // ការពារកុំឱ្យធ្លាក់បន្ទាត់គាបគ្នា
      });
    },
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
      hideLoader();
    })
    .catch(onSaveFailure);
}

function handleCaptureReportPdf() {
  showLoader();
  const fileName = `Report-Analytics-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  const { jsPDF } = window.jspdf;

  html2canvas(reportCaptureArea, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#FFFFFF",
    windowWidth: 1600,
    onclone: (clonedDoc) => {
      // បង្ខំឱ្យពង្រីក Padding ខ្លាំង ដូចគ្នា
      const allCells = clonedDoc.querySelectorAll(
        ".report-table th, .report-table td"
      );
      allCells.forEach((cell) => {
        cell.style.paddingTop = "18px";
        cell.style.paddingBottom = "18px";
        cell.style.lineHeight = "2.2";
        cell.style.whiteSpace = "nowrap";
      });
    },
  })
    .then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = canvas.width;
      const pdfHeight = canvas.height;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(fileName);
      hideLoader();
    })
    .catch(onSaveFailure);
}

// --- Admin Functions ---
function showAdminMessage(type, message) {
  adminStatusMsg.className = `status-message-inline ${type}`;
  adminStatusMsg.innerText = message;
  setTimeout(() => (adminStatusMsg.className = "status-message-inline"), 5000);
}

async function handleDeleteDay() {
  const dateValue = deleteDateInput.value;
  if (!dateValue) {
    showAdminMessage("error", "សូមជ្រើសរើសថ្ងៃដែលត្រូវលុប។");
    return;
  }
  const [y, m, d] = dateValue.split("-");
  const sheetName = `${d}-${m}-${y}`;
  if (
    !confirm(
      `តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់សម្រាប់ថ្ងៃទី ${sheetName} មែនទេ?`
    )
  )
    return;
  const payload = { type: "day", value: sheetName };
  await postDeleteRequest(payload);
}

async function handleDeleteMonth() {
  const monthValue = deleteMonthInput.value;
  if (!monthValue) {
    showAdminMessage("error", "សូមជ្រើសរើសខែដែលត្រូវលុប។");
    return;
  }
  const [y, m] = monthValue.split("-");
  const monthYearStr = `${m}-${y}`;
  if (
    !confirm(`តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់សម្រាប់ខែ ${monthYearStr} មែនទេ?`)
  )
    return;
  const payload = { type: "month", value: monthYearStr };
  await postDeleteRequest(payload);
}

async function postDeleteRequest(payload) {
  showLoader();
  showAdminMessage("loading", "កំពុងដំណើរការលុប...");
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action: "deleteData", payload: payload }),
    });
    hideLoader();
    showAdminMessage(
      "success",
      `សំណើលុបសម្រាប់ "${payload.value}" ត្រូវបានបញ្ជូន។ សូមពិនិត្យមើល Sheet របស់អ្នក។`
    );
  } catch (error) {
    hideLoader();
    showAdminMessage("error", `បរាជ័យក្នុងការបញ្ជូនសំណើ: ${error.message}`);
  }
}

// --- Initial Load ---
async function initializeApp() {
  const now = new Date();
  reportMonthSelect.value = now.getMonth() + 1;
  reportYearInput.value = now.getFullYear();
  deleteMonthInput.value = now.toISOString().slice(0, 7);

  updateTime();
  setInterval(updateTime, 1000);
  saveBtn.addEventListener("click", handleSaveAll);
  captureBtn.addEventListener("click", handleCapture);
  pdfBtn.addEventListener("click", handleCapturePdf);
  generateReportBtn.addEventListener("click", handleGenerateReport);
  reportPdfBtn.addEventListener("click", handleCaptureReportPdf);
  reportCaptureBtn.addEventListener("click", handleCaptureReport);
  deleteDayBtn.addEventListener("click", handleDeleteDay);
  deleteMonthBtn.addEventListener("click", handleDeleteMonth);

  showLoader();
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getToday`);
    if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
    const data = await response.json();
    if (data.status === "error") throw new Error(data.message);

    sheetDateDisplay.textContent = data.sheetDate;
    if (data.members && data.members.length > 0) {
      memberListContainer.innerHTML = data.members
        .map((m, i) => createMemberCardHTML(m, i))
        .join("");
      addEventListenersToCards();
    } else {
      memberListContainer.innerHTML =
        '<p class="error">មិនមានទិន្នន័យសមាជិកទេ។</p>';
    }
  } catch (error) {
    memberListContainer.innerHTML = `<p class="error">បរាជ័យក្នុងការទាញទិន្នន័យ: ${error.message}</p>`;
  } finally {
    hideLoader();
    updateGlobalStats();
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
