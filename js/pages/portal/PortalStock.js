import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Search, LogOut, Package, LayoutGrid, List, Moon, Sun, KeyRound } from "lucide-react";
import { rpc } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useEffect } from "react";
import DataTable from "../../components/ui/DataTable.js";
import SearchSelect from "../../components/ui/SearchSelect.js";
import { Badge, PageLoader, Alert } from "../../components/ui/Bits.js";
import ChangePasswordModal from "../../components/layout/ChangePasswordModal.js";
import { money, int, greeting, initials } from "../../lib/format.js";
function PortalStock() {
  const { profile, signOut } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => rpc("portal_stock"), [], { initial: [] });
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [cat, setCat] = useState("");
  const [view, setView] = useState("grid");
  const [img, setImg] = useState(null);
  const [pw, setPw] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || "light");
  useEffect(() => {
    const t = setInterval(() => reload(true), 2e4);
    return () => clearInterval(t);
  }, [reload]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("ims.theme", theme);
    } catch {
    }
  }, [theme]);
  useEffect(() => {
    toast.success(`${greeting()}, ${profile.full_name.split(" ")[0]}!`, "Showing live stock.");
  }, []);
  const opts = (k) => [...new Set(data.map((r) => r[k]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
  const rows = useMemo(() => {
    const parts = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.filter((r) => (!brand || r.brand === brand) && (!cat || r.category === cat) && parts.every((p) => `${r.code} ${r.description} ${r.brand || ""} ${r.model || ""} ${r.part_code || ""} ${r.customer_code || ""}`.toLowerCase().includes(p))).map((r) => ({ ...r, id: `${r.product_id}|${r.mrp}` }));
  }, [data, q, brand, cat]);
  const cols = [
    { key: "image_url", header: "", width: 56, sortable: false, csv: false, render: (r) => r.image_url ? /* @__PURE__ */ jsx("img", { className: "thumb", src: r.image_url, alt: "", onClick: () => setImg(r.image_url), style: { cursor: "zoom-in" } }) : /* @__PURE__ */ jsx("div", { className: "thumb thumb-ph", children: /* @__PURE__ */ jsx(Package, { size: 18 }) }) },
    { key: "code", header: "Item code", render: (r) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.code }) },
    { key: "customer_code", header: "Your code", render: (r) => r.customer_code ? /* @__PURE__ */ jsx(Badge, { tone: "brand", children: r.customer_code }) : "\u2014" },
    { key: "description", header: "Description", minWidth: 220, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("b", { children: r.description }),
      /* @__PURE__ */ jsx("span", { className: "sub-text", children: [r.brand, r.model].filter(Boolean).join(" \xB7 ") })
    ] }) },
    { key: "mrp", header: "MRP", align: "right", render: (r) => /* @__PURE__ */ jsx("b", { children: money(r.mrp) }) },
    { key: "qty", header: "Available", align: "right", render: (r) => /* @__PURE__ */ jsxs(Badge, { tone: r.qty <= 5 ? "warn" : "ok", dot: true, children: [
      int(r.qty),
      " pcs"
    ] }) },
    { key: "racks", header: "Location", render: (r) => r.racks.split(", ").map((x) => /* @__PURE__ */ jsx("span", { className: "loc-chip", style: { marginRight: 4 }, children: x }, x)) }
  ];
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsxs("header", { className: "topbar", children: [
      /* @__PURE__ */ jsx("img", { src: "img/logo.png", alt: "IMS", style: { height: 38 } }),
      /* @__PURE__ */ jsx("div", { className: "grow" }),
      /* @__PURE__ */ jsxs("span", { className: "live-pill", children: [
        /* @__PURE__ */ jsx("i", {}),
        " Live"
      ] }),
      /* @__PURE__ */ jsx("button", { className: "icon-btn", onClick: () => setTheme((t) => t === "dark" ? "light" : "dark"), "aria-label": "Toggle dark mode", children: theme === "dark" ? /* @__PURE__ */ jsx(Sun, {}) : /* @__PURE__ */ jsx(Moon, {}) }),
      /* @__PURE__ */ jsx("button", { className: "icon-btn", onClick: () => setPw(true), title: "Change password", children: /* @__PURE__ */ jsx(KeyRound, {}) }),
      /* @__PURE__ */ jsx("span", { className: "avatar", title: profile.full_name, children: initials(profile.full_name) }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: signOut, children: [
        /* @__PURE__ */ jsx(LogOut, {}),
        " Sign out"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "content", children: [
      /* @__PURE__ */ jsx("div", { className: "page-head", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { children: [
          greeting(),
          ", ",
          profile.full_name.split(" ")[0]
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Live stock available for ",
          profile.customer_name,
          ". Updates automatically."
        ] })
      ] }) }),
      error && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message }),
      /* @__PURE__ */ jsxs("div", { className: "portal-bar", children: [
        /* @__PURE__ */ jsxs("div", { className: "search", children: [
          /* @__PURE__ */ jsx(Search, {}),
          /* @__PURE__ */ jsx("input", { className: "input", placeholder: "Search by code, name, brand, model\u2026", value: q, onChange: (e) => setQ(e.target.value) })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { width: 180 }, children: /* @__PURE__ */ jsx(SearchSelect, { placeholder: "All brands", options: opts("brand"), value: brand, onChange: setBrand }) }),
        /* @__PURE__ */ jsx("div", { style: { width: 180 }, children: /* @__PURE__ */ jsx(SearchSelect, { placeholder: "All categories", options: opts("category"), value: cat, onChange: setCat }) }),
        /* @__PURE__ */ jsx("div", { className: "grow" }),
        /* @__PURE__ */ jsxs("div", { className: "row", style: { gap: 4 }, children: [
          /* @__PURE__ */ jsx("button", { className: `btn btn-icon ${view === "grid" ? "btn-dark" : ""}`, onClick: () => setView("grid"), "aria-label": "Card view", children: /* @__PURE__ */ jsx(LayoutGrid, {}) }),
          /* @__PURE__ */ jsx("button", { className: `btn btn-icon ${view === "list" ? "btn-dark" : ""}`, onClick: () => setView("list"), "aria-label": "Table view", children: /* @__PURE__ */ jsx(List, {}) })
        ] })
      ] }),
      loading && !data.length ? /* @__PURE__ */ jsx(PageLoader, {}) : view === "list" ? /* @__PURE__ */ jsx(DataTable, { rows, columns: cols, exportName: "available_stock", defaultSort: { key: "code", dir: "asc" }, stickyFirst: true, tall: true, emptyTitle: "No stock available right now" }) : rows.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty card", children: [
        /* @__PURE__ */ jsx(Package, {}),
        /* @__PURE__ */ jsx("b", { children: "No matching products" }),
        /* @__PURE__ */ jsx("span", { children: "Try a different search." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "pgrid", children: rows.map((r) => /* @__PURE__ */ jsxs("div", { className: "pcard", children: [
        /* @__PURE__ */ jsxs("div", { className: "pimg", onClick: () => r.image_url && setImg(r.image_url), children: [
          r.image_url ? /* @__PURE__ */ jsx("img", { src: r.image_url, alt: r.description, loading: "lazy" }) : /* @__PURE__ */ jsx(Package, {}),
          /* @__PURE__ */ jsx("span", { className: "stock-pill", children: /* @__PURE__ */ jsxs(Badge, { tone: r.qty <= 5 ? "warn" : "ok", dot: true, children: [
            int(r.qty),
            " pcs"
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pbody", children: [
          /* @__PURE__ */ jsxs("span", { className: "pcode", children: [
            r.code,
            r.customer_code && /* @__PURE__ */ jsxs(Fragment, { children: [
              " \xB7 ",
              /* @__PURE__ */ jsx("span", { style: { color: "var(--text)" }, children: r.customer_code })
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "pname", children: r.description }),
          /* @__PURE__ */ jsx("span", { className: "pmeta", children: [r.brand, r.model, r.category].filter(Boolean).join(" \xB7 ") }),
          /* @__PURE__ */ jsx("div", { className: "row wrap", style: { gap: 5 }, children: r.racks.split(", ").map((x) => /* @__PURE__ */ jsxs("span", { className: "loc-chip", children: [
            "\u{1F4CD} ",
            x
          ] }, x)) }),
          /* @__PURE__ */ jsxs("div", { className: "pprice", children: [
            /* @__PURE__ */ jsx("span", { className: "muted", children: "MRP" }),
            /* @__PURE__ */ jsx("b", { children: money(r.mrp) })
          ] })
        ] })
      ] }, r.id)) })
    ] }),
    img && /* @__PURE__ */ jsx("div", { className: "lightbox", onClick: () => setImg(null), children: /* @__PURE__ */ jsx("img", { src: img, alt: "Product" }) }),
    /* @__PURE__ */ jsx(ChangePasswordModal, { open: pw || profile.must_change_password, forced: profile.must_change_password, onClose: () => setPw(false) })
  ] });
}
export {
  PortalStock as default
};
