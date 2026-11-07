import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MapPin, Plus, Pencil, Power } from "lucide-react";
import Modal from "../../components/ui/Modal.js";
import { Badge, Field, Alert } from "../../components/ui/Bits.js";
import { supabase } from "../../lib/supabase.js";
import { run, errText } from "../../lib/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
const EMPTY = { name: "", contact_person: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", pincode: "", gstin: "", is_active: true };
function LocationsModal({ customer, onClose }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data: rows, loading, reload } = useAsync(
    () => customer ? run(supabase.from("customer_locations").select("*").eq("customer_id", customer.id).order("name")) : [],
    [customer?.id],
    { initial: [] }
  );
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name?.trim()) return setErr("Location name is required.");
    setBusy(true);
    try {
      const { id, created_at, created_by, created_by_name, updated_at, updated_by, updated_by_name, ...rest } = form;
      const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]));
      if (id) await run(supabase.from("customer_locations").update(clean).eq("id", id));
      else await run(supabase.from("customer_locations").insert({ ...clean, customer_id: customer.id }));
      toast.success("Location saved");
      setForm(null);
      reload(true);
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (r) => {
    try {
      await run(supabase.from("customer_locations").update({ is_active: !r.is_active }).eq("id", r.id));
      reload(true);
    } catch (x) {
      toast.error("Failed", errText(x));
    }
  };
  const canEdit = can("customer.edit");
  const canAdd = can("customer.create");
  return /* @__PURE__ */ jsx(
    Modal,
    {
      open: !!customer,
      onClose,
      size: "lg",
      title: `Locations \u2014 ${customer?.name || ""}`,
      icon: MapPin,
      footer: /* @__PURE__ */ jsx("button", { className: "btn", onClick: onClose, children: "Close" }),
      children: !form ? /* @__PURE__ */ jsxs("div", { className: "stack", children: [
        canAdd && /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => {
          setErr("");
          setForm({ ...EMPTY });
        }, children: [
          /* @__PURE__ */ jsx(Plus, {}),
          " Add location"
        ] }) }),
        loading ? /* @__PURE__ */ jsx("div", { className: "page-loader", children: /* @__PURE__ */ jsx("span", { className: "spinner" }) }) : rows.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty", children: [
          /* @__PURE__ */ jsx(MapPin, {}),
          /* @__PURE__ */ jsx("b", { children: "No locations yet" }),
          /* @__PURE__ */ jsx("span", { children: "Add at least one location \u2014 outward entries need it." })
        ] }) : rows.map((r) => /* @__PURE__ */ jsxs("div", { className: "card card-pad row", style: { opacity: r.is_active ? 1 : 0.55 }, children: [
          /* @__PURE__ */ jsxs("div", { className: "grow", children: [
            /* @__PURE__ */ jsx("b", { children: r.name }),
            " ",
            /* @__PURE__ */ jsx(Badge, { tone: r.is_active ? "ok" : "muted", children: r.is_active ? "Active" : "Inactive" }),
            /* @__PURE__ */ jsx("div", { className: "muted", children: [r.address_line1, r.address_line2, r.city, r.state, r.pincode].filter(Boolean).join(", ") || "No address" }),
            /* @__PURE__ */ jsx("div", { className: "muted", children: [r.contact_person, r.phone, r.gstin && `GSTIN ${r.gstin}`].filter(Boolean).join(" \xB7 ") })
          ] }),
          canEdit && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: () => {
              setErr("");
              setForm({ ...r });
            }, children: [
              /* @__PURE__ */ jsx(Pencil, {}),
              " Edit"
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-icon", onClick: () => toggle(r), title: "Activate / deactivate", children: /* @__PURE__ */ jsx(Power, {}) })
          ] })
        ] }, r.id))
      ] }) : /* @__PURE__ */ jsxs("form", { className: "stack", onSubmit: save, children: [
        err && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: err }),
        /* @__PURE__ */ jsxs("div", { className: "form-grid", children: [
          /* @__PURE__ */ jsx(Field, { label: "Location name", required: true, className: "span-2", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. Chennai Showroom", autoFocus: true }) }),
          /* @__PURE__ */ jsx(Field, { label: "Contact person", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.contact_person || "", onChange: (e) => set("contact_person", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "Phone", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.phone || "", onChange: (e) => set("phone", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "Address line 1", className: "span-2", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.address_line1 || "", onChange: (e) => set("address_line1", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "Address line 2", className: "span-2", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.address_line2 || "", onChange: (e) => set("address_line2", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "City", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.city || "", onChange: (e) => set("city", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "State", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.state || "", onChange: (e) => set("state", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "Pincode", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.pincode || "", onChange: (e) => set("pincode", e.target.value) }) }),
          /* @__PURE__ */ jsx(Field, { label: "GSTIN (if different)", children: /* @__PURE__ */ jsx("input", { className: "input", value: form.gstin || "", onChange: (e) => set("gstin", e.target.value.toUpperCase()) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "row", style: { justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn", onClick: () => setForm(null), children: "Back" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-primary", disabled: busy, children: busy ? "Saving\u2026" : "Save location" })
        ] })
      ] })
    }
  );
}
export {
  LocationsModal as default
};
