import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "../components/ui/Modal.js";
const Ctx = createContext(null);
function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const [text, setText] = useState("");
  const resolver = useRef(null);
  const open = useCallback((cfg) => new Promise((resolve) => {
    resolver.current = resolve;
    setText("");
    setDlg(cfg);
  }), []);
  const close = (val) => {
    resolver.current?.(val);
    resolver.current = null;
    setDlg(null);
  };
  const api = {
    confirm: (cfg) => open({ ...cfg, mode: "confirm" }),
    ask: (cfg) => open({ ...cfg, mode: "ask" })
  };
  const tooShort = dlg?.mode === "ask" && text.trim().length < (dlg.minLength || 1);
  return /* @__PURE__ */ jsxs(Ctx.Provider, { value: api, children: [
    children,
    /* @__PURE__ */ jsxs(
      Modal,
      {
        open: !!dlg,
        size: "sm",
        title: dlg?.title || "",
        onClose: () => close(dlg?.mode === "ask" ? null : false),
        icon: dlg?.danger ? AlertTriangle : HelpCircle,
        tone: dlg?.danger ? "danger" : "",
        footer: dlg && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => close(dlg.mode === "ask" ? null : false), children: dlg.cancelText || "Cancel" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: `btn ${dlg.danger ? "btn-danger" : "btn-primary"}`,
              disabled: tooShort,
              onClick: () => close(dlg.mode === "ask" ? text.trim() : true),
              children: dlg.confirmText || "Confirm"
            }
          )
        ] }),
        children: [
          dlg?.message && /* @__PURE__ */ jsx("p", { style: { marginBottom: dlg.mode === "ask" ? 12 : 0 }, children: dlg.message }),
          dlg?.mode === "ask" && /* @__PURE__ */ jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsx("label", { children: dlg.label || "Reason" }),
            /* @__PURE__ */ jsx("textarea", { className: "textarea", autoFocus: true, value: text, onChange: (e) => setText(e.target.value) }),
            dlg.minLength > 1 && /* @__PURE__ */ jsxs("span", { className: "hint", children: [
              "At least ",
              dlg.minLength,
              " characters."
            ] })
          ] })
        ]
      }
    )
  ] });
}
const useDialog = () => useContext(Ctx);
export {
  DialogProvider,
  useDialog
};
