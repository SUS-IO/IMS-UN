import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Upload, Package } from "lucide-react";
import MasterPage from "./MasterPage.js";
import ImageField from "./ImageField.js";
import ImportModal from "../../components/ui/ImportModal.js";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, run } from "../../lib/api.js";
import { GST_SLABS } from "../../config.js";
import { useToast } from "../../context/ToastContext.js";
import { useAuth } from "../../context/AuthContext.js";
const columns = [
  { key: "image_url", header: "", width: 56, sortable: false, csv: false, render: (r) => r.image_url ? /* @__PURE__ */ jsx("img", { className: "thumb", src: r.image_url, alt: "", loading: "lazy" }) : /* @__PURE__ */ jsx("div", { className: "thumb thumb-ph", children: /* @__PURE__ */ jsx(Package, { size: 18 }) }) },
  { key: "code", header: "Item code", render: (r) => /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.code }) },
  { key: "description", header: "Description", minWidth: 220, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("b", { children: r.description }),
    /* @__PURE__ */ jsx("span", { className: "sub-text", children: [r.model && `Model ${r.model}`, r.part_code && `Part ${r.part_code}`].filter(Boolean).join(" \xB7 ") })
  ] }) },
  { key: "brand", header: "Brand" },
  { key: "product_type", header: "Type" },
  { key: "category", header: "Category" },
  { key: "hsn", header: "HSN" },
  { key: "uom", header: "UOM / pack", value: (r) => `${r.uom} (${r.pack_size})`, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    r.uom,
    /* @__PURE__ */ jsxs("span", { className: "sub-text", children: [
      r.pack_size,
      " pcs per ",
      r.uom
    ] })
  ] }) },
  { key: "default_gst", header: "GST %", align: "right", render: (r) => `${Number(r.default_gst)}%` },
  { key: "min_stock", header: "Min stock", align: "right" }
];
const fields = [
  { name: "code", label: "Item code (our key)", required: true, lockOnEdit: true, upper: true, hint: "Your own product code. It can never be changed later." },
  { name: "description", label: "Item description", required: true },
  { name: "brand", label: "Brand" },
  { name: "product_type", label: "Product type", placeholder: "Original / Refurbished\u2026" },
  { name: "category", label: "Category" },
  { name: "model", label: "Model" },
  { name: "part_code", label: "Part code" },
  { name: "hsn", label: "HSN code" },
  { name: "uom", label: "UOM (unit you buy in)", required: true, placeholder: "Set / Packet / Nos" },
  { name: "pack_size", label: "UOQ \u2014 pieces in 1 UOM", type: "number", required: true, min: 1, step: 1, hint: "e.g. a packet of 100 tags \u2192 100. Stock is tracked in loose pieces." },
  { name: "default_gst", label: "Default GST %", type: "select", options: GST_SLABS.map((g) => ({ value: g, label: `${g}%` })), hint: "Suggested on entries; can be changed on each inward / outward." },
  { name: "min_stock", label: "Minimum stock (pieces)", type: "number", min: 0, step: 1, hint: "You get an alert when total stock falls to this level." },
  { name: "image_url", label: "Photo", type: "custom", span2: true, render: (v, set) => /* @__PURE__ */ jsx(ImageField, { value: v.image_url, onChange: (u) => set("image_url", u) }) }
];
const IMPORT_COLS = [
  { field: "code", label: "Item Code", required: true, aliases: ["code", "itemcode", "productcode"] },
  { field: "description", label: "Item Description", required: true, aliases: ["description", "name"] },
  { field: "brand", label: "Brand" },
  { field: "product_type", label: "Product Type", aliases: ["type"] },
  { field: "category", label: "Category Type", aliases: ["category"] },
  { field: "hsn", label: "Hsn", aliases: ["hsncode"] },
  { field: "model", label: "Model" },
  { field: "part_code", label: "Part Code", aliases: ["partno"] },
  { field: "uom", label: "UOM" },
  { field: "pack_size", label: "UOQ", aliases: ["packsize", "pieces"] },
  { field: "default_gst", label: "GST", aliases: ["gst%", "defaultgst"] },
  { field: "min_stock", label: "Min Stock", aliases: ["minimumstock"] },
  { field: "image_url", label: "Images", aliases: ["image", "imageurl", "photo"] }
];
function Products() {
  const [imp, setImp] = useState(false);
  const toast = useToast();
  const { can } = useAuth();
  const [key, setKey] = useState(0);
  const prepare = async (objs) => {
    const existing = new Set((await fetchAll(() => supabase.from("products").select("id,code"))).map((p) => p.code.toUpperCase()));
    const seen = /* @__PURE__ */ new Set();
    return objs.map((o) => {
      const code = String(o.code || "").trim().toUpperCase();
      const raw = { ...o, code };
      if (!code) return { line: o.__line, raw, error: "Item code missing" };
      if (!String(o.description || "").trim()) return { line: o.__line, raw, error: "Description missing" };
      if (existing.has(code)) return { line: o.__line, raw, error: "Already exists" };
      if (seen.has(code)) return { line: o.__line, raw, error: "Duplicate in file" };
      seen.add(code);
      const pack = o.pack_size === "" ? 1 : Number(o.pack_size);
      if (!Number.isInteger(pack) || pack < 1) return { line: o.__line, raw, error: "UOQ must be a whole number \u2265 1" };
      const gst = o.default_gst === "" ? 18 : Number(String(o.default_gst).replace("%", ""));
      if (Number.isNaN(gst) || gst < 0 || gst > 100) return { line: o.__line, raw, error: "GST must be 0\u2013100" };
      const min = o.min_stock === "" ? 0 : Number(o.min_stock);
      if (!Number.isInteger(min) || min < 0) return { line: o.__line, raw, error: "Min stock must be a whole number" };
      const t = (x) => x === "" || x === null || x === void 0 ? null : String(x).trim();
      return { line: o.__line, data: {
        code,
        description: String(o.description).trim(),
        brand: t(o.brand),
        product_type: t(o.product_type),
        category: t(o.category),
        hsn: t(o.hsn),
        model: t(o.model),
        part_code: t(o.part_code),
        uom: t(o.uom) || "Nos",
        pack_size: pack,
        default_gst: gst,
        min_stock: min,
        image_url: /^https?:\/\//i.test(String(o.image_url || "")) ? String(o.image_url).trim() : null
      } };
    });
  };
  const save = async (rows) => {
    for (let i = 0; i < rows.length; i += 200) await run(supabase.from("products").insert(rows.slice(i, i + 200)));
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      MasterPage,
      {
        title: "Products",
        subtitle: "Create every product here before it can be received on an Inward.",
        noun: "Product",
        table: "products",
        perm: "product",
        orderBy: "code",
        columns,
        fields,
        defaults: { uom: "Nos", pack_size: 1, default_gst: 18, min_stock: 0 },
        formSize: "lg",
        exportName: "products",
        toolbar: () => can("product.create") && /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => setImp(true), children: [
          /* @__PURE__ */ jsx(Upload, {}),
          " Import Excel"
        ] })
      },
      key
    ),
    /* @__PURE__ */ jsx(
      ImportModal,
      {
        open: imp,
        onClose: () => setImp(false),
        title: "Import products from Excel / CSV",
        columns: IMPORT_COLS,
        prepare,
        save,
        templateName: "IMS_products_template",
        sample: [["UN00001", "Dost Fly Wheel", "AL", "Original", "Wheels", "", "Dost", "AL56584P", "Set", 2, 18, 5, ""]],
        onDone: (n) => {
          toast.success(`${n} products imported`);
          setKey((k) => k + 1);
        }
      }
    )
  ] });
}
export {
  Products as default
};
