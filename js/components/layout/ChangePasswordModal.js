import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import Modal from "../ui/Modal.js";
import { Field, Alert } from "../ui/Bits.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
function ChangePasswordModal({ open, onClose, forced }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (n1.length < 8) return setErr("New password must be at least 8 characters.");
    if (n1 !== n2) return setErr("The two new passwords do not match.");
    if (n1 === cur) return setErr("Choose a password different from the current one.");
    setBusy(true);
    try {
      await changePassword(cur, n1);
      toast.success("Password changed");
      setCur("");
      setN1("");
      setN2("");
      onClose();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsx(Modal, { open, onClose, dismissable: !forced, size: "sm", title: forced ? "Set your own password" : "Change password", icon: KeyRound, children: /* @__PURE__ */ jsxs("form", { className: "stack", onSubmit: submit, children: [
    forced && /* @__PURE__ */ jsx(Alert, { tone: "info", children: "Your password was set by the administrator. Please choose a new one that only you know." }),
    err && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: err }),
    /* @__PURE__ */ jsx(Field, { label: "Current password", children: /* @__PURE__ */ jsx("input", { className: "input", type: "password", autoComplete: "current-password", value: cur, onChange: (e) => setCur(e.target.value), required: true, autoFocus: true }) }),
    /* @__PURE__ */ jsx(Field, { label: "New password", hint: "Minimum 8 characters", children: /* @__PURE__ */ jsx("input", { className: "input", type: "password", autoComplete: "new-password", value: n1, onChange: (e) => setN1(e.target.value), required: true }) }),
    /* @__PURE__ */ jsx(Field, { label: "Repeat new password", children: /* @__PURE__ */ jsx("input", { className: "input", type: "password", autoComplete: "new-password", value: n2, onChange: (e) => setN2(e.target.value), required: true }) }),
    /* @__PURE__ */ jsx("button", { className: "btn btn-primary btn-block", disabled: busy, children: busy ? "Saving\u2026" : "Save new password" })
  ] }) });
}
export {
  ChangePasswordModal as default
};
