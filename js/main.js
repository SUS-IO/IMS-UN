import { jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
try {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("ims.theme") || "light");
} catch {
}
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx(StrictMode, { children: /* @__PURE__ */ jsx(App, {}) }));
