const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
function calcLine({ kind, qty, pack, rate, disc = 0, gst = 0, inclusive = true }) {
  const q = Number(qty) || 0;
  const net = q * (Number(rate) || 0) / Math.max(Number(pack) || 1, 1) * (1 - (Number(disc) || 0) / 100);
  const g = Number(gst) || 0;
  const taxable = kind === "sale" && inclusive ? r2(net / (1 + g / 100)) : r2(net);
  const gstAmount = r2(taxable * g / 100);
  return { taxable, gstAmount, total: r2(taxable + gstAmount) };
}
const packOf = (pack) => Math.max(Number(pack) || 1, 1);
const unitDivisor = (unit, pack) => unit === "PCS" ? packOf(pack) : 1;
const trim = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  let t = x.toFixed(4).replace(/0+$/, "");
  if (/\.\d?$/.test(t)) t = x.toFixed(2);
  return t;
};
// Prices are stored per PACK. This shows them per the unit the user entered (loose piece or pack/set).
function lineView(l, uom) {
  const pack = packOf(l.pack_size);
  const unit = l.entry_unit === "PACK" && pack > 1 ? "PACK" : "PCS";
  const d = unitDivisor(unit, pack);
  const q = Number(l.qty) || 0;
  return {
    unit,
    qty: unit === "PACK" ? q / pack : q,
    unitLabel: unit === "PACK" ? uom || "Pack" : "Pcs",
    per: unit === "PACK" ? "pack" : "pc",
    mrp: l.mrp === null || l.mrp === void 0 ? null : Number(l.mrp) / d,
    rate: l.rate === null || l.rate === void 0 ? null : Number(l.rate) / d
  };
}
function sumLines(lines) {
  return lines.reduce(
    (a, l) => ({ taxable: r2(a.taxable + (l.taxable || 0)), gst: r2(a.gst + (l.gstAmount || 0)), total: r2(a.total + (l.total || 0)) }),
    { taxable: 0, gst: 0, total: 0 }
  );
}
export {
  calcLine,
  lineView,
  packOf,
  trim,
  unitDivisor,
  sumLines
};
