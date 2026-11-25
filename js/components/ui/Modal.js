import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
function Modal({ open, title, onClose, children, footer, size = "md", dismissable = true, icon: Icon, tone }) {
  useEffect(() => {
    if (!open) return void 0;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && dismissable) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismissable, onClose]);
  if (!open) return null;
  return createPortal(
    /* @__PURE__ */ jsx("div", { className: "modal-back", onMouseDown: (e) => {
      if (e.target === e.currentTarget && dismissable) onClose?.();
    }, children: /* @__PURE__ */ jsxs("div", { className: `modal ${size}`, role: "dialog", "aria-modal": "true", "aria-label": title, children: [
      /* @__PURE__ */ jsxs("div", { className: "modal-head", children: [
        Icon && /* @__PURE__ */ jsx("span", { className: `m-ic ${tone || ""}`, children: /* @__PURE__ */ jsx(Icon, {}) }),
        /* @__PURE__ */ jsx("h3", { children: title }),
        dismissable && /* @__PURE__ */ jsx("button", { className: "icon-btn", onClick: onClose, "aria-label": "Close", children: /* @__PURE__ */ jsx(X, {}) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "modal-body", children }),
      footer && /* @__PURE__ */ jsx("div", { className: "modal-foot", children: footer })
    ] }) }),
    document.body
  );
}
export {
  Modal as default
};
