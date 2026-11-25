import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import MasterPage from "./MasterPage.js";
const columns = [
  { key: "code", header: "Code", width: 90, render: (r) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.code }) },
  { key: "name", header: "Vendor", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("b", { children: r.name }),
    /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.contact_person })
  ] }) },
  { key: "gstin", header: "GSTIN" },
  { key: "phone", header: "Phone" },
  { key: "city", header: "City" }
];
const fields = [
  { name: "code", label: "Vendor code", lockOnEdit: true, upper: true, hint: "Leave blank to auto-generate (V0001\u2026)" },
  { name: "name", label: "Vendor name", required: true },
  { name: "gstin", label: "GSTIN", upper: true },
  { name: "pan", label: "PAN", upper: true },
  { name: "contact_person", label: "Contact person" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "city", label: "City" },
  { name: "address_line1", label: "Address line 1", span2: true },
  { name: "address_line2", label: "Address line 2", span2: true },
  { name: "state", label: "State" },
  { name: "pincode", label: "Pincode" },
  { name: "notes", label: "Notes", type: "textarea", span2: true }
];
function Vendors() {
  return /* @__PURE__ */ jsx(MasterPage, { title: "Vendors", subtitle: "Suppliers you buy spare parts from.", noun: "Vendor", table: "vendors", perm: "vendor", columns, fields });
}
export {
  Vendors as default
};
