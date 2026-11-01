// ==================== ОТРИСОВКА ГРАФИКОВ ====================
const PLOT_SELECTOR = "#plot-container";
const TOOLTIP_ID = "chart-tooltip";

function getTooltip() {
  let tooltip = document.getElementById(TOOLTIP_ID);
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

let hoverBound = false;

function bindHoverTooltip() {
  if (hoverBound) return;
  if (typeof window.jQuery === "undefined") return;
  const $plot = $(PLOT_SELECTOR);
  if (!$plot.length) return;

  hoverBound = true;
  $plot.on("plothover", (event, pos, item) => {
    const tooltip = getTooltip();
    if (!item) {
      tooltip.style.display = "none";
      return;
    }
    const [x, y] = item.datapoint;
    const label = item.series.label || "Граница интервала";
    tooltip.innerHTML =
      `${label}<br>t = ${Math.round(x)}<br>x = ${y.toFixed(2)}`;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.pageX + 12}px`;
    tooltip.style.top = `${event.pageY + 12}px`;
  });
}

// xValues — модель на всём интервале (история + прогноз),
// lsmValues — модель по МНК, historyLength — сколько первых точек относится к истории.
export function plotGraph(xValues, lsmValues, historyLength = 0) {
  const theory = Array.isArray(xValues) ? xValues : [];
  const lsm = Array.isArray(lsmValues) ? lsmValues : [];
  const datasets = [];

  const split =
    Number.isInteger(historyLength) &&
    historyLength > 0 &&
    historyLength < theory.length;

  if (theory.length > 0) {
    if (!split) {
      datasets.push({
        label: "Теоретическая модель",
        data: theory.map((v, i) => [i, v]),
        color: "#806edc",
        lines: { show: true, lineWidth: 2 },
        points: { show: true, radius: 2.5 },
      });
    } else {
      // История — основным цветом, прогноз — светлее и крупными точками
      datasets.push({
        label: "История (модель)",
        data: theory.slice(0, historyLength).map((v, i) => [i, v]),
        color: "#806edc",
        lines: { show: true, lineWidth: 2 },
        points: { show: true, radius: 2.5 },
      });
      datasets.push({
        label: "Прогноз",
        data: theory
          .slice(historyLength - 1)
          .map((v, i) => [historyLength - 1 + i, v]),
        color: "#c4b5fd",
        lines: { show: true, lineWidth: 2 },
        points: { show: true, radius: 4 },
      });

      // Доверительный интервал ±10% от прогноза
      const tail = theory.slice(historyLength);
      const upper = {
        label: "Доверительный интервал (±10%)",
        data: tail.map((v, i) => [historyLength + i, v * 1.1]),
        color: "rgba(128, 110, 220, 0.5)",
        lines: { show: true, lineWidth: 1 },
        points: { show: false },
      };
      const lower = {
        label: "",
        data: tail.map((v, i) => [historyLength + i, Math.max(0, v * 0.9)]),
        color: "rgba(128, 110, 220, 0.5)",
        lines: { show: true, lineWidth: 1 },
        points: { show: false },
      };
      datasets.push(upper, lower);
    }
  }

  if (lsm.length > 0) {
    datasets.push({
      label: "Расчетная модель (МНК)",
      data: lsm.map((v, i) => [i, v]),
      color: "#ff9800",
      lines: { show: true, lineWidth: 2 },
      points: { show: true, radius: 2.5 },
    });
  }

  if (datasets.length === 0) {
    plotGraphEmpty();
    return;
  }

  bindHoverTooltip();

  try {
    $.plot($(PLOT_SELECTOR), datasets, {
      grid: { hoverable: true, clickable: true },
      legend: { position: "ne" },
      xaxis: { tickDecimals: 0 },
    });
    $(PLOT_SELECTOR).find(".chart-placeholder").hide();
  } catch (e) {
    console.warn(e);
  }
}

export function plotGraphEmpty() {
  const tooltip = document.getElementById(TOOLTIP_ID);
  if (tooltip) tooltip.style.display = "none";
  $.plot($(PLOT_SELECTOR), []);
  $(PLOT_SELECTOR).find(".chart-placeholder").show();
}
