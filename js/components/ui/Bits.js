import { jsx, jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
const Badge = ({ tone = "", dot, children, title }) => /* @__PURE__ */ jsxs("span", { className: `badge ${tone}`, title, children: [
  dot && /* @__PURE__ */ jsx("i", { className: "dot" }),
  children
] });
function Field({ label, required, hint, error, className = "", children }) {
  return /* @__PURE__ */ jsxs("div", { className: `field ${className}`, children: [
    label && /* @__PURE__ */ jsxs("label", { children: [
      label,
      required && /* @__PURE__ */ jsx("span", { className: "req", children: " *" })
    ] }),
    children,
    error ? /* @__PURE__ */ jsx("span", { className: "err", children: error }) : hint ? /* @__PURE__ */ jsx("span", { className: "hint", children: hint }) : null
  ] });
}
function PageHeader({ title, subtitle, actions }) {
  return /* @__PURE__ */ jsxs("div", { className: "page-head", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { children: title }),
      subtitle && /* @__PURE__ */ jsx("p", { children: subtitle })
    ] }),
    actions && /* @__PURE__ */ jsx("div", { className: "actions", children: actions })
  ] });
}
function StatCard({ icon: Icon, label, value, sub, tone = "", onClick }) {
  const Tag = onClick ? "button" : "div";
  return /* @__PURE__ */ jsxs(Tag, { className: `stat ${tone}`, onClick, type: onClick ? "button" : void 0, children: [
    /* @__PURE__ */ jsx("span", { className: "s-ic", children: /* @__PURE__ */ jsx(Icon, {}) }),
    /* @__PURE__ */ jsxs("span", { children: [
      /* @__PURE__ */ jsx("div", { className: "s-label", children: label }),
      /* @__PURE__ */ jsx("div", { className: "s-value", children: value }),
      sub && /* @__PURE__ */ jsx("div", { className: "s-sub", children: sub })
    ] })
  ] });
}
const PageLoader = ({ text = "Loading\u2026" }) => /* @__PURE__ */ jsxs("div", { className: "page-loader", children: [
  /* @__PURE__ */ jsx("span", { className: "spinner" }),
  text
] });
const Alert = ({ tone = "info", icon: Icon, children }) => /* @__PURE__ */ jsxs("div", { className: `alert ${tone}`, children: [
  Icon && /* @__PURE__ */ jsx(Icon, {}),
  /* @__PURE__ */ jsx("div", { children })
] });
function Btn({ busy, children, icon: Icon, ...p }) {
  return /* @__PURE__ */ jsxs("button", { ...p, disabled: p.disabled || busy, children: [
    busy ? /* @__PURE__ */ jsx(Loader2, { className: "spin-ic", style: { animation: "spin .7s linear infinite" } }) : Icon ? /* @__PURE__ */ jsx(Icon, {}) : null,
    children
  ] });
}
function Tabs({ tabs, value, onChange }) {
  return /* @__PURE__ */ jsx("div", { className: "tabs", role: "tablist", children: tabs.map((t) => /* @__PURE__ */ jsxs("button", { role: "tab", "aria-selected": value === t.key, className: `tab ${value === t.key ? "active" : ""}`, onClick: () => onChange(t.key), children: [
    t.icon && /* @__PURE__ */ jsx(t.icon, {}),
    t.label,
    t.count !== void 0 && /* @__PURE__ */ jsx("span", { className: "badge", children: t.count })
  ] }, t.key)) });
}
export {
  Alert,
  Badge,
  Btn,
  Field,
  PageHeader,
  PageLoader,
  StatCard,
  Tabs
};
