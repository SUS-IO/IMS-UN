import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck, Layers, Zap, AlertTriangle } from "lucide-react";
import { useAuth, takeLoginNote } from "../context/AuthContext.js";
import { Field, Alert } from "../components/ui/Bits.js";
function Login() {
  const { signIn } = useAuth();
  const [uid, setUid] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note] = useState(() => takeLoginNote());
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn(uid, pw);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "login-wrap", children: [
    /* @__PURE__ */ jsxs("div", { className: "login-hero", children: [
      /* @__PURE__ */ jsx("div", { className: "chip", children: /* @__PURE__ */ jsx("img", { src: "img/logo.png", alt: "IMS" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { children: "Every spare part, tracked to the rack." }),
        /* @__PURE__ */ jsx("p", { children: "Live stock by MRP and GST, complete audit trail, and step-by-step reversals \u2014 built for automobile spare parts." }),
        /* @__PURE__ */ jsxs("div", { className: "login-points", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Zap, {}),
            "Live stock that updates the moment you post"
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Layers, {}),
            "Same part, different MRP & GST \u2014 kept apart, aged separately"
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(ShieldCheck, {}),
            "Nothing is deleted: every change is timestamped with who did it"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { style: { color: "#9aa4ae", fontSize: 12.5 }, children: "\xA9 IMS \u2014 Inventory Management Systems" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "login-card-wrap", children: /* @__PURE__ */ jsxs("form", { className: "login-card", onSubmit: submit, children: [
      /* @__PURE__ */ jsx("div", { className: "mobile-logo", children: /* @__PURE__ */ jsx("img", { src: "img/logo.png", alt: "IMS" }) }),
      /* @__PURE__ */ jsx("h1", { children: "Welcome back" }),
      /* @__PURE__ */ jsx("p", { className: "sub", children: "Sign in with your User ID and password." }),
      /* @__PURE__ */ jsxs("div", { className: "stack", children: [
        note && /* @__PURE__ */ jsx(Alert, { tone: "warn", icon: AlertTriangle, children: note }),
        err && /* @__PURE__ */ jsx(Alert, { tone: "danger", icon: AlertTriangle, children: err }),
        /* @__PURE__ */ jsx(Field, { label: "User ID", children: /* @__PURE__ */ jsx("input", { className: "input", autoFocus: true, autoCapitalize: "none", autoComplete: "username", value: uid, onChange: (e) => setUid(e.target.value), required: true, placeholder: "e.g. ravi" }) }),
        /* @__PURE__ */ jsx(Field, { label: "Password", children: /* @__PURE__ */ jsxs("div", { className: "pw-wrap", children: [
          /* @__PURE__ */ jsx("input", { className: "input", type: show ? "text" : "password", autoComplete: "current-password", value: pw, onChange: (e) => setPw(e.target.value), required: true, placeholder: "Your password" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShow((s) => !s), "aria-label": show ? "Hide password" : "Show password", children: show ? /* @__PURE__ */ jsx(EyeOff, { size: 17 }) : /* @__PURE__ */ jsx(Eye, { size: 17 }) })
        ] }) }),
        /* @__PURE__ */ jsxs("button", { className: "btn btn-primary btn-block", style: { height: 44 }, disabled: busy, children: [
          /* @__PURE__ */ jsx(LogIn, {}),
          busy ? "Signing in\u2026" : "Sign in"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "login-help", children: "Forgot your password? Ask your administrator to reset it." })
    ] }) })
  ] });
}
export {
  Login as default
};
