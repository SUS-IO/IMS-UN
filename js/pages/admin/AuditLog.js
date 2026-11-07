import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import DataTable from "../../components/ui/DataTable.js";
import Modal from "../../components/ui/Modal.js";
import { Badge, PageHeader, Alert } from "../../components/ui/Bits.js";
import { fmtDateTime } from "../../lib/format.js";
const TONE = { CREATE: "ok", UPDATE: "info", POST: "brand", REVERSE: "danger", LOGIN: "", FORCE_LOGOUT: "danger", SAVE_DRAFT: "warn", DISCARD_DRAFT: "warn" };
function AuditLog() {
  const [days, setDays] = useState(7);
  const [sel, setSel] = useState(null);
  const { data, loading, error, reload } = useAsync(() => fetchAll(() => supabase.from("audit_log").select("*").gte("at", new Date(Date.now() - days * 864e5).toISOString()).order("id", { ascending: false }), { cap: 1e4 }), [days], { initial: [] });
  const cols = [
    { key: "at", header: "When", render: (r) => /* @__PURE__ */ jsx("span", { className: "nowrap", children: fmtDateTime(r.at) }) },
    { key: "user_name", header: "Who" },
    { key: "action", header: "Action", render: (r) => /* @__PURE__ */ jsx(Badge, { tone: TONE[r.action] || "", children: r.action.replace(/_/g, " ") }) },
    { key: "entity", header: "Record type" },
    { key: "summary", header: "Record" },
    { key: "details", header: "Details", sortable: false, value: (r) => r.details ? JSON.stringify(r.details) : "", render: (r) => r.details ? /* @__PURE__ */ jsx("button", { className: "btn btn-sm", onClick: () => setSel(r), children: "View" }) : "\u2014" }
  ];
  const opts = (k) => [...new Set(data.map((r) => r[k]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Audit Log", subtitle: "A permanent record of who did what and when. It cannot be edited or deleted by anyone.", actions: /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => reload(), children: [
      /* @__PURE__ */ jsx(RefreshCw, {}),
      " Refresh"
    ] }) }),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: data,
        columns: cols,
        loading,
        exportName: "audit_log",
        defaultSort: { key: "at", dir: "desc" },
        searchPlaceholder: "Search user, record, details\u2026",
        filters: [{ key: "action", label: "All actions", options: opts("action") }, { key: "entity", label: "All record types", options: opts("entity") }, { key: "user_name", label: "All users", options: opts("user_name") }],
        toolbar: /* @__PURE__ */ jsx("select", { className: "select", style: { width: "auto", height: 32 }, value: days, onChange: (e) => setDays(Number(e.target.value)), children: [[1, "Last 24 hours"], [7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"]].map(([v, l]) => /* @__PURE__ */ jsx("option", { value: v, children: l }, v)) })
      }
    ),
    /* @__PURE__ */ jsx(Modal, { open: !!sel, onClose: () => setSel(null), size: "md", title: "Audit details", icon: ScrollText, footer: /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setSel(null), children: "Close" }), children: sel && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("p", { className: "muted", style: { marginBottom: 10 }, children: [
        sel.user_name,
        " \xB7 ",
        fmtDateTime(sel.at),
        " \xB7 ",
        sel.action,
        " ",
        sel.entity,
        " ",
        sel.summary
      ] }),
      sel.action === "UPDATE" ? /* @__PURE__ */ jsxs("table", { className: "perm-table", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Field" }),
          /* @__PURE__ */ jsx("th", { children: "Before" }),
          /* @__PURE__ */ jsx("th", { children: "After" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: Object.entries(sel.details).map(([k, [a, b]]) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: k }),
          /* @__PURE__ */ jsx("td", { className: "muted", children: String(JSON.stringify(a)) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: String(JSON.stringify(b)) }) })
        ] }, k)) })
      ] }) : /* @__PURE__ */ jsx("pre", { style: { background: "var(--surface-2)", padding: 12, borderRadius: 8, overflow: "auto", fontSize: 12.5 }, children: JSON.stringify(sel.details, null, 2) })
    ] }) })
  ] });
}
export {
  AuditLog as default
};
