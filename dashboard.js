import {
  convertToRawFormula,
  extractIndicesFromRaw,
  estimateCoefficientsFromData,
  calculateModel,
} from "./math.js";
import { plotGraph, plotGraphEmpty } from "./chart.js";
import {
  calculateRecommendedPrice,
  getLastPrice,
  savePriceEntry,
} from "./pricing.js";
import { parseSeries, isValidSeries, isValidCapacity } from "./validation.js";

// Демо-параметры цены (в отчётах базовая цена будет приходить из данных рейса)
const BASE_PRICE = 10000;
const MIN_PRICE = 9000;
const MAX_PRICE = 11000;

// Эмуляция выгрузки из БД (бэкенда пока нет)
const TEST_SERIES = [10, 15, 20, 25, 30, 35, 40];

const state = { demand: 0, recommended: 0, current: 0 };

// "x[t] = a0 + a1*t (Линейный тренд)" -> "a0 + a1*t"
function getFormulaExpression(select) {
  if (!select || !select.value) return "";
  const parts = select.value.split("=");
  if (parts.length < 2) return select.value.trim();
  return parts
    .slice(1)
    .join("=")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

function getElements(root) {
  return {
    textarea: root.querySelector("textarea"),
    formulaSelect: [...root.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.text.includes("x[t]")),
    ),
    flightSelect: [...root.querySelectorAll("select")].find(
      (s) => ![...s.options].some((o) => o.text.includes("x[t]")),
    ),
    horizonInput: root.querySelector('input[value="10"]'),
    capacityInput: root.querySelector('input[value="150"]'),
  };
}

function formatMoney(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function getFlightCode(root) {
  const { flightSelect } = getElements(root);
  return flightSelect ? flightSelect.value.split(" ")[0] : "";
}

function renderPriceBox(root) {
  const box = root.querySelector("#price-recommendation");
  if (!box) return;

  if (!state.recommended) {
    box.textContent = "";
    return;
  }

  let text =
    `Прогнозируемый спрос: ${Math.round(state.demand)} мест. ` +
    `Рекомендованная цена: ${formatMoney(state.recommended)}.`;
  if (state.current && state.current !== state.recommended) {
    text += ` Текущая цена: ${formatMoney(state.current)}.`;
  }
  box.textContent = text;
}

function buildForecast(root) {
  const { textarea, formulaSelect, horizonInput, capacityInput } =
    getElements(root);
  if (!textarea || !formulaSelect) return;

  if (!isValidSeries(textarea.value)) {
    plotGraphEmpty();
    alert("Введите не менее 3 числовых значений истории продаж.");
    return;
  }

  if (!isValidCapacity(capacityInput?.value)) {
    plotGraphEmpty();
    alert("Вместимость должна быть числом больше нуля.");
    return;
  }

  const history = parseSeries(textarea.value);
  const rawFormula = convertToRawFormula(getFormulaExpression(formulaSelect));
  if (!rawFormula) {
    plotGraphEmpty();
    alert("Выберите формулу модели.");
    return;
  }

  const coeffIndices = extractIndicesFromRaw(rawFormula);
  if (coeffIndices.length === 0) {
    plotGraphEmpty();
    alert("В формуле нет коэффициентов a0, a1...");
    return;
  }

  const coeffs = estimateCoefficientsFromData(rawFormula, coeffIndices, history);
  if (!coeffs) {
    plotGraphEmpty();
    alert("Не удалось рассчитать коэффициенты (матрица вырождена).");
    return;
  }

  const horizon = Math.max(1, parseInt(horizonInput?.value, 10) || 10);
  const capacity = parseInt(capacityInput?.value, 10);

  const xValues = calculateModel(
    rawFormula,
    coeffIndices,
    coeffs,
    history.length + horizon,
  );
  const lsmValues = calculateModel(
    rawFormula,
    coeffIndices,
    coeffs,
    history.length,
  );

  plotGraph(xValues, lsmValues, history.length);

  const forecast = xValues.slice(history.length);
  state.demand = forecast.length ? Math.max(...forecast) : 0;
  state.recommended = calculateRecommendedPrice(
    state.demand,
    capacity,
    BASE_PRICE,
    MIN_PRICE,
    MAX_PRICE,
  );
  state.current = state.recommended;

  savePriceEntry(state.recommended, {
    status: "recommended",
    flight: getFlightCode(root),
    comment: "рекомендация системы",
  });

  renderPriceBox(root);
  return { coeffs, xValues, lsmValues, capacity, recommendedPrice: state.recommended };
}

function loadFromDb(root) {
  const { textarea } = getElements(root);
  if (!textarea) return;

  const lastPrice = getLastPrice();
  textarea.value = TEST_SERIES.join(", ");
  const result = buildForecast(root);

  if (!result) return;
  alert(
    `Данные загружены из БД (эмуляция).\n` +
      `Ряд: ${TEST_SERIES.join(", ")}\n` +
      `Последняя сохранённая цена: ${lastPrice ? formatMoney(lastPrice) : "нет"}`,
  );
}

function adjustPrice(root) {
  if (!state.recommended) {
    alert("Сначала постройте прогноз.");
    return;
  }

  const input = prompt(
    `Введите новую цену (${MIN_PRICE}–${MAX_PRICE} ₽):`,
    String(Math.round(state.current || state.recommended)),
  );
  if (input === null) return;

  const price = Number(String(input).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) {
    alert("Некорректная цена. Введите число.");
    return;
  }
  if (price < MIN_PRICE || price > MAX_PRICE) {
    alert(`Цена должна быть в диапазоне ${MIN_PRICE}–${MAX_PRICE} ₽.`);
    return;
  }

  state.current = price;
  savePriceEntry(price, {
    status: "corrected",
    flight: getFlightCode(root),
    comment: "ручная корректировка",
  });
  renderPriceBox(root);
}

function approvePrice(root) {
  if (!state.current) {
    alert("Сначала постройте прогноз.");
    return;
  }

  savePriceEntry(state.current, {
    status: "approved",
    flight: getFlightCode(root),
    comment: "утверждено руководителем",
  });
  alert(`Цена ${formatMoney(state.current)} утверждена.`);
}

export function initDashboard() {
  const root = document.getElementById("dashboard");
  if (!root) return;

  root
    .querySelector(".card-button")
    ?.addEventListener("click", () => buildForecast(root));
  root
    .querySelector("#load-from-db")
    ?.addEventListener("click", () => loadFromDb(root));
  root
    .querySelector("#adjust-price")
    ?.addEventListener("click", () => adjustPrice(root));
  root
    .querySelector("#approve-price")
    ?.addEventListener("click", () => approvePrice(root));
}
