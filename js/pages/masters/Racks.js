import { jsx } from "react/jsx-runtime";
import MasterPage from "./MasterPage.js";
const columns = [
  { key: "code", header: "Rack code", width: 140, render: (r) => /* @__PURE__ */ jsx("span", { className: "loc-chip", children: r.code }) },
  { key: "description", header: "Description" }
];
const fields = [
  { name: "code", label: "Rack code", required: true, lockOnEdit: true, upper: true, hint: "One entry per rack / compartment, e.g. A1, A2, B7", placeholder: "A1" },
  { name: "description", label: "Description", placeholder: "e.g. Aisle A, shelf 1" }
];
function Racks() {
  return /* @__PURE__ */ jsx(
    MasterPage,
    {
      title: "Racks / Locations",
      subtitle: "Every compartment where stock is kept. Choose one while receiving inward.",
      noun: "Rack",
      table: "racks",
      perm: "rack",
      orderBy: "code",
      columns,
      fields,
      exportName: "racks"
    }
  );
}
export {
  Racks as default
};
