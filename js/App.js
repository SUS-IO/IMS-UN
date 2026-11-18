import { jsx, jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { CONFIG_OK } from "./config.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { ToastProvider } from "./context/ToastContext.js";
import { DialogProvider } from "./context/DialogContext.js";
import AppShell from "./components/layout/AppShell.js";
import ErrorBoundary from "./components/ui/ErrorBoundary.js";
import { PageLoader } from "./components/ui/Bits.js";
import Login from "./pages/Login.js";
import SetupNeeded from "./pages/SetupNeeded.js";
import { DOC_LIST } from "./lib/docTypes.js";
import { NAV } from "./components/layout/nav.js";
const Dashboard = lazy(() => import("./pages/Dashboard.js"));
const Products = lazy(() => import("./pages/masters/Products.js"));
const Customers = lazy(() => import("./pages/masters/Customers.js"));
const Vendors = lazy(() => import("./pages/masters/Vendors.js"));
const Racks = lazy(() => import("./pages/masters/Racks.js"));
const CustomerCodes = lazy(() => import("./pages/masters/CustomerCodes.js"));
const Stock = lazy(() => import("./pages/inventory/Stock.js"));
const Ledger = lazy(() => import("./pages/inventory/Ledger.js"));
const DocumentList = lazy(() => import("./pages/documents/DocumentList.js"));
const DocumentEditor = lazy(() => import("./pages/documents/DocumentEditor.js"));
const DocumentView = lazy(() => import("./pages/documents/DocumentView.js"));
const Users = lazy(() => import("./pages/admin/Users.js"));
const Company = lazy(() => import("./pages/admin/Company.js"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog.js"));
const PortalStock = lazy(() => import("./pages/portal/PortalStock.js"));
function Guard({ perm, admin, children }) {
  const { can, isAdmin } = useAuth();
  if (admin && !isAdmin || perm && !can(perm)) {
    return /* @__PURE__ */ jsxs("div", { className: "empty card", children: [
      /* @__PURE__ */ jsx("b", { children: "No access" }),
      /* @__PURE__ */ jsx("span", { children: "You do not have permission to open this page. Ask the administrator." })
    ] });
  }
  return children;
}
function Home() {
  const { can, isCustomer } = useAuth();
  if (isCustomer) return /* @__PURE__ */ jsx(Navigate, { to: "/portal", replace: true });
  if (can("dashboard.view")) return /* @__PURE__ */ jsx(Navigate, { to: "/dashboard", replace: true });
  const first = NAV.flatMap((g) => g.items).find((i) => !i.admin && can(i.perm));
  return /* @__PURE__ */ jsx(Navigate, { to: first?.to || "/stock", replace: true });
}
function Routed() {
  const { loading, profile, isCustomer } = useAuth();
  if (loading) return /* @__PURE__ */ jsx(PageLoader, { text: "Starting IMS\u2026" });
  if (!profile) return /* @__PURE__ */ jsx(Login, {});
  if (isCustomer) {
    return /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(PageLoader, {}), children: /* @__PURE__ */ jsxs(Routes, { children: [
      /* @__PURE__ */ jsx(Route, { path: "/portal", element: /* @__PURE__ */ jsx(PortalStock, {}) }),
      /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Navigate, { to: "/portal", replace: true }) })
    ] }) });
  }
  return /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(PageLoader, {}), children: /* @__PURE__ */ jsx(Routes, { children: /* @__PURE__ */ jsxs(Route, { element: /* @__PURE__ */ jsx(AppShell, {}), children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(Home, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "dashboard", element: /* @__PURE__ */ jsx(Guard, { perm: "dashboard.view", children: /* @__PURE__ */ jsx(Dashboard, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "products", element: /* @__PURE__ */ jsx(Guard, { perm: "product.view", children: /* @__PURE__ */ jsx(Products, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "customers", element: /* @__PURE__ */ jsx(Guard, { perm: "customer.view", children: /* @__PURE__ */ jsx(Customers, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "vendors", element: /* @__PURE__ */ jsx(Guard, { perm: "vendor.view", children: /* @__PURE__ */ jsx(Vendors, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "racks", element: /* @__PURE__ */ jsx(Guard, { perm: "rack.view", children: /* @__PURE__ */ jsx(Racks, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "customer-codes", element: /* @__PURE__ */ jsx(Guard, { perm: "mapping.view", children: /* @__PURE__ */ jsx(CustomerCodes, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "stock", element: /* @__PURE__ */ jsx(Guard, { perm: "stock.view", children: /* @__PURE__ */ jsx(Stock, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "ledger", element: /* @__PURE__ */ jsx(Guard, { perm: "stock.view", children: /* @__PURE__ */ jsx(Ledger, {}) }) }),
    DOC_LIST.map((d) => /* @__PURE__ */ jsxs(Route, { path: d.path, children: [
      /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(Guard, { perm: `${d.perm}.view`, children: /* @__PURE__ */ jsx(DocumentList, { cfg: d }) }) }),
      /* @__PURE__ */ jsx(Route, { path: "new", element: /* @__PURE__ */ jsx(Guard, { perm: `${d.perm}.create`, children: /* @__PURE__ */ jsx(DocumentEditor, { cfg: d }) }) }),
      /* @__PURE__ */ jsx(Route, { path: "edit/:id", element: /* @__PURE__ */ jsx(Guard, { perm: `${d.perm}.create`, children: /* @__PURE__ */ jsx(DocumentEditor, { cfg: d }) }) }),
      /* @__PURE__ */ jsx(Route, { path: ":id", element: /* @__PURE__ */ jsx(Guard, { perm: `${d.perm}.view`, children: /* @__PURE__ */ jsx(DocumentView, { cfg: d }) }) })
    ] }, d.path)),
    /* @__PURE__ */ jsx(Route, { path: "admin/users", element: /* @__PURE__ */ jsx(Guard, { admin: true, children: /* @__PURE__ */ jsx(Users, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "admin/company", element: /* @__PURE__ */ jsx(Guard, { admin: true, children: /* @__PURE__ */ jsx(Company, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "admin/audit", element: /* @__PURE__ */ jsx(Guard, { perm: "audit.view", children: /* @__PURE__ */ jsx(AuditLog, {}) }) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx("div", { className: "empty card", children: /* @__PURE__ */ jsx("b", { children: "Page not found" }) }) })
  ] }) }) });
}
function App() {
  if (!CONFIG_OK) return /* @__PURE__ */ jsx(SetupNeeded, {});
  return /* @__PURE__ */ jsx(HashRouter, { children: /* @__PURE__ */ jsx(ToastProvider, { children: /* @__PURE__ */ jsx(DialogProvider, { children: /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(ErrorBoundary, { children: /* @__PURE__ */ jsx(Routed, {}) }) }) }) }) });
}
export {
  App as default
};
