import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { Package, Boxes, IndianRupee, AlertTriangle, PackagePlus, PackageMinus, Undo2, Redo2, FileClock, Ban, Link2 } from "lucide-react";
import { rpc } from "../lib/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { useLiveStock } from "../hooks/useLiveStock.js";
import { useAuth } from "../context/AuthContext.js";
import { Badge, StatCard, PageLoader, Alert } from "../components/ui/Bits.js";
import { money, int, greeting } from "../lib/format.js";
function Dashboard() {
  const { profile, can } = useAuth();
  const nav = useNavigate();
  const { data: s, loading, error, reload } = useAsync(() => rpc("dashboard_stats"), []);
  useLiveStock(() => reload(true));
  if (loading && !s) return /* @__PURE__ */ jsx(PageLoader, {});
  if (error) return /* @__PURE__ */ jsx(Alert, { tone: "danger", children: error.message });
  if (!s) return null;
  const max = Math.max(1, ...s.trend.flatMap((d) => [Number(d.inward), Number(d.outward)]));
  const ag = s.ageing;
  const agTotal = Math.max(1, ag.d0_30 + ag.d31_60 + ag.d61_90 + ag.d90p);
  const quick = [
    ["/inward/new", "New inward", PackagePlus, "inward.create"],
    ["/outward/new", "New outward", PackageMinus, "outward.create"],
    ["/customer-return/new", "Customer return", Redo2, "creturn.create"],
    ["/vendor-return/new", "Vendor return", Undo2, "vreturn.create"],
    ["/stock", "View stock", Boxes, "stock.view"],
    ["/customer-codes", "Customer codes", Link2, "mapping.view"]
  ].filter((q) => can(q[3]));
  const today = s.today || {};
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "hello", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { children: [
          greeting(),
          ", ",
          profile.full_name.split(" ")[0],
          " \u{1F44B}"
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          " \xB7 here is your stock at a glance."
        ] })
      ] }),
      s.drafts > 0 && /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => nav("/inward"), children: [
        /* @__PURE__ */ jsx(FileClock, {}),
        " ",
        s.drafts,
        " draft",
        s.drafts > 1 ? "s" : "",
        " waiting"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "stat-grid", children: [
      /* @__PURE__ */ jsx(StatCard, { icon: Package, label: "Active products", value: int(s.products), tone: "brand", onClick: can("product.view") ? () => nav("/products") : void 0 }),
      /* @__PURE__ */ jsx(StatCard, { icon: Boxes, label: "Units in stock", value: int(s.units), sub: "loose pieces", tone: "info", onClick: () => nav("/stock") }),
      s.stock_value !== null && s.stock_value !== void 0 && /* @__PURE__ */ jsx(StatCard, { icon: IndianRupee, label: "Stock value (cost)", value: money(s.stock_value), tone: "ok" }),
      /* @__PURE__ */ jsx(StatCard, { icon: AlertTriangle, label: "Low stock", value: int(s.low_stock), sub: "at / below minimum", tone: s.low_stock ? "warn" : "", onClick: () => nav("/stock?low=1") }),
      /* @__PURE__ */ jsx(StatCard, { icon: Ban, label: "Out of stock", value: int(s.out_of_stock), tone: s.out_of_stock ? "danger" : "", onClick: () => nav("/stock?low=1") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "dash-grid", children: [
      /* @__PURE__ */ jsxs("div", { className: "card", children: [
        /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
          /* @__PURE__ */ jsx("h3", { children: "Last 7 days \u2014 value posted" }),
          /* @__PURE__ */ jsxs("div", { className: "legend", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("i", { style: { background: "var(--slate-600)" } }),
              "Inward"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("i", { style: { background: "var(--red)" } }),
              "Outward"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card-pad", children: [
          /* @__PURE__ */ jsx("div", { className: "bars", children: s.trend.map((d) => /* @__PURE__ */ jsxs("div", { className: "bar-col", children: [
            /* @__PURE__ */ jsxs("div", { className: "bar-pair", children: [
              /* @__PURE__ */ jsx("div", { className: "bar in", style: { height: `${Number(d.inward) / max * 100}%` }, "data-tip": `In ${money(d.inward)}` }),
              /* @__PURE__ */ jsx("div", { className: "bar out", style: { height: `${Number(d.outward) / max * 100}%` }, "data-tip": `Out ${money(d.outward)}` })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "bar-label", children: (/* @__PURE__ */ new Date(d.day + "T00:00:00")).toLocaleDateString("en-GB", { weekday: "short" }) })
          ] }, d.day)) }),
          /* @__PURE__ */ jsx("div", { className: "row wrap", style: { marginTop: 14 }, children: [["INWARD", "Inward today", "ok"], ["OUTWARD", "Outward today", "brand"], ["CUSTOMER_RETURN", "Customer returns", "info"], ["VENDOR_RETURN", "Vendor returns", "warn"]].map(([k, l, t]) => /* @__PURE__ */ jsxs(Badge, { tone: t, children: [
            l,
            ": ",
            today[k]?.count || 0,
            today[k] ? ` \xB7 ${money(today[k].value)}` : ""
          ] }, k)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card", children: [
        /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
          /* @__PURE__ */ jsx("h3", { children: "Stock ageing" }),
          /* @__PURE__ */ jsx(Link, { to: "/stock", className: "muted", children: "Details" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card-pad", children: [
          /* @__PURE__ */ jsx("div", { className: "ageing-bar", children: [ag.d0_30, ag.d31_60, ag.d61_90, ag.d90p].map((v, i) => /* @__PURE__ */ jsx("div", { className: `age-${i}`, style: { width: `${v / agTotal * 100}%` } }, i)) }),
          /* @__PURE__ */ jsx("div", { className: "age-legend", children: [["0\u201330 days", ag.d0_30, 0], ["31\u201360 days", ag.d31_60, 1], ["61\u201390 days", ag.d61_90, 2], ["Over 90 days", ag.d90p, 3]].map(([l, v, i]) => /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("i", { className: `age-${i}` }),
            /* @__PURE__ */ jsxs("span", { children: [
              l,
              /* @__PURE__ */ jsxs("b", { style: { display: "block" }, children: [
                int(v),
                " pcs"
              ] })
            ] })
          ] }, l)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "dash-grid even", children: [
      /* @__PURE__ */ jsxs("div", { className: "card", children: [
        /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
          /* @__PURE__ */ jsx("h3", { children: "Needs re-ordering" }),
          /* @__PURE__ */ jsx(Link, { to: "/stock?low=1", className: "muted", children: "View all" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "card-pad", children: s.low_list.length === 0 ? /* @__PURE__ */ jsx("div", { className: "muted", children: "Nothing below its minimum level. \u{1F389}" }) : s.low_list.map((p) => /* @__PURE__ */ jsxs("div", { className: "list-row", children: [
          /* @__PURE__ */ jsxs("div", { className: "grow", children: [
            /* @__PURE__ */ jsx("b", { children: p.code }),
            /* @__PURE__ */ jsx("span", { className: "sub-text", children: p.description })
          ] }),
          /* @__PURE__ */ jsxs(Badge, { tone: Number(p.qty) === 0 ? "danger" : "warn", children: [
            int(p.qty),
            " / ",
            int(p.min_stock)
          ] })
        ] }, p.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card", children: [
        /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("h3", { children: "Quick actions" }) }),
        /* @__PURE__ */ jsx("div", { className: "card-pad", children: /* @__PURE__ */ jsx("div", { className: "quick", children: quick.map(([to, l, I]) => /* @__PURE__ */ jsxs(Link, { to, children: [
          /* @__PURE__ */ jsx(I, {}),
          l
        ] }, to)) }) })
      ] })
    ] })
  ] });
}
export {
  Dashboard as default
};
