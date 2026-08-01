/**
 * ============================================================
 * FitReserve - System Rezerwacji Treningów (Mobile-First)
 * ============================================================
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://josdglurvhbcbjtkywyv.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_HxFELpiuuegDlZDzs9Ta7g_lHx3eXbT";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const STORAGE_KEY = 'fitreserve_trainings';
const BOOKINGS_KEY = 'fitreserve_bookings';

const defaultTrainings = [
  { id: 1, date: "2025-08-10", time: "16:00", title: "Trening grupowy", capacity: 6, booked: 3 },
];

async function getTrainings() {

  const { data, error } = await supabase
    .from("trainings")
    .select("*")
    .order("date")
    .order("time");

  if(error){
    console.error(error);
    return [];
  }

  return data;
}

function saveTrainings(trainings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trainings));
}

function getBookings() {
  const stored = localStorage.getItem(BOOKINGS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

let currentWeekStart = new Date(2026, 7, 10);
let selectedTraining = null;

function formatDatePL(date) {
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function strToDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatShortDate(date) {
  return dateToStr(date);
}

function getShortDayName(date) {
  const days = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  return days[date.getDay()];
}

function getFullDayName(date) {
  const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  return days[date.getDay()];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ================= MOBILE MENU =================
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    menuToggle.textContent = mobileMenu.classList.contains('open') ? '✕' : '☰';
  });
  document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuToggle.textContent = '☰';
    });
  });
}

// ================= ACTIVE SECTION HIGHLIGHT =================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

function highlightActiveSection() {
  const scrollPos = window.scrollY + window.innerHeight / 3;

  let currentSection = '';

  sections.forEach(section => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    if (scrollPos >= top && scrollPos < bottom) {
      currentSection = section.id;
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';

    if (link.getAttribute('href') === `#${currentSection}`) {
      link.style.color = 'var(--accent)';
    }
  });
}
window.addEventListener('scroll', highlightActiveSection);

// ================= CALENDAR =================
async function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const weekRange = document.getElementById('weekRange');
  const trainings = await getTrainings();

  grid.innerHTML = '';

  const weekEnd = addDays(currentWeekStart, 6);
  weekRange.textContent = `${formatDatePL(currentWeekStart)} – ${formatDatePL(weekEnd)}`;

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(currentWeekStart, i);
    const dateStr = formatShortDate(dayDate);
    const dayTrainings = trainings.filter(t => t.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

    const dayColumn = document.createElement('div');
    dayColumn.className = 'day-column';

    const fullDayName = getFullDayName(dayDate);

    dayColumn.innerHTML = `
      <div class="day-header">
        <span class="day-name">${getShortDayName(dayDate)}</span>
        <span class="day-date">${dayDate.getDate()} <span class="day-fullname">${fullDayName}</span></span>
      </div>
      <div class="day-slots">
        ${dayTrainings.length === 0 
          ? '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 24px 0;">Brak treningów tego dnia</p>' 
          : ''}
        ${dayTrainings.map(training => {
          const available = training.capacity - training.booked;
          const isFull = available <= 0;
          const isLow = available > 0 && available <= 2;

          let spotsClass = '';
          if (isFull) spotsClass = 'spots-full';
          else if (isLow) spotsClass = 'spots-low';

          return `
            <div class="training-card">
              <div class="training-time">🕐 ${training.time}</div>
              <div class="training-title">${training.title}</div>
              <div class="training-meta">
                <span class="spots ${spotsClass}">
                  ${isFull ? 'Brak miejsc' : `Miejsca: ${training.booked}/${training.capacity}`}
                </span>
              </div>
              <button class="btn btn-primary btn-book" 
                      ${isFull ? 'disabled' : ''}
                      onclick="openBookingModal(${training.id})">
                ${isFull ? 'Brak miejsc' : 'Zarezerwuj'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    grid.appendChild(dayColumn);
  }
}

function getCurrentWeekStart() {
  const today = new Date();

  // poniedziałek jako początek tygodnia
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function updateWeekButtons() {
  const prevButton = document.getElementById('prevWeek');
  const currentWeek = getCurrentWeekStart();

  if (currentWeekStart <= currentWeek) {
    prevButton.disabled = true;
    prevButton.style.opacity = "0.4";
    prevButton.style.cursor = "not-allowed";
  } else {
    prevButton.disabled = false;
    prevButton.style.opacity = "1";
    prevButton.style.cursor = "pointer";
  }
}

// Week navigation
document.getElementById('prevWeek').addEventListener('click', () => {
  const currentWeek = getCurrentWeekStart();

  if (currentWeekStart <= currentWeek) {
    return;
  }

  currentWeekStart = addDays(currentWeekStart, -7);
  renderCalendar();
  updateWeekButtons();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  renderCalendar();
  updateWeekButtons();
});

// ================= BOOKING MODAL =================
function openBookingModal(trainingId) {
  const trainings = await getTrainings();
  const training = trainings.find(t => t.id === trainingId);
  if (!training) return;

  selectedTraining = training;

  document.getElementById('modalTrainingTitle').textContent = training.title;
  document.getElementById('modalTrainingDate').textContent = formatDatePL(strToDate(training.date));
  document.getElementById('modalTrainingTime').textContent = training.time;

  const available = training.capacity - training.booked;
  const spotsEl = document.getElementById('modalTrainingSpots');
  spotsEl.textContent = `${available} z ${training.capacity}`;
  spotsEl.style.color = available <= 2 ? 'var(--warning)' : 'var(--accent)';

  document.getElementById('bookingForm').reset();
  document.getElementById('bookingModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

window.openBookingModal = openBookingModal;

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
  document.body.style.overflow = '';
  selectedTraining = null;
}

document.getElementById('closeModal').addEventListener('click', closeBookingModal);
document.getElementById('bookingModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('bookingModal')) closeBookingModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeBookingModal();
});

// Swipe to close modal on mobile
let touchStartY = 0;
const modalEl = document.querySelector('.modal');
if (modalEl) {
  modalEl.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
  modalEl.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY > 120) closeBookingModal();
  });
}

// ================= BOOKING FORM =================
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedTraining) return;

  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const notes = document.getElementById('notes').value.trim();

  await bookTraining(selectedTraining.id, name, email, phone, notes);
});

async function bookTraining(trainingId, name, email, phone = '', notes = '') {
  try {
    await new Promise(resolve => setTimeout(resolve, 600));

    const trainings = await getTrainings();
    const training = trainings.find(t => t.id === trainingId);
    if (!training) throw new Error('Trening nie istnieje');
    if (training.booked >= training.capacity) throw new Error('Brak wolnych miejsc');

    const bookings = getBookings();
    bookings.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      trainingId: trainingId,
      name,
      email,
      phone,
      notes,
      createdAt: new Date().toISOString()
    });
    saveBookings(bookings);

    training.booked += 1;
    saveTrainings(trainings);

    closeBookingModal();
    renderCalendar();
    showNotification('Rezerwacja potwierdzona! ✅', 'success');

  } catch (error) {
    showNotification(error.message || 'Wystąpił błąd podczas rezerwacji.', 'error');
  }
}

// ================= NOTIFICATIONS =================
function showNotification(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'toast-notification';
  notification.style.cssText = `
    position: fixed; bottom: 20px; left: 16px; right: 16px;
    padding: 16px 20px; border-radius: 14px; text-align: center;
    font-size: 1rem; font-weight: 600; z-index: 9999;
    animation: toastSlideUp 0.35s ease-out;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    ${type === 'success' 
      ? 'background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);' 
      : 'background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35);'}
  `;
  notification.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'toastSlideUp 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  renderCalendar();
  updateWeekButtons();
  highlightActiveSection();
});
