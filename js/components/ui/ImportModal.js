import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import Modal from "./Modal.js";
import { Alert } from "./Bits.js";
import { readTableFile, downloadCSV } from "../../lib/csv.js";
import { errText } from "../../lib/api.js";
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
function ImportModal({ open, onClose, title, columns, prepare, save, templateName, sample = [], onDone }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const reset = () => {
    setRows(null);
    setFileName("");
    setError("");
    setBusy(false);
  };
  const close = () => {
    reset();
    onClose();
  };
  const handle = async (file) => {
    if (!file) return;
    setError("");
    setBusy(true);
    setFileName(file.name);
    try {
      const table = await readTableFile(file);
      if (!table.length) throw new Error("The file is empty.");
      const heads = table[0].map(norm);
      const map = {};
      columns.forEach((c) => {
        const names = [c.label, c.field, ...c.aliases || []].map(norm);
        const i = heads.findIndex((h) => names.includes(h));
        if (i >= 0) map[c.field] = i;
      });
      const missing = columns.filter((c) => c.required && map[c.field] === void 0).map((c) => c.label);
      if (missing.length) throw new Error(`Column(s) not found: ${missing.join(", ")}. Download the template to see the expected headings.`);
      const objs = table.slice(1).filter((r) => r.some((x) => String(x ?? "").trim() !== "")).map((r, i) => {
        const o = { __line: i + 2 };
        Object.entries(map).forEach(([f, idx]) => {
          const v = r[idx];
          o[f] = v === null || v === void 0 ? "" : typeof v === "string" ? v.trim() : v;
        });
        return o;
      });
      if (!objs.length) throw new Error("No data rows found under the headings.");
      setRows(await prepare(objs));
    } catch (e) {
      setError(errText(e));
      setRows(null);
    } finally {
      setBusy(false);
    }
  };
  const good = rows?.filter((r) => r.data) || [];
  const bad = rows?.filter((r) => r.error) || [];
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      await save(good.map((r) => r.data));
      onDone?.(good.length);
      close();
    } catch (e) {
      setError(errText(e));
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsx(
    Modal,
    {
      open,
      onClose: close,
      size: "lg",
      title,
      icon: FileSpreadsheet,
      footer: /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        rows && /* @__PURE__ */ jsx("button", { className: "btn btn-primary", disabled: !good.length || busy, onClick: go, children: busy ? "Importing\u2026" : `Import ${good.length} record${good.length === 1 ? "" : "s"}` })
      ] }),
      children: /* @__PURE__ */ jsxs("div", { className: "stack", children: [
        error && /* @__PURE__ */ jsx(Alert, { tone: "danger", icon: AlertTriangle, children: error }),
        !rows && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: `dropzone ${drag ? "drag" : ""}`,
              onClick: () => input.current?.click(),
              onDragOver: (e) => {
                e.preventDefault();
                setDrag(true);
              },
              onDragLeave: () => setDrag(false),
              onDrop: (e) => {
                e.preventDefault();
                setDrag(false);
                handle(e.dataTransfer.files?.[0]);
              },
              children: [
                /* @__PURE__ */ jsx(UploadCloud, {}),
                /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("b", { children: busy ? "Reading file\u2026" : "Click to choose, or drop an Excel (.xlsx) / CSV file here" }) }),
                fileName && /* @__PURE__ */ jsx("div", { className: "muted", children: fileName }),
                /* @__PURE__ */ jsx("input", { ref: input, type: "file", accept: ".xlsx,.csv", hidden: true, onChange: (e) => {
                  handle(e.target.files?.[0]);
                  e.target.value = "";
                } })
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "row wrap", children: [
            /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => downloadCSV(templateName, columns.map((c) => c.label), sample), children: [
              /* @__PURE__ */ jsx(Download, {}),
              " Download template"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "muted", children: [
              "Columns: ",
              columns.map((c) => c.label + (c.required ? "*" : "")).join(", ")
            ] })
          ] })
        ] }),
        rows && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "row wrap", children: [
            /* @__PURE__ */ jsxs("span", { className: "badge ok", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { size: 13 }),
              " ",
              good.length,
              " ready to import"
            ] }),
            bad.length > 0 && /* @__PURE__ */ jsxs("span", { className: "badge danger", children: [
              bad.length,
              " will be skipped"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "muted", children: fileName }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-ghost", onClick: reset, children: "Choose another file" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "table-scroll", style: { maxHeight: 340, border: "1px solid var(--border)", borderRadius: 8 }, children: /* @__PURE__ */ jsxs("table", { className: "dt", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { children: /* @__PURE__ */ jsx("div", { className: "th-in", children: "Row" }) }),
              /* @__PURE__ */ jsx("th", { children: /* @__PURE__ */ jsx("div", { className: "th-in", children: "Status" }) }),
              columns.slice(0, 4).map((c) => /* @__PURE__ */ jsx("th", { children: /* @__PURE__ */ jsx("div", { className: "th-in", children: c.label }) }, c.field))
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: rows.slice(0, 300).map((r) => /* @__PURE__ */ jsxs("tr", { className: r.error ? "row-danger" : "", children: [
              /* @__PURE__ */ jsx("td", { children: r.line }),
              /* @__PURE__ */ jsx("td", { children: r.error ? /* @__PURE__ */ jsx("span", { className: "badge danger", children: r.error }) : /* @__PURE__ */ jsx("span", { className: "badge ok", children: r.note || "OK" }) }),
              columns.slice(0, 4).map((c) => /* @__PURE__ */ jsx("td", { children: String((r.data || r.raw || {})[c.field] ?? "") }, c.field))
            ] }, r.line)) })
          ] }) }),
          rows.length > 300 && /* @__PURE__ */ jsx("span", { className: "muted", children: "Showing the first 300 rows; all valid rows will be imported." })
        ] })
      ] })
    }
  );
}
export {
  ImportModal as default
};
