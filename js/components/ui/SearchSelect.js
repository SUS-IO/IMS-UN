import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search } from "lucide-react";
const MAX_SHOWN = 80;
function SearchSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select\u2026",
  disabled,
  clearable = true,
  invalid,
  size,
  emptyText = "No matches",
  autoFocus
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const pop = useRef(null);
  const listRef = useRef(null);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    const parts = s.split(/\s+/);
    return options.filter((o) => {
      const hay = `${o.label} ${o.sub || ""} ${o.keywords || ""}`.toLowerCase();
      return parts.every((p) => hay.includes(p));
    });
  }, [options, q]);
  const shown = filtered.slice(0, MAX_SHOWN);
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const h = Math.min(340, 60 + shown.length * 46);
    const up = below < Math.min(h, 240) && r.top > below;
    const width = Math.max(r.width, 260);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ left: Math.max(8, left), width, top: up ? void 0 : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : void 0, maxH: Math.max(160, (up ? r.top : below) - 16) });
  };
  useLayoutEffect(() => {
    if (open) place();
  }, [open, shown.length]);
  useEffect(() => {
    if (!open) return void 0;
    const close = (e) => {
      if (!btn.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false);
    };
    const re = () => place();
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", re);
    window.addEventListener("scroll", re, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", re);
      window.removeEventListener("scroll", re, true);
    };
  }, [open]);
  useEffect(() => {
    setHi(0);
  }, [q, open]);
  useEffect(() => {
    listRef.current?.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  }, [hi]);
  useEffect(() => {
    if (autoFocus) btn.current?.focus();
  }, [autoFocus]);
  const choose = (o) => {
    if (o.disabled) return;
    onChange?.(o.value, o);
    setOpen(false);
    setQ("");
    btn.current?.focus();
  };
  const onKey = (e) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[hi]) choose(shown[hi]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") setOpen(false);
  };
  return /* @__PURE__ */ jsxs("div", { className: `ss ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${invalid ? "invalid" : ""} ${size === "sm" ? "sm" : ""}`, children: [
    /* @__PURE__ */ jsxs("button", { type: "button", ref: btn, className: "ss-control", disabled, onClick: () => setOpen((o) => !o), onKeyDown: onKey, "aria-haspopup": "listbox", "aria-expanded": open, children: [
      /* @__PURE__ */ jsx("span", { className: `ss-value ${selected ? "" : "ph"}`, children: selected ? selected.label : placeholder }),
      clearable && selected && !disabled && /* @__PURE__ */ jsx("span", { className: "ss-clear", role: "button", "aria-label": "Clear", onMouseDown: (e) => e.stopPropagation(), onClick: (e) => {
        e.stopPropagation();
        onChange?.("", null);
      }, children: /* @__PURE__ */ jsx(X, {}) }),
      /* @__PURE__ */ jsx(ChevronDown, {})
    ] }),
    open && pos && createPortal(
      /* @__PURE__ */ jsxs("div", { ref: pop, className: "ss-pop", style: { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }, children: [
        /* @__PURE__ */ jsx("div", { className: "ss-search", children: /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ jsx(Search, { size: 15, style: { position: "absolute", left: 10, top: 10, color: "var(--muted)" } }),
          /* @__PURE__ */ jsx("input", { className: "input", style: { paddingLeft: 32 }, autoFocus: true, placeholder: "Type to search\u2026", value: q, onChange: (e) => setQ(e.target.value), onKeyDown: onKey })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "ss-list", ref: listRef, role: "listbox", children: [
          shown.length === 0 && /* @__PURE__ */ jsx("div", { className: "ss-empty", children: emptyText }),
          shown.map((o, i) => /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              disabled: o.disabled,
              role: "option",
              "aria-selected": o.value === value,
              className: `ss-opt ${i === hi ? "active" : ""} ${o.value === value ? "selected" : ""}`,
              onMouseEnter: () => setHi(i),
              onClick: () => choose(o),
              children: [
                o.label,
                o.sub && /* @__PURE__ */ jsx("span", { className: "sub", children: o.sub })
              ]
            },
            String(o.value)
          )),
          filtered.length > MAX_SHOWN && /* @__PURE__ */ jsxs("div", { className: "ss-more", children: [
            "Showing ",
            MAX_SHOWN,
            " of ",
            filtered.length,
            " \u2014 type to narrow down"
          ] })
        ] })
      ] }),
      document.body
    )
  ] });
}
export {
  SearchSelect as default
};
