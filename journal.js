import { getPriceHistory, PRICE_STATUS_LABELS } from "./pricing.js";

export function renderJournal() {
  const tbody = document.getElementById("journal-body");
  if (!tbody) return;

  const list = getPriceHistory();
  if (list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="hint">Записей пока нет — постройте прогноз на дашборде.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((e) => {
      const status = PRICE_STATUS_LABELS[e.status] || "—";
      return (
        `<tr><td>${e.date}</td><td>${e.flight || "—"}</td>` +
        `<td class="num">${Number(e.price).toLocaleString("ru-RU")} ₽</td>` +
        `<td>${status}</td><td>${e.comment || "—"}</td></tr>`
      );
    })
    .join("");
}

export function initJournal() {
  renderJournal();
  document.addEventListener("pricehistory:changed", renderJournal);
}
