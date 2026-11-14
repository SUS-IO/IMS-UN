import { jsx, jsxs } from "react/jsx-runtime";
import { AlertTriangle } from "lucide-react";
function SetupNeeded() {
  return /* @__PURE__ */ jsx("div", { style: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }, children: /* @__PURE__ */ jsxs("div", { className: "card card-pad", style: { maxWidth: 560 }, children: [
    /* @__PURE__ */ jsxs("div", { className: "row", style: { marginBottom: 10 }, children: [
      /* @__PURE__ */ jsx(AlertTriangle, { color: "var(--red)" }),
      /* @__PURE__ */ jsx("h2", { children: "Supabase is not connected yet" })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "muted", style: { marginBottom: 12 }, children: [
      "Open the file ",
      /* @__PURE__ */ jsx("b", { children: "ims-config.js" }),
      " in the main folder and fill in your Supabase details:"
    ] }),
    /* @__PURE__ */ jsx("pre", { style: { background: "var(--surface-2)", padding: 12, borderRadius: 8, overflow: "auto" }, children: `SUPABASE_URL: 'https://xxxx.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-key'` }),
    /* @__PURE__ */ jsx("p", { className: "muted", style: { marginTop: 12 }, children: "Save, upload the file again to GitHub, and refresh this page. Full steps are in README.md." })
  ] }) });
}
export {
  SetupNeeded as default
};
