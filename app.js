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
const authModal = document.querySelector(".auth-modal");
const authBackdrop = document.querySelector(".auth-backdrop");
const passwordInput = document.getElementById("adminPasswordInput");

const SUPABASE_URL = 'https://btzexlsyesskkfeulwuh.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emV4bHN5ZXNza2tmZXVsd3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzY1OTEsImV4cCI6MjA5Mzc1MjU5MX0.DtL0JDt3wOKh9KxeXDYaMKCa4OPiO3yX_dny_a_1sLQ';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); // 'new' 삭제 (CDN 방식에서는 사용 안 함)

let renderedCompanionCount = -1;
let adminTapCount = 0;
let adminTapTimer;

const titles = {
  date: "날짜 선택",
  guide: "집 안내",
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
    bgImage: "starhills.png",
    datePageTitle: "언제 놀러올래?",
    datePageSubtitle: "클릭 가능한 날만 선택돼요",
    inviteEyebrow: "종건이네 집 초대",
    inviteTitle: "저녁 먹고 수다 떨기",
    guideEyebrow: "초대 상세",
    guideTitle: "종건이네 집에 놀러오기",
    infoTitle: "누가 오는지 알려줘",
    infoSubtitle: "호스트에게만 보여요",
    completeTitle: "놀러오는 약속이 잡혔어요!",
    completeSubtitle: "종건이에게 방문 정보가 전달되었습니다.",
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

// 초기 상태 설정 (데이터를 불러오기 전까지 기본값 유지)
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

let config = clone(defaultConfig);

const adminState = {
  month: new Date(state.month),
  dateKey: state.dateKey,
};

// 앱 시작 시 DB에서 설정을 불러옵니다.
async function initApp() {
  // 먼저 기본값으로 화면을 한 번 그립니다 (연결이 늦어져도 화면이 뜨게 함)
  // 1. 라이브러리 로드 확인
  if (typeof supabase === 'undefined') {
    console.error("Supabase 라이브러리가 로드되지 않았습니다. 인터넷 연결을 확인하세요.");
    syncUI();
    return;
  }

  // 2. 기본값으로 먼저 화면 표시
  syncUI();
  
  try {
    await loadConfigFromSupabase();
    syncUI();
  } catch (err) {
    console.error("초기 데이터 로드 중 오류 발생. 기본 설정으로 구동합니다:", err);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadConfigFromSupabase() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('config_store')
      .select('data')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    // 데이터가 있고, data 내부 속성이 존재하는지 확인
    if (data && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
      const saved = data.data;
      config = {
        ...clone(defaultConfig),
        ...saved, // 저장된 전체 객체를 덮어씌움
        rules: { ...defaultConfig.rules, ...(saved.rules || {}) },
        content: {
          ...clone(defaultConfig.content),
          ...(saved.content || {}),
          arrivalNotes: {
            ...defaultConfig.content.arrivalNotes,
            ...((saved.content || {}).arrivalNotes || {}),
          },
          bookingDetails: saved.bookingDetails || {},
        },
      };
    }
    console.log("Config loaded from Supabase. bgImage:", config.content.bgImage); // 디버깅 로그 추가
  } catch (err) {
    console.error("데이터베이스 로드 실패:", err.message);
  }
}

async function saveConfigToSupabase() {
  try {
    const { error } = await supabaseClient
      .from('config_store')
      .upsert({ id: 1, data: config, updated_at: new Date() });
    if (error) throw error;
    console.log("Config saved to Supabase. bgImage:", config.content.bgImage); // 디버깅 로그 추가
  } catch (err) {
    console.error("Config 저장 실패:", err.message);
    alert("저장에 실패했습니다. 네트워크 상태를 확인해주세요.");
  }
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

function isTooFarFuture(key) {
  const date = dateFromKey(key);
  const today = dateFromKey(TODAY_KEY);
  const limit = new Date(today);
  limit.setDate(today.getDate() + 160); // 오늘 기준 정확히 160일 이후로 제한
  return date > limit;
}

function availableTimesFor(key) {
  if (isPastDate(key) || isTooFarFuture(key)) return [];
  if (config.blocked.includes(key) || config.booked.includes(key)) return [];

  const date = dateFromKey(key);
  const day = date.getDay(); // 0:일, 1:월, ..., 5:금, 6:토
  const isHoliday = config.holidays.includes(key);

  // 다음날이 공휴일인지 확인 (공휴일 전날 활성화 로직)
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const nextDayKey = keyFromDate(nextDay);
  const isDayBeforeHoliday = config.holidays.includes(nextDayKey);

  // 월~목(1~4)은 닫고, 금/토/일(5,6,0) 및 공휴일(전날 포함)만 활성화
  const isNaturallyOpen = (day === 5 || day === 6 || day === 0);
  
  if (!isNaturallyOpen && !isHoliday && !isDayBeforeHoliday) return [];

  // 시간 규칙: 토/일/공휴일 본일은 holidayStart, 금요일/공휴일 전날은 weekdayStart 적용
  const useHolidayRules = (day === 0 || day === 6 || isHoliday);
  const start = useHolidayRules ? config.rules.holidayStart : config.rules.weekdayStart;

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

function syncContent() {
  const bgImage = "starhills.png";

  document.querySelectorAll(".home-visual, .hero-visual").forEach((el) => {
    el.style.backgroundImage = `url("${bgImage}")`;
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
    text: "종건이네 집에 놀러가기",
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: "친구 초대 약속입니다.",
    location: "목동중앙본로 7길 23, 301호",
  });
  link.href = `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function syncUI() {
  console.log(`syncUI: 현재 스텝: ${state.step}`);
  if (state.step !== "complete") ensureSelectedDateIsAvailable();
  const formattedDate = formatDate(state.dateKey);
  const schedule = `${formattedDate} ${state.time}`;

  app.dataset.step = state.step;
  screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === state.step));
  stepPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.go === state.step));
  console.log(`syncUI: app.dataset.step 설정됨: ${app.dataset.step}`);

  setText("screenTitle", titles[state.step]);
  setText("selectedDateLine", schedule);
  setText("guideDate", formattedDate);
  setText("guideTime", state.time);
  setText("completeDate", formattedDate);
  setText("completeTime", state.time);
  setText("completeArrival", state.arrival);
  setText("completeGuests", state.guests);

  renderCalendar();
  renderTimes();
  renderCompanions();
  syncContent();
  syncCalendarLink();
  console.log(`syncUI: 화면 업데이트 완료. 'complete' 스크린 활성화 여부: ${document.querySelector('[data-screen="complete"]')?.classList.contains('is-active')}`);

  // 미래 날짜 제한 안내 문구 제어
  const monthEnd = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0);
  const showNotice = isTooFarFuture(keyFromDate(monthEnd));
  const noticeEl = document.getElementById("futureLimitNotice");
  if (noticeEl) noticeEl.style.display = showNotice ? "block" : "none";
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
  renderBookedList();
}

function renderBookedList() {
  const list = document.getElementById("adminBookedList");
  if (!list) return;
  list.innerHTML = "";

  // 날짜순으로 정렬하여 표시
  const sortedBooked = [...config.booked].sort();
  
  sortedBooked.forEach(key => {
    const detail = config.bookingDetails?.[key];
    const li = document.createElement("li");
    li.textContent = detail ? `${formatDate(key)} (${detail.name})` : formatDate(key);
    li.onclick = () => {
      const date = dateFromKey(key);
      adminState.month = new Date(date.getFullYear(), date.getMonth(), 1);
      adminState.dateKey = key;
      renderAdminCalendar();
    };
    list.appendChild(li);
  });

  // 목록 섹션 표시 여부
  const section = document.getElementById("adminBookedListSection");
  if (section) {
    section.hidden = sortedBooked.length === 0;
  }
}

function syncAdminForm() {
  const selectedTimes = availableTimesFor(adminState.dateKey);
  setInputValue("adminDateInput", formatDate(adminState.dateKey));
  setChecked("holidayToggle", config.holidays.includes(adminState.dateKey));
  setChecked("blockedToggle", config.blocked.includes(adminState.dateKey));
  setChecked("bookedToggle", config.booked.includes(adminState.dateKey));

  // 예약 상세 정보 표시
  const detail = config.bookingDetails?.[adminState.dateKey];
  const detailContainer = document.getElementById("adminBookingDetailDisplay");
  if (detail && config.booked.includes(adminState.dateKey)) {
    detailContainer.innerHTML = `
      <div class="admin-detail-card">
        <p><strong>신청자:</strong> ${detail.name} (${detail.phone})</p>
        <p><strong>인원:</strong> ${detail.guests} (동행: ${detail.companions.join(', ') || '없음'})</p>
        <p><strong>메뉴/부탁:</strong> ${detail.menu || '없음'} / ${detail.request || '없음'}</p>
      </div>
    `;
  } else {
    detailContainer.innerHTML = "";
  }

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
  
  // 공통 화면 문구 (HTML에 존재하는 필드만 설정)
  setInputValue("datePageTitleInput", config.content.datePageTitle);
  setInputValue("guideNoticeInput", (config.content.guideNoticeLines || []).join("\n"));
  setInputValue("friendGuideTitleInput", config.content.friendGuideTitle);
  setInputValue("friendGuideInput", (config.content.friendGuideLines || []).join("\n"));
  setInputValue("transitNoteInput", config.content.arrivalNotes.transit);
  setInputValue("carNoteInput", config.content.arrivalNotes.car);
  setInputValue("walkNoteInput", config.content.arrivalNotes.walk);

  adminBackdrop.hidden = false;
  adminPanel.hidden = false;
  renderAdminCalendar();
}

function openAuthModal() {
  authBackdrop.hidden = false;
  authModal.hidden = false;
  passwordInput.value = "";
  passwordInput.focus();
}

function closeAuthModal() {
  authBackdrop.hidden = true;
  authModal.hidden = true;
  authModal.classList.remove("shake");
}

function checkAdminPassword() {
  if (passwordInput.value === "72") {
    closeAuthModal();
    openAdminPanel();
  } else {
    authModal.classList.add("shake");
    setTimeout(() => authModal.classList.remove("shake"), 400);
    passwordInput.value = "";
    passwordInput.focus();
  }
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

async function saveAdminSettings() {
  // 안전하게 값을 가져오기 위한 헬퍼
  const val = (id) => document.getElementById(id)?.value?.trim();

  // 운영 규칙
  config.rules.weekdayStart = val("weekdayStartInput") || config.rules.weekdayStart;
  config.rules.holidayStart = val("holidayStartInput") || config.rules.holidayStart;
  config.rules.end = val("endTimeInput") || config.rules.end;

  // 공통 화면 문구
  config.content.datePageTitle = val("datePageTitleInput") || defaultConfig.content.datePageTitle;
  
  const noticeVal = val("guideNoticeInput");
  if (noticeVal !== null) config.content.guideNoticeLines = noticeVal.split("\n").map(l => l.trim()).filter(Boolean);
  
  config.content.friendGuideTitle = val("friendGuideTitleInput") || defaultConfig.content.friendGuideTitle;
  
  const friendVal = val("friendGuideInput");
  if (friendVal !== null) config.content.friendGuideLines = friendVal.split("\n").map(l => l.trim()).filter(Boolean);

  config.content.arrivalNotes.transit = val("transitNoteInput") || defaultConfig.content.arrivalNotes.transit;
  config.content.arrivalNotes.car = val("carNoteInput") || defaultConfig.content.arrivalNotes.car;
  config.content.arrivalNotes.walk = val("walkNoteInput") || defaultConfig.content.arrivalNotes.walk;

  await saveConfigToSupabase();
  showSaveStatus("저장됐어요.");
  syncUI();
  renderAdminCalendar();
}

function exportConfig() {
  const configJson = JSON.stringify(config, null, 2);
  navigator.clipboard.writeText(configJson).then(() => {
    alert("현재 설정 데이터가 복사되었습니다!\napp.js의 defaultConfig 변수에 이 내용을 덮어씌우면 영구적으로 반영됩니다.");
  }).catch(err => {
    console.error('복사 실패:', err);
    console.log(configJson);
  });
}

function resetAdminSettings() {
  config = clone(defaultConfig);
  saveConfigToSupabase();
  showSaveStatus("초기화했어요.");
  syncUI();
  openAdminPanel();
}

function showSaveStatus(message) {
  setText("adminSaveStatus", message);
  window.clearTimeout(showSaveStatus.timer);
  showSaveStatus.timer = window.setTimeout(() => setText("adminSaveStatus", ""), 1800);
}

async function blockDateRange(days) {
  const cursor = dateFromKey(adminState.dateKey);
  for (let i = 0; i < days; i += 1) {
    const key = keyFromDate(cursor);
    if (!isPastDate(key)) {
      config.blocked = toggleListValue(config.blocked, key, true);
      config.booked = toggleListValue(config.booked, key, false);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  await saveConfigToSupabase();
  showSaveStatus(`${days}일을 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

async function blockRemainingMonth() {
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
  await saveConfigToSupabase();
  showSaveStatus(`${count}개 날짜를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

async function blockWeekdaysInMonth() {
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
  await saveConfigToSupabase();
  showSaveStatus(`남은 평일 ${count}개를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

async function blockRelativeRange(rangeStr) {
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
  await saveConfigToSupabase();
  showSaveStatus(`선택일 기준 범위를 예약 불가로 저장했어요.`);
  syncUI();
  renderAdminCalendar();
}

function go(step) {
  state.step = step;
  console.log(`go: 스텝을 '${step}'으로 변경. syncUI 호출.`);
  syncUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function finalizeBooking() {
  console.log("finalizeBooking: 시작");
  // 폼 데이터 수집
  const form = document.querySelector('.screen-info .booking-form');
  const name = form.querySelector('input[type="text"]').value.trim();
  const phone = form.querySelector('input[type="tel"]').value.trim();
  const textareas = form.querySelectorAll('textarea');
  const menu = textareas[0] ? textareas[0].value.trim() : "";
  const request = textareas[1] ? textareas[1].value.trim() : "";
  const companions = [...document.querySelectorAll(".companion-name")].map(i => i.value.trim());

  config.bookingDetails = config.bookingDetails || {};
  config.bookingDetails[state.dateKey] = {
    name, phone, guests: state.guests, companions, menu, request, 
    timestamp: new Date().toISOString()
  };

  config.booked = toggleListValue(config.booked, state.dateKey, true);
  
  await saveConfigToSupabase();
  console.log("finalizeBooking: Supabase 저장 완료, 'complete' 스텝으로 이동 요청.");
  go("complete");
  console.log("finalizeBooking: 'complete' 스텝 이동 요청 완료.");
}

/**
 * 2단계 방문 정보 입력 검증 로직
 */
function validateAndConfirm() {
  const nameInput = document.querySelector('.screen-info .booking-form input[type="text"]');
  console.log("validateAndConfirm: 시작");
  const telInput = document.querySelector('.screen-info .booking-form input[type="tel"]');
  const companionInputs = [...document.querySelectorAll(".companion-name")];

  if (!nameInput.value.trim()) {
    alert("방문하시는 분의 이름을 입력해주세요.");
    nameInput.focus();
    return;
  }
  if (!telInput.value.trim()) {
    alert("연락처를 입력해주세요.");
    telInput.focus();
    return;
  }
  for (let i = 0; i < companionInputs.length; i++) {
    if (!companionInputs[i].value.trim()) {
      alert(`동행인 ${i + 1}의 이름을 입력해주세요.`);
      companionInputs[i].focus();
      return;
    }
  }

  // 모든 검증 통과 시 확정 모달 표시 (또는 바로 확정)
  if (companionInputs.length > 0) {
    console.log("validateAndConfirm: 동행인 있음. 확인 모달 표시.");
    confirmBackdrop.hidden = false;
    confirmModal.hidden = false;
  } else {
    finalizeBooking();
    console.log("validateAndConfirm: 동행인 없음. 바로 finalizeBooking 호출.");
  }
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

  // Step Pill (탭) 클릭 처리
  const stepPillClicked = event.target.closest(".step-pill[data-go]");
  if (stepPillClicked) {
    const targetStep = stepPillClicked.dataset.go;
    const stepOrder = ["date", "info", "complete"];
    const currentStepIndex = stepOrder.indexOf(state.step);
    const targetStepIndex = stepOrder.indexOf(targetStep);

    // 현재 단계보다 미래의 탭을 누르는 것을 차단 (입력 없이 넘어가는 것 방지)
    if (targetStepIndex > currentStepIndex && state.step !== "complete") {
      return;
    }
    // 이전 단계나 현재 단계로 이동하는 것은 허용
    go(targetStep);
    return;
  }

  if (event.target.closest("[data-admin-trigger]")) {
    clearTimeout(adminTapTimer);
    adminTapCount += 1;
    adminTapTimer = setTimeout(() => {
      adminTapCount = 0;
    }, 1200);
    if (adminTapCount >= 5) {
      adminTapCount = 0;
      openAuthModal();
    }
    return;
  }

  if (event.target.closest("[data-admin-close]")) {
    closeAdminPanel();
    return;
  }

  if (event.target.closest("[data-auth-close]")) {
    closeAuthModal();
    return;
  }

  if (event.target.id === "authSubmitBtn" || (event.target.tagName === 'INPUT' && event.target.id === 'adminPasswordInput' && event.key === 'Enter')) {
    checkAdminPassword();
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

  if (event.target.closest("[data-admin-export]")) {
    exportConfig();
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

  if (goButton && !stepPillClicked) { // stepPillClicked가 아닌 일반 data-go 버튼만 처리
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
    validateAndConfirm();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "guestCount") {
    state.guests = `${event.target.value}명`;
    syncUI();
  }

  if (event.target.id === "holidayToggle") {
    config.holidays = toggleListValue(config.holidays, adminState.dateKey, event.target.checked);
    saveConfigToSupabase();
    showSaveStatus("공휴일 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }

  if (event.target.id === "blockedToggle") {
    config.blocked = toggleListValue(config.blocked, adminState.dateKey, event.target.checked);
    if (event.target.checked) config.booked = toggleListValue(config.booked, adminState.dateKey, false);
    saveConfigToSupabase();
    showSaveStatus("예약 불가 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }

  if (event.target.id === "bookedToggle") {
    config.booked = toggleListValue(config.booked, adminState.dateKey, event.target.checked);
    if (event.target.checked) config.blocked = toggleListValue(config.blocked, adminState.dateKey, false);
    saveConfigToSupabase();
    showSaveStatus("예약 완료 설정을 저장했어요.");
    syncUI();
    renderAdminCalendar();
  }
});

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    checkAdminPassword();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!adminPanel.hidden) closeAdminPanel();
    if (!confirmModal.hidden) closeConfirmModal();
    if (!authModal.hidden) closeAuthModal();
  }
});

initApp();
