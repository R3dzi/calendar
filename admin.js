/**
 * ============================================================
 * FitReserve Admin Panel (Mobile-First)
 * ============================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://josdglurvhbcbjtkywyv.supabase.co";
const SUPABASE_KEY = "sb_publishable__bzqXmvZvSFgQKyCNk_Y_g_q7I-J-Mv";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


async function checkAdmin() {

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Błąd pobierania sesji:", error);
        window.location.href = "login.html";
        return false;
    }

    const session = data.session;

    if (!session) {
        console.log("Brak sesji - przekierowanie do logowania");
        window.location.replace("login.html");
        return false;
    }

    console.log("Admin zalogowany:", session.user.email);

    return true;
}


const STORAGE_KEY = 'fitreserve_trainings';
const BOOKINGS_KEY = 'fitreserve_bookings';

async function getTrainings() {

  const { data, error } = await supabase
    .from("trainings")
    .select(`
      *,
      bookings (
        id
      )
    `)
    .order("date")
    .order("time");

  if(error){
    console.error(error);
    return [];
  }


  return data.map(training => ({
    ...training,
    booked: training.bookings ? training.bookings.length : 0
  }));
}

async function saveTrainings(trainings) {

  const cleanedTrainings = trainings.map(t => ({
    id: t.id,
    date: t.date,
    time: t.time,
    title: t.title,
    capacity: t.capacity,
    group_id: t.groupId || null
  }));

  const { error } = await supabase
    .from("trainings")
    .insert(cleanedTrainings);

  if(error){
    console.error(error);
    throw error;
  }

}

async function getBookings() {

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    console.error(error);
    return [];
  }

  return data;
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function generateGroupId() {
  return 'grp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// --- POPRAWIONE FUNKCJE DATY (bez toISOString) ---
function formatDatePL(dateStr) {
  const date = strToDate(dateStr);
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

function getDayNamePL(dateStr) {
  const date = strToDate(dateStr);
  const days = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  return days[date.getDay()];
}

function strToDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToStr(dateStr, days) {
  const date = strToDate(dateStr);
  date.setDate(date.getDate() + days);
  return dateToStr(date);
}

function showNotification(message, type = 'success') {
  const existing = document.querySelector('.admin-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'admin-notification';
  notification.style.cssText = `
    position: fixed; bottom: 16px; left: 16px; right: 16px;
    padding: 16px 20px; border-radius: 14px; text-align: center;
    font-size: 1rem; font-weight: 600; z-index: 9999;
    animation: toastSlideUp 0.3s ease-out;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    ${type === 'success'
      ? 'background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);'
      : 'background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35);'}
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'toastSlideUp 0.25s ease-out reverse';
    setTimeout(() => notification.remove(), 250);
  }, 3000);
}

// --- STATYSTYKI ---
async function updateStats() {
  const bookings = await getBookings();
  const trainings = await getTrainings();
  const totalTrainings = trainings.length;
  const totalBookings = bookings.length;
  const totalCapacity = trainings.reduce((sum, t) => sum + t.capacity, 0);
  const availableSpots = totalCapacity - trainings.reduce((sum, t) => sum + t.booked, 0);
  const fullTrainings = trainings.filter(t => t.booked >= t.capacity).length;

  document.getElementById('statTotalTrainings').textContent = totalTrainings;
  document.getElementById('statTotalBookings').textContent = totalBookings;
  document.getElementById('statAvailableSpots').textContent = availableSpots;
  document.getElementById('statFullTrainings').textContent = fullTrainings;
}

// --- TABELA TRENINGÓW ---
async function renderTable() {
  const tbody = document.getElementById('adminTableBody');
  const trainings = await getTrainings();
  const sorted = [...trainings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.95rem;">
          Brak treningów. Dodaj pierwszy trening powyżej.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(t => {
    const available = t.capacity - t.booked;
    const percent = (t.booked / t.capacity) * 100;
    let statusBadge = '';
    if (available === 0) statusBadge = '<span class="badge badge-danger">Pełny</span>';
    else if (percent >= 75) statusBadge = '<span class="badge badge-warning">Mało</span>';
    else statusBadge = '<span class="badge badge-success">OK</span>';

    const isCyclic = !!t.groupId;
    const cyclicBadge = isCyclic ? '<span class="badge badge-info" style="margin-left: 4px;">🔄</span>' : '';

    return `
      <tr data-id="${t.id}">
        <td>${formatDatePL(t.date)}</td>
        <td>${t.time}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${t.title}${cyclicBadge}</td>
        <td>${t.capacity}</td>
        <td>${t.booked}</td>
        <td style="color: ${available === 0 ? 'var(--danger)' : 'var(--accent)'}; font-weight: 600;">${available}</td>
        <td>${statusBadge}</td>
        <td class="actions">
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteTraining(${t.id})">🗑</button>
        </td>
      </tr>`;
  }).join('');
}

// --- LISTA ZAPISANYCH OSÓB ---
async function renderBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  const bookings = await getBookings();
  const trainings = await getTrainings();

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.95rem;">
          Nikt się jeszcze nie zapisał.
        </td>
      </tr>`;
    return;
  }

  // Sortuj od najnowszych
  const sorted = [...bookings].sort((a, b) => new Date(b.created_at) - new Date(a.createdAt));

  tbody.innerHTML = sorted.map(b => {
    const training = trainings.find(t => t.id === b.training_id);
    const trainingInfo = training 
      ? `${training.title}, ${formatDatePL(training.date)} ${training.time}` 
      : 'Trening usunięty';

    return `
      <tr data-booking-id="${b.id}">
        <td style="font-weight: 600; color: var(--text-primary);">${b.name}</td>
        <td>${b.email}</td>
        <td>-</td>
        <td>${trainingInfo}</td>
        <td>${b.notes || '-'}</td>
        <td class="actions">
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteBooking(${b.id})">🗑 Usuń zapis</button>
        </td>
      </tr>`;
  }).join('');
}

// --- USUWANIE TRENINGU ---
let deleteTrainingId = null;

async function confirmDeleteTraining(trainingId) {
  deleteTrainingId = trainingId;
  const trainings = await getTrainings();
  const training = trainings.find(t => t.id === trainingId);
  if (!training) return;

  const isCyclic = !!training.groupId;
  const sameGroupCount = isCyclic ? trainings.filter(t => t.groupId === training.groupId).length : 1;

  document.getElementById('confirmTitle').textContent = 'Usuwanie treningu';
  document.getElementById('confirmMessage').innerHTML = `
    Czy na pewno chcesz usunąć <strong>${training.title}</strong> 
    (${formatDatePL(training.date)}, ${training.time})?
    ${isCyclic ? `<br><br><label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-secondary); font-size: 0.95rem; margin-top: 8px;">
      <input type="checkbox" id="deleteSeries" style="width: 22px; height: 22px; accent-color: var(--danger); flex-shrink: 0;">
      <span>Usuń całą serię cykliczną (${sameGroupCount} treningów)</span>
    </label>` : ''}
  `;

  document.getElementById('confirmOverlay').classList.add('active');
}

// --- USUWANIE ZAPISU ---
let deleteBookingId = null;

async function confirmDeleteBooking(bookingId) {
  deleteBookingId = bookingId;
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const trainings = await getTrainings();
  const training = trainings.find(t => t.id === booking.training_id);

  document.getElementById('confirmTitle').textContent = 'Usuwanie zapisu';
  document.getElementById('confirmMessage').innerHTML = `
    Czy na pewno chcesz usunąć zapis <strong>${booking.name}</strong> 
    ${training ? `na trening <strong>${training.title}</strong> (${formatDatePL(training.date)})` : ''}?
    <br><br><span style="color: var(--text-muted); font-size: 0.9rem;">Liczba zapisanych osób na ten trening zostanie zmniejszona o 1.</span>
  `;

  document.getElementById('confirmOverlay').classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  deleteTrainingId = null;
  deleteBookingId = null;
}

async function deleteBooking(id){

 const { error } = await supabase
   .from("bookings")
   .delete()
   .eq("id", id);

 if(error){
   console.error(error);
   throw error;
 }
}

async function executeDelete() {
  // Sprawdź czy usuwamy trening czy booking
  if (deleteTrainingId !== null) {
    const trainings = await getTrainings();
    const training = trainings.find(t => t.id === deleteTrainingId);
    if (!training) { closeConfirm(); return; }

    const deleteSeriesCheckbox = document.getElementById('deleteSeries');
    const deleteSeries = deleteSeriesCheckbox && deleteSeriesCheckbox.checked;

    let newTrainings;
    if (deleteSeries && training.groupId) {
      newTrainings = trainings.filter(t => t.groupId !== training.groupId);
      showNotification('Usunięto serię cykliczną', 'success');
    } else {
      newTrainings = trainings.filter(t => t.id !== deleteTrainingId);
      showNotification('Trening usunięty', 'success');
    }

    await deleteTraining(deleteTrainingId);
  }

    if (deleteBookingId !== null) {
    
        await deleteBooking(deleteBookingId);
    
        showNotification('Zapis usunięty', 'success');
    }
    
      closeConfirm();
      renderTable();
      renderBookings();
      updateStats();
    }

// --- CYCLIC PREVIEW ---
function updateCyclicPreview() {
  const type = document.querySelector('input[name="trainingType"]:checked').value;
  const previewEl = document.getElementById('cyclicPreview');
  if (type !== 'cyclic') {
    previewEl.textContent = '';
    return;
  }

  const date = document.getElementById('trainingDate').value;
  const intervalWeeks = parseInt(document.getElementById('intervalWeeks').value, 10) || 1;
  const weeksCount = parseInt(document.getElementById('weeksCount').value, 10) || 4;

  if (!date) {
    previewEl.textContent = 'Wybierz datę startu.';
    return;
  }

  const intervalDays = intervalWeeks * 7;
  const maxDays = weeksCount * 7;

  let totalCount = 0;
  let currentDate = date;
  const maxIterations = 100;
  while (strToDate(currentDate) < strToDate(addDaysToStr(date, maxDays)) && totalCount < maxIterations) {
    totalCount++;
    currentDate = addDaysToStr(currentDate, intervalDays);
  }

  const dayName = getDayNamePL(date);

  if (intervalWeeks === 1) {
    previewEl.innerHTML = `Wygeneruje <strong>${totalCount} treningów</strong> w każdą <strong>${dayName}</strong> przez <strong>${weeksCount} tygodni</strong>.`;
  } else {
    previewEl.innerHTML = `Wygeneruje <strong>${totalCount} treningów</strong> w <strong>${dayName}</strong> co <strong>${intervalWeeks} tygodni</strong>.`;
  }
}

function updateDayHint() {
  const date = document.getElementById('trainingDate').value;
  const hint = document.getElementById('dayOfWeekHint');
  if (date) {
    hint.textContent = '📅 ' + getDayNamePL(date).charAt(0).toUpperCase() + getDayNamePL(date).slice(1);
  } else {
    hint.textContent = '';
  }
  updateCyclicPreview();
}

function toggleCyclicFields() {
  const isCyclic = document.querySelector('input[name="trainingType"]:checked').value === 'cyclic';
  const cyclicFields = document.getElementById('cyclicFields');
  if (isCyclic) {
    cyclicFields.style.display = 'block';
    cyclicFields.style.animation = 'fadeInUp 0.25s ease-out';
  } else {
    cyclicFields.style.display = 'none';
  }
  updateCyclicPreview();
}
// --- DELETE TRAINING ---
async function deleteTraining(id){

 const { error } = await supabase
   .from("trainings")
   .delete()
   .eq("id", id);

 if(error){
   console.error(error);
   throw error;
 }
}

// --- ADD TRAINING ---
async function handleAddTraining(e) {
  e.preventDefault();

  const titleSelect = document.getElementById('trainingTitle');
  const customTitle = document.getElementById('customTitle').value.trim();
  const title = titleSelect.value === 'custom' ? customTitle : titleSelect.value;

  if (!title) {
    showNotification('Podaj nazwę treningu', 'error');
    return;
  }

  const date = document.getElementById('trainingDate').value;
  const time = document.getElementById('trainingTime').value;
  const capacity = parseInt(document.getElementById('trainingCapacity').value, 10);
  const type = document.querySelector('input[name="trainingType"]:checked').value;

  if (!date || !time || !capacity) {
    showNotification('Wypełnij wszystkie wymagane pola', 'error');
    return;
  }

  const trainings = await getTrainings();
  const newTrainings = [];

  if (type === 'single') {
    newTrainings.push({ 
     id: generateId(),
     date,
     time,
     title,
     capacity
    });
  } else {
    const intervalWeeks = parseInt(document.getElementById('intervalWeeks').value, 10) || 1;
    const weeksCount = parseInt(document.getElementById('weeksCount').value, 10) || 4;
    const intervalDays = intervalWeeks * 7;
    const maxDays = weeksCount * 7;

    const groupId = generateGroupId();
    let currentDate = date;
    let count = 0;
    const maxIterations = 100;

    while (strToDate(currentDate) < strToDate(addDaysToStr(date, maxDays)) && count < maxIterations) {
      newTrainings.push({ 
         id: generateId(),
         date: currentDate,
         time,
         title,
         capacity,
         groupId
        });
      currentDate = addDaysToStr(currentDate, intervalDays);
      count++;
    }
  }

  // Check conflicts
  const conflicts = [];
  for (const nt of newTrainings) {
    const existing = trainings.find(t => t.date === nt.date && t.time === nt.time);
    if (existing) conflicts.push(`${nt.date} ${nt.time}`);
  }

  if (conflicts.length > 0) {
    showNotification(`Konflikt: ${conflicts[0]}`, 'error');
    return;
  }

  await saveTrainings(newTrainings);

  const msg = type === 'single'
    ? 'Trening dodany ✅'
    : `Dodano ${newTrainings.length} treningów ✅`;
  showNotification(msg, 'success');

  // Reset form
  document.getElementById('addTrainingForm').reset();
  document.getElementById('customTitleWrap').style.display = 'none';
  document.getElementById('dayOfWeekHint').textContent = '';
  document.getElementById('cyclicPreview').textContent = '';
  document.getElementById('trainingTime').value = '17:00';
  document.getElementById('trainingCapacity').value = '6';
  document.getElementById('intervalWeeks').value = '1';
  document.getElementById('weeksCount').value = '4';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('trainingDate').value = dateToStr(tomorrow);

  toggleCyclicFields();
  renderTable();
  updateStats();
}
window.confirmDeleteBooking = confirmDeleteBooking;
window.confirmDeleteTraining = confirmDeleteTraining;

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {

  // Sprawdź czy administrator jest zalogowany
  const isAdmin = await checkAdmin();

  if (!isAdmin) {
      return;
  }

  // Załaduj dane z Supabase
  await renderTable();
  await renderBookings();
  await updateStats();

  // Event listenery
  document.getElementById('addTrainingForm').addEventListener('submit', handleAddTraining);
  document.getElementById('cancelDelete').addEventListener('click', closeConfirm);
  document.getElementById('confirmDelete').addEventListener('click', executeDelete);

  document.getElementById('confirmOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmOverlay')) {
      closeConfirm();
    }
  });

  document.querySelectorAll('input[name="trainingType"]').forEach(radio => {
    radio.addEventListener('change', toggleCyclicFields);
  });

  document.getElementById('trainingTitle').addEventListener('change', (e) => {
    const wrap = document.getElementById('customTitleWrap');

    if (e.target.value === 'custom') {
      wrap.style.display = 'block';
      document.getElementById('customTitle').focus();
    } else {
      wrap.style.display = 'none';
    }
  });

  document.getElementById('trainingDate').addEventListener('change', updateDayHint);
  document.getElementById('intervalWeeks').addEventListener('input', updateCyclicPreview);
  document.getElementById('weeksCount').addEventListener('input', updateCyclicPreview);

  // Domyślna data = jutro
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('trainingDate').value = dateToStr(tomorrow);

  updateDayHint();

});
