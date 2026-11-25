import { jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Package } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { IMAGE_BUCKET } from "../../config.js";
import { errText } from "../../lib/api.js";
import { compressImage, kb } from "../../lib/image.js";
function ImageField({ value, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [size, setSize] = useState("");
  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please choose an image file.");
    setBusy(true);
    setErr("");
    try {
      const blob = await compressImage(file, { maxDim: 800, maxKB: 60 });
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      onChange(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
      setSize(kb(blob));
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "img-upload", children: [
      /* @__PURE__ */ jsx("div", { className: "preview", children: busy ? /* @__PURE__ */ jsx(Loader2, { style: { animation: "spin .7s linear infinite" } }) : value ? /* @__PURE__ */ jsx("img", { src: value, alt: "Product" }) : /* @__PURE__ */ jsx(Package, { size: 30 }) }),
      /* @__PURE__ */ jsxs("div", { className: "stack", style: { gap: 6 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "row", children: [
          /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-sm", onClick: () => input.current?.click(), disabled: busy, children: [
            /* @__PURE__ */ jsx(ImagePlus, {}),
            " ",
            value ? "Replace photo" : "Upload photo"
          ] }),
          value && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-sm btn-ghost", onClick: () => onChange(""), children: "Remove" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "muted", style: { fontSize: 12 }, children: size ? `Saved as ${size} (auto-reduced).` : "Photos are auto-reduced to a few KB. Customers see this in their stock view." })
      ] }),
      /* @__PURE__ */ jsx("input", { ref: input, type: "file", accept: "image/*", hidden: true, onChange: (e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      } })
    ] }),
    err && /* @__PURE__ */ jsx("span", { className: "err", style: { color: "var(--danger)", fontSize: 12 }, children: err })
  ] });
}
export {
  ImageField as default
};
