const app = document.querySelector(".app");
const screens = [...document.querySelectorAll("[data-screen]")];
const stepPills = [...document.querySelectorAll(".step-pill")];
const calendarGrid = document.getElementById("calendarGrid");
const timeOptions = document.getElementById("timeOptions");
const adminPanel = document.querySelector(".admin-panel");
const adminBackdrop = document.querySelector(".admin-backdrop");
const adminCalendarGrid = document.getElementById("adminCalendarGrid");
const confirmModal = document.querySelector(".confirm-modal");
const confirmBackdrop = document.querySelector(".confirm-backdrop");

let renderedCompanionCount = -1;
let adminTapCount = 0;
let adminTapTimer;

const titles = {
  date: "날짜 선택",
  info: "방문 정보",
  complete: "약속 완료",
};

const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "homeInviteAdminConfig";

const TODAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());

const defaultConfig = {
  rules: {
    weekdayStart: "18:00",
    holidayStart: "10:00",
    end: "21:00",
  },
  holidays: ["2026-05-05", "2026-06-06"],
  blocked: [],
  booked: [],
  content: {
    bgImage: "",
    datePageTitle: "언제 놀러올래?",
    datePageSubtitle: "클릭 가능한 날만 선택돼요",
    inviteEyebrow: "볼디네 집 초대",
    inviteTitle: "저녁 먹고 수다 떨기",
    guideEyebrow: "초대 상세",
    guideTitle: "볼디네 집에 놀러오기",
    infoTitle: "누가 오는지 알려줘",
    infoSubtitle: "호스트에게만 보여요",
    completeTitle: "놀러오는 약속이 잡혔어요!",
    completeSubtitle: "볼디에게 방문 정보가 전달되었습니다.",
    guideNoticeTitle: "알아두면 좋아요",
    guideNoticeLines: [
      "주소는 목동중앙본로 7길 23, 301호예요.",
      "엘리베이터는 1층 공동현관 오른쪽에 있어요.",
      "집 앞 주차는 어렵고, 가까운 공영주차장을 추천해요.",
    ],
    friendGuideTitle: "친구 약속 안내",
    friendGuideLines: [
      "갑자기 못 오게 되면 이 링크에서 일정 변경을 눌러주세요.",
      "주소와 공동현관 안내는 확정 후에 보여드려요.",
      "밤 11시 전에는 마무리하는 약속이에요.",
    ],
    arrivalNotes: {
      transit: "대중교통은 목동역에서 내려 도보 이동을 추천해요.",
      car: "집 앞 주차는 어렵고, 가까운 공영주차장을 이용해주세요.",
      walk: "도보로 오면 골목이 좁아서 큰길 쪽으로 오는 길을 추천해요.",
    },
  },
};

let config = loadConfig();

const [tYear, tMonth] = TODAY_KEY.split("-").map(Number);

const state = {
  step: "date",
  month: new Date(tYear, tMonth - 1, 1),
  dateKey: TODAY_KEY,
  time: "18:00",
  arrival: "대중교통",
  arrivalKey: "transit",
  guests: "2명",
};

const adminState = {
  month: new Date(state.month),
  dateKey: state.dateKey,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        ...clone(defaultConfig),
        ...saved,
        rules: { ...defaultConfig.rules, ...(saved.rules || {}) },
        content: {
          ...clone(defaultConfig.content),
          ...(saved.content || {}),
          arrivalNotes: {
            ...defaultConfig.content.arrivalNotes,
            ...((saved.content || {}).arrivalNotes || {}),
          },
        },
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return clone(defaultConfig);
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function dateFromKey(key) {
  const [year, month, date] = key.split("-").map(Number);
  return new Date(year, month - 1, date);
}

function keyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(key) {
  const date = dateFromKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일(${dayNames[date.getDay()]})`;
}

function timeRange(start, end) {
  const slots = [];
  const [startHour] = start.split(":").map(Number);
  const [endHour] = end.split(":").map(Number);
  for (let hour = startHour; hour <= endHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
}

function isHolidayOrWeekend(key) {
  const day = dateFromKey(key).getDay();
  return day === 0 || day === 6 || config.holidays.includes(key);
}

function isPastDate(key) {
  return key < TODAY_KEY;
}

function availableTimesFor(key) {
  if (isPastDate(key)) return [];
  if (config.blocked.includes(key) || config.booked.includes(key)) return [];
  const start = isHolidayOrWeekend(key) ? config.rules.holidayStart : config.rules.weekdayStart;
  return timeRange(start, config.rules.end);
}

function firstAvailableKey() {
  const cursor = new Date(state.month);
  for (let i = 0; i < 370; i += 1) {
    const key = keyFromDate(cursor);
    if (availableTimesFor(key).length) return key;
    cursor.setDate(cursor.getDate() + 1);
  }
  return "";
}

function ensureSelectedDateIsAvailable() {
  const times = availableTimesFor(state.dateKey);
  if (times.length) return;

  const nextKey = firstAvailableKey();
  if (!nextKey) return;

  state.dateKey = nextKey;
  const date = dateFromKey(nextKey);
  state.month = new Date(date.getFullYear(), date.getMonth(), 1);
  state.time = availableTimesFor(nextKey)[0];
}

function renderMonthGrid(container, monthDate, selectedKey, mode) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();

  container.innerHTML = "";

  for (let i = 0; i < startOffset; i += 1) {
    const outsideDate = document.createElement("span");
    outsideDate.className = "outside-month";
    outsideDate.textContent = prevLastDate - startOffset + i + 1;
    container.append(outsideDate);
  }

  for (let date = 1; date <= lastDate; date += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    const button = document.createElement("button");
    const times = availableTimesFor(key);
    button.type = "button";
    button.textContent = date;
    button.dataset[mode === "admin" ? "adminDateKey" : "dateKey"] = key;
    button.classList.toggle("available", Boolean(times.length));
    button.classList.toggle("open", Boolean(times.length));
    button.classList.toggle("selected", key === selectedKey);
    button.classList.toggle("holiday", isHolidayOrWeekend(key));
    button.classList.toggle("booked", config.booked.includes(key));
    button.classList.toggle("blocked", config.blocked.includes(key));
    button.classList.toggle("past", isPastDate(key));
    if (mode !== "admin") button.disabled = !times.length;
    if (mode === "admin") button.disabled = isPastDate(key);
    container.append(button);
  }

  const renderedCells = startOffset + lastDate;
  const trailingCells = Math.ceil(renderedCells / 7) * 7 - renderedCells;
  for (let i = 1; i <= trailingCells; i += 1) {
    const outsideDate = document.createElement("span");
    outsideDate.className = "outside-month";
    outsideDate.textContent = i;
    container.append(outsideDate);
  }
}

function renderCalendar() {
  setText("monthLabel", `${state.month.getFullYear()}년 ${state.month.getMonth() + 1}월`);
  renderMonthGrid(calendarGrid, state.month, state.dateKey, "friend");
}

function renderTimes() {
  const times = availableTimesFor(state.dateKey);
  if (!times.includes(state.time)) state.time = times[0] || "";

  timeOptions.innerHTML = "";
  if (!times.length) {
    const empty = document.createElement("p");
    empty.className = "empty-time";
    empty.textContent = "선택 가능한 시간이 아직 없어요.";
    timeOptions.append(empty);
    return;
  }

  times.forEach((time) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = time;
    button.dataset.time = time;
    button.classList.toggle("is-active", time === state.time);
    timeOptions.append(button);
  });
}

function renderLines(listId, lines) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = "";
  lines.filter(Boolean).forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  });
}

function countAvailableSlotsInMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  let availableCount = 0;

  for (let date = 1; date <= lastDate; date += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    if (availableTimesFor(key).length > 0) {
      availableCount += 1;
    }
  }
  return availableCount;
}



function syncContent() {
  const bgUrl = config.content.bgImage ? `url("${config.content.bgImage}")` : 'none';
  document.querySelectorAll('.home-visual, .hero-visual, .summary-visual').forEach(el => {
    el.style.setProperty('--custom-bg', bgUrl);
  });

  setText("datePageTitle", config.content.datePageTitle);
  setText("datePageSubtitle", config.content.datePageSubtitle);
  setText("inviteEyebrow", config.content.inviteEyebrow);
  setText("inviteTitle", config.content.inviteTitle);
  setText("guideEyebrow", config.content.guideEyebrow);
  setText("guideTitle", config.content.guideTitle);
  setText("infoTitle", config.content.infoTitle);
  setText("infoSubtitle", config.content.infoSubtitle);
  setText("completeTitle", config.content.completeTitle);
  setText("completeSubtitle", config.content.completeSubtitle);
  setText("guideNoticeTitle", config.content.guideNoticeTitle);
  setText("friendGuideTitle", config.content.friendGuideTitle);
  renderLines("guideNoticeList", config.content.guideNoticeLines);
  renderLines("friendGuideList", config.content.friendGuideLines);
  setText("arrivalNote", config.content.arrivalNotes[state.arrivalKey]);
}

function syncCalendarLink() {
  const link = document.getElementById("calendarLink");
  if (!link) return;
  const date = dateFromKey(state.dateKey);
  const [hour, minute] = state.time.split(":").map(Number);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const toGoogleDate = (value) => value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "볼디네 집에 놀러가기",
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: "친구 초대 약속입니다.",
    location: "목동중앙본로 7길 23, 301호",
  });
  link.href = `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function updateMetaTags() {
  const availableDays = countAvailableSlotsInMonth(state.month);
  const description = `이번 달 남은 일정 ${availableDays}개`;

  document.getElementById('ogDescription').setAttribute('content', description);
  document.getElementById('twitterDescription').setAttribute('content', description);
}


function syncUI() {
  if (state.step !== "complete") ensureSelectedDateIsAvailable();
  const formattedDate = formatDate(state.dateKey);
  const schedule = `${formattedDate} ${state.time}`;

  app.dataset.step = state.step;
  screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === state.step));
  stepPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.go === state.step));

  setText("screenTitle", titles[state.step]);
  setText("selectedDateLine", schedule);
  setText("guideDate", formattedDate);
  setText("guideTime", state.time);
  setText("completeDate", formattedDate);
  setText("completeTime", state.time);
  setText("completeArrival", state.arrival);
  setText("completeGuests", state.guests);
  setText("sideSchedule", `${schedule} · 목동중앙본로 7길 23, 301호`);

  renderCalendar();
  renderTimes();
  renderCompanions();
  syncContent();
  syncCalendarLink();
  updateMetaTags();
}

function renderCompanions() {
  const companionFields = document.getElementById("companionFields");
  if (!companionFields) return;

  const guestTotal = Number.parseInt(state.guests, 10) || 1;
  const companionCount = Math.max(guestTotal - 1, 0);
  if (companionCount === renderedCompanionCount) return;

  renderedCompanionCount = companionCount;
  companionFields.innerHTML = "";

  for (let index = 1; index <= companionCount; index += 1) {
    const card = document.createElement("section");
    card.className = "companion-card";
    card.innerHTML = `
      <h2>동행인 ${index}</h2>
      <label>
        <span>이름</span>
        <input type="text" class="companion-name" placeholder="동행인 이름" autocomplete="off" />
      </label>
    `;
    companionFields.append(card);
  }
}

function fillTimeSelect(select, selectedValue) {
  if (!select) return;
  select.innerHTML = "";
  timeRange("10:00", "21:00").forEach((time) => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    option.selected = time === selectedValue;
    select.append(option);
  });
}

function renderAdminCalendar() {
  if (!adminCalendarGrid) return;
  setText("adminMonthLabel", `${adminState.month.getFullYear()}년 ${adminState.month.getMonth() + 1}월`);
  renderMonthGrid(adminCalendarGrid, adminState.month, adminState.dateKey, "admin");
  syncAdminForm();
}

function syncAdminForm() {
  const selectedTimes = availableTimesFor(adminState.dateKey);
  setInputValue("adminDateInput", formatDate(adminState.dateKey));
  setChecked("holidayToggle", config.holidays.includes(adminState.dateKey));
  setChecked("blockedToggle", config.blocked.includes(adminState.dateKey));
  setChecked("bookedToggle", config.booked.includes(adminState.dateKey));
  setText(
    "adminDateSummary",
    selectedTimes.length ? `친구에게 ${selectedTimes[0]}부터 ${selectedTimes[selectedTimes.length - 1]}까지 보여요.` : "친구 화면에서 선택할 수 없는 날짜예요.",
  );
}

function setInputValue(id, value) {
  const node = document.getElementById(id);
  if (node) node.value = value;
}

function setChecked(id, value) {
  const node = document.getElementById(id);
  if (node) node.checked = value;
}

function openAdminPanel() {
  adminState.month = new Date(state.month);
  adminState.dateKey = state.dateKey;
  fillTimeSelect(document.getElementById("weekdayStartInput"), config.rules.weekdayStart);
  fillTimeSelect(document.getElementById("holidayStartInput"), config.rules.holidayStart);
  fillTimeSelect(document.getElementById("endTimeInput"), config.rules.end);
  setInputValue("bgImageInput", config.content.bgImage || "");
  setInputValue("guideNoticeTitleInput", config.content.guideNoticeTitle);
  setInputValue("datePageTitleInput", config.content.datePageTitle);
  setInputValue("datePageSubtitleInput", config.content.datePageSubtitle);
  setInputValue("inviteEyebrowInput", config.content.inviteEyebrow);
  setInputValue("inviteTitleInput", config.content.inviteTitle);
  setInputValue("guideEyebrowInput", config.content.guideEyebrow);
  setInputValue("guideTitleInput", config.content.guideTitle);
  setInputValue("guideNoticeInput", config.content.guideNoticeLines.join("\n"));
  setInputValue("friendGuideTitleInput", config.content.friendGuideTitle);
  setInputValue("friendGuideInput", config.content.friendGuideLines.join("\n"));
  setInputValue("infoTitleInput", config.content.infoTitle);
  setInputValue("infoSubtitleInput", config.content.infoSubtitle);
  setInputValue("completeTitleInput", config.content.completeTitle);
  setInputValue("completeSubtitleInput", config.content.completeSubtitle);
  setInputValue("transitNoteInput", config.content.arrivalNotes.transit);
  setInputValue("carNoteInput", config.content.arrivalNotes.car);
  setInputValue("walkNoteInput", config.content.arrivalNotes.walk);
  adminBackdrop.hidden = false;
  adminPanel.hidden = false;
  renderAdminCalendar();
}

function closeAdminPanel() {
  adminBackdrop.hidden = true;
  adminPanel.hidden = true;
}

function toggleListValue(list, value, enabled) {
  const next = new Set(list);
  if (enabled) next.add(value);
  else next.delete(value);
  return [...next].sort();
}

function saveAdminSettings() {
  config.rules.weekdayStart = document.getElementById("weekdayStartInput").value;
  config.rules.holidayStart = document.getElementById("holidayStartInput").value;
  config.rules.end = document.getElementById("endTimeInput").value;
  config.content.bgImage = document.getElementById("bgImageInput").value.trim();
  config.content.datePageTitle = document.getElementById("datePageTitleInput").value.trim() || defaultConfig.content.datePageTitle;
  config.content.datePageSubtitle = document.getElementById("datePageSubtitleInput").value.trim() || defaultConfig.content.datePageSubtitle;
  config.content.inviteEyebrow = document.getElementById("inviteEyebrowInput").value.trim() || defaultConfig.content.inviteEyebrow;
  config.content.inviteTitle = document.getElementById("inviteTitleInput").value.trim() || defaultConfig.content.inviteTitle;
  config.content.guideEyebrow = document.getElementById("guideEyebrowInput").value.trim() || defaultConfig.content.guideEyebrow;
  config.content.guideTitle = document.getElementById("guideTitleInput").value.trim() || defaultConfig.content.guideTitle;
  config.content.guideNoticeTitle = document.getElementById("guideNoticeTitleInput").value.trim() || defaultConfig.content.guideNoticeTitle;
  config.content.guideNoticeLines = document.getElementById("guideNoticeInput").value.split("\n").map((line) => line.trim()).filter(Boolean);
  config.content.friendGuideTitle = document.getElementById("friendGuideTitleInput").value.trim() || defaultConfig.content.friendGuideTitle;
  config.content.friendGuideLines = document.getElementById("friendGuideInput").value.split("\n").map((line) => line.trim()).filter(Boolean);
  config.content.infoTitle = document.getElementById("infoTitleInput").value.trim() || defaultConfig.content.infoTitle;
  config.content.infoSubtitle = document.getElementById("infoSubtitleInput").value.trim() || defaultConfig.content.infoSubtitle;
  config.content.completeTitle = document.getElementById("completeTitleInput").value.trim() || defaultConfig.content.completeTitle;
  config.content.completeSubtitle = document.getElementById("completeSubtitleInput").value.trim() || defaultConfig.content.completeSubtitle;
  config.content.arrivalNotes.transit = document.getElementById("transitNoteInput").value.trim();
  config.content.arrivalNotes.car = document.getElementById("carNoteInput").value.trim();
  config.content.arrivalNotes.walk = document.getElementById("walkNoteInput").value.trim();
  saveConfig();
  showSaveStatus("저장됐어요.");
  syncUI();
  renderAdminCalendar();
}

function resetAdminSettings() {
  config = clone(defaultConfig);
  saveConfig();
  showSaveStatus("초기화했어요.");
  syncUI();
  openAdminPanel();
}

function showSaveStatus(message) {
  setText("adminSaveStatus", message);
  window.clearTimeout(showSaveStatus.timer);
  showSaveStatus.timer = window.setTimeout(() => setText("adminSaveStatus", ""), 1800);
}

function blockDateRange(days) {
  const cursor = dateFromKey(adminState.dateKey);
  for (let i = 0; i < days; i += 1) {
    const key = keyFromDate(cursor);
    if (!isPastDate(key)) {
      config.blocked = toggleListValue(config.blocked, key, true);
      config.booked = toggleListValue(config.booked, key, false);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  saveConfig();
  showSaveStatus(`${days}일을 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

function blockRemainingMonth() {
  const cursor = dateFromKey(adminState.dateKey);
  const month = cursor.getMonth();
  let count = 0;
  while (cursor.getMonth() === month) {
    const key = keyFromDate(cursor);
    if (!isPastDate(key)) {
      config.blocked = toggleListValue(config.blocked, key, true);
      config.booked = toggleListValue(config.booked, key, false);
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  saveConfig();
  showSaveStatus(`${count}개 날짜를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

function blockWeekdaysInMonth() {
  const cursor = dateFromKey(adminState.dateKey);
  const month = cursor.getMonth();
  let count = 0;
  while (cursor.getMonth() === month) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) {
      const key = keyFromDate(cursor);
      if (!isPastDate(key)) {
        config.blocked = toggleListValue(config.blocked, key, true);
        config.booked = toggleListValue(config.booked, key, false);
        count += 1;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  saveConfig();
  showSaveStatus(`남은 평일 ${count}개를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

function blockRelativeRange(rangeStr) {
  const [start, end] = rangeStr.split(",").map(Number);
  const base = dateFromKey(adminState.dateKey);
  for (let i = start; i <= end; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const key = keyFromDate(d);
    if (!isPastDate(key)) {
      config.blocked = toggleListValue(config.blocked, key, true);
      config.booked = toggleListValue(config.booked, key, false);
    }
  }
  saveConfig();
  showSaveStatus(`선택일 기준 범위를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

function go(step) {
  state.step = step;
  syncUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finalizeBooking() {
  config.booked = toggleListValue(config.booked, state.dateKey, true);
  saveConfig();
  go("complete");
}

function maybeConfirmCompanionDuplicate() {
  const hasCompanionName = [...document.querySelectorAll(".companion-name")].some((input) => input.value.trim());
  if (!hasCompanionName) {
    finalizeBooking();
    return;
  }
  confirmBackdrop.hidden = false;
  confirmModal.hidden = false;
}

function closeConfirmModal() {
  confirmBackdrop.hidden = true;
  confirmModal.hidden = true;
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  const monthButton = event.target.closest("[data-month]");
  const dateButton = event.target.closest("[data-date-key]");
  const timeButton = event.target.closest("[data-time]");
  const arrivalButton = event.target.closest("[data-arrival]");
  const adminDateButton = event.target.closest("[data-admin-date-key]");
  const adminMonthButton = event.target.closest("[data-admin-month]");

  if (event.target.closest("[data-admin-trigger]")) {
    clearTimeout(adminTapTimer);
    adminTapCount += 1;
    adminTapTimer = setTimeout(() => {
      adminTapCount = 0;
    }, 1200);
    if (adminTapCount >= 5) {
      adminTapCount = 0;
      openAdminPanel();
    }
    return;
  }

  if (event.target.closest("[data-admin-close]")) {
    closeAdminPanel();
    return;
  }

  if (adminMonthButton) {
    const direction = adminMonthButton.dataset.adminMonth === "next" ? 1 : -1;
    adminState.month = new Date(adminState.month.getFullYear(), adminState.month.getMonth() + direction, 1);
    renderAdminCalendar();
    return;
  }

  if (adminDateButton) {
    if (adminDateButton.disabled) return;
    adminState.dateKey = adminDateButton.dataset.adminDateKey;
    renderAdminCalendar();
    return;
  }

  const rangeButton = event.target.closest("[data-admin-block-range]");
  if (rangeButton) {
    blockDateRange(Number(rangeButton.dataset.adminBlockRange));
    return;
  }

  if (event.target.closest("[data-admin-block-month]")) {
    blockRemainingMonth();
    return;
  }

  if (event.target.closest("[data-admin-block-weekdays]")) {
    blockWeekdaysInMonth();
    return;
  }

  const relativeButton = event.target.closest("[data-admin-block-relative]");
  if (relativeButton) {
    blockRelativeRange(relativeButton.dataset.adminBlockRelative);
    return;
  }

  if (event.target.closest("[data-admin-save]")) {
    saveAdminSettings();
    return;
  }

  if (event.target.closest("[data-admin-reset]")) {
    resetAdminSettings();
    return;
  }

  if (event.target.closest("[data-confirm-cancel]")) {
    closeConfirmModal();
    return;
  }

  if (event.target.closest("[data-confirm-submit]")) {
    closeConfirmModal();
    finalizeBooking();
    return;
  }

  if (goButton) {
    go(goButton.dataset.go);
    return;
  }

  if (event.target.closest("[data-action='back']")) {
    const order = ["date", "info", "complete"];
    const index = order.indexOf(state.step);
    go(order[Math.max(index - 1, 0)]);
    return;
  }

  if (monthButton) {
    const direction = monthButton.dataset.month === "next" ? 1 : -1;
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + direction, 1);
    renderCalendar();
    return;
  }

  if (dateButton) {
    state.dateKey = dateButton.dataset.dateKey;
    state.time = availableTimesFor(state.dateKey)[0];
    syncUI();
    return;
  }

  if (timeButton) {
    state.time = timeButton.dataset.time;
    syncUI();
    return;
  }

  if (arrivalButton) {
    document.querySelectorAll("[data-arrival]").forEach((button) => {
      button.classList.toggle("is-active", button === arrivalButton);
    });
    state.arrivalKey = arrivalButton.dataset.arrival;
    state.arrival = {
      transit: "대중교통",
      car: "자가",
      walk: "도보",
    }[state.arrivalKey];
    syncUI();
  }

  if (event.target.closest("[data-complete]")) {
    maybeConfirmCompanionDuplicate();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "guestCount") {
    state.guests = `${event.target.value}명`;
    syncUI();
  }

  if (event.target.id === "holidayToggle") {
    config.holidays = toggleListValue(config.holidays, adminState.dateKey, event.target.checked);
    saveConfig();
    showSaveStatus("공휴일 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }

  if (event.target.id === "blockedToggle") {
    config.blocked = toggleListValue(config.blocked, adminState.dateKey, event.target.checked);
    if (event.target.checked) config.booked = toggleListValue(config.booked, adminState.dateKey, false);
    saveConfig();
    showSaveStatus("예약 불가 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }

  if (event.target.id === "bookedToggle") {
    config.booked = toggleListValue(config.booked, adminState.dateKey, event.target.checked);
    if (event.target.checked) config.blocked = toggleListValue(config.blocked, adminState.dateKey, false);
    saveConfig();
    showSaveStatus("예약 완료 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!adminPanel.hidden) closeAdminPanel();
    if (!confirmModal.hidden) closeConfirmModal();
  }
});

syncUI();
