import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import MasterPage from "./MasterPage.js";
import ImportModal from "../../components/ui/ImportModal.js";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, run } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
const columns = [
  { key: "customer", header: "Customer", value: (r) => r.customers?.name, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("b", { children: r.customers?.name }),
    /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.customers?.code })
  ] }) },
  { key: "product", header: "Our item code", value: (r) => r.products?.code, render: (r) => /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("span", { className: "code-cell", children: r.products?.code }),
    /* @__PURE__ */ jsx("span", { className: "sub-text", children: r.products?.description })
  ] }) },
  { key: "customer_code", header: "Customer\u2019s code", render: (r) => /* @__PURE__ */ jsx("span", { className: "badge brand", children: r.customer_code }) },
  { key: "customer_description", header: "Customer\u2019s description" }
];
const IMPORT_COLS = [
  { field: "customer", label: "Customer Code", required: true, aliases: ["customer", "customername", "customerid"] },
  { field: "product", label: "Our Item Code", required: true, aliases: ["itemcode", "productcode", "ourcode"] },
  { field: "customer_code", label: "Customer Item Code", required: true, aliases: ["theircode", "customerpartcode"] },
  { field: "customer_description", label: "Customer Description", aliases: ["description"] }
];
function CustomerCodes() {
  const { can } = useAuth();
  const toast = useToast();
  const [imp, setImp] = useState(false);
  const [key, setKey] = useState(0);
  const { data: look } = useAsync(async () => {
    const [c, p] = await Promise.all([
      fetchAll(() => supabase.from("customers").select("id,code,name,is_active").order("name")),
      fetchAll(() => supabase.from("products").select("id,code,description,is_active").order("code"))
    ]);
    return { c, p };
  }, [key], { initial: { c: [], p: [] } });
  const lookups = useMemo(() => ({
    customers: look.c.filter((x) => x.is_active).map((x) => ({ value: x.id, label: x.name, sub: x.code, keywords: x.code })),
    products: look.p.filter((x) => x.is_active).map((x) => ({ value: x.id, label: x.code, sub: x.description, keywords: x.description }))
  }), [look]);
  const fields = [
    { name: "customer_id", label: "Customer", type: "lookup", lookup: "customers", required: true, lockOnEdit: true },
    { name: "product_id", label: "Our product", type: "lookup", lookup: "products", required: true, lockOnEdit: true },
    { name: "customer_code", label: "Customer\u2019s own item code", required: true, hint: "Printed next to our code whenever you sell this product to this customer." },
    { name: "customer_description", label: "Customer\u2019s description" }
  ];
  const prepare = async (objs) => {
    const cmap = /* @__PURE__ */ new Map();
    look.c.forEach((c) => {
      cmap.set(c.code.toUpperCase(), c);
      cmap.set(c.name.toUpperCase(), c);
    });
    const pmap = new Map(look.p.map((p) => [p.code.toUpperCase(), p]));
    const existing = await fetchAll(() => supabase.from("customer_product_codes").select("id,customer_id,product_id"));
    const have = new Set(existing.map((e) => `${e.customer_id}|${e.product_id}`));
    const seen = /* @__PURE__ */ new Set();
    return objs.map((o) => {
      const c = cmap.get(String(o.customer).trim().toUpperCase());
      const p = pmap.get(String(o.product).trim().toUpperCase());
      if (!c) return { line: o.__line, raw: o, error: "Customer not found" };
      if (!p) return { line: o.__line, raw: o, error: "Product not found" };
      if (!String(o.customer_code).trim()) return { line: o.__line, raw: o, error: "Customer code missing" };
      const k = `${c.id}|${p.id}`;
      if (have.has(k)) return { line: o.__line, raw: o, error: "Already mapped" };
      if (seen.has(k)) return { line: o.__line, raw: o, error: "Duplicate in file" };
      seen.add(k);
      return { line: o.__line, raw: o, data: { customer_id: c.id, product_id: p.id, customer_code: String(o.customer_code).trim(), customer_description: String(o.customer_description || "").trim() || null } };
    });
  };
  const save = async (rows) => {
    for (let i = 0; i < rows.length; i += 200) await run(supabase.from("customer_product_codes").insert(rows.slice(i, i + 200)));
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      MasterPage,
      {
        title: "Customer Codes",
        subtitle: "Map each customer\u2019s own item code to your product code. Your code stays the key; theirs is added to every outward for that customer.",
        noun: "Mapping",
        table: "customer_product_codes",
        perm: "mapping",
        orderBy: "created_at",
        select: "*, customers(code,name), products(code,description)",
        columns,
        fields,
        lookups,
        exportName: "customer_codes",
        extraFilters: [{ key: "customer_id", label: "All customers", options: lookups.customers.map((o) => ({ value: o.value, label: o.label })) }],
        toolbar: () => can("mapping.manage") && /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => setImp(true), children: [
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
        title: "Import customer code mapping",
        columns: IMPORT_COLS,
        prepare,
        save,
        templateName: "IMS_customer_codes_template",
        sample: [["C0001", "UN00001", "SAM-WHL-77", "Dost flywheel"]],
        onDone: (n) => {
          toast.success(`${n} mappings imported`);
          setKey((k) => k + 1);
        }
      }
    )
  ] });
}
export {
  CustomerCodes as default
};
