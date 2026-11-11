import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Printer, RotateCcw, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, rpc, run, errText } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useDialog } from "../../context/DialogContext.js";
import { Badge, PageHeader, PageLoader, Alert } from "../../components/ui/Bits.js";
import DataTable from "../../components/ui/DataTable.js";
import { STATUS_TONE } from "../../lib/docTypes.js";
import { fmtDate, fmtDateTime, money, int, pct } from "../../lib/format.js";
function DocumentView({ cfg }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const dlg = useDialog();
  const { data, loading, error, reload } = useAsync(async () => {
    const [doc2, lines2, moves2, company2] = await Promise.all([
      run(supabase.from("documents").select("*, vendors(name,code,gstin,city), customers(name,code,gstin), customer_locations(name,address_line1,address_line2,city,state,pincode)").eq("id", id).single()),
      run(supabase.from("document_lines").select("*, products(code,description,uom,hsn), racks(code)").eq("document_id", id).order("line_no")),
      can("stock.view") ? fetchAll(() => supabase.from("v_movements").select("*").eq("doc_id", id).order("id")) : [],
      run(supabase.from("company_settings").select("*").eq("id", 1).single())
    ]);
    return { doc: doc2, lines: lines2, moves: moves2, company: company2 };
  }, [id]);
  if (loading && !data) return /* @__PURE__ */ jsx(PageLoader, {});
  if (error) return /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message });
  const { doc, lines, moves, company } = data;
  if (doc.doc_type !== cfg.type) return /* @__PURE__ */ jsx(Alert, { tone: "danger", children: "This document belongs to a different module." });
  const party = cfg.partyKind === "vendor" ? doc.vendors : doc.customers;
  const sale = cfg.kind === "sale";
  const reverse = async () => {
    const reason = await dlg.ask({
      title: `Reverse ${doc.doc_no}?`,
      danger: true,
      confirmText: "Reverse document",
      minLength: 5,
      label: "Reason for reversal",
      message: "Stock is moved back exactly as it was. The original stays on record with your name, time and reason."
    });
    if (!reason) return;
    try {
      await rpc("reverse_document", { p_id: doc.id, p_reason: reason });
      toast.success(`${doc.doc_no} reversed`);
      reload(true);
    } catch (e) {
      toast.error("Cannot reverse yet", errText(e));
    }
  };
  const lineCols = [
    { key: "line_no", header: "#", width: 50 },
    { key: "code", header: "Item", value: (l) => l.products.code, render: (l) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("span", { className: "code-cell", children: l.products.code }),
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: l.products.description })
    ] }) },
    ...cfg.type === "OUTWARD" || cfg.type === "CUSTOMER_RETURN" ? [{ key: "customer_code", header: "Customer code", render: (l) => l.customer_code ? /* @__PURE__ */ jsx(Badge, { tone: "brand", children: l.customer_code }) : "\u2014" }] : [],
    ...cfg.type === "INWARD" ? [{ key: "rack", header: "Rack", value: (l) => l.racks?.code, render: (l) => /* @__PURE__ */ jsx("span", { className: "loc-chip", children: l.racks?.code }) }] : [],
    { key: "qty", header: "Qty (pcs)", align: "right", render: (l) => /* @__PURE__ */ jsx("b", { children: int(l.qty) }) },
    { key: "mrp", header: "MRP", align: "right", render: (l) => money(l.mrp) },
    { key: "rate", header: sale ? "Rate / pack" : "Cost / pack", align: "right", render: (l) => money(l.rate) },
    ...sale ? [{ key: "discount_pct", header: "Disc", align: "right", render: (l) => Number(l.discount_pct) ? pct(l.discount_pct) : "\u2014" }] : [],
    { key: "gst", header: "GST", align: "right", value: (l) => Number(sale ? l.sale_gst_pct : l.gst_pct), render: (l) => /* @__PURE__ */ jsxs(Fragment, { children: [
      pct(sale ? l.sale_gst_pct : l.gst_pct),
      sale && Number(l.sale_gst_pct) !== Number(l.gst_pct) && /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
        "stock @ ",
        pct(l.gst_pct)
      ] })
    ] }) },
    { key: "taxable", header: "Taxable", align: "right", render: (l) => money(l.taxable) },
    { key: "gst_amount", header: "GST amt", align: "right", render: (l) => money(l.gst_amount) },
    { key: "line_total", header: "Total", align: "right", render: (l) => /* @__PURE__ */ jsx("b", { children: money(l.line_total) }) }
  ];
  const moveCols = [
    { key: "created_at", header: "Time", render: (m) => fmtDateTime(m.created_at) },
    { key: "movement_type", header: "Movement", render: (m) => /* @__PURE__ */ jsx(Badge, { tone: m.movement_type === "REVERSAL" ? "danger" : "info", children: m.movement_type.replace("_", " ") }) },
    { key: "product_code", header: "Item", render: (m) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: m.product_code }) },
    { key: "mrp", header: "MRP", align: "right", render: (m) => money(m.mrp) },
    { key: "gst_pct", header: "GST", align: "right", render: (m) => pct(m.gst_pct) },
    { key: "rack_code", header: cfg.type === "OUTWARD" ? "Pick from rack" : "Rack", render: (m) => /* @__PURE__ */ jsx("span", { className: "loc-chip", children: m.rack_code }) },
    { key: "qty_delta", header: "Qty", align: "right", render: (m) => /* @__PURE__ */ jsxs("b", { style: { color: m.qty_delta > 0 ? "var(--ok)" : "var(--danger)" }, children: [
      m.qty_delta > 0 ? "+" : "",
      m.qty_delta
    ] }) },
    { key: "created_by_name", header: "By" }
  ];
  const loc = doc.customer_locations;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "print-only", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsx("h2", { children: company.company_name }),
      /* @__PURE__ */ jsx("div", { children: [company.address_line1, company.address_line2, company.city, company.state, company.pincode].filter(Boolean).join(", ") }),
      /* @__PURE__ */ jsx("div", { children: [company.phone, company.email, company.gstin && `GSTIN ${company.gstin}`].filter(Boolean).join(" \xB7 ") }),
      /* @__PURE__ */ jsx("hr", {})
    ] }),
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: doc.doc_no || "Draft",
        subtitle: `${cfg.long} \xB7 ${fmtDate(doc.doc_date)}`,
        actions: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => nav(`/${cfg.path}`), children: [
            /* @__PURE__ */ jsx(ArrowLeft, {}),
            " Back"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => window.print(), children: [
            /* @__PURE__ */ jsx(Printer, {}),
            " Print"
          ] }),
          doc.status === "DRAFT" && can(`${cfg.perm}.create`) && /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: () => nav(`/${cfg.path}/edit/${doc.id}`), children: [
            /* @__PURE__ */ jsx(Pencil, {}),
            " Continue draft"
          ] }),
          doc.status === "POSTED" && can(`${cfg.perm}.reverse`) && /* @__PURE__ */ jsxs("button", { className: "btn btn-danger", onClick: reverse, children: [
            /* @__PURE__ */ jsx(RotateCcw, {}),
            " Reverse"
          ] })
        ] })
      }
    ),
    doc.status === "REVERSED" && /* @__PURE__ */ jsx("div", { style: { marginBottom: 14 }, children: /* @__PURE__ */ jsxs(Alert, { tone: "danger", children: [
      /* @__PURE__ */ jsx("b", { children: "This document was reversed" }),
      " by ",
      doc.reversed_by_name,
      " on ",
      fmtDateTime(doc.reversed_at),
      ". Reason: \u201C",
      doc.reverse_reason,
      "\u201D. Stock has been restored."
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "card card-pad", style: { marginBottom: 14 }, children: /* @__PURE__ */ jsxs("div", { className: "doc-meta", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: "Status" }),
        /* @__PURE__ */ jsx("div", { className: "v", children: /* @__PURE__ */ jsx(Badge, { tone: STATUS_TONE[doc.status], dot: true, children: doc.status[0] + doc.status.slice(1).toLowerCase() }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: cfg.partyKind === "vendor" ? "Vendor" : "Customer" }),
        /* @__PURE__ */ jsxs("div", { className: "v", children: [
          party?.name,
          /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
            party?.code,
            party?.gstin ? ` \xB7 ${party.gstin}` : ""
          ] })
        ] })
      ] }),
      loc && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: "Location" }),
        /* @__PURE__ */ jsxs("div", { className: "v", children: [
          loc.name,
          /* @__PURE__ */ jsx("span", { className: "sub-text", children: [loc.address_line1, loc.city, loc.pincode].filter(Boolean).join(", ") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: cfg.refLabel }),
        /* @__PURE__ */ jsx("div", { className: "v", children: doc.reference_no || "\u2014" })
      ] }),
      doc.reason && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: "Reason" }),
        /* @__PURE__ */ jsx("div", { className: "v", children: doc.reason })
      ] }),
      doc.notes && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "k", children: "Notes" }),
        /* @__PURE__ */ jsx("div", { className: "v", children: doc.notes })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      DataTable,
      {
        rows: lines,
        columns: lineCols,
        exportName: doc.doc_no?.replace(/\//g, "-") || "document",
        defaultSort: { key: "line_no", dir: "asc" },
        pageSize: 250,
        footer: () => /* @__PURE__ */ jsxs("div", { className: "row", style: { justifyContent: "flex-end", gap: 24 }, children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Taxable ",
            money(doc.sub_total)
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "GST ",
            money(doc.gst_total)
          ] }),
          /* @__PURE__ */ jsxs("span", { style: { fontSize: 16 }, children: [
            "Total ",
            money(doc.grand_total)
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "dash-grid even", children: [
      /* @__PURE__ */ jsxs("div", { className: "card card-pad", children: [
        /* @__PURE__ */ jsx("h3", { style: { marginBottom: 12 }, children: "Audit trail" }),
        /* @__PURE__ */ jsxs("div", { className: "timeline", children: [
          /* @__PURE__ */ jsxs("div", { className: "ev", children: [
            /* @__PURE__ */ jsx("i", {}),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Entered" }),
              " by ",
              doc.created_by_name,
              /* @__PURE__ */ jsx("div", { className: "muted", children: fmtDateTime(doc.created_at) })
            ] })
          ] }),
          doc.updated_at !== doc.created_at && doc.status === "DRAFT" && /* @__PURE__ */ jsxs("div", { className: "ev", children: [
            /* @__PURE__ */ jsx("i", {}),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Last edited" }),
              " by ",
              doc.updated_by_name,
              /* @__PURE__ */ jsx("div", { className: "muted", children: fmtDateTime(doc.updated_at) })
            ] })
          ] }),
          doc.posted_at && /* @__PURE__ */ jsxs("div", { className: "ev ok", children: [
            /* @__PURE__ */ jsx("i", {}),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Posted" }),
              " by ",
              doc.posted_by_name,
              /* @__PURE__ */ jsx("div", { className: "muted", children: fmtDateTime(doc.posted_at) })
            ] })
          ] }),
          doc.reversed_at && /* @__PURE__ */ jsxs("div", { className: "ev danger", children: [
            /* @__PURE__ */ jsx("i", {}),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Reversed" }),
              " by ",
              doc.reversed_by_name,
              /* @__PURE__ */ jsxs("div", { className: "muted", children: [
                fmtDateTime(doc.reversed_at),
                " \u2014 ",
                doc.reverse_reason
              ] })
            ] })
          ] }),
          doc.cancelled_at && /* @__PURE__ */ jsxs("div", { className: "ev danger", children: [
            /* @__PURE__ */ jsx("i", {}),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Discarded" }),
              " by ",
              doc.cancelled_by_name,
              /* @__PURE__ */ jsx("div", { className: "muted", children: fmtDateTime(doc.cancelled_at) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "muted", style: { marginTop: 12 }, children: [
          "Posted documents can never be edited or deleted. ",
          /* @__PURE__ */ jsx(Link, { to: "/admin/audit", children: "Full audit log" }),
          " records every action."
        ] })
      ] }),
      can("stock.view") && moves.length > 0 && /* @__PURE__ */ jsxs("div", { className: "no-print", children: [
        /* @__PURE__ */ jsxs("h3", { style: { margin: "0 0 10px" }, children: [
          "Stock movements",
          cfg.type === "OUTWARD" ? " \xB7 pick list" : ""
        ] }),
        /* @__PURE__ */ jsx(DataTable, { rows: moves, columns: moveCols, pageSize: 25 })
      ] })
    ] })
  ] });
}
export {
  DocumentView as default
};
