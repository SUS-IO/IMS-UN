import { LayoutDashboard, PackagePlus, PackageMinus, Undo2, Redo2, Boxes, History, Package, Users, Truck, Warehouse, Link2, Shield, Building2, ScrollText } from "lucide-react";
const NAV = [
  { title: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" }] },
  { title: "Transactions", items: [
    { to: "/inward", label: "Inward", icon: PackagePlus, perm: "inward.view" },
    { to: "/outward", label: "Outward", icon: PackageMinus, perm: "outward.view" },
    { to: "/vendor-return", label: "Vendor Returns", icon: Undo2, perm: "vreturn.view" },
    { to: "/customer-return", label: "Customer Returns", icon: Redo2, perm: "creturn.view" }
  ] },
  { title: "Inventory", items: [
    { to: "/stock", label: "Stock & Ageing", icon: Boxes, perm: "stock.view", badge: "low" },
    { to: "/ledger", label: "Stock Ledger", icon: History, perm: "stock.view" }
  ] },
  { title: "Masters", items: [
    { to: "/products", label: "Products", icon: Package, perm: "product.view" },
    { to: "/customers", label: "Customers", icon: Users, perm: "customer.view" },
    { to: "/vendors", label: "Vendors", icon: Truck, perm: "vendor.view" },
    { to: "/racks", label: "Racks / Locations", icon: Warehouse, perm: "rack.view" },
    { to: "/customer-codes", label: "Customer Codes", icon: Link2, perm: "mapping.view" }
  ] },
  { title: "Administration", items: [
    { to: "/admin/users", label: "Users & Access", icon: Shield, admin: true },
    { to: "/admin/company", label: "Company Details", icon: Building2, admin: true },
    { to: "/admin/audit", label: "Audit Log", icon: ScrollText, perm: "audit.view" }
  ] }
];
export {
  NAV
};
