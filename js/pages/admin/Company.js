import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { Save, Building2, Upload } from "lucide-react";
import { compressImage, kb } from "../../lib/image.js";
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
  const fileRef = useRef(null);
  const pickLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please choose an image file.");
    setErr("");
    try {
      const blob = await compressImage(file, { maxDim: 400, maxKB: 30, keepAlpha: true });
      const url = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("Could not read the image."));
        r.readAsDataURL(blob);
      });
      setF((x) => ({ ...x, logo_url: url, _logoSize: kb(blob) }));
    } catch (x) {
      setErr(errText(x));
    }
  };
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
      payload.logo_url = f.logo_url || null;
      payload.prices_include_gst = !!f.prices_include_gst;
      payload.idle_minutes = Number(f.idle_minutes);
      payload.timezone = f.timezone || "Asia/Kolkata";
      await run(supabase.from("company_settings").update(payload).eq("id", 1));
      toast.success("Company details saved");
      window.dispatchEvent(new Event("ims-company-changed"));
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
        /* @__PURE__ */ jsxs("div", { className: "img-upload", children: [
          /* @__PURE__ */ jsx("div", { className: "preview", style: { width: 110 }, children: f.logo_url ? /* @__PURE__ */ jsx("img", { src: f.logo_url, alt: "Company logo", style: { objectFit: "contain" } }) : /* @__PURE__ */ jsx(Building2, { size: 30 }) }),
          /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 6 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "row", children: [
              /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-sm", onClick: () => fileRef.current?.click(), children: [/* @__PURE__ */ jsx(Upload, {}), f.logo_url ? " Replace logo" : " Upload company logo"] }),
              f.logo_url && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-sm btn-ghost", onClick: () => setF((x) => ({ ...x, logo_url: "", _logoSize: "" })), children: "Remove" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "muted", style: { fontSize: 12 }, children: f._logoSize ? `New logo ready (${f._logoSize}) \u2014 click Save changes.` : "Shown at the top of the screen and on printouts. Auto-reduced to a few KB." })
          ] }),
          /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => {
            pickLogo(e.target.files?.[0]);
            e.target.value = "";
          } })
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
