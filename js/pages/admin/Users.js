import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { UserPlus, Pencil, KeyRound, LogOut, Power, ShieldAlert, Wand2, Users as UsersIcon } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, rpc, errText } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useDialog } from "../../context/DialogContext.js";
import DataTable from "../../components/ui/DataTable.js";
import Modal from "../../components/ui/Modal.js";
import SearchSelect from "../../components/ui/SearchSelect.js";
import { Badge, Field, PageHeader, Alert } from "../../components/ui/Bits.js";
import PermMatrix from "./PermMatrix.js";
import { timeAgo, fmtDateTime } from "../../lib/format.js";
async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    let msg = error.message;
    try {
      const j = await error.context.json();
      if (j?.error) msg = j.error;
    } catch {
    }
    if (/Failed to send|NetworkError|Failed to fetch|not found|404/i.test(msg)) msg = 'The "admin-users" Edge Function is not reachable. Deploy it first (see README step 5).';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
const genPass = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  const a = crypto.getRandomValues(new Uint32Array(10));
  a.forEach((x) => {
    p += c[x % c.length];
  });
  return `${p}7`;
};
const TYPES = [{ value: "staff", label: "Staff user" }, { value: "customer", label: "Customer portal login" }, { value: "admin", label: "Administrator (full access)" }];
function Users() {
  const { profile } = useAuth();
  const toast = useToast();
  const dlg = useDialog();
  const { data, loading, error, reload } = useAsync(async () => {
    const [users, customers] = await Promise.all([rpc("admin_list_users"), fetchAll(() => supabase.from("customers").select("id,code,name,is_active").order("name"))]);
    return { users, customers };
  }, [], { initial: { users: [], customers: [] } });
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const custOptions = useMemo(() => data.customers.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name, sub: c.code })), [data.customers]);
  const set = (k, v2) => setModal((m) => ({ ...m, values: { ...m.values, [k]: v2 } }));
  const open = (m) => {
    setErr("");
    setModal(m);
  };
  const submit = async (e) => {
    e?.preventDefault();
    const v2 = modal.values;
    setErr("");
    try {
      setBusy(true);
      if (modal.mode === "create") {
        await callAdmin({ action: "create_user", user_code: v2.user_code, full_name: v2.full_name, password: v2.password, user_type: v2.user_type, customer_id: v2.customer_id || null, permissions: v2.permissions });
        toast.success("User created", `${v2.user_code} must set a new password at first sign-in.`);
      } else if (modal.mode === "edit") {
        await rpc("admin_update_user", { p_id: modal.user.id, p_full_name: v2.full_name, p_permissions: modal.user.user_type === "staff" ? v2.permissions : [] });
        toast.success("User updated", "Changes apply within about 30 seconds, even if they are signed in.");
      } else {
        await callAdmin({ action: "reset_password", user_id: modal.user.id, password: v2.password });
        toast.success("Password reset", "They will be asked to choose a new one at next sign-in.");
      }
      setModal(null);
      reload(true);
    } catch (x) {
      setErr(x.message || errText(x));
    } finally {
      setBusy(false);
    }
  };
  const forceOut = async (u) => {
    if (!await dlg.confirm({ title: `Sign out ${u.full_name}?`, message: "They are logged out immediately and must sign in again. Anything they were entering is saved as a draft when possible.", confirmText: "Force logout", danger: true })) return;
    try {
      await rpc("admin_force_logout", { p_id: u.id });
      toast.success("Session ended");
      reload(true);
    } catch (x) {
      toast.error("Failed", errText(x));
    }
  };
  const forceAll = async () => {
    if (!await dlg.confirm({ title: "Sign out everyone?", message: "Every user except you is logged out immediately.", confirmText: "Sign out all", danger: true })) return;
    try {
      const n = await rpc("admin_force_logout_all");
      toast.success(`${n} user(s) signed out`);
      reload(true);
    } catch (x) {
      toast.error("Failed", errText(x));
    }
  };
  const toggle = async (u) => {
    if (!await dlg.confirm({ title: u.is_active ? `Disable ${u.full_name}?` : `Enable ${u.full_name}?`, message: u.is_active ? "They are signed out and cannot log in until re-enabled. Their history stays." : "They can log in again.", confirmText: u.is_active ? "Disable" : "Enable", danger: u.is_active })) return;
    try {
      await rpc("admin_set_active", { p_id: u.id, p_active: !u.is_active });
      toast.success(u.is_active ? "User disabled" : "User enabled");
      reload(true);
    } catch (x) {
      toast.error("Failed", errText(x));
    }
  };
  const cols = [
    { key: "full_name", header: "User", render: (u) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("b", { children: u.full_name }),
      /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
        "ID: ",
        u.user_code,
        u.id === profile.id ? " (you)" : ""
      ] })
    ] }) },
    { key: "user_type", header: "Type", render: (u) => /* @__PURE__ */ jsx(Badge, { tone: u.user_type === "admin" ? "brand" : u.user_type === "customer" ? "info" : "", children: u.user_type === "customer" ? `Customer \xB7 ${u.customer_name || ""}` : u.user_type === "admin" ? "Administrator" : "Staff" }) },
    { key: "access", header: "Access", sortable: false, value: (u) => u.user_type === "staff" ? `${u.permissions.length} permissions` : u.user_type === "admin" ? "Full" : "Stock view", render: (u) => /* @__PURE__ */ jsx("span", { className: "muted", children: u.user_type === "staff" ? `${u.permissions.length} permissions` : u.user_type === "admin" ? "Everything" : "Live stock view" }) },
    { key: "is_active", header: "Status", value: (u) => u.is_active ? "Active" : "Disabled", render: (u) => !u.is_active ? /* @__PURE__ */ jsx(Badge, { tone: "danger", dot: true, children: "Disabled" }) : u.last_seen_at && Date.now() - new Date(u.last_seen_at) < 12e4 ? /* @__PURE__ */ jsx(Badge, { tone: "ok", dot: true, children: "Online" }) : /* @__PURE__ */ jsx(Badge, { dot: true, children: "Offline" }) },
    { key: "last_login_at", header: "Last login", render: (u) => /* @__PURE__ */ jsxs("span", { className: "muted", title: fmtDateTime(u.last_login_at), children: [
      timeAgo(u.last_login_at),
      u.must_change_password && /* @__PURE__ */ jsx("span", { className: "sub-text", style: { color: "var(--warn)" }, children: "must change password" })
    ] }) },
    { key: "_a", header: "", sortable: false, csv: false, align: "right", render: (u) => /* @__PURE__ */ jsxs("div", { className: "cell-actions", children: [
      u.user_type !== "customer" && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => open({ mode: "edit", user: u, values: { full_name: u.full_name, permissions: u.permissions } }), children: [
        /* @__PURE__ */ jsx(Pencil, {}),
        " Access"
      ] }),
      u.user_type === "customer" && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => open({ mode: "edit", user: u, values: { full_name: u.full_name, permissions: [] } }), children: [
        /* @__PURE__ */ jsx(Pencil, {}),
        " Edit"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => open({ mode: "reset", user: u, values: { password: genPass() } }), children: [
        /* @__PURE__ */ jsx(KeyRound, {}),
        " Reset password"
      ] }),
      u.id !== profile.id && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => forceOut(u), title: "End their session now", children: [
        /* @__PURE__ */ jsx(LogOut, {}),
        " Logout"
      ] }),
      u.id !== profile.id && /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", onClick: () => toggle(u), title: u.is_active ? "Disable user" : "Enable user", children: /* @__PURE__ */ jsx(Power, {}) })
    ] }) }
  ];
  const v = modal?.values;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Users & Access",
        subtitle: "Create logins with a User ID and password \u2014 no email needed. Choose exactly what each person may do.",
        actions: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("button", { className: "btn btn-danger", onClick: forceAll, children: [
            /* @__PURE__ */ jsx(ShieldAlert, {}),
            " Sign out everyone"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: () => open({ mode: "create", values: { user_code: "", full_name: "", password: genPass(), user_type: "staff", customer_id: "", permissions: [] } }), children: [
            /* @__PURE__ */ jsx(UserPlus, {}),
            " New user"
          ] })
        ] })
      }
    ),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data.users,
        columns: cols,
        loading,
        exportName: "users",
        defaultSort: { key: "user_type", dir: "asc" },
        stickyFirst: true,
        rowClass: (u) => u.is_active ? "" : "row-muted",
        filters: [{ key: "user_type", label: "All types", options: TYPES.map((t) => ({ value: t.value, label: t.label })) }],
        emptyTitle: "No users"
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!modal,
        onClose: () => setModal(null),
        size: modal?.mode === "reset" ? "sm" : "lg",
        icon: modal?.mode === "create" ? UserPlus : modal?.mode === "reset" ? KeyRound : UsersIcon,
        title: modal?.mode === "create" ? "New user" : modal?.mode === "reset" ? `Reset password \u2014 ${modal.user.full_name}` : `Edit \u2014 ${modal?.user.full_name}`,
        footer: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setModal(null), children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-primary", onClick: submit, disabled: busy, children: busy ? "Please wait\u2026" : modal?.mode === "create" ? "Create user" : modal?.mode === "reset" ? "Set password" : "Save changes" })
        ] }),
        children: modal && /* @__PURE__ */ jsxs("form", { className: "stack", onSubmit: submit, children: [
          err && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: err }),
          modal.mode === "create" && /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
            /* @__PURE__ */ jsx(Field, { label: "User ID", required: true, hint: "3\u201330 letters / numbers. This is what they type to log in.", children: /* @__PURE__ */ jsx("input", { className: "input", autoCapitalize: "none", value: v.user_code, onChange: (e) => set("user_code", e.target.value.toLowerCase().replace(/\s/g, "")) }) }),
            /* @__PURE__ */ jsx(Field, { label: "Full name", required: true, children: /* @__PURE__ */ jsx("input", { className: "input", value: v.full_name, onChange: (e) => set("full_name", e.target.value) }) }),
            /* @__PURE__ */ jsx(Field, { label: "User type", required: true, children: /* @__PURE__ */ jsx("select", { className: "select", value: v.user_type, onChange: (e) => set("user_type", e.target.value), children: TYPES.map((t) => /* @__PURE__ */ jsx("option", { value: t.value, children: t.label }, t.value)) }) }),
            v.user_type === "customer" && /* @__PURE__ */ jsx(Field, { label: "Belongs to customer", required: true, children: /* @__PURE__ */ jsx(SearchSelect, { value: v.customer_id, options: custOptions, onChange: (x) => set("customer_id", x), placeholder: "Select customer\u2026" }) })
          ] }),
          modal.mode === "edit" && /* @__PURE__ */ jsx(Field, { label: "Full name", required: true, children: /* @__PURE__ */ jsx("input", { className: "input", value: v.full_name, onChange: (e) => set("full_name", e.target.value) }) }),
          (modal.mode === "create" || modal.mode === "reset") && /* @__PURE__ */ jsx(Field, { label: "Temporary password", required: true, hint: "Share it with the user. They must change it at first sign-in.", children: /* @__PURE__ */ jsxs("div", { className: "input-group", children: [
            /* @__PURE__ */ jsx("input", { className: "input", value: v.password, onChange: (e) => set("password", e.target.value) }),
            /* @__PURE__ */ jsxs("button", { type: "button", className: "seg", onClick: () => set("password", genPass()), children: [
              /* @__PURE__ */ jsx(Wand2, { size: 14 }),
              " Generate"
            ] })
          ] }) }),
          (modal.mode === "create" && v.user_type === "staff" || modal.mode === "edit" && modal.user.user_type === "staff") && /* @__PURE__ */ jsx(PermMatrix, { value: v.permissions, onChange: (p) => set("permissions", p) }),
          modal.mode === "create" && v.user_type === "admin" && /* @__PURE__ */ jsx(Alert, { tone: "warn", children: "Administrators can do everything, including managing users and company details." }),
          modal.mode === "create" && v.user_type === "customer" && /* @__PURE__ */ jsx(Alert, { tone: "info", children: "Customer logins only see live stock: product photo, MRP, quantity and rack \u2014 never cost price." }),
          /* @__PURE__ */ jsx("button", { hidden: true, type: "submit" })
        ] })
      }
    )
  ] });
}
export {
  Users as default
};
