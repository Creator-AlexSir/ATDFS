import { getPriceHistory, PRICE_STATUS_LABELS } from "./pricing.js";

const HEADER = ["Дата", "Рейс", "Цена, руб.", "Статус", "Основание"];

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildReportCsv() {
  const rows = [
    HEADER,
    ...getPriceHistory().map((e) => [
      e.date,
      e.flight || "",
      e.price,
      PRICE_STATUS_LABELS[e.status] || "",
      e.comment || "",
    ]),
  ];
  // BOM для корректного открытия кириллицы в Excel
  return "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n");
}

export function downloadReport() {
  const blob = new Blob([buildReportCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  alert("Отчет сформирован");
}

export function initReports() {
  document
    .getElementById("download-report")
    ?.addEventListener("click", downloadReport);
}
