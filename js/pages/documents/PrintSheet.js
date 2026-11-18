import { jsx, jsxs } from "react/jsx-runtime";
import { fmtDate, fmtDateTime } from "../../lib/format.js";
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function below1000(n) {
  let s = "";
  if (n >= 100) {
    s += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) s += ONES[n] + " ";
  return s;
}
function rupeesInWords(amount) {
  const total = Math.round(Math.abs(Number(amount) || 0) * 100);
  let rupees = Math.floor(total / 100);
  const paise = total % 100;
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  let words = "";
  const crore = Math.floor(rupees / 1e7);
  rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5);
  rupees %= 1e5;
  const thousand = Math.floor(rupees / 1e3);
  rupees %= 1e3;
  if (crore) words += below1000(crore) + "Crore ";
  if (lakh) words += below1000(lakh) + "Lakh ";
  if (thousand) words += below1000(thousand) + "Thousand ";
  if (rupees) words += below1000(rupees);
  words = words.trim();
  const rs = words ? `${words} Rupees` : "";
  const ps = paise ? `${below1000(paise).trim()} Paise` : "";
  return `${[rs, ps].filter(Boolean).join(" and ")} Only`;
}
const f2 = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const TITLES = {
  INWARD: ["GOODS RECEIPT NOTE", "Inward from vendor"],
  OUTWARD: ["SALES INVOICE", "Outward to customer"],
  VENDOR_RETURN: ["DEBIT NOTE", "Return of goods to vendor"],
  CUSTOMER_RETURN: ["CREDIT NOTE", "Goods returned by customer"]
};
function PrintSheet({ doc, lines, company, cfg, sourceDoc }) {
  const sale = cfg.kind === "sale";
  const isVendor = cfg.partyKind === "vendor";
  const party = isVendor ? doc.vendors : doc.customers;
  const loc = doc.customer_locations;
  const [title, subtitle] = TITLES[doc.doc_type] || ["DOCUMENT", ""];
  const gstOf = (l) => Number(sale ? l.sale_gst_pct ?? l.gst_pct : l.gst_pct);
  const slabs = /* @__PURE__ */ new Map();
  for (const l of lines) {
    const k = gstOf(l);
    const s = slabs.get(k) || { rate: k, taxable: 0, gst: 0 };
    s.taxable += Number(l.taxable);
    s.gst += Number(l.gst_amount);
    slabs.set(k, s);
  }
  const slabList = [...slabs.values()].sort((a, b) => a.rate - b.rate);
  const totalQty = lines.reduce((a, l) => a + Number(l.qty), 0);
  const companyAddr = [company.address_line1, company.address_line2, [company.city, company.state].filter(Boolean).join(", "), company.pincode].filter(Boolean).join(", ");
  const partyAddr = isVendor ? [party?.address_line1, party?.address_line2, party?.city].filter(Boolean).join(", ") : [loc?.address_line1, loc?.address_line2, [loc?.city, loc?.state].filter(Boolean).join(", "), loc?.pincode].filter(Boolean).join(", ");
  const partyGstin = !isVendor && loc?.gstin || party?.gstin;
  const meta = [
    ["Document No.", doc.doc_no || "DRAFT"],
    ["Date", fmtDate(doc.doc_date)],
    doc.reference_no && [cfg.refLabel.replace(/\s*\(.*\)/, ""), doc.reference_no],
    sourceDoc && [isVendor ? "Against Inward" : "Against Outward", sourceDoc.doc_no],
    doc.reason && ["Reason", doc.reason]
  ].filter(Boolean);
  const cols = ["#", "Item", "HSN", "Qty", "Pack", "MRP", sale ? "Rate/pack" : "Cost/pack", ...sale ? ["Disc %"] : [], "GST %", "Taxable", "GST", "Amount"];
  return /* @__PURE__ */ jsx("div", { className: "print-sheet", children: /* @__PURE__ */ jsxs("table", { className: "ps-wrap", children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "ps-space" }) }) }) }),
    /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "ps-space" }) }) }) }),
    /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsxs("td", { className: "ps-body", children: [
      doc.status === "REVERSED" && /* @__PURE__ */ jsx("div", { className: "ps-watermark", children: "REVERSED" }),
      /* @__PURE__ */ jsxs("div", { className: "ps-letterhead", children: [
        /* @__PURE__ */ jsxs("div", { className: "ps-brand", children: [
          company.logo_url && /* @__PURE__ */ jsx("img", { src: company.logo_url, alt: "" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "ps-company", children: company.company_name }),
            company.legal_name && company.legal_name !== company.company_name && /* @__PURE__ */ jsx("div", { className: "ps-small", children: company.legal_name }),
            /* @__PURE__ */ jsx("div", { className: "ps-small", children: companyAddr }),
            /* @__PURE__ */ jsx("div", { className: "ps-small", children: [company.phone && `Ph: ${company.phone}`, company.email, company.website].filter(Boolean).join("  |  ") }),
            /* @__PURE__ */ jsx("div", { className: "ps-small", children: [company.gstin && `GSTIN: ${company.gstin}`, company.pan && `PAN: ${company.pan}`].filter(Boolean).join("   ") })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ps-title", children: [
          /* @__PURE__ */ jsx("div", { className: "ps-doc-title", children: title }),
          /* @__PURE__ */ jsx("div", { className: "ps-small", children: subtitle })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ps-boxes", children: [
        /* @__PURE__ */ jsxs("div", { className: "ps-box", children: [
          /* @__PURE__ */ jsx("div", { className: "ps-box-h", children: isVendor ? "Vendor" : doc.doc_type === "OUTWARD" ? "Billed / Shipped to" : "Customer" }),
          /* @__PURE__ */ jsx("div", { className: "ps-party", children: party?.name }),
          !isVendor && loc?.name && /* @__PURE__ */ jsx("div", { children: loc.name }),
          partyAddr && /* @__PURE__ */ jsx("div", { className: "ps-small", children: partyAddr }),
          /* @__PURE__ */ jsx("div", { className: "ps-small", children: [party?.code && `Code: ${party.code}`, partyGstin && `GSTIN: ${partyGstin}`].filter(Boolean).join("   ") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ps-box", children: [
          /* @__PURE__ */ jsx("div", { className: "ps-box-h", children: "Document details" }),
          /* @__PURE__ */ jsx("table", { className: "ps-meta", children: /* @__PURE__ */ jsx("tbody", { children: meta.map(([k, v]) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { children: k }),
            /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: v }) })
          ] }, k)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("table", { className: "ps-items", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: cols.map((c, i) => /* @__PURE__ */ jsx("th", { className: i > 2 ? "r" : "", children: c }, c)) }) }),
        /* @__PURE__ */ jsx("tbody", { children: lines.map((l) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: l.line_no }),
          /* @__PURE__ */ jsxs("td", { children: [
            /* @__PURE__ */ jsx("b", { children: l.products.code }),
            /* @__PURE__ */ jsx("div", { className: "ps-small", children: l.products.description }),
            sale && l.customer_code && /* @__PURE__ */ jsxs("div", { className: "ps-small", children: ["Your code: ", /* @__PURE__ */ jsx("b", { children: l.customer_code })] }),
            doc.doc_type === "INWARD" && l.racks?.code && /* @__PURE__ */ jsxs("div", { className: "ps-small", children: ["Rack: ", l.racks.code] })
          ] }),
          /* @__PURE__ */ jsx("td", { children: l.products.hsn || "" }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f0(l.qty) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f0(l.pack_size) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f2(l.mrp) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f2(l.rate) }),
          sale && /* @__PURE__ */ jsx("td", { className: "r", children: Number(l.discount_pct) ? f2(l.discount_pct) : "-" }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f2(gstOf(l)) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f2(l.taxable) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: f2(l.gst_amount) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: /* @__PURE__ */ jsx("b", { children: f2(l.line_total) }) })
        ] }, l.id)) }),
        /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { colSpan: 3, className: "r", children: /* @__PURE__ */ jsx("b", { children: "Total" }) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: /* @__PURE__ */ jsx("b", { children: f0(totalQty) }) }),
          /* @__PURE__ */ jsx("td", { colSpan: cols.length - 7 }),
          /* @__PURE__ */ jsx("td", { className: "r", children: /* @__PURE__ */ jsx("b", { children: f2(doc.sub_total) }) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: /* @__PURE__ */ jsx("b", { children: f2(doc.gst_total) }) }),
          /* @__PURE__ */ jsx("td", { className: "r", children: /* @__PURE__ */ jsx("b", { children: f2(doc.grand_total) }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ps-summary", children: [
        /* @__PURE__ */ jsxs("div", { className: "ps-slabs", children: [
          /* @__PURE__ */ jsxs("table", { className: "ps-items ps-mini", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { children: "GST %" }),
              /* @__PURE__ */ jsx("th", { className: "r", children: "Taxable" }),
              /* @__PURE__ */ jsx("th", { className: "r", children: "CGST" }),
              /* @__PURE__ */ jsx("th", { className: "r", children: "SGST" }),
              /* @__PURE__ */ jsx("th", { className: "r", children: "Total GST" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: slabList.map((s) => /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: f2(s.rate) }),
              /* @__PURE__ */ jsx("td", { className: "r", children: f2(s.taxable) }),
              /* @__PURE__ */ jsx("td", { className: "r", children: f2(s.gst / 2) }),
              /* @__PURE__ */ jsx("td", { className: "r", children: f2(s.gst / 2) }),
              /* @__PURE__ */ jsx("td", { className: "r", children: f2(s.gst) })
            ] }, s.rate)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "ps-words", children: [
            /* @__PURE__ */ jsx("span", { children: "Amount in words: " }),
            /* @__PURE__ */ jsx("b", { children: rupeesInWords(doc.grand_total) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("table", { className: "ps-totals", children: [
          /* @__PURE__ */ jsx("tbody", { children: [["Taxable value", doc.sub_total], ["Total GST", doc.gst_total]].map(([k, v]) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { children: k }),
            /* @__PURE__ */ jsxs("td", { className: "r", children: ["₹ ", f2(v)] })
          ] }, k)) }),
          /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { children: "Grand total" }),
            /* @__PURE__ */ jsxs("td", { className: "r", children: ["₹ ", f2(doc.grand_total)] })
          ] }) })
        ] })
      ] }),
      doc.notes && /* @__PURE__ */ jsxs("div", { className: "ps-notes", children: [/* @__PURE__ */ jsx("b", { children: "Notes: " }), doc.notes] }),
      doc.status === "REVERSED" && /* @__PURE__ */ jsxs("div", { className: "ps-notes", children: [/* @__PURE__ */ jsx("b", { children: "This document was reversed" }), ` on ${fmtDateTime(doc.reversed_at)} by ${doc.reversed_by_name || ""}. Reason: ${doc.reverse_reason || "-"}`] }),
      company.invoice_footer && /* @__PURE__ */ jsx("div", { className: "ps-terms", children: company.invoice_footer }),
      /* @__PURE__ */ jsxs("div", { className: "ps-sign", children: [
        /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", { className: "ps-line" }), isVendor ? "Received / checked by" : "Receiver's signature"] }),
        /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", { className: "ps-line" }), `Prepared by: ${doc.created_by_name || ""}`] }),
        /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", { className: "ps-line" }), `For ${company.company_name}`, /* @__PURE__ */ jsx("br", {}), "Authorised signatory"] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ps-foot", children: ["This is a computer-generated document · ", doc.doc_no || "Draft", " · Posted ", fmtDateTime(doc.posted_at), doc.posted_by_name ? ` by ${doc.posted_by_name}` : ""] })
    ] }) }) })
  ] }) });
}
export {
  PrintSheet as default,
  rupeesInWords
};
