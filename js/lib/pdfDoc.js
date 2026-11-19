// Draws professional A4 PDFs (invoice / GRN / debit & credit notes / delivery challan / "after returns" versions).
// Pure drawing code - the data comes from lib/docData.js.
import { lineView, packOf } from "./calc.js";
import { fmtDate, fmtDateTime } from "./format.js";
import { rupeesInWords } from "./words.js";
let lib;
const getLib = async () => lib ||= await import("../../vendor/pdf.js");
const RED = [165, 15, 42], INK = [31, 36, 48], GREY = [95, 100, 110], SOFT = [246, 247, 249], RULE = [205, 209, 216];
const f2 = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const price = (n) => {
  const x = Number(n || 0);
  const t = x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return t;
};
const logoCache = /* @__PURE__ */ new Map();
async function logoPng(url) {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url);
  let out = null;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    out = { data: c.toDataURL("image/png"), w: c.width, h: c.height };
  } catch {
    out = null;
  }
  logoCache.set(url, out);
  return out;
}
const TITLES = {
  INWARD: ["GOODS RECEIPT NOTE", "Inward from vendor", "GRN"],
  OUTWARD: ["SALES INVOICE", "Outward to customer", "Invoice"],
  VENDOR_RETURN: ["DEBIT NOTE", "Return of goods to vendor", "DebitNote"],
  CUSTOMER_RETURN: ["CREDIT NOTE", "Goods returned by customer", "CreditNote"]
};
const isSale = (t) => t === "OUTWARD" || t === "CUSTOMER_RETURN";
// "variant": "STANDARD" (with rates) | "DC" (delivery challan, no rates).  "marked": show returns & final figures.
function docTitle(type, variant, marked) {
  let [t, sub] = TITLES[type] || ["DOCUMENT", ""];
  if (variant === "DC") {
    t = "DELIVERY CHALLAN";
    sub = "Goods delivered — not a tax invoice";
  }
  if (marked) t += " — AFTER RETURNS";
  return [t, sub];
}
function fileName(doc, variant, marked) {
  const kind = variant === "DC" ? "DC" : (TITLES[doc.doc_type] || [])[2] || "Document";
  const no = String(doc.doc_no || "DRAFT").replace(/[\\/:*?"<>|\s]+/g, "-");
  return `${no}_${kind}${marked ? "_AfterReturns" : ""}.pdf`;
}
const gstOf = (l, sale) => Number(sale ? l.sale_gst_pct ?? l.gst_pct : l.gst_pct);
function qtyText(pcs, l, uom) {
  const pack = packOf(l.pack_size);
  const n = Number(pcs) || 0;
  if (l.entry_unit === "PACK" && pack > 1 && n % pack === 0) return `${n / pack} ${uom || "Pack"}`;
  return `${n} Pcs`;
}
async function buildDocPdf(bundle, company, { variant = "STANDARD", marked = false } = {}) {
  const { jsPDF, autoTable } = await getLib();
  const { doc, lines, sourceDoc, returns } = bundle;
  const sale = isSale(doc.doc_type);
  const isVendor = doc.doc_type === "INWARD" || doc.doc_type === "VENDOR_RETURN";
  const dc = variant === "DC";
  const party = isVendor ? doc.vendors : doc.customers;
  const loc = doc.customer_locations;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, M = 12;
  const retOf = (l) => marked && returns?.byLine?.[l.id] || null;
  pdf.setProperties({ title: `${docTitle(doc.doc_type, variant, marked)[0]} ${doc.doc_no || ""}`, author: company.company_name || "IMS" });

  // ---------- letterhead ----------
  let x = M;
  const logo = await logoPng(company.logo_url);
  if (logo) {
    const h = 17, w = Math.min(38, h * logo.w / logo.h);
    pdf.addImage(logo.data, "PNG", M, 10, w, h);
    x = M + w + 4;
  }
  pdf.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(15).text(company.company_name || "", x, 15);
  pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY);
  const addr = [company.address_line1, company.address_line2, [company.city, company.state].filter(Boolean).join(", "), company.pincode].filter(Boolean).join(", ");
  const sub1 = [company.phone && `Ph: ${company.phone}`, company.email, company.website].filter(Boolean).join("  |  ");
  const sub2 = [company.gstin && `GSTIN: ${company.gstin}`, company.pan && `PAN: ${company.pan}`].filter(Boolean).join("    ");
  let ty = 19.5;
  for (const t of [addr, sub1, sub2]) {
    if (!t) continue;
    pdf.text(pdf.splitTextToSize(t, 105), x, ty);
    ty += 3.8;
  }
  const [title, subtitle] = docTitle(doc.doc_type, variant, marked);
  pdf.setFont("helvetica", "bold").setFontSize(marked ? 11.5 : 15).setTextColor(...RED).text(title, W - M, 15, { align: "right" });
  pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY).text(subtitle, W - M, 19.5, { align: "right" });
  const ruleY = Math.max(ty, 30) + 0.5;
  pdf.setDrawColor(...RED).setLineWidth(0.7).line(M, ruleY, W - M, ruleY);

  // ---------- party + document boxes ----------
  const by = ruleY + 4, bh = 30, bw = (W - 2 * M - 4) / 2;
  pdf.setDrawColor(...RULE).setLineWidth(0.3).roundedRect(M, by, bw, bh, 1.5, 1.5).roundedRect(M + bw + 4, by, bw, bh, 1.5, 1.5);
  const head = (t, bx) => pdf.setFont("helvetica", "bold").setFontSize(7).setTextColor(...RED).text(t.toUpperCase(), bx + 3, by + 4.5);
  head(isVendor ? "Vendor" : doc.doc_type === "OUTWARD" ? "Billed / shipped to" : "Customer", M);
  pdf.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...INK).text(pdf.splitTextToSize(party?.name || "", bw - 6)[0] || "", M + 3, by + 10);
  const pAddr = isVendor ? [party?.address_line1, party?.address_line2, party?.city].filter(Boolean).join(", ") : [loc?.address_line1, loc?.address_line2, [loc?.city, loc?.state].filter(Boolean).join(", "), loc?.pincode].filter(Boolean).join(", ");
  const pg = !isVendor && loc?.gstin || party?.gstin;
  pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...INK);
  let py = by + 14.5;
  if (!isVendor && loc?.name) {
    pdf.text(loc.name, M + 3, py);
    py += 4;
  }
  pdf.setFontSize(8).setTextColor(...GREY);
  if (pAddr) {
    const al = pdf.splitTextToSize(pAddr, bw - 6).slice(0, 2);
    pdf.text(al, M + 3, py);
    py += al.length * 3.6;
  }
  pdf.text([party?.code && `Code: ${party.code}`, pg && `GSTIN: ${pg}`].filter(Boolean).join("    "), M + 3, Math.min(py, by + bh - 2.5));
  head("Document details", M + bw + 4);
  const meta = [
    ["Document No.", doc.doc_no || "DRAFT"],
    ["Date", fmtDate(doc.doc_date)],
    doc.reference_no && [(doc.doc_type === "INWARD" ? "Vendor invoice" : "Reference"), doc.reference_no],
    sourceDoc && [isVendor ? "Against inward" : "Against outward", sourceDoc.doc_no],
    doc.reason && ["Reason", doc.reason],
    doc.status === "REVERSED" && ["Status", "REVERSED"]
  ].filter(Boolean).slice(0, 5);
  let my = by + 10;
  for (const [k, v] of meta) {
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY).text(k, M + bw + 7, my);
    pdf.setFont("helvetica", "bold").setTextColor(...INK).text(String(v).slice(0, 38), M + bw + 33, my);
    my += 4.2;
  }

  // ---------- items ----------
  let head1, body, colStyles, foot = null;
  const itemCell = (l) => [l.products.code, l.products.description, sale && !dc && l.customer_code ? `Your code: ${l.customer_code}` : sale && dc && l.customer_code ? `Your code: ${l.customer_code}` : "", !sale && doc.doc_type === "INWARD" && l.racks?.code ? `Rack: ${l.racks.code}` : ""].filter(Boolean).join("\n");
  const unitTag = (v) => `\nper ${v.per}`;
  if (dc) {
    if (marked) {
      head1 = ["#", "Item", "HSN", "Qty sent", "Returned", "Net qty"];
      body = lines.map((l) => {
        const r = retOf(l);
        return [l.line_no, itemCell(l), l.products.hsn || "", qtyText(l.qty, l, l.products.uom), r ? qtyText(r.qty, l, l.products.uom) : "-", qtyText(l.qty - (r?.qty || 0), l, l.products.uom)];
      });
      colStyles = { 0: { cellWidth: 9 }, 2: { cellWidth: 22 }, 3: { halign: "right", cellWidth: 26 }, 4: { halign: "right", cellWidth: 26 }, 5: { halign: "right", cellWidth: 26 } };
    } else {
      head1 = ["#", "Item", "HSN", "Unit", "Qty", "Total pcs"];
      body = lines.map((l) => {
        const v = lineView(l, l.products.uom);
        return [l.line_no, itemCell(l), l.products.hsn || "", v.unit === "PACK" ? `${v.unitLabel} of ${packOf(l.pack_size)}` : "Pcs", f2(v.qty).replace(/\.00$/, ""), String(l.qty)];
      });
      colStyles = { 0: { cellWidth: 9 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { halign: "right", cellWidth: 22 }, 5: { halign: "right", cellWidth: 24 } };
    }
  } else if (marked) {
    head1 = ["#", "Item", "HSN", "Qty", "Returned", "Net qty", "Rate", "GST %", "Amount", "Returned amt", "Net amount"];
    body = lines.map((l) => {
      const v = lineView(l, l.products.uom), r = retOf(l);
      return [l.line_no, itemCell(l), l.products.hsn || "", qtyText(l.qty, l, l.products.uom), r ? qtyText(r.qty, l, l.products.uom) : "-", qtyText(l.qty - (r?.qty || 0), l, l.products.uom), price(v.rate) + unitTag(v), f2(gstOf(l, sale)), f2(l.line_total), r ? f2(r.total) : "-", f2(Number(l.line_total) - (r?.total || 0))];
    });
    colStyles = { 0: { cellWidth: 7 }, 2: { cellWidth: 16 }, 3: { halign: "right", cellWidth: 14 }, 4: { halign: "right", cellWidth: 14 }, 5: { halign: "right", cellWidth: 14 }, 6: { halign: "right", cellWidth: 17 }, 7: { halign: "right", cellWidth: 11 }, 8: { halign: "right", cellWidth: 19 }, 9: { halign: "right", cellWidth: 19 }, 10: { halign: "right", cellWidth: 20, fontStyle: "bold" } };
  } else {
    head1 = ["#", "Item", "HSN", "Qty", "MRP", sale ? "Rate" : "Cost", ...sale ? ["Disc %"] : [], "GST %", "Taxable", "GST", "Amount"];
    body = lines.map((l) => {
      const v = lineView(l, l.products.uom);
      return [l.line_no, itemCell(l), l.products.hsn || "", `${f2(v.qty).replace(/\.00$/, "")} ${v.unitLabel}`, price(v.mrp) + unitTag(v), price(v.rate) + unitTag(v), ...sale ? [Number(l.discount_pct) ? f2(l.discount_pct) : "-"] : [], f2(gstOf(l, sale)), f2(l.taxable), f2(l.gst_amount), f2(l.line_total)];
    });
    const n = head1.length;
    const W2 = sale ? [7, null, 16, 17, 17, 17, 11, 11, 20, 16, 20] : [7, null, 16, 17, 17, 17, 11, 20, 16, 20];
    colStyles = {};
    W2.forEach((w, i) => {
      if (i === 1) return;
      colStyles[i] = { cellWidth: w, ...i >= 3 ? { halign: "right" } : {} };
    });
    colStyles[n - 1].fontStyle = "bold";
  }
  const startY = by + bh + 5;
  autoTable(pdf, {
    startY,
    head: [head1],
    body,
    theme: "plain",
    margin: { top: 14, left: M, right: M, bottom: 20 },
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 }, textColor: INK, lineColor: RULE, lineWidth: { bottom: 0.15 }, valign: "top" },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold", fontSize: 7.5, lineWidth: 0 },
    alternateRowStyles: { fillColor: SOFT },
    columnStyles: colStyles,
    rowPageBreak: "avoid",
    didParseCell: (d) => {
      if (d.section === "head" && colStyles[d.column.index]?.halign) d.cell.styles.halign = colStyles[d.column.index].halign;
    },
    willDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        d.cell._ln = d.cell.text.slice();
        d.cell.text = [];
      }
    },
    didDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 1 && d.cell._ln) {
        let yy = d.cell.y + 1.6 + 2.6;
        d.cell._ln.forEach((t, i) => {
          pdf.setFont("helvetica", i === 0 ? "bold" : "normal").setFontSize(i === 0 ? 8.2 : 7.2).setTextColor(...i === 0 ? INK : GREY);
          pdf.text(t, d.cell.x + 1.5, yy);
          yy += 3.2;
        });
      }
    }
  });
  let y = pdf.lastAutoTable.finalY + 6;
  const ensure = (h) => {
    if (y + h > H - 20) {
      pdf.addPage();
      y = 16;
    }
  };

  // ---------- totals ----------
  const netOf = (l) => {
    const r = retOf(l);
    return { taxable: Number(l.taxable) - (r?.taxable || 0), gst: Number(l.gst_amount) - (r?.gst || 0), total: Number(l.line_total) - (r?.total || 0) };
  };
  if (dc) {
    const pcs = lines.reduce((a, l) => a + Number(l.qty), 0);
    const retPcs = marked ? lines.reduce((a, l) => a + (retOf(l)?.qty || 0), 0) : 0;
    ensure(14);
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK);
    pdf.text(marked ? `Total sent: ${pcs} pcs   |   Returned: ${retPcs} pcs   |   Net with customer: ${pcs - retPcs} pcs` : `Total items: ${lines.length}   |   Total pieces: ${pcs}`, M, y);
    y += 8;
  } else {
    const slabs = /* @__PURE__ */ new Map();
    let sub = 0, gst = 0, tot = 0;
    for (const l of lines) {
      const n = marked ? netOf(l) : { taxable: Number(l.taxable), gst: Number(l.gst_amount), total: Number(l.line_total) };
      const k = gstOf(l, sale);
      const s = slabs.get(k) || { rate: k, taxable: 0, gst: 0 };
      s.taxable += n.taxable;
      s.gst += n.gst;
      slabs.set(k, s);
      sub += n.taxable;
      gst += n.gst;
      tot += n.total;
    }
    const slabList = [...slabs.values()].sort((a, b) => a.rate - b.rate);
    const origTotal = Number(doc.grand_total);
    ensure(14 + slabList.length * 6 + 16);
    const top = y;
    autoTable(pdf, {
      startY: y,
      head: [["GST %", "Taxable", "CGST", "SGST", "Total GST"]],
      body: slabList.map((s) => [f2(s.rate), f2(s.taxable), f2(s.gst / 2), f2(s.gst / 2), f2(s.gst)]),
      theme: "plain",
      tableWidth: 100,
      margin: { left: M, right: W - M - 100, top: 14, bottom: 20 },
      styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: RULE, lineWidth: { bottom: 0.15 }, textColor: INK },
      headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 0: { cellWidth: 14 } },
      didParseCell: (d) => {
        if (d.section === "head" && d.column.index > 0) d.cell.styles.halign = "right";
      }
    });
    const afterSlabs = pdf.lastAutoTable.finalY;
    // totals box on the right
    const rows = marked ? [["Original total", f2(origTotal)], ["Less: returns", `- ${f2(origTotal - tot)}`], ["Taxable value", f2(sub)], ["Total GST", f2(gst)]] : [["Taxable value", f2(sub)], ["Total GST", f2(gst)]];
    let ry = top + 1;
    pdf.setFontSize(9);
    for (const [k, v] of rows) {
      pdf.setFont("helvetica", "normal").setTextColor(...INK).text(k, W - M - 62, ry + 3.5);
      pdf.text(v, W - M - 1.5, ry + 3.5, { align: "right" });
      pdf.setDrawColor(...RULE).setLineWidth(0.15).line(W - M - 64, ry + 5, W - M, ry + 5);
      ry += 6;
    }
    pdf.setFillColor(...RED).rect(W - M - 64, ry, 64, 8.5, "F");
    pdf.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(255, 255, 255);
    pdf.text(marked ? "Net total (Rs.)" : "Grand total (Rs.)", W - M - 62, ry + 5.8);
    pdf.text(f2(marked ? tot : origTotal), W - M - 1.5, ry + 5.8, { align: "right" });
    y = Math.max(afterSlabs, ry + 8.5) + 5;
    pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...INK);
    pdf.text("Amount in words: ", M, y);
    const lw = pdf.getTextWidth("Amount in words: ");
    pdf.setFont("helvetica", "bold").text(pdf.splitTextToSize(rupeesInWords(marked ? tot : origTotal), W - 2 * M - lw), M + lw, y);
    y += 7;
  }

  // ---------- returns list, notes, terms ----------
  if (marked && returns?.docs?.length) {
    ensure(10 + returns.docs.length * 4);
    pdf.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...RED).text("RETURNS ADJUSTED AGAINST THIS DOCUMENT", M, y);
    y += 4.5;
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...INK);
    for (const r of returns.docs) {
      pdf.text(`${r.doc_no}   dated ${fmtDate(r.doc_date)}`, M + 2, y);
      y += 4;
    }
    y += 2;
  }
  const para = (label, text, color = INK) => {
    if (!text) return;
    const lines2 = pdf.splitTextToSize(`${label}${text}`, W - 2 * M - 6);
    ensure(lines2.length * 3.8 + 4);
    pdf.setFillColor(...SOFT).rect(M, y - 3.2, W - 2 * M, lines2.length * 3.8 + 2.5, "F");
    pdf.setFillColor(...RED).rect(M, y - 3.2, 0.9, lines2.length * 3.8 + 2.5, "F");
    pdf.setFont("helvetica", "normal").setFontSize(8.2).setTextColor(...color).text(lines2, M + 3, y);
    y += lines2.length * 3.8 + 4;
  };
  para("Notes: ", doc.notes);
  if (doc.status === "REVERSED") para("This document was reversed: ", `${fmtDateTime(doc.reversed_at)} by ${doc.reversed_by_name || ""}. Reason: ${doc.reverse_reason || "-"}`);
  if (company.invoice_footer && !dc) {
    const t = pdf.splitTextToSize(company.invoice_footer, W - 2 * M);
    ensure(t.length * 3.4 + 2);
    pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY).text(t, M, y);
    y += t.length * 3.4 + 2;
  }

  // ---------- signatures ----------
  ensure(34);
  y += 14;
  const sw = (W - 2 * M - 16) / 3;
  const sigs = [dc ? "Receiver's signature & seal" : isVendor ? "Received / checked by" : "Receiver's signature", `Prepared by: ${doc.created_by_name || ""}`, `For ${company.company_name || ""}\nAuthorised signatory`];
  sigs.forEach((t, i) => {
    const sx = M + i * (sw + 8);
    pdf.setDrawColor(60, 60, 60).setLineWidth(0.3).line(sx, y, sx + sw, y);
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...INK).text(t, sx + sw / 2, y + 4, { align: "center" });
  });

  // ---------- watermark + page footers ----------
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    if (doc.status === "REVERSED") {
      pdf.saveGraphicsState();
      pdf.setGState(new pdf.GState({ opacity: 0.12 }));
      pdf.setFont("helvetica", "bold").setFontSize(80).setTextColor(...RED).text("REVERSED", W / 2, H / 2, { align: "center", angle: 30 });
      pdf.restoreGraphicsState();
    }
    pdf.setDrawColor(...RULE).setLineWidth(0.2).line(M, H - 13, W - M, H - 13);
    pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
    pdf.text(`Computer-generated document  |  ${doc.doc_no || "Draft"}  |  Posted ${fmtDateTime(doc.posted_at)}${doc.posted_by_name ? " by " + doc.posted_by_name : ""}`, M, H - 9);
    pdf.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: "right" });
  }
  return pdf;
}
async function pdfBytes(bundle, company, opts) {
  const pdf = await buildDocPdf(bundle, company, opts);
  return new Uint8Array(pdf.output("arraybuffer"));
}
async function downloadDocPdf(bundle, company, opts) {
  const pdf = await buildDocPdf(bundle, company, opts);
  pdf.save(fileName(bundle.doc, opts?.variant, opts?.marked));
}
export {
  buildDocPdf,
  downloadDocPdf,
  fileName,
  pdfBytes
};
