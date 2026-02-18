// ===================================================
// BreathFresh — background.js (Service Worker)
// Управление бейджем на иконке расширения
// ===================================================

// ── Форматирование числа для бейджа ──────────────────
// Если > 999 — сокращаем (например, 1.2k)
function formatBadgeText(value) {
  if (value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000)    return (num / 1000).toFixed(1) + "k";
  return Math.floor(num).toString();
}

// ── Обновление бейджа ────────────────────────────────
function updateBadge() {
  chrome.storage.sync.get(null, (data) => {
    const quitTimestamp = data.quitTimestamp || Date.now();
    const daysSinceQuitting = Math.floor(
      (Date.now() - quitTimestamp) / (1000 * 60 * 60 * 24)
    );

    const badgeMode = data.badgeMode || "days";
    let badgeText  = "";
    let badgeColor = "#4caf87"; // зелёный по умолчанию

    if (badgeMode === "days") {
      // Режим "Дни"
      badgeText  = formatBadgeText(daysSinceQuitting);
      badgeColor = "#4caf87";

    } else if (badgeMode === "lungs") {
      // Режим "Лёгкие %"
      const hasHistory =
        data.smokingYears > 0 || data.smokingMonths > 0 || data.smokingDays > 0;

      if (hasHistory) {
        const totalYears =
          (data.smokingYears   || 0) +
          (data.smokingMonths  || 0) / 12 +
          (data.smokingDays    || 0) / 365;

        const recoveryPct = Math.min(
          100,
          Math.floor((daysSinceQuitting / (270 + totalYears * 15)) * 100)
        );
        badgeText  = recoveryPct + "%";
        badgeColor = "#4a9ebb"; // голубой
      }

    } else if (badgeMode === "money") {
      // Режим "Рубли"
      if (data.packPrice > 0 && data.daysPerPack > 0) {
        const savedMoney = (daysSinceQuitting / data.daysPerPack) * data.packPrice;
        badgeText  = formatBadgeText(savedMoney);
        badgeColor = "#7b68ee"; // фиолетовый для денег
      }

    } else if (badgeMode === "none") {
      // Скрыть бейдж
      badgeText = "";
    }

    // Устанавливаем бейдж
    chrome.action.setBadgeText({ text: badgeText });
    if (badgeText) {
      chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    }
  });
}

// ── Слушатели событий ────────────────────────────────

// Обновление при установке расширения
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Первая установка — сохраняем начальный timestamp
    chrome.storage.sync.set({
      quitTimestamp: Date.now(),
      badgeMode: "days",
    }, () => {
      updateBadge();
    });
  } else {
    updateBadge();
  }
});

// Обновление по сообщению из popup.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateBadge") {
    updateBadge();
  }
});

// Периодическое обновление бейджа каждые 30 минут
// (чтобы счётчик дней обновлялся, если браузер открыт долго)
chrome.alarms.create("badgeRefresh", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "badgeRefresh") {
    updateBadge();
  }
});

// Также обновляем при любом изменении storage
chrome.storage.onChanged.addListener(() => {
  updateBadge();
});
