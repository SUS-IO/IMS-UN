import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, RotateCcw, Lock, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, rpc, errText } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useDialog } from "../../context/DialogContext.js";
import DataTable from "../../components/ui/DataTable.js";
import { Badge, PageHeader, Alert } from "../../components/ui/Bits.js";
import { STATUS_TONE } from "../../lib/docTypes.js";
import { fmtDate, fmtDateTime, money } from "../../lib/format.js";
function DocumentList({ cfg }) {
  const { can, profile } = useAuth();
  const toast = useToast();
  const dlg = useDialog();
  const nav = useNavigate();
  const { data: rows, loading, error, reload } = useAsync(() => fetchAll(() => supabase.from("documents").select("*, vendors(name,code), customers(name,code), customer_locations(name)").eq("doc_type", cfg.type).order("created_at", { ascending: false })), [cfg.type], { initial: [] });
  const { data: locks, reload: reloadLocks } = useAsync(() => rpc("get_locks"), [], { initial: [] });
  useEffect(() => {
    const t = setInterval(() => {
      reloadLocks(true);
      reload(true);
    }, 15e3);
    return () => clearInterval(t);
  }, [reload, reloadLocks]);
  const lock = locks.find((l) => l.doc_type === cfg.type && l.is_active);
  const busyBy = lock && !lock.mine ? lock : null;
  const canCreate = can(`${cfg.perm}.create`);
  const reverse = async (d) => {
    const reason = await dlg.ask({
      title: `Reverse ${d.doc_no}?`,
      danger: true,
      confirmText: "Reverse document",
      minLength: 5,
      label: "Reason for reversal",
      message: "Stock is moved back exactly as it was. The original stays on record, marked \u201CReversed\u201D, with your name, time and reason."
    });
    if (!reason) return;
    try {
      await rpc("reverse_document", { p_id: d.id, p_reason: reason });
      toast.success(`${d.doc_no} reversed`);
      reload(true);
    } catch (e) {
      toast.error("Cannot reverse yet", errText(e));
    }
  };
  const discard = async (d) => {
    const ok = await dlg.confirm({ title: "Discard this draft?", message: "It stays in history as \u201CCancelled\u201D.", confirmText: "Discard", danger: true });
    if (!ok) return;
    try {
      await rpc("cancel_draft", { p_id: d.id });
      toast.info("Draft discarded");
      reload(true);
    } catch (e) {
      toast.error("Could not discard", errText(e));
    }
  };
  const partyName = (r) => (cfg.partyKind === "vendor" ? r.vendors?.name : r.customers?.name) || "\u2014";
  const cols = [
    { key: "doc_no", header: "Document no.", value: (r) => r.doc_no || "Draft", render: (r) => r.doc_no ? /* @__PURE__ */ jsx(Link, { to: `/${cfg.path}/${r.id}`, className: "code-cell", children: r.doc_no }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "Draft" }) },
    { key: "doc_date", header: "Date", render: (r) => fmtDate(r.doc_date) },
    { key: "party", header: cfg.partyKind === "vendor" ? "Vendor" : "Customer", value: partyName, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("b", { children: partyName(r) }),
      r.customer_locations?.name && /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.customer_locations.name })
    ] }) },
    { key: "reference_no", header: "Reference" },
    ...cfg.showReason ? [{ key: "reason", header: "Reason" }] : [],
    { key: "grand_total", header: "Total", align: "right", value: (r) => Number(r.grand_total), render: (r) => /* @__PURE__ */ jsx("b", { children: money(r.grand_total) }) },
    { key: "status", header: "Status", render: (r) => /* @__PURE__ */ jsx(Badge, { tone: STATUS_TONE[r.status], dot: true, children: r.status[0] + r.status.slice(1).toLowerCase() }) },
    { key: "created_at", header: "Entered by", render: (r) => /* @__PURE__ */ jsxs("span", { className: "muted", children: [
      r.created_by_name,
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: fmtDateTime(r.created_at) })
    ] }) },
    { key: "posted_at", header: "Posted / closed", value: (r) => r.reversed_at || r.posted_at || r.cancelled_at, render: (r) => {
      if (r.status === "REVERSED") return /* @__PURE__ */ jsxs("span", { className: "muted", children: [
        "Reversed by ",
        r.reversed_by_name,
        /* @__PURE__ */ jsx("span", { className: "sub-text", children: fmtDateTime(r.reversed_at) })
      ] });
      if (r.status === "POSTED") return /* @__PURE__ */ jsxs("span", { className: "muted", children: [
        r.posted_by_name,
        /* @__PURE__ */ jsx("span", { className: "sub-text", children: fmtDateTime(r.posted_at) })
      ] });
      if (r.status === "CANCELLED") return /* @__PURE__ */ jsxs("span", { className: "muted", children: [
        "Discarded by ",
        r.cancelled_by_name,
        /* @__PURE__ */ jsx("span", { className: "sub-text", children: fmtDateTime(r.cancelled_at) })
      ] });
      return "\u2014";
    } },
    { key: "_a", header: "", sortable: false, csv: false, align: "right", render: (r) => /* @__PURE__ */ jsxs("div", { className: "cell-actions", children: [
      r.status === "DRAFT" && canCreate && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => nav(`/${cfg.path}/edit/${r.id}`), children: [
        /* @__PURE__ */ jsx(Pencil, {}),
        " Continue"
      ] }),
      r.status === "DRAFT" && canCreate && /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", title: "Discard draft", onClick: () => discard(r), children: /* @__PURE__ */ jsx(Trash2, {}) }),
      r.status !== "DRAFT" && r.status !== "CANCELLED" && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => nav(`/${cfg.path}/${r.id}`), children: [
        /* @__PURE__ */ jsx(Eye, {}),
        " View"
      ] }),
      r.status === "POSTED" && can(`${cfg.perm}.reverse`) && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm btn-danger", onClick: () => reverse(r), children: [
        /* @__PURE__ */ jsx(RotateCcw, {}),
        " Reverse"
      ] })
    ] }) }
  ];
  const draftCount = rows.filter((r) => r.status === "DRAFT").length;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: cfg.long, subtitle: cfg.blurb, actions: canCreate && /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: () => nav(`/${cfg.path}/new`), children: [
      /* @__PURE__ */ jsx(Plus, {}),
      " New ",
      cfg.title.toLowerCase()
    ] }) }),
    busyBy && /* @__PURE__ */ jsx("div", { style: { marginBottom: 14 }, children: /* @__PURE__ */ jsxs(Alert, { tone: "warn", icon: Lock, children: [
      /* @__PURE__ */ jsx("b", { children: busyBy.user_name }),
      " is working on ",
      cfg.title.toLowerCase(),
      " right now. You can start once they finish (or after ",
      profile.idle_minutes || 5,
      " idle minutes)."
    ] }) }),
    draftCount > 0 && /* @__PURE__ */ jsx("div", { style: { marginBottom: 14 }, children: /* @__PURE__ */ jsxs(Alert, { tone: "info", children: [
      draftCount,
      " draft",
      draftCount > 1 ? "s" : "",
      " saved \u2014 anyone with access can continue ",
      draftCount > 1 ? "them" : "it",
      "."
    ] }) }),
    error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows,
        columns: cols,
        loading,
        exportName: cfg.path,
        defaultSort: { key: "created_at", dir: "desc" },
        stickyFirst: true,
        rowClass: (r) => r.status === "REVERSED" ? "row-danger" : r.status === "DRAFT" ? "row-warn" : r.status === "CANCELLED" ? "row-muted" : "",
        filters: [{ key: "status", label: "All statuses", options: ["DRAFT", "POSTED", "REVERSED", "CANCELLED"].map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() })) }],
        searchPlaceholder: "Search number, party, reference\u2026",
        emptyTitle: `No ${cfg.title.toLowerCase()} entries yet`,
        emptyText: canCreate ? "Click \u201CNew\u201D to create the first one." : ""
      }
    )
  ] });
}
export {
  DocumentList as default
};
