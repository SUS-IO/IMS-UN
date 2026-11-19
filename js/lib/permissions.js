const PERMISSION_ROWS = [
  { label: "Dashboard", items: [["dashboard.view", "View"]] },
  { label: "Products", items: [["product.view", "View"], ["product.create", "Create"], ["product.edit", "Edit"]] },
  { label: "Customers & locations", items: [["customer.view", "View"], ["customer.create", "Create"], ["customer.edit", "Edit"]] },
  { label: "Vendors", items: [["vendor.view", "View"], ["vendor.create", "Create"], ["vendor.edit", "Edit"]] },
  { label: "Racks / locations", items: [["rack.view", "View"], ["rack.create", "Create"], ["rack.edit", "Edit"]] },
  { label: "Customer code mapping", items: [["mapping.view", "View"], ["mapping.manage", "Create / edit"]] },
  { label: "Inward (purchase)", items: [["inward.view", "View"], ["inward.create", "Enter / draft"], ["inward.post", "Post"], ["inward.reverse", "Reverse"]] },
  { label: "Outward (sales)", items: [["outward.view", "View"], ["outward.create", "Enter / draft"], ["outward.post", "Post"], ["outward.reverse", "Reverse"]] },
  { label: "Return to vendor", items: [["vreturn.view", "View"], ["vreturn.create", "Enter / draft"], ["vreturn.post", "Post"], ["vreturn.reverse", "Reverse"]] },
  { label: "Customer returns", items: [["creturn.view", "View"], ["creturn.create", "Enter / draft"], ["creturn.post", "Post"], ["creturn.reverse", "Reverse"]] },
  { label: "Stock & ledger", items: [["stock.view", "View stock"], ["cost.view", "See cost price"]] },
  { label: "Audit log", items: [["audit.view", "View"]] }
];
const ALL_PERMS = PERMISSION_ROWS.flatMap((r) => r.items.map((i) => i[0]));
const only = (re, ex = []) => ALL_PERMS.filter((p) => re.test(p) && !ex.includes(p));
const PRESETS = [
  { name: "Store keeper", perms: [
    "dashboard.view",
    "product.view",
    "rack.view",
    "vendor.view",
    "customer.view",
    "mapping.view",
    "stock.view",
    ...only(/^(inward|outward|vreturn|creturn)\.(view|create|post)$/)
  ] },
  { name: "Sales / dispatch", perms: [
    "dashboard.view",
    "product.view",
    "customer.view",
    "mapping.view",
    "mapping.manage",
    "stock.view",
    ...only(/^(outward|creturn)\.(view|create|post)$/)
  ] },
  { name: "Purchase", perms: [
    "dashboard.view",
    "product.view",
    "product.create",
    "vendor.view",
    "vendor.create",
    "vendor.edit",
    "rack.view",
    "stock.view",
    "cost.view",
    ...only(/^(inward|vreturn)\.(view|create|post)$/)
  ] },
  { name: "View only", perms: only(/\.view$/, ["audit.view"]) },
  { name: "Manager (all but audit)", perms: ALL_PERMS.filter((p) => p !== "audit.view") },
  { name: "Clear all", perms: [] }
];
export {
  ALL_PERMS,
  PERMISSION_ROWS,
  PRESETS
};
