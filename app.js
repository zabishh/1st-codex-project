const storeKey = "study_todo_pomodoro_v2";
const THESAURUS_API_URL = "/api/thesaurus";

const el = {
  today: document.getElementById("today"),
  todayDate: document.getElementById("todayDate"),
  form: document.getElementById("todoForm"),
  subject: document.getElementById("subject"),
  task: document.getElementById("task"),
  minutes: document.getElementById("minutes"),
  focusMinutes: document.getElementById("focusMinutes"),
  breakMinutes: document.getElementById("breakMinutes"),
  longBreakMinutes: document.getElementById("longBreakMinutes"),
  longBreakEvery: document.getElementById("longBreakEvery"),
  applyTimer: document.getElementById("applyTimer"),
  todoList: document.getElementById("todoList"),
  studyStatus: document.getElementById("studyStatus"),
  logList: document.getElementById("logList"),
  timerMode: document.getElementById("timerMode"),
  timeDisplay: document.getElementById("timeDisplay"),
  ring: document.getElementById("ring"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  autoBreak: document.getElementById("autoBreak"),
  sessionCount: document.getElementById("sessionCount"),
  soundEnabled: document.getElementById("soundEnabled"),
  vibrateEnabled: document.getElementById("vibrateEnabled"),
  alarmVolume: document.getElementById("alarmVolume"),
  deepFocusBtn: document.getElementById("deepFocusBtn"),
  timelineList: document.getElementById("timelineList"),
  todayFocusTotal: document.getElementById("todayFocusTotal"),
  recapStats: document.getElementById("recapStats"),
  recapSubjects: document.getElementById("recapSubjects"),
  weekStreak: document.getElementById("weekStreak"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  clearBtn: document.getElementById("clearBtn"),
  presetForm: document.getElementById("presetForm"),
  presetSubject: document.getElementById("presetSubject"),
  presetMinutes: document.getElementById("presetMinutes"),
  presetList: document.getElementById("presetList"),
  quoteText: document.getElementById("quoteText"),
  thesaurusForm: document.getElementById("thesaurusForm"),
  thesaurusQuery: document.getElementById("thesaurusQuery"),
  thesaurusResults: document.getElementById("thesaurusResults"),
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const nowStamp = () => new Date().toISOString();

const defaultState = {
  todos: [],
  log: [],
  sessions: {},
  presets: {},
  timeline: [],
  settings: {
    autoBreak: true,
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    soundEnabled: true,
    vibrateEnabled: false,
    alarmVolume: 60,
    deepFocus: false,
  },
  quotes: [
    "Start small. Finish strong.",
    "Future you is built in tiny sessions.",
    "One focused block beats hours of drift.",
    "Consistency makes the work feel lighter.",
    "Show up, then shape it.",
    "Quiet work. Loud results.",
  ],
};

let state = loadState();
let activeTodoId = null;
let currentSession = null;
let timer = {
  intervalId: null,
  mode: "focus",
  total: state.settings.focusMinutes * 60,
  remaining: state.settings.focusMinutes * 60,
};

function loadState() {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: {
        ...structuredClone(defaultState.settings),
        ...parsed.settings,
      },
      presets: parsed.presets || {},
      timeline: parsed.timeline || [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function normalizeMinutes(value, min, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.round(num));
}

function updateDateBadge() {
  const now = new Date();
  el.today.textContent = dayNames[now.getDay()];
  el.todayDate.textContent = now.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTodayTodos() {
  const key = dayKey();
  return state.todos.filter((todo) => todo.dateKey === key);
}

function renderTodos() {
  const todos = getTodayTodos();
  el.todoList.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    if (todo.done) li.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const text = document.createElement("div");
    text.innerHTML = `<strong>${escapeHtml(todo.subject)}</strong><br><span>${escapeHtml(todo.task)}</span>`;

    const actions = document.createElement("div");
    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.textContent = "Focus";
    focusBtn.addEventListener("click", () => setActiveTodo(todo.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeTodo(todo.id));

    actions.appendChild(focusBtn);
    actions.appendChild(removeBtn);

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(actions);
    el.todoList.appendChild(li);
  });

  updateStudyStatus();
}

function updateStudyStatus() {
  const todos = getTodayTodos();
  const sessions = state.sessions[dayKey()] || 0;
  const studied = todos.some((todo) => todo.done) || sessions > 0;
  el.studyStatus.textContent = studied ? "Studied" : "Not Studied";
  if (studied) {
    el.studyStatus.style.background = "rgba(90, 120, 90, 0.35)";
    el.studyStatus.style.color = "#e6f1e6";
  } else {
    el.studyStatus.style.background = "rgba(20, 24, 34, 0.85)";
    el.studyStatus.style.color = "#f2f4ff";
  }
}

function renderLog() {
  const recent = [...state.log].slice(-10).reverse();
  el.logList.innerHTML = "";
  if (recent.length === 0) {
    const empty = document.createElement("div");
    empty.className = "log__item";
    empty.textContent = "No study sessions logged yet.";
    el.logList.appendChild(empty);
    return;
  }

  recent.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "log__item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br>${escapeHtml(entry.detail)}`;
    const right = document.createElement("div");
    right.textContent = new Date(entry.timestamp).toLocaleString();
    item.appendChild(left);
    item.appendChild(right);
    el.logList.appendChild(item);
  });
}

function renderTimeline() {
  const today = dayKey();
  const items = state.timeline.filter((t) => t.dateKey === today);
  el.timelineList.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "log__item";
    empty.textContent = "No sessions yet.";
    el.timelineList.appendChild(empty);
  } else {
    items.slice().reverse().forEach((entry) => {
      const item = document.createElement("div");
      item.className = "log__item";
      const left = document.createElement("div");
      left.innerHTML = `<strong>${escapeHtml(entry.label)}</strong><br>${escapeHtml(entry.subject || "General")} • ${Math.round(entry.minutes)} min`;
      const right = document.createElement("div");
      right.textContent = `${formatTime(entry.start)} - ${formatTime(entry.end)}`;
      item.appendChild(left);
      item.appendChild(right);
      el.timelineList.appendChild(item);
    });
  }

  const focusMinutes = items.filter((i) => i.type === "focus").reduce((acc, i) => acc + i.minutes, 0);
  el.todayFocusTotal.textContent = `${Math.round(focusMinutes)} min`;
}

function addLog(title, detail) {
  state.log.push({ title, detail, timestamp: nowStamp() });
  saveState();
  renderLog();
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveState();
  renderTodos();
  if (todo.done) {
    addLog("Completed", `${todo.subject} - ${todo.task}`);
  }
}

function removeTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  if (activeTodoId === id) {
    activeTodoId = null;
    resetTimer();
  }
  saveState();
  renderTodos();
}

function setActiveTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  activeTodoId = id;
  setFocusMinutes(todo.minutes);
  el.timerMode.textContent = `Focus: ${todo.subject}`;
}

function setFocusMinutes(min) {
  const minutes = Number(min) || state.settings.focusMinutes;
  timer.mode = "focus";
  timer.total = minutes * 60;
  timer.remaining = timer.total;
  updateTimerDisplay();
  updateRing();
}

function updateTimerDisplay() {
  const mins = Math.floor(timer.remaining / 60);
  const secs = timer.remaining % 60;
  el.timeDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateRing() {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - timer.remaining / timer.total;
  el.ring.style.strokeDasharray = `${circumference}`;
  el.ring.style.strokeDashoffset = `${circumference * progress}`;
}

function startTimer() {
  if (timer.intervalId) return;
  el.startBtn.disabled = true;
  el.pauseBtn.disabled = false;
  beginSession();
  timer.intervalId = setInterval(() => {
    timer.remaining -= 1;
    if (timer.remaining <= 0) {
      timer.remaining = 0;
      completeTimer();
    }
    updateTimerDisplay();
    updateRing();
  }, 1000);
}

function stopTimer() {
  if (!timer.intervalId) return;
  clearInterval(timer.intervalId);
  timer.intervalId = null;
  el.startBtn.disabled = false;
  el.pauseBtn.disabled = true;
}

function pauseTimer() {
  if (!timer.intervalId) return;
  stopTimer();
  endSession(false);
}

function resetTimer() {
  pauseTimer();
  if (timer.mode === "break") {
    timer.total = state.settings.breakMinutes * 60;
    timer.remaining = timer.total;
    el.timerMode.textContent = "Break";
    updateTimerDisplay();
    updateRing();
    return;
  }

  if (activeTodoId) {
    const todo = state.todos.find((t) => t.id === activeTodoId);
    setFocusMinutes(todo ? todo.minutes : state.settings.focusMinutes);
    el.timerMode.textContent = todo ? `Focus: ${todo.subject}` : "Focus";
  } else {
    setFocusMinutes(state.settings.focusMinutes);
    el.timerMode.textContent = "Focus";
  }
}

function applyTimerSettings() {
  const focus = normalizeMinutes(el.focusMinutes.value, 1, 25);
  const rest = normalizeMinutes(el.breakMinutes.value, 1, 5);
  const longBreak = normalizeMinutes(el.longBreakMinutes.value, 1, 15);
  const longEvery = normalizeMinutes(el.longBreakEvery.value, 2, 4);
  state.settings.focusMinutes = focus;
  state.settings.breakMinutes = rest;
  state.settings.longBreakMinutes = longBreak;
  state.settings.longBreakEvery = longEvery;
  saveState();
  el.focusMinutes.value = focus;
  el.breakMinutes.value = rest;
  el.longBreakMinutes.value = longBreak;
  el.longBreakEvery.value = longEvery;
  el.minutes.value = focus;
  resetTimer();
}

function completeTimer() {
  stopTimer();
  endSession(true);
  if (timer.mode === "focus") {
    const key = dayKey();
    state.sessions[key] = (state.sessions[key] || 0) + 1;
    saveState();
    updateSessions();
    addLog("Pomodoro", "Focus session completed");
    updateStudyStatus();
    playAlert();
    if (el.autoBreak.checked) {
      const count = state.sessions[key];
      const isLongBreak = state.settings.longBreakEvery > 0 && count % state.settings.longBreakEvery === 0;
      timer.mode = "break";
      timer.total = (isLongBreak ? state.settings.longBreakMinutes : state.settings.breakMinutes) * 60;
      timer.remaining = timer.total;
      el.timerMode.textContent = isLongBreak ? "Long Break" : "Break";
      updateTimerDisplay();
      updateRing();
      startTimer();
      return;
    }
  } else {
    playAlert();
  }

  timer.mode = "focus";
  el.timerMode.textContent = activeTodoId ? `Focus: ${state.todos.find((t) => t.id === activeTodoId)?.subject || "Focus"}` : "Focus";
  resetTimer();
}

function updateSessions() {
  el.sessionCount.textContent = state.sessions[dayKey()] || 0;
}

function beginSession() {
  if (currentSession) return;
  currentSession = {
    type: timer.mode,
    label: timer.mode === "focus" ? "Focus" : (timer.total === state.settings.longBreakMinutes * 60 ? "Long Break" : "Break"),
    subject: activeTodoId ? state.todos.find((t) => t.id === activeTodoId)?.subject : "General",
    start: nowStamp(),
    end: null,
  };
}

function endSession(completed) {
  if (!currentSession) return;
  currentSession.end = nowStamp();
  const start = new Date(currentSession.start);
  const end = new Date(currentSession.end);
  const minutes = (end - start) / 60000;
  state.timeline.push({
    ...currentSession,
    minutes: Math.max(1, minutes),
    dateKey: dayKey(start),
  });
  if (completed) {
    addLog(currentSession.label, `${currentSession.subject} - ${Math.round(minutes)} min`);
  }
  currentSession = null;
  saveState();
  renderTimeline();
}

function playAlert() {
  if (state.settings.soundEnabled) {
    const volume = state.settings.alarmVolume / 100;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 640;
    gain.gain.value = volume;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  }
  if (state.settings.vibrateEnabled && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

function renderPresets() {
  el.presetList.innerHTML = "";
  const entries = Object.entries(state.presets);
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "preset__item";
    empty.textContent = "No presets yet.";
    el.presetList.appendChild(empty);
    return;
  }
  entries.forEach(([subject, minutes]) => {
    const row = document.createElement("div");
    row.className = "preset__item";
    const label = document.createElement("span");
    label.textContent = `${subject} - ${minutes} min`;
    const actions = document.createElement("div");
    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => {
      el.subject.value = subject;
      el.minutes.value = minutes;
    });
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      delete state.presets[subject];
      saveState();
      renderPresets();
    });
    actions.appendChild(useBtn);
    actions.appendChild(removeBtn);
    row.appendChild(label);
    row.appendChild(actions);
    el.presetList.appendChild(row);
  });
}

function renderRecap() {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return dayKey(d);
  }).reverse();

  const totalSessions = days.reduce((acc, key) => acc + (state.sessions[key] || 0), 0);
  const totalFocusMinutes = state.timeline
    .filter((t) => days.includes(t.dateKey) && t.type === "focus")
    .reduce((acc, t) => acc + t.minutes, 0);

  el.recapStats.innerHTML = "";
  el.recapStats.appendChild(buildRecapRow("Focus minutes", `${Math.round(totalFocusMinutes)} min`));
  el.recapStats.appendChild(buildRecapRow("Focus sessions", `${totalSessions}`));

  const subjectTotals = {};
  state.timeline
    .filter((t) => days.includes(t.dateKey) && t.type === "focus")
    .forEach((t) => {
      const key = t.subject || "General";
      subjectTotals[key] = (subjectTotals[key] || 0) + t.minutes;
    });

  el.recapSubjects.innerHTML = "";
  const sorted = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    el.recapSubjects.appendChild(buildRecapRow("Top subject", "No data"));
  } else {
    sorted.slice(0, 5).forEach(([subject, minutes]) => {
      el.recapSubjects.appendChild(buildRecapRow(subject, `${Math.round(minutes)} min`));
    });
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if ((state.sessions[days[i]] || 0) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  el.weekStreak.textContent = `Streak: ${streak}`;
}

function buildRecapRow(label, value) {
  const row = document.createElement("div");
  row.className = "recap__row";
  const left = document.createElement("span");
  left.textContent = label;
  const right = document.createElement("strong");
  right.textContent = value;
  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function toggleDeepFocus() {
  state.settings.deepFocus = !state.settings.deepFocus;
  document.body.classList.toggle("deep-focus", state.settings.deepFocus);
  el.deepFocusBtn.textContent = state.settings.deepFocus ? "Exit Deep Focus" : "Deep Focus Mode";
  saveState();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-data-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = {
        ...structuredClone(defaultState),
        ...parsed,
        settings: { ...structuredClone(defaultState.settings), ...parsed.settings },
      };
      saveState();
      hydrateFromState();
    } catch {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
}

function clearData() {
  if (!confirm("Clear all local data?")) return;
  state = structuredClone(defaultState);
  saveState();
  hydrateFromState();
}

function hydrateFromState() {
  el.autoBreak.checked = state.settings.autoBreak;
  el.soundEnabled.checked = state.settings.soundEnabled;
  el.vibrateEnabled.checked = state.settings.vibrateEnabled;
  el.alarmVolume.value = state.settings.alarmVolume;
  el.focusMinutes.value = state.settings.focusMinutes;
  el.breakMinutes.value = state.settings.breakMinutes;
  el.longBreakMinutes.value = state.settings.longBreakMinutes;
  el.longBreakEvery.value = state.settings.longBreakEvery;
  el.minutes.value = state.settings.focusMinutes;
  el.presetMinutes.value = state.settings.focusMinutes;
  el.quoteText.textContent = state.quotes[Math.floor(Math.random() * state.quotes.length)];
  document.body.classList.toggle("deep-focus", state.settings.deepFocus);
  el.deepFocusBtn.textContent = state.settings.deepFocus ? "Exit Deep Focus" : "Deep Focus Mode";
  updateDateBadge();
  renderTodos();
  renderLog();
  renderTimeline();
  updateSessions();
  renderPresets();
  renderRecap();
  resetTimer();
}

async function fetchThesaurus(query) {
  if (window.location.protocol === "file:") {
    throw new Error("Run the local server (python proxy.py) for thesaurus.");
  }
  const url = `${THESAURUS_API_URL}?word=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function renderThesaurusResults(data) {
  el.thesaurusResults.innerHTML = "";
  if (!Array.isArray(data) || data.length === 0) {
    el.thesaurusResults.textContent = "No results.";
    return;
  }

  if (typeof data[0] === "string") {
    const suggestions = document.createElement("div");
    suggestions.className = "thesaurus__card";
    suggestions.innerHTML = `<div class="thesaurus__title">Suggestions</div><div>${data.slice(0, 8).join(", ")}</div>`;
    el.thesaurusResults.appendChild(suggestions);
    return;
  }

  const entry = data[0];
  const syns = entry?.meta?.syns?.flat() || [];
  const ants = entry?.meta?.ants?.flat() || [];
  const defs = entry?.shortdef || [];

  const defCard = document.createElement("div");
  defCard.className = "thesaurus__card";
  defCard.innerHTML = `<div class="thesaurus__title">Definition</div><div>${defs.slice(0, 2).join("; ") || "No definition"}</div>`;
  el.thesaurusResults.appendChild(defCard);

  const synCard = document.createElement("div");
  synCard.className = "thesaurus__card";
  synCard.innerHTML = `<div class="thesaurus__title">Synonyms</div>${syns.length ? `<ul class="thesaurus__list">${syns.slice(0, 12).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "None"}`;
  el.thesaurusResults.appendChild(synCard);

  const antCard = document.createElement("div");
  antCard.className = "thesaurus__card";
  antCard.innerHTML = `<div class="thesaurus__title">Antonyms</div>${ants.length ? `<ul class="thesaurus__list">${ants.slice(0, 12).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "None"}`;
  el.thesaurusResults.appendChild(antCard);
}

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const subject = el.subject.value.trim();
  const task = el.task.value.trim();
  const minutes = Number(el.minutes.value) || state.settings.focusMinutes;
  if (!subject || !task) return;

  const todo = {
    id: crypto.randomUUID(),
    subject,
    task,
    minutes,
    done: false,
    dateKey: dayKey(),
  };

  state.todos.push(todo);
  saveState();
  el.form.reset();
  el.minutes.value = minutes;
  renderTodos();
});

el.presetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const subject = el.presetSubject.value.trim();
  const minutes = normalizeMinutes(el.presetMinutes.value, 1, state.settings.focusMinutes);
  if (!subject) return;
  state.presets[subject] = minutes;
  saveState();
  el.presetForm.reset();
  el.presetMinutes.value = state.settings.focusMinutes;
  renderPresets();
});

el.thesaurusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = el.thesaurusQuery.value.trim();
  if (!query) return;
  el.thesaurusResults.textContent = "Searching...";
  try {
    const data = await fetchThesaurus(query);
    renderThesaurusResults(data);
  } catch (err) {
    const msg = err && err.message ? err.message : "Error fetching results.";
    el.thesaurusResults.textContent = msg;
  }
});

el.startBtn.addEventListener("click", startTimer);
el.pauseBtn.addEventListener("click", pauseTimer);
el.resetBtn.addEventListener("click", resetTimer);
el.applyTimer.addEventListener("click", applyTimerSettings);
el.deepFocusBtn.addEventListener("click", toggleDeepFocus);

el.autoBreak.addEventListener("change", () => {
  state.settings.autoBreak = el.autoBreak.checked;
  saveState();
});

el.soundEnabled.addEventListener("change", () => {
  state.settings.soundEnabled = el.soundEnabled.checked;
  saveState();
});

el.vibrateEnabled.addEventListener("change", () => {
  state.settings.vibrateEnabled = el.vibrateEnabled.checked;
  saveState();
});

el.alarmVolume.addEventListener("input", () => {
  state.settings.alarmVolume = Number(el.alarmVolume.value);
  saveState();
});

el.exportBtn.addEventListener("click", exportData);
el.importFile.addEventListener("change", (event) => {
  if (event.target.files.length) importData(event.target.files[0]);
});
el.clearBtn.addEventListener("click", clearData);

hydrateFromState();


function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] || char;
  });
}

