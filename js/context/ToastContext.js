import { jsx, jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
const Ctx = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warn: AlertTriangle };
function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, title, text, ms = 4500) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, type, title, text }]);
    if (ms) setTimeout(() => remove(id), ms);
  }, [remove]);
  const api = useMemo(() => ({
    success: (t, x) => push("success", t, x),
    error: (t, x) => push("error", t, x, 8e3),
    info: (t, x) => push("info", t, x),
    warn: (t, x) => push("warn", t, x, 7e3)
  }), [push]);
  return /* @__PURE__ */ jsxs(Ctx.Provider, { value: api, children: [
    children,
    /* @__PURE__ */ jsx("div", { className: "toasts", "aria-live": "polite", children: items.map((t) => {
      const Icon = ICONS[t.type];
      return /* @__PURE__ */ jsxs("div", { className: `toast ${t.type}`, children: [
        /* @__PURE__ */ jsx(Icon, {}),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: t.title }),
          t.text && /* @__PURE__ */ jsx("span", { children: t.text })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "x", onClick: () => remove(t.id), "aria-label": "Close", children: /* @__PURE__ */ jsx(X, { size: 16 }) })
      ] }, t.id);
    }) })
  ] });
}
const useToast = () => useContext(Ctx);
export {
  ToastProvider,
  useToast
};
