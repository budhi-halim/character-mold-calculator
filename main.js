import { SHIFTS, LOCATIONS } from "./config.js";
import { formToCode, formatExpDateString } from "./logic.js";

// === DOM ELEMENTS ===
const startDateEl = document.getElementById("startDate");
const endDateEl = document.getElementById("endDate");
const startDateDisplay = document.getElementById("startDateDisplay");
const endDateDisplay = document.getElementById("endDateDisplay");

const minShelfEl = document.getElementById("minShelf");
const maxShelfEl = document.getElementById("maxShelf");

const shiftsContainer = document.getElementById("shiftsContainer");
const locsContainer = document.getElementById("locsContainer");

const revYearEl = document.getElementById("revYear");
const revDateEl = document.getElementById("revDate");
const revSLEl = document.getElementById("revSL");

const calculateBtn = document.getElementById("calculateBtn");
const summaryTbody = document.getElementById("summaryTbody");
const proofTbody = document.getElementById("proofTbody");
const detailTbody = document.getElementById("detailTbody");
const rowWarning = document.getElementById("rowWarning");

// Pagination Elements
const paginationControls = document.getElementById("paginationControls");
const btnFirst = document.getElementById("btnFirst");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnLast = document.getElementById("btnLast");
const pageIndicator = document.getElementById("pageIndicator");

// === GLOBAL STATE ===
const PAGE_SIZE = 1000;
let currentConfig = null; 
let totalCombinations = 0;
let totalPages = 1;
let currentPage = 1;

// === UTILS ===
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDDMMMYYYY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

// Syncs the native YYYY-MM-DD input with our custom text display
function syncDateDisplay(dateInput, displayInput) {
  if (dateInput.value) {
    // Append T12:00:00 to prevent local timezone shifts causing it to drop a day backwards
    const d = new Date(dateInput.value + "T12:00:00");
    displayInput.value = formatDDMMMYYYY(d);
  } else {
    displayInput.value = "";
  }
}

// === INITIALIZATION ===
function init() {
  // 1. Setup Dates
  const today = new Date();
  const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
  
  startDateEl.value = todayStr;
  syncDateDisplay(startDateEl, startDateDisplay);

  endDateEl.value = "2030-12-31"; 
  syncDateDisplay(endDateEl, endDateDisplay);

  // Sync when user picks a date
  startDateEl.addEventListener("input", () => syncDateDisplay(startDateEl, startDateDisplay));
  endDateEl.addEventListener("input", () => syncDateDisplay(endDateEl, endDateDisplay));

  // 2. Render Checkboxes
  SHIFTS.forEach(s => {
    const checked = s.id === 0 ? "checked" : "";
    shiftsContainer.innerHTML += `
      <label class="checkbox-label">
        <input type="checkbox" name="shift" value="${s.id}" ${checked}> ${s.name}
      </label>
    `;
  });

  LOCATIONS.forEach(l => {
    const checked = l.id === 0 ? "checked" : "";
    locsContainer.innerHTML += `
      <label class="checkbox-label">
        <input type="checkbox" name="loc" value="${l.id}" ${checked}> ${l.name}
      </label>
    `;
  });

  // 3. Attach Event Listeners
  calculateBtn.addEventListener("click", performCalculation);
  
  btnFirst.addEventListener("click", () => navigatePage(1));
  btnPrev.addEventListener("click", () => navigatePage(currentPage - 1));
  btnNext.addEventListener("click", () => navigatePage(currentPage + 1));
  btnLast.addEventListener("click", () => navigatePage(totalPages));
  
  // Run once on load
  performCalculation();
}

// === CORE LOGIC ===
function performCalculation() {
  const startDateStr = startDateEl.value;
  const endDateStr = endDateEl.value;
  if (!startDateStr || !endDateStr) return alert("Please select valid dates.");

  const start = new Date(startDateStr + "T12:00:00");
  const end = new Date(endDateStr + "T12:00:00");
  
  const minShelf = parseInt(minShelfEl.value, 10) || 0;
  const maxShelf = parseInt(maxShelfEl.value, 10) || 0;

  if (start > end) return alert("Start Date cannot be after End Date.");
  if (minShelf > maxShelf) return alert("Min Shelf Life cannot be greater than Max.");

  const selectedShifts = Array.from(document.querySelectorAll('input[name="shift"]:checked')).map(cb => parseInt(cb.value, 10));
  const selectedLocs = Array.from(document.querySelectorAll('input[name="loc"]:checked')).map(cb => parseInt(cb.value, 10));
  
  if (selectedShifts.length === 0 || selectedLocs.length === 0) {
    return alert("Please select at least one Shift and one Location.");
  }

  const revY = revYearEl.value === "true";
  const revD = revDateEl.value === "true";
  const revSL = revSLEl.value === "true";

  currentConfig = { start, end, minShelf, maxShelf, selectedShifts, selectedLocs, revY, revD, revSL };

  analyzeAllCombinations();
}

function analyzeAllCombinations() {
  const { start, end, minShelf, maxShelf, selectedShifts, selectedLocs, revY, revD, revSL } = currentConfig;
  
  const maxMolds = new Array(10).fill(0);
  const proofData = new Array(10).fill(null); 
  totalCombinations = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    for (let shiftId of selectedShifts) {
      for (let locId of selectedLocs) {
        
        const prodCode = formToCode(d, shiftId, locId, revY, revD, revSL);

        for (let sl = minShelf; sl <= maxShelf; sl++) {
          totalCombinations++;

          const expDate = new Date(d);
          expDate.setDate(expDate.getDate() + sl);
          const expCode = formatExpDateString(expDate);

          const combinedString = prodCode + expCode;
          const currentCounts = new Array(10).fill(0);
          
          for (let i = 0; i < combinedString.length; i++) {
            currentCounts[combinedString[i]]++;
          }

          for (let i = 0; i < 10; i++) {
            if (currentCounts[i] > maxMolds[i]) {
              maxMolds[i] = currentCounts[i];
              
              const shiftName = SHIFTS.find(s => s.id === shiftId)?.name;
              const locName = LOCATIONS.find(l => l.id === locId)?.name;
              
              proofData[i] = {
                digit: i,
                prodDateStr: formatDDMMMYYYY(d),
                expDateStr: formatDDMMMYYYY(expDate),
                shiftName,
                locName,
                prodCode,
                expCode
              };
            }
          }
        }
      }
    }
  }

  let summaryHtml = "";
  for (let i = 0; i < 10; i++) {
    summaryHtml += `
      <tr>
        <td><strong>${i}</strong></td>
        <td>${maxMolds[i]}</td>
      </tr>
    `;
  }
  const totalMolds = maxMolds.reduce((acc, curr) => acc + curr, 0);
  summaryHtml += `
      <tr>
        <td><strong>Total</strong></td>
        <td>${totalMolds}</td>
      </tr>
    `;
  summaryTbody.innerHTML = summaryHtml;

  let proofHtml = "";
  for (let i = 0; i < 10; i++) {
    if (proofData[i]) {
      const p = proofData[i];
      proofHtml += `
        <tr>
          <td><strong>${p.digit}</strong></td>
          <td class="selectable">${p.prodDateStr}</td>
          <td class="selectable">${p.expDateStr}</td>
          <td>${p.shiftName}</td>
          <td>${p.locName}</td>
          <td class="selectable"><strong>${p.prodCode}</strong></td>
          <td class="selectable"><strong>${p.expCode}</strong></td>
        </tr>
      `;
    }
  }
  proofTbody.innerHTML = proofHtml;

  totalPages = Math.ceil(totalCombinations / PAGE_SIZE) || 1;
  updateWarningText();
  navigatePage(1); 
}

function navigatePage(page) {
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage = page;

  const { start, end, minShelf, maxShelf, selectedShifts, selectedLocs, revY, revD, revSL } = currentConfig;
  
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  
  let currentIndex = 0;
  let htmlRows = "";

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    for (let shiftId of selectedShifts) {
      for (let locId of selectedLocs) {
        
        const prodCode = formToCode(d, shiftId, locId, revY, revD, revSL);

        for (let sl = minShelf; sl <= maxShelf; sl++) {
          
          if (currentIndex >= startIndex && currentIndex < endIndex) {
            const expDate = new Date(d);
            expDate.setDate(expDate.getDate() + sl);
            const expCode = formatExpDateString(expDate);
            
            const shiftName = SHIFTS.find(s => s.id === shiftId)?.name;
            const locName = LOCATIONS.find(l => l.id === locId)?.name;

            htmlRows += `
              <tr>
                <td>${currentIndex + 1}</td>
                <td class="selectable">${formatDDMMMYYYY(d)}</td>
                <td class="selectable">${formatDDMMMYYYY(expDate)}</td>
                <td>${shiftName}</td>
                <td>${locName}</td>
                <td class="selectable"><strong>${prodCode}</strong></td>
                <td class="selectable"><strong>${expCode}</strong></td>
              </tr>
            `;
          }
          
          currentIndex++;
          
          if (currentIndex >= endIndex) {
            detailTbody.innerHTML = htmlRows;
            updatePaginationUI();
            return;
          }
        }
      }
    }
  }
  
  detailTbody.innerHTML = htmlRows;
  updatePaginationUI();
}

function updateWarningText() {
  let text = `Calculated ${totalCombinations.toLocaleString()} combinations.`;
  if (totalCombinations > PAGE_SIZE) {
    text += ` Displaying ${PAGE_SIZE} rows per page.`;
    paginationControls.style.display = "flex";
  } else {
    paginationControls.style.display = "none";
  }
  
  rowWarning.textContent = text;
  rowWarning.style.display = "block";
}

function updatePaginationUI() {
  pageIndicator.textContent = `Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()}`;
  
  btnFirst.disabled = currentPage === 1;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = currentPage === totalPages;
  btnLast.disabled = currentPage === totalPages;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);