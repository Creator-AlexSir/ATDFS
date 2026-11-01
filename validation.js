// Разбор строки ряда: допускаются пробелы, запятые, точки с запятой,
// символ «*» (распродано) и прочий мусор — они игнорируются.
export function parseSeries(text) {
  return String(text || "")
    .split(/[\s,;]+/)
    .filter((token) => token && token !== "*")
    .map(Number)
    .filter((v) => !isNaN(v));
}

// Ряд валиден, если в нём не менее 3 чисел.
export function isValidSeries(text) {
  return parseSeries(text).length >= 3;
}

// Вместимость валидна, если это число больше нуля.
export function isValidCapacity(num) {
  const value = Number(num);
  return Number.isFinite(value) && value > 0;
}
