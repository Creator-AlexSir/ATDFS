// ==================== ГЕНЕРАЦИЯ ШУМА ========================
export function getNormalRandom() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ==================== ПРЕОБРАЗОВАНИЕ ФОРМУЛ =================
export function convertToRawFormula(displayFormula) {
  const decodeSubscript = (subscript) => {
    const map = {
      "₀": "0",
      "₁": "1",
      "₂": "2",
      "₃": "3",
      "₄": "4",
      "₅": "5",
      "₆": "6",
      "₇": "7",
      "₈": "8",
      "₉": "9",
    };
    return subscript
      .split("")
      .map((ch) => map[ch] || ch)
      .join("");
  };
  const decodeSuperscript = (sup) => {
    const map = {
      "⁰": "0",
      "¹": "1",
      "²": "2",
      "³": "3",
      "⁴": "4",
      "⁵": "5",
      "⁶": "6",
      "⁷": "7",
      "⁸": "8",
      "⁹": "9",
      ⁿ: "n",
    };
    return sup
      .split("")
      .map((ch) => map[ch] || ch)
      .join("");
  };

  let result = displayFormula;
  result = result.replace(
    /xₜ₋([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (m, sub) => `x[t-${decodeSubscript(sub)}]`,
  );
  result = result.replace(/xₜ/g, "x[t]");
  result = result.replace(/wₜ/g, "wt");
  result = result.replace(
    /a([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (m, sub) => `a${decodeSubscript(sub)}`,
  );
  result = result.replace(/π/g, "pi");
  result = result.replace(
    /(\w+|\([^)]+\))([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+)/g,
    (m, base, sup) => `${base}^${decodeSuperscript(sup)}`,
  );
  return result;
}

export function extractIndicesFromRaw(rawFormula) {
  const aRegex = /a(\d+)/g;
  let match,
    indices = new Set();
  while ((match = aRegex.exec(rawFormula)) !== null) {
    indices.add(parseInt(match[1]));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

// Преобразование формулы в JS-выражение
export function formulaToJS(expr) {
  return expr
    .replace(/pi/g, "Math.PI")
    .replace(/sin\(/g, "Math.sin(")
    .replace(/cos\(/g, "Math.cos(")
    .replace(/tan\(/g, "Math.tan(")
    .replace(/exp\(/g, "Math.exp(")
    .replace(/ln\(/g, "Math.log(")
    .replace(/sqrt\(/g, "Math.sqrt(")
    .replace(/\^/g, "**");
}

// ==================== ВЫЧИСЛЕНИЯ И МОДЕЛИРОВАНИЕ ============
// formulaRaw — строка формулы, coeffIndices — массив индексов [0,1,...],
// coeffs — объект { a0: 1, a1: 0.5 }, length — число точек,
// wtMultiplier — множитель шума, x0 — значение до начала ряда
export function calculateModel(
  formulaRaw,
  coeffIndices,
  coeffs,
  length,
  wtMultiplier = 1,
  x0 = 0,
) {
  if (!formulaRaw || !coeffIndices || coeffIndices.length === 0) return [];

  const baseExpr = formulaToJS(formulaRaw);
  const result = [];

  for (let t = 0; t < length; t++) {
    let evalExpr = baseExpr;

    evalExpr = evalExpr.replace(/x\[t-(\d+)\]/g, (match, lag) => {
      const idx = t - parseInt(lag);
      return idx >= 0 && idx < result.length ? result[idx] : x0;
    });

    evalExpr = evalExpr.replace(/\bt\b/g, t);

    for (let [key, val] of Object.entries(coeffs)) {
      evalExpr = evalExpr.replace(new RegExp(`\\b${key}\\b`, "g"), val);
    }

    const wt = getNormalRandom() * wtMultiplier;
    evalExpr = evalExpr.replace(/\bwt\b/g, wt);

    try {
      const val = eval(evalExpr);
      result[t] = isNaN(val) || !isFinite(val) ? 0 : val;
    } catch (e) {
      console.error("Ошибка в формуле:", evalExpr, e);
      result[t] = 0;
    }
  }
  return result;
}

// ==================== МНК ===================================
export function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row) => [...row]);
  const v = [...b];

  for (let i = 0; i < n; i++) {
    let max = i;
    for (let j = i + 1; j < n; j++)
      if (Math.abs(M[j][i]) > Math.abs(M[max][i])) max = j;
    [M[i], M[max]] = [M[max], M[i]];
    [v[i], v[max]] = [v[max], v[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let j = i + 1; j < n; j++) {
      const factor = M[j][i] / M[i][i];
      v[j] -= factor * v[i];
      for (let k = i; k < n; k++) M[j][k] -= factor * M[i][k];
    }
  }

  const res = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += M[i][j] * res[j];
    res[i] = (v[i] - sum) / M[i][i];
  }
  return res;
}

// yData — массив чисел. Возвращает объект { a0: ..., a1: ... }
// или null, если данных мало / матрица вырождена.
export function estimateCoefficientsFromData(formulaRaw, coeffIndices, yData) {
  if (!formulaRaw || !coeffIndices || coeffIndices.length === 0) return null;

  const ySeries = Array.isArray(yData)
    ? yData.map(Number).filter((v) => !isNaN(v))
    : [];

  if (ySeries.length < 3) return null;

  const k = coeffIndices.length;
  const n = ySeries.length;
  const Z = [];

  for (let t = 0; t < n; t++) {
    const row = [];
    for (let idx of coeffIndices) {
      let expr = formulaRaw;
      for (let other of coeffIndices) {
        expr = expr.replace(
          new RegExp(`\\ba${other}\\b`, "g"),
          other === idx ? 1 : 0,
        );
      }
      expr = formulaToJS(expr);

      expr = expr.replace(/x\[t-(\d+)\]/g, (match, lag) => {
        const idxPast = t - parseInt(lag);
        return idxPast >= 0 && idxPast < ySeries.length ? ySeries[idxPast] : 0;
      });
      expr = expr.replace(/\bwt\b/g, "0").replace(/\bt\b/g, t);

      try {
        row.push(eval(expr));
      } catch {
        row.push(0);
      }
    }
    Z.push(row);
  }

  const ZTZ = Array(k)
    .fill()
    .map(() => Array(k).fill(0));
  const ZTy = Array(k).fill(0);

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      for (let m = 0; m < n; m++) ZTZ[i][j] += Z[m][i] * Z[m][j];
    }
    for (let m = 0; m < n; m++) ZTy[i] += Z[m][i] * ySeries[m];
  }

  const solution = solveLinear(ZTZ, ZTy);
  if (!solution) return null;

  const estimatedCoeffs = {};
  for (let i = 0; i < coeffIndices.length; i++) {
    estimatedCoeffs[`a${coeffIndices[i]}`] = solution[i];
  }
  return estimatedCoeffs;
}
