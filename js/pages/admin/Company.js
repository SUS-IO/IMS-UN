import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Save, Building2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { run, errText } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useToast } from "../../context/ToastContext.js";
import { Field, PageHeader, PageLoader, Alert } from "../../components/ui/Bits.js";
import { fmtDateTime } from "../../lib/format.js";
const TEXT = ["company_name", "legal_name", "gstin", "pan", "phone", "email", "website", "address_line1", "address_line2", "city", "state", "pincode", "invoice_footer"];
function Company() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => run(supabase.from("company_settings").select("*").eq("id", 1).single()), []);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (data) setF({ ...data });
  }, [data]);
  if (loading || !f) return /* @__PURE__ */ jsx(PageLoader, {});
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const inp = (k, label, extra = {}) => /* @__PURE__ */ jsx(Field, { label, ...extra, children: /* @__PURE__ */ jsx("input", { className: "input", value: f[k] ?? "", onChange: (e) => set(k, extra.upper ? e.target.value.toUpperCase() : e.target.value) }) });
  const save = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.company_name?.trim()) return setErr("Company name is required.");
    setBusy(true);
    try {
      const payload = Object.fromEntries(TEXT.map((k) => [k, (f[k] ?? "").toString().trim() || null]));
      payload.company_name = f.company_name.trim();
      payload.prices_include_gst = !!f.prices_include_gst;
      payload.idle_minutes = Number(f.idle_minutes);
      payload.timezone = f.timezone || "Asia/Kolkata";
      await run(supabase.from("company_settings").update(payload).eq("id", 1));
      toast.success("Company details saved");
      reload(true);
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Company Details", subtitle: "Your company information and system rules. One company only." }),
    /* @__PURE__ */ jsxs("form", { className: "stack", onSubmit: save, style: { maxWidth: 900 }, children: [
      (err || error) && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: err || error?.message }),
      /* @__PURE__ */ jsxs("div", { className: "card card-pad stack", children: [
        /* @__PURE__ */ jsxs("h3", { className: "row", children: [
          /* @__PURE__ */ jsx(Building2, { size: 18 }),
          " Business details"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          inp("company_name", "Company name *"),
          inp("legal_name", "Legal name"),
          inp("gstin", "GSTIN", { upper: true }),
          inp("pan", "PAN", { upper: true }),
          inp("phone", "Phone"),
          inp("email", "Email"),
          inp("website", "Website", { className: "span-2" }),
          inp("address_line1", "Address line 1", { className: "span-2" }),
          inp("address_line2", "Address line 2", { className: "span-2" }),
          inp("city", "City"),
          inp("state", "State"),
          inp("pincode", "Pincode"),
          /* @__PURE__ */ jsx(Field, { label: "Footer text on printouts", className: "span-2", children: /* @__PURE__ */ jsx("textarea", { className: "textarea", value: f.invoice_footer ?? "", onChange: (e) => set("invoice_footer", e.target.value) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card card-pad stack", children: [
        /* @__PURE__ */ jsx("h3", { children: "System rules" }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsx(Field, { label: "Idle time before auto-draft (minutes)", hint: "If a user is inactive on Inward / Outward / Returns for this long, their work is saved as a draft and the screen is released.", children: /* @__PURE__ */ jsx("input", { className: "input", type: "number", min: "1", max: "120", value: f.idle_minutes, onChange: (e) => set("idle_minutes", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "Time zone", hint: "Used for \u201Ctoday\u201D and ageing, e.g. Asia/Kolkata", children: /* @__PURE__ */ jsx("input", { className: "input", value: f.timezone, onChange: (e) => set("timezone", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { className: "span-2", children: /* @__PURE__ */ jsxs("label", { className: "check", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: !!f.prices_include_gst, onChange: (e) => set("prices_include_gst", e.target.checked) }),
            "Selling prices / MRP already include GST (usual in India). GST on outward is then backed out of the price instead of added on top."
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxs("span", { className: "muted grow", children: [
          "Last changed by ",
          f.updated_by_name || "\u2014",
          " \xB7 ",
          fmtDateTime(f.updated_at)
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", disabled: busy, children: [
          /* @__PURE__ */ jsx(Save, {}),
          " ",
          busy ? "Saving\u2026" : "Save changes"
        ] })
      ] })
    ] })
  ] });
}
export {
  Company as default
};
