const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const money = (n) => n === null || n === void 0 || n === "" || Number.isNaN(Number(n)) ? "\u2014" : inr.format(Number(n));
const num = (n) => n === null || n === void 0 || n === "" ? "\u2014" : numFmt.format(Number(n));
const int = (n) => n === null || n === void 0 || n === "" ? "\u2014" : intFmt.format(Number(n));
const pct = (n) => n === null || n === void 0 ? "\u2014" : `${Number(n)}%`;
function fmtDate(d) {
  if (!d) return "\u2014";
  const x = typeof d === "string" && d.length === 10 ? /* @__PURE__ */ new Date(d + "T00:00:00") : new Date(d);
  return x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}
function timeAgo(d) {
  if (!d) return "never";
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1e3);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
const todayISO = () => {
  const d = /* @__PURE__ */ new Date();
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};
function greeting() {
  const h = (/* @__PURE__ */ new Date()).getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function packText(qty, packSize, uom) {
  const q = Number(qty || 0);
  const p = Number(packSize || 1);
  if (p <= 1) return `${int(q)} ${uom && uom.toLowerCase() !== "nos" ? uom : "pcs"}`;
  const packs = Math.floor(q / p);
  const loose = q % p;
  const u = uom || "pack";
  if (!packs) return `${int(loose)} pcs`;
  return loose ? `${int(packs)} ${u} + ${int(loose)} pcs` : `${int(packs)} ${u}`;
}
function ageTone(days) {
  if (days === null || days === void 0) return "muted";
  if (days <= 30) return "ok";
  if (days <= 60) return "info";
  if (days <= 90) return "warn";
  return "danger";
}
const ageLabel = (days) => days === null || days === void 0 ? "\u2014" : days === 0 ? "Today" : `${days} d`;
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
export {
  ageLabel,
  ageTone,
  fmtDate,
  fmtDateTime,
  greeting,
  initials,
  int,
  money,
  num,
  packText,
  pct,
  timeAgo,
  todayISO
};
