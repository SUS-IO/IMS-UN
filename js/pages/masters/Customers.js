import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MapPin } from "lucide-react";
import MasterPage from "./MasterPage.js";
import LocationsModal from "./LocationsModal.js";
const columns = [
  { key: "code", header: "Code", width: 90, render: (r) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.code }) },
  { key: "name", header: "Customer", render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("b", { children: r.name }),
    /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.contact_person })
  ] }) },
  { key: "gstin", header: "GSTIN" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" }
];
const fields = [
  { name: "code", label: "Customer code", lockOnEdit: true, upper: true, hint: "Leave blank to auto-generate (C0001\u2026)" },
  { name: "name", label: "Customer name", required: true },
  { name: "gstin", label: "GSTIN", upper: true },
  { name: "pan", label: "PAN", upper: true },
  { name: "contact_person", label: "Contact person" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", span2: true },
  { name: "notes", label: "Notes", type: "textarea", span2: true }
];
function Customers() {
  const [loc, setLoc] = useState(null);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      MasterPage,
      {
        title: "Customers",
        subtitle: "Each customer can have many locations (branches / showrooms) with their own names.",
        noun: "Customer",
        table: "customers",
        perm: "customer",
        columns,
        fields,
        rowActions: (r) => /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: (e) => {
          e.stopPropagation();
          setLoc(r);
        }, children: [
          /* @__PURE__ */ jsx(MapPin, {}),
          " Locations"
        ] })
      }
    ),
    /* @__PURE__ */ jsx(LocationsModal, { customer: loc, onClose: () => setLoc(null) })
  ] });
}
export {
  Customers as default
};
