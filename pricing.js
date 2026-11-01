// Базовая логика цены: спрос выше 80% вместимости — +10%,
// ниже 50% — −10%, иначе базовая цена. Результат зажат в границы.
export function calculateRecommendedPrice(
  forecastDemand,
  capacity,
  basePrice,
  minPrice = 0,
  maxPrice = Infinity,
) {
  let price = basePrice;

  if (capacity > 0) {
    if (forecastDemand > capacity * 0.8) {
      price = basePrice * 1.1;
    } else if (forecastDemand < capacity * 0.5) {
      price = basePrice * 0.9;
    }
  }

  return Math.min(Math.max(price, minPrice), maxPrice);
}

// ==================== ИСТОРИЯ ЦЕН (localStorage) =============
const HISTORY_KEY = "ATDFS_PRICE_HISTORY";
const HISTORY_LIMIT = 100;

export const PRICE_STATUS_LABELS = {
  recommended: "Рекомендована",
  corrected: "Скорректирована",
  approved: "Утверждена",
};

export function getPriceHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function getLastPrice() {
  const list = getPriceHistory();
  return list.length ? list[0].price : null;
}

// Запись: { price, date, flight, comment, status }
export function savePriceEntry(price, options = {}) {
  const entry = {
    price: Number(price),
    date: new Date().toLocaleString("ru-RU"),
    flight: options.flight || "",
    comment: options.comment || "ручная корректировка",
    status: options.status || "corrected",
  };

  const list = [entry, ...getPriceHistory()].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Не удалось сохранить историю цен:", e);
  }

  document.dispatchEvent(new CustomEvent("pricehistory:changed"));
  return entry;
}
