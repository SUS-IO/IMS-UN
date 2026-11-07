const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
function calcLine({ kind, qty, pack, rate, disc = 0, gst = 0, inclusive = true }) {
  const q = Number(qty) || 0;
  const net = q * (Number(rate) || 0) / Math.max(Number(pack) || 1, 1) * (1 - (Number(disc) || 0) / 100);
  const g = Number(gst) || 0;
  const taxable = kind === "sale" && inclusive ? r2(net / (1 + g / 100)) : r2(net);
  const gstAmount = r2(taxable * g / 100);
  return { taxable, gstAmount, total: r2(taxable + gstAmount) };
}
function sumLines(lines) {
  return lines.reduce(
    (a, l) => ({ taxable: r2(a.taxable + (l.taxable || 0)), gst: r2(a.gst + (l.gstAmount || 0)), total: r2(a.total + (l.total || 0)) }),
    { taxable: 0, gst: 0, total: 0 }
  );
}
export {
  calcLine,
  sumLines
};
