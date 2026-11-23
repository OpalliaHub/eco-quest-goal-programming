// For these missions, increasing y cannot increase any shortfall.
// Bound each row using the resources, then recover any plateau at the minimum.
function searchRows(model, limits, weights, evaluate) {
  const rows = [];
  for (let x = 0; x <= 8; x++) {
    const bounds = model.resources.map((r, i) => {
      const remaining = limits[i] - r.x * x;
      if (remaining < 0) return -1;
      return r.y ? Math.floor(remaining / r.y) : 8;
    });
    const y = Math.min(8, ...bounds);
    const point = y >= 0 ? evaluate(model, x, y, limits, weights) : null;
    rows.push({x, y, bounds, point});
  }
  const best = Math.min(...rows.filter(r => r.point).map(r => r.point.score));
  const winners = [];
  for (const row of rows) {
    if (!row.point || Math.abs(row.point.score - best) > 1e-9) continue;
    for (let y = row.y; y >= 0; y--) {
      const p = evaluate(model, row.x, y, limits, weights);
      if (Math.abs(p.score - best) > 1e-9) break;
      winners.push(p);
    }
  }
  return {rows, winners, best};
}
if (typeof module === 'object') module.exports = searchRows;
