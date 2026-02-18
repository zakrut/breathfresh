// ===================================================
// BreathFresh — popup.js
// Главный скрипт интерфейса расширения
// ===================================================

// ── Мотивационные фразы ──────────────────────────────
const MOTIVATION_PHRASES = [
  "Ты молодец! Продолжай в том же духе 💪",
  "Каждый день без сигареты — победа! 🏆",
  "Твои лёгкие говорят спасибо 🫁",
  "Сила воли — твоя суперсила! ⚡",
  "Дышать полной грудью — бесценно ✨",
  "Ещё один день свободы от никотина! 🌿",
  "Ты вдохновляешь! Не останавливайся 🌟",
  "Твоё тело восстанавливается прямо сейчас 💚",
];

// ── DOM-элементы ──────────────────────────────────────
const screens = {
  main:     document.getElementById("screen-main"),
  settings: document.getElementById("screen-settings"),
};

// Статистика
const elDays        = document.getElementById("val-days");
const elLungs       = document.getElementById("val-lungs");
const elMoney       = document.getElementById("val-money");
const cardLungs     = document.getElementById("card-lungs");
const cardMoney     = document.getElementById("card-money");
const progressSect  = document.getElementById("progress-section");
const progressFill  = document.getElementById("progress-fill");
const progressPct   = document.getElementById("progress-pct");
const motivText     = document.getElementById("motivation-text");

// Настройки — поля ввода
const inputDaysAgo      = document.getElementById("input-days-ago");
const inputYears        = document.getElementById("input-years");
const inputMonths       = document.getElementById("input-months");
const inputDurDays      = document.getElementById("input-dur-days");
const inputPackPrice    = document.getElementById("input-pack-price");
const inputDaysPerPack  = document.getElementById("input-days-per-pack");
const badgeOptLungs     = document.getElementById("badge-opt-lungs");
const badgeOptMoney     = document.getElementById("badge-opt-money");

// Кнопки
const btnSettings    = document.getElementById("btn-settings");
const btnBack        = document.getElementById("btn-back");
const btnSave        = document.getElementById("btn-save");
const btnQuit        = document.getElementById("btn-quit");
const btnQuitCancel  = document.getElementById("btn-quit-cancel");
const btnQuitConfirm = document.getElementById("btn-quit-confirm");
const overlayQuit    = document.getElementById("overlay-quit");

// ── Переключение экранов ──────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
}

btnSettings.addEventListener("click", openSettings);
btnBack.addEventListener("click", () => showScreen("main"));

// ── Загрузка настроек в поля ──────────────────────────
function openSettings() {
  chrome.storage.sync.get(null, (data) => {
    // Высчитываем "уже не курю (дней)" из timestamp
    const qts = data.quitTimestamp || Date.now();
    const daysAgo = Math.floor((Date.now() - qts) / (1000 * 60 * 60 * 24));
    inputDaysAgo.value      = daysAgo > 0 ? daysAgo : 0;
    inputYears.value        = data.smokingYears   ?? "";
    inputMonths.value       = data.smokingMonths  ?? "";
    inputDurDays.value      = data.smokingDays    ?? "";
    inputPackPrice.value    = data.packPrice      ?? "";
    inputDaysPerPack.value  = data.daysPerPack    ?? "";

    // Выбор режима бейджа
    const badgeMode = data.badgeMode || "days";
    const radioEl = document.querySelector(`input[name="badge-mode"][value="${badgeMode}"]`);
    if (radioEl) radioEl.checked = true;

    // Блокировка недоступных опций бейджа
    updateBadgeOptionAvailability(data);

    showScreen("settings");
  });
}

// ── Умный ввод стажа курения ───────────────────────────
// При начале ввода в одно поле — ставим 0 в пустые
[inputYears, inputMonths, inputDurDays].forEach((input) => {
  input.addEventListener("focus", () => {
    [inputYears, inputMonths, inputDurDays].forEach((other) => {
      if (other !== input && other.value === "") {
        other.value = "0";
      }
    });
  });
});

// ── Сохранение настроек ───────────────────────────────
btnSave.addEventListener("click", () => {
  const daysAgo      = parseInt(inputDaysAgo.value) || 0;
  const packPrice    = parseFloat(inputPackPrice.value) || 0;
  const daysPerPack  = parseFloat(inputDaysPerPack.value) || 1;
  const smokingYears = parseInt(inputYears.value)    || 0;
  const smokingMonths= parseInt(inputMonths.value)   || 0;
  const smokingDays  = parseInt(inputDurDays.value)  || 0;

  // Пересчитываем quitTimestamp
  const quitTimestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

  // Определяем выбранный режим бейджа
  const checkedRadio = document.querySelector('input[name="badge-mode"]:checked');
  let badgeMode = checkedRadio ? checkedRadio.value : "days";

  // Защита: если выбран недоступный вариант — откатываем на "days"
  const hasSmokingHistory = smokingYears > 0 || smokingMonths > 0 || smokingDays > 0;
  const hasMoneySetting   = packPrice > 0 && daysPerPack > 0;
  if (badgeMode === "lungs" && !hasSmokingHistory) badgeMode = "days";
  if (badgeMode === "money" && !hasMoneySetting)   badgeMode = "days";

  const toSave = {
    quitTimestamp,
    packPrice,
    daysPerPack,
    smokingYears,
    smokingMonths,
    smokingDays,
    badgeMode,
  };

  chrome.storage.sync.set(toSave, () => {
    // Уведомляем background-скрипт об обновлении бейджа
    chrome.runtime.sendMessage({ action: "updateBadge" });
    showScreen("main");
    renderMain();
  });
});

// ── Обновление доступности опций бейджа ───────────────
function updateBadgeOptionAvailability(data) {
  const hasSmokingHistory =
    (data.smokingYears > 0 || data.smokingMonths > 0 || data.smokingDays > 0);
  const hasMoneySetting =
    (data.packPrice > 0 && data.daysPerPack > 0);

  badgeOptLungs.classList.toggle("disabled", !hasSmokingHistory);
  badgeOptMoney.classList.toggle("disabled", !hasMoneySetting);
}

// ── Кнопка "Сдаюсь" ──────────────────────────────────
btnQuit.addEventListener("click", () => {
  overlayQuit.style.display = "flex";
});

btnQuitCancel.addEventListener("click", () => {
  overlayQuit.style.display = "none";
});

btnQuitConfirm.addEventListener("click", () => {
  overlayQuit.style.display = "none";
  // Сброс timestamp на текущее время
  const newTimestamp = Date.now();
  chrome.storage.sync.set({ quitTimestamp: newTimestamp }, () => {
    chrome.runtime.sendMessage({ action: "updateBadge" });
    renderMain();
  });
});

// ── Форматирование денег ───────────────────────────────
function formatMoney(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "М";
  if (amount >= 1000)    return (amount / 1000).toFixed(1) + "к";
  return Math.floor(amount).toString();
}

// ── Расчёт и рендер главного экрана ───────────────────
function renderMain() {
  chrome.storage.sync.get(null, (data) => {
    // Если timestamp не установлен — инициализируем
    if (!data.quitTimestamp) {
      chrome.storage.sync.set({ quitTimestamp: Date.now() });
      data.quitTimestamp = Date.now();
    }

    // Количество дней без курения
    const daysSinceQuitting = Math.floor(
      (Date.now() - data.quitTimestamp) / (1000 * 60 * 60 * 24)
    );

    // ── Блок "Дни" ────────────────────────────────────
    elDays.textContent = daysSinceQuitting;

    // ── Блок "Лёгкие" ─────────────────────────────────
    const hasSmokingHistory =
      data.smokingYears > 0 || data.smokingMonths > 0 || data.smokingDays > 0;

    if (hasSmokingHistory) {
      const totalYears =
        (data.smokingYears   || 0) +
        (data.smokingMonths  || 0) / 12 +
        (data.smokingDays    || 0) / 365;

      const recoveryPct = Math.min(
        100,
        Math.floor((daysSinceQuitting / (270 + totalYears * 15)) * 100)
      );

      elLungs.textContent = recoveryPct + "%";
      cardLungs.classList.remove("inactive");

      // Прогресс-бар
      progressSect.style.display = "block";
      progressFill.style.width   = recoveryPct + "%";
      progressPct.textContent    = recoveryPct + "%";
    } else {
      elLungs.textContent = "—";
      cardLungs.classList.add("inactive");
      progressSect.style.display = "none";
    }

    // ── Блок "Рубли" ──────────────────────────────────
    const hasMoneySetting = data.packPrice > 0 && data.daysPerPack > 0;

    if (hasMoneySetting) {
      const savedMoney = (daysSinceQuitting / data.daysPerPack) * data.packPrice;
      elMoney.textContent = formatMoney(savedMoney);
      cardMoney.classList.remove("inactive");
    } else {
      elMoney.textContent = "—";
      cardMoney.classList.add("inactive");
    }

    // ── Мотивационная фраза ────────────────────────────
    // Выбираем фразу по дню (детерминированно, не меняется до перезапуска)
    const phraseIndex = daysSinceQuitting % MOTIVATION_PHRASES.length;
    motivText.textContent = MOTIVATION_PHRASES[phraseIndex];
  });
}

// ── Инициализация при открытии попапа ─────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderMain();
  showScreen("main");
});
