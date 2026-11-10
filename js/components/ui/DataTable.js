import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import SearchSelect from "./SearchSelect.js";
import { downloadCSV } from "../../lib/csv.js";
const cmp = (a, b) => {
  const an = a === null || a === void 0 || a === "";
  const bn = b === null || b === void 0 || b === "";
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), void 0, { numeric: true, sensitivity: "base" });
};
function DataTable({
  rows = [],
  columns,
  loading,
  rowKey = "id",
  searchPlaceholder = "Search\u2026",
  filters = [],
  defaultSort,
  rowClass,
  onRowClick,
  selectedKey,
  toolbar,
  exportName,
  pageSize: initialSize = 50,
  emptyTitle = "Nothing here yet",
  emptyText,
  stickyFirst,
  footer,
  tall
}) {
  const [q, setQ] = useState("");
  const [fv, setFv] = useState({});
  const [sort, setSort] = useState(defaultSort || null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  const val = (row, c) => c.value ? c.value(row) : row[c.key];
  const processed = useMemo(() => {
    let r = rows;
    for (const f of filters) {
      const v = fv[f.key];
      if (v !== void 0 && v !== "") r = r.filter((row) => f.match ? f.match(row, v) : String(row[f.key]) === String(v));
    }
    const s = q.trim().toLowerCase();
    if (s) {
      const parts = s.split(/\s+/);
      r = r.filter((row) => {
        const hay = columns.map((c) => {
          const v = val(row, c);
          return v === null || v === void 0 ? "" : String(v);
        }).join(" ").toLowerCase();
        return parts.every((p) => hay.includes(p));
      });
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      if (c) {
        const d = sort.dir === "asc" ? 1 : -1;
        r = [...r].sort((a, b) => d * cmp(val(a, c), val(b, c)));
      }
    }
    return r;
  }, [rows, q, fv, sort, columns, filters]);
  useEffect(() => {
    setPage(0);
  }, [q, fv, sort, size, rows.length]);
  const pages = Math.max(1, Math.ceil(processed.length / size));
  const pageRows = processed.slice(page * size, page * size + size);
  const toggleSort = (c) => {
    if (c.sortable === false) return;
    setSort((s) => !s || s.key !== c.key ? { key: c.key, dir: "asc" } : s.dir === "asc" ? { key: c.key, dir: "desc" } : null);
  };
  const exportCsv = () => {
    const cols = columns.filter((c) => c.csv !== false && c.header);
    downloadCSV(exportName || "export", cols.map((c) => c.header), processed.map((row) => cols.map((c) => {
      const v = val(row, c);
      return v ?? "";
    })));
  };
  return /* @__PURE__ */ jsxs("div", { className: "table-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "table-toolbar", children: [
      /* @__PURE__ */ jsxs("div", { className: "search", children: [
        /* @__PURE__ */ jsx(Search, {}),
        /* @__PURE__ */ jsx("input", { className: "input", placeholder: searchPlaceholder, value: q, onChange: (e) => setQ(e.target.value) })
      ] }),
      filters.map((f) => /* @__PURE__ */ jsx("div", { className: "filter", children: /* @__PURE__ */ jsx(SearchSelect, { size: "sm", placeholder: f.label, options: f.options, value: fv[f.key] ?? "", onChange: (v) => setFv((o) => ({ ...o, [f.key]: v })) }) }, f.key)),
      /* @__PURE__ */ jsx("div", { className: "spacer" }),
      toolbar,
      exportName && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: exportCsv, disabled: !processed.length, title: "Download as CSV (opens in Excel)", children: [
        /* @__PURE__ */ jsx(Download, {}),
        " Export"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: `table-scroll ${tall ? "tall" : ""}`, children: loading ? /* @__PURE__ */ jsxs("div", { className: "page-loader", children: [
      /* @__PURE__ */ jsx("span", { className: "spinner" }),
      " Loading\u2026"
    ] }) : processed.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty", children: [
      /* @__PURE__ */ jsx(Inbox, {}),
      /* @__PURE__ */ jsx("b", { children: rows.length ? "No matching records" : emptyTitle }),
      /* @__PURE__ */ jsx("span", { children: rows.length ? "Try changing the search or filters." : emptyText })
    ] }) : /* @__PURE__ */ jsxs("table", { className: `dt ${stickyFirst ? "sticky-first" : ""}`, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: columns.map((c) => {
        const sorted = sort?.key === c.key;
        return /* @__PURE__ */ jsx(
          "th",
          {
            className: `${c.sortable === false ? "" : "sortable"} ${sorted ? "sorted" : ""} ${c.align || ""}`,
            style: { width: c.width, minWidth: c.minWidth },
            onClick: () => toggleSort(c),
            "aria-sort": sorted ? sort.dir === "asc" ? "ascending" : "descending" : "none",
            children: /* @__PURE__ */ jsxs("div", { className: "th-in", children: [
              c.header,
              c.sortable !== false && c.header && (sorted ? sort.dir === "asc" ? /* @__PURE__ */ jsx(ArrowUp, { className: "sort-ic" }) : /* @__PURE__ */ jsx(ArrowDown, { className: "sort-ic" }) : /* @__PURE__ */ jsx(ArrowUpDown, { className: "sort-ic" }))
            ] })
          },
          c.key
        );
      }) }) }),
      /* @__PURE__ */ jsx("tbody", { children: pageRows.map((row) => /* @__PURE__ */ jsx(
        "tr",
        {
          className: `${onRowClick ? "clickable" : ""} ${selectedKey && selectedKey === row[rowKey] ? "selected" : ""} ${rowClass?.(row) || ""}`,
          onClick: onRowClick ? () => onRowClick(row) : void 0,
          children: columns.map((c) => /* @__PURE__ */ jsx("td", { className: `${c.align || ""} ${sort?.key === c.key ? "col-sorted" : ""} ${c.className?.(row) || ""}`, children: c.render ? c.render(row) : val(row, c) ?? "\u2014" }, c.key))
        },
        row[rowKey]
      )) }),
      footer && /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: columns.length, children: typeof footer === "function" ? footer(processed) : footer }) }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "table-foot", children: [
      /* @__PURE__ */ jsx("span", { children: processed.length === rows.length ? `${processed.length} records` : `${processed.length} of ${rows.length} records` }),
      /* @__PURE__ */ jsxs("div", { className: "pager", children: [
        /* @__PURE__ */ jsx("select", { className: "select", value: size, onChange: (e) => setSize(Number(e.target.value)), "aria-label": "Rows per page", children: [25, 50, 100, 250].map((n) => /* @__PURE__ */ jsxs("option", { value: n, children: [
          n,
          " / page"
        ] }, n)) }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", disabled: page === 0, onClick: () => setPage((p) => p - 1), "aria-label": "Previous page", children: /* @__PURE__ */ jsx(ChevronLeft, {}) }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Page ",
          page + 1,
          " / ",
          pages
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", disabled: page >= pages - 1, onClick: () => setPage((p) => p + 1), "aria-label": "Next page", children: /* @__PURE__ */ jsx(ChevronRight, {}) })
      ] })
    ] })
  ] });
}
export {
  DataTable as default
};
