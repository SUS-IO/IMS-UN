import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Plus, Pencil, Power } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, errText, run } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useDialog } from "../../context/DialogContext.js";
import DataTable from "../../components/ui/DataTable.js";
import Modal from "../../components/ui/Modal.js";
import SearchSelect from "../../components/ui/SearchSelect.js";
import { Badge, Field, PageHeader, Alert } from "../../components/ui/Bits.js";
function MasterPage({
  title,
  subtitle,
  noun,
  table,
  perm,
  columns,
  fields,
  orderBy = "created_at",
  select = "*",
  defaults = {},
  lookups = {},
  rowActions,
  toolbar,
  exportName,
  prepare,
  extraFilters = [],
  onSaved,
  formSize = "md",
  afterForm,
  rowClass
}) {
  const { can } = useAuth();
  const toast = useToast();
  const dlg = useDialog();
  const { data: rows, loading, error, reload } = useAsync(() => fetchAll(() => supabase.from(table).select(select).order(orderBy, { ascending: true })), [table], { initial: [] });
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const [saveErr, setSaveErr] = useState("");
  const [busy, setBusy] = useState(false);
  const canCreate = can(`${perm}.create`) || can(`${perm}.manage`);
  const canEdit = can(`${perm}.edit`) || can(`${perm}.manage`);
  const openNew = () => {
    setErrs({});
    setSaveErr("");
    setForm({ values: { is_active: true, ...defaults } });
  };
  const openEdit = (row) => {
    setErrs({});
    setSaveErr("");
    setForm({ id: row.id, values: { ...row } });
  };
  const set = (name, v) => setForm((f) => ({ ...f, values: { ...f.values, [name]: v } }));
  const save = async (e) => {
    e?.preventDefault();
    const v = form.values;
    const ne = {};
    fields.forEach((f) => {
      if (f.required && (v[f.name] === void 0 || v[f.name] === null || String(v[f.name]).trim() === "")) ne[f.name] = "Required";
    });
    setErrs(ne);
    if (Object.keys(ne).length) return;
    setBusy(true);
    setSaveErr("");
    try {
      const payload = {};
      fields.forEach((f) => {
        if (f.type === "custom" && !f.name) return;
        let x = v[f.name];
        if (f.type === "number") x = x === "" || x === null || x === void 0 ? null : Number(x);
        else if (typeof x === "string") x = x.trim() === "" ? null : x.trim();
        payload[f.name] = x;
      });
      payload.is_active = v.is_active !== false;
      Object.assign(payload, prepare ? await prepare(payload, form) : {});
      if (form.id) await run(supabase.from(table).update(payload).eq("id", form.id));
      else await run(supabase.from(table).insert(payload));
      toast.success(`${noun} ${form.id ? "updated" : "created"}`);
      setForm(null);
      await reload(true);
      onSaved?.();
    } catch (x) {
      setSaveErr(errText(x));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (row) => {
    const ok = await dlg.confirm({
      title: row.is_active ? `Deactivate ${noun.toLowerCase()}?` : `Activate ${noun.toLowerCase()}?`,
      message: row.is_active ? "It will no longer be selectable in new entries. Past records stay unchanged." : "It will become selectable again.",
      confirmText: row.is_active ? "Deactivate" : "Activate",
      danger: row.is_active
    });
    if (!ok) return;
    try {
      await run(supabase.from(table).update({ is_active: !row.is_active }).eq("id", row.id));
      toast.success(row.is_active ? "Deactivated" : "Activated");
      reload(true);
    } catch (x) {
      toast.error("Could not change status", errText(x));
    }
  };
  const cols = useMemo(() => [
    ...columns,
    { key: "is_active", header: "Status", width: 100, value: (r) => r.is_active ? "Active" : "Inactive", render: (r) => /* @__PURE__ */ jsx(Badge, { tone: r.is_active ? "ok" : "muted", dot: true, children: r.is_active ? "Active" : "Inactive" }) },
    { key: "updated_at", header: "Last changed", value: (r) => r.updated_at, render: (r) => /* @__PURE__ */ jsxs("span", { className: "muted nowrap", children: [
      new Date(r.updated_at).toLocaleDateString("en-GB"),
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.updated_by_name })
    ] }) },
    ...canEdit || rowActions ? [{ key: "_a", header: "", sortable: false, csv: false, align: "right", render: (r) => /* @__PURE__ */ jsxs("div", { className: "cell-actions", children: [
      rowActions?.(r, reload),
      canEdit && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: (e) => {
        e.stopPropagation();
        openEdit(r);
      }, children: [
        /* @__PURE__ */ jsx(Pencil, {}),
        " Edit"
      ] }),
      canEdit && /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", title: r.is_active ? "Deactivate" : "Activate", onClick: (e) => {
        e.stopPropagation();
        toggle(r);
      }, children: /* @__PURE__ */ jsx(Power, {}) })
    ] }) }] : []
  ], [columns, canEdit, rowActions]);
  const renderField = (f) => {
    const v = form.values[f.name];
    const locked = f.lockOnEdit && form.id;
    let input;
    if (f.render) input = f.render(form.values, set, { editing: !!form.id });
    else if (f.type === "select") input = /* @__PURE__ */ jsx("select", { className: "select", value: v ?? "", onChange: (e) => set(f.name, e.target.value), disabled: locked, children: (f.options || []).map((o) => /* @__PURE__ */ jsx("option", { value: o.value, children: o.label }, o.value)) });
    else if (f.type === "lookup") input = /* @__PURE__ */ jsx(SearchSelect, { value: v || "", onChange: (x) => set(f.name, x), options: lookups[f.lookup] || [], disabled: locked, invalid: !!errs[f.name], placeholder: f.placeholder || "Select\u2026" });
    else if (f.type === "textarea") input = /* @__PURE__ */ jsx("textarea", { className: "textarea", value: v ?? "", onChange: (e) => set(f.name, e.target.value) });
    else if (f.type === "checkbox") input = /* @__PURE__ */ jsxs("label", { className: "check", children: [
      /* @__PURE__ */ jsx("input", { type: "checkbox", checked: !!v, onChange: (e) => set(f.name, e.target.checked) }),
      f.checkLabel || f.label
    ] });
    else input = /* @__PURE__ */ jsx(
      "input",
      {
        className: `input ${errs[f.name] ? "invalid" : ""}`,
        type: f.type === "number" ? "number" : "text",
        min: f.min,
        step: f.step,
        value: v ?? "",
        disabled: locked,
        onChange: (e) => set(f.name, f.upper ? e.target.value.toUpperCase() : e.target.value),
        placeholder: f.placeholder
      }
    );
    return /* @__PURE__ */ jsx(Field, { label: f.type === "checkbox" ? "" : f.label, required: f.required, error: errs[f.name], hint: locked ? "Cannot be changed after creation" : f.hint, className: f.span2 ? "span-2" : "", children: input }, f.name);
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title,
        subtitle,
        actions: canCreate && /* @__PURE__ */ jsxs(Fragment, { children: [
          toolbar?.(reload),
          /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: openNew, children: [
            /* @__PURE__ */ jsx(Plus, {}),
            " New ",
            noun.toLowerCase()
          ] })
        ] })
      }
    ),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows,
        columns: cols,
        loading,
        exportName: exportName || table,
        defaultSort: { key: columns[0].key, dir: "asc" },
        stickyFirst: true,
        rowClass: (r) => r.is_active ? rowClass?.(r) || "" : "row-muted",
        filters: [{ key: "is_active", label: "All statuses", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] }, ...extraFilters],
        emptyTitle: `No ${noun.toLowerCase()}s yet`,
        emptyText: canCreate ? `Click \u201CNew ${noun.toLowerCase()}\u201D to add the first one.` : ""
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!form,
        onClose: () => setForm(null),
        size: formSize,
        title: form?.id ? `Edit ${noun.toLowerCase()}` : `New ${noun.toLowerCase()}`,
        icon: Pencil,
        footer: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setForm(null), children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-primary", onClick: save, disabled: busy, children: busy ? "Saving\u2026" : "Save" })
        ] }),
        children: form && /* @__PURE__ */ jsxs("form", { onSubmit: save, className: "stack", children: [
          saveErr && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: saveErr }),
          /* @__PURE__ */ jsx("div", { className: "form-grid", children: fields.map(renderField) }),
          form.id && /* @__PURE__ */ jsxs("label", { className: "check", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: form.values.is_active !== false, onChange: (e) => set("is_active", e.target.checked) }),
            "Active"
          ] }),
          afterForm?.(form),
          /* @__PURE__ */ jsx("button", { type: "submit", hidden: true })
        ] })
      }
    )
  ] });
}
export {
  MasterPage as default
};
