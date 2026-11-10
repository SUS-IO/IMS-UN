import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, Moon, Sun, LogOut, KeyRound, AlertTriangle, ChevronRight } from "lucide-react";
import { NAV } from "./nav.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { supabase } from "../../lib/supabase.js";
import { useLiveStock } from "../../hooks/useLiveStock.js";
import { initials, greeting } from "../../lib/format.js";
import ChangePasswordModal from "./ChangePasswordModal.js";
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ims.theme") || "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("ims.theme", theme);
    } catch {
    }
  }, [theme]);
  return [theme, () => setTheme((t) => t === "dark" ? "light" : "dark")];
}
function useOnline() {
  const [on, setOn] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const u = () => setOn(true), d = () => setOn(false);
    window.addEventListener("online", u);
    window.addEventListener("offline", d);
    return () => {
      window.removeEventListener("online", u);
      window.removeEventListener("offline", d);
    };
  }, []);
  return on;
}
function AppShell() {
  const online = useOnline();
  const { profile, signOut, can, isAdmin } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [pw, setPw] = useState(false);
  const [low, setLow] = useState([]);
  const [theme, toggleTheme] = useTheme();
  const menuRef = useRef(null);
  const bellRef = useRef(null);
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
      if (!bellRef.current?.contains(e.target)) setBell(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const loadLow = async () => {
    if (!can("stock.view")) return;
    const { data } = await supabase.from("v_product_stock").select("product_id,code,description,total_qty,min_stock").eq("is_low", true).eq("is_active", true).limit(50);
    setLow(data || []);
  };
  useEffect(() => {
    loadLow();
  }, [profile?.id]);
  useLiveStock(loadLow);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ims.welcomed") === profile.id) return;
      sessionStorage.setItem("ims.welcomed", profile.id);
    } catch {
    }
    toast.success(`${greeting()}, ${profile.full_name.split(" ")[0]}!`, "Welcome back to IMS.");
  }, []);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.admin ? isAdmin : can(i.perm)) })).filter((g) => g.items.length);
  const current = groups.flatMap((g) => g.items).find((i) => loc.pathname.startsWith(i.to));
  return /* @__PURE__ */ jsxs("div", { className: "app", children: [
    /* @__PURE__ */ jsxs("aside", { className: `sidebar ${open ? "open" : ""}`, children: [
      /* @__PURE__ */ jsx("div", { className: "sidebar-brand", children: /* @__PURE__ */ jsx("div", { className: "logo-chip", children: /* @__PURE__ */ jsx("img", { src: "img/logo.png", alt: "IMS - Inventory Management Systems" }) }) }),
      /* @__PURE__ */ jsx("nav", { className: "sidebar-nav", children: groups.map((g) => /* @__PURE__ */ jsxs("div", { className: "nav-group", children: [
        /* @__PURE__ */ jsx("div", { className: "nav-group-title", children: g.title }),
        g.items.map((i) => /* @__PURE__ */ jsxs(NavLink, { to: i.to, className: ({ isActive }) => `nav-link ${isActive ? "active" : ""}`, children: [
          /* @__PURE__ */ jsx(i.icon, {}),
          i.label,
          i.badge === "low" && low.length > 0 && /* @__PURE__ */ jsx("span", { className: "count", children: low.length })
        ] }, i.to))
      ] }, g.title)) }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-foot", children: [
        /* @__PURE__ */ jsx("span", { className: "live-dot" }),
        " Live stock \xB7 synced"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: `backdrop ${open ? "show" : ""}`, onClick: () => setOpen(false) }),
    /* @__PURE__ */ jsxs("div", { className: "main", children: [
      /* @__PURE__ */ jsxs("header", { className: "topbar no-print", children: [
        /* @__PURE__ */ jsx("button", { className: "icon-btn menu-btn", onClick: () => setOpen(true), "aria-label": "Open menu", children: /* @__PURE__ */ jsx(Menu, {}) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "page-crumb", children: current?.label || "IMS" }),
          /* @__PURE__ */ jsx("div", { className: "company", children: profile.company_name })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grow" }),
        can("stock.view") && /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, ref: bellRef, children: [
          /* @__PURE__ */ jsxs("button", { className: "icon-btn", onClick: () => setBell((b) => !b), "aria-label": "Low stock alerts", children: [
            /* @__PURE__ */ jsx(Bell, {}),
            low.length > 0 && /* @__PURE__ */ jsx("span", { className: "pip", children: low.length })
          ] }),
          bell && /* @__PURE__ */ jsxs("div", { className: "menu", style: { minWidth: 300 }, children: [
            /* @__PURE__ */ jsxs("div", { className: "menu-head", children: [
              /* @__PURE__ */ jsx("b", { children: "Low stock alerts" }),
              /* @__PURE__ */ jsx("span", { className: "muted", children: low.length ? "At or below minimum level" : "All products are above minimum" })
            ] }),
            low.slice(0, 8).map((p) => /* @__PURE__ */ jsxs("button", { className: "menu-item", onClick: () => {
              setBell(false);
              nav("/stock?low=1");
            }, children: [
              /* @__PURE__ */ jsx(AlertTriangle, { style: { color: "var(--danger)" } }),
              /* @__PURE__ */ jsxs("span", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsx("b", { children: p.code }),
                /* @__PURE__ */ jsx("span", { className: "sub-text", children: p.description })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "badge danger", children: [
                p.total_qty,
                "/",
                p.min_stock
              ] })
            ] }, p.product_id)),
            low.length > 0 && /* @__PURE__ */ jsxs("button", { className: "menu-item", onClick: () => {
              setBell(false);
              nav("/stock?low=1");
            }, children: [
              "View all ",
              /* @__PURE__ */ jsx(ChevronRight, { style: { marginLeft: "auto" } })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "icon-btn", onClick: toggleTheme, "aria-label": "Toggle dark mode", title: "Light / dark", children: theme === "dark" ? /* @__PURE__ */ jsx(Sun, {}) : /* @__PURE__ */ jsx(Moon, {}) }),
        /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, ref: menuRef, children: [
          /* @__PURE__ */ jsxs("button", { className: "user-btn", onClick: () => setMenu((m) => !m), children: [
            /* @__PURE__ */ jsx("span", { className: "avatar", children: initials(profile.full_name) }),
            /* @__PURE__ */ jsxs("span", { className: "utext", children: [
              /* @__PURE__ */ jsx("div", { className: "uname", children: profile.full_name }),
              /* @__PURE__ */ jsx("div", { className: "urole", children: profile.user_type === "admin" ? "Administrator" : "Staff" })
            ] })
          ] }),
          menu && /* @__PURE__ */ jsxs("div", { className: "menu", children: [
            /* @__PURE__ */ jsxs("div", { className: "menu-head", children: [
              /* @__PURE__ */ jsx("b", { children: profile.full_name }),
              /* @__PURE__ */ jsxs("span", { className: "muted", children: [
                "User ID: ",
                profile.user_code
              ] })
            ] }),
            /* @__PURE__ */ jsxs("button", { className: "menu-item", onClick: () => {
              setMenu(false);
              setPw(true);
            }, children: [
              /* @__PURE__ */ jsx(KeyRound, {}),
              "Change password"
            ] }),
            /* @__PURE__ */ jsx("hr", {}),
            /* @__PURE__ */ jsxs("button", { className: "menu-item", onClick: signOut, children: [
              /* @__PURE__ */ jsx(LogOut, {}),
              "Sign out"
            ] })
          ] })
        ] })
      ] }),
      !online && /* @__PURE__ */ jsx("div", { role: "alert", style: { background: "#b42318", color: "#fff", textAlign: "center", padding: "6px 12px", fontSize: 13 }, children: "You are offline \u2014 changes cannot be saved until the connection returns." }),
      /* @__PURE__ */ jsx("main", { className: "content", children: /* @__PURE__ */ jsx(Outlet, {}) })
    ] }),
    /* @__PURE__ */ jsx(ChangePasswordModal, { open: pw || profile.must_change_password, forced: profile.must_change_password, onClose: () => setPw(false) })
  ] });
}
export {
  AppShell as default
};
