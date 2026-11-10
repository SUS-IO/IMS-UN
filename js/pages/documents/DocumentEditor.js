import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Send, Trash2, Timer, Lock, FileClock, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { fetchAll, rpc, run, toAppError } from "../../lib/api.js";
import { LOCK_BEAT_MS } from "../../config.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { useDialog } from "../../context/DialogContext.js";
import { SUPABASE_URL, SUPABASE_KEY } from "../../config.js";
import { useIdleTimer } from "../../hooks/useIdleTimer.js";
import { useLiveStock } from "../../hooks/useLiveStock.js";
import Modal from "../../components/ui/Modal.js";
import SearchSelect from "../../components/ui/SearchSelect.js";
import { Field, PageHeader, PageLoader, Alert } from "../../components/ui/Bits.js";
import { LINE_COMPONENT, LINE_HEADS } from "./LineEditors.js";
import { qtyPcs } from "./LineParts.js";
import { calcLine, sumLines } from "../../lib/calc.js";
import { money, todayISO, int, ageLabel } from "../../lib/format.js";
let seq = 0;
const newLine = () => ({ key: `n${++seq}`, product_id: "", rack_id: "", lot_id: "", source_line_id: "", mrp: "", gst_pct: "", sale_gst_pct: "", rate: "", discount_pct: 0, qtyInput: "", unit: "PCS" });
function DocumentEditor({ cfg }) {
  const { id: draftId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const dlg = useDialog();
  const { profile } = useAuth();
  const T = cfg.type;
  const isVendor = cfg.partyKind === "vendor";
  const listPath = `/${cfg.path}`;
  const [phase, setPhase] = useState("starting");
  const [blockedBy, setBlockedBy] = useState("");
  const [err, setErr] = useState("");
  const [docId, setDocId] = useState(draftId || null);
  const [head, setHead] = useState({ doc_date: todayISO(), vendor_id: "", customer_id: "", location_id: "", reference_no: "", reason: "", notes: "" });
  const [lines, setLines] = useState([newLine()]);
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(null);
  const [left, setLeft] = useState(null);
  const [look, setLook] = useState(null);
  const [custCodeMap, setCustCodeMap] = useState({});
  const [stockLots, setStockLots] = useState([]);
  const [returnable, setReturnable] = useState([]);
  const holding = useRef(false);
  const finished = useRef(false);
  const idleMs = (profile.idle_minutes || 5) * 6e4;
  useEffect(() => {
    (async () => {
      try {
        const [products, racks, vendors, customers] = await Promise.all([
          fetchAll(() => supabase.from("products").select("id,code,description,uom,pack_size,default_gst,is_active,brand").order("code")),
          fetchAll(() => supabase.from("racks").select("id,code,description,is_active").order("code")),
          isVendor ? fetchAll(() => supabase.from("vendors").select("id,code,name,is_active").order("name")) : [],
          !isVendor ? fetchAll(() => supabase.from("customers").select("id,code,name,is_active").order("name")) : []
        ]);
        setLook({ products, racks, vendors, customers });
      } catch (e) {
        setErr(toAppError(e).message);
        setPhase("error");
      }
    })();
  }, [isVendor]);
  const productsById = useMemo(() => Object.fromEntries((look?.products || []).map((p) => [p.id, p])), [look]);
  const productOptions = useMemo(() => (look?.products || []).filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.code, sub: p.description, keywords: p.brand || "" })), [look]);
  const rackOptions = useMemo(() => (look?.racks || []).filter((r) => r.is_active).map((r) => ({ value: r.id, label: r.code, sub: r.description })), [look]);
  const partyOptions = useMemo(() => (isVendor ? look?.vendors : look?.customers || []).filter?.((x) => x.is_active).map((x) => ({ value: x.id, label: x.name, sub: x.code, keywords: x.code })) || [], [look, isVendor]);
  const [locations, setLocations] = useState([]);
  useEffect(() => {
    if (isVendor || !head.customer_id) {
      setLocations([]);
      setCustCodeMap({});
      return;
    }
    (async () => {
      try {
        const [l, m] = await Promise.all([
          run(supabase.from("customer_locations").select("id,name,city,is_active").eq("customer_id", head.customer_id).order("name")),
          fetchAll(() => supabase.from("customer_product_codes").select("product_id,customer_code").eq("customer_id", head.customer_id).eq("is_active", true))
        ]);
        setLocations(l);
        setCustCodeMap(Object.fromEntries(m.map((x) => [x.product_id, x.customer_code])));
      } catch {
      }
    })();
  }, [head.customer_id, isVendor]);
  const locationOptions = useMemo(() => locations.filter((l) => l.is_active).map((l) => ({ value: l.id, label: l.name, sub: l.city })), [locations]);
  const loadStock = useCallback(async () => {
    try {
      if (T === "OUTWARD" || T === "VENDOR_RETURN") setStockLots(await fetchAll(() => supabase.from("v_stock_lots").select("*").gt("qty_on_hand", 0).order("received_at")));
      if (T === "CUSTOMER_RETURN" && head.customer_id) setReturnable(await fetchAll(() => supabase.from("v_outward_returnable").select("*").eq("customer_id", head.customer_id).gt("remaining_qty", 0).order("doc_date", { ascending: false })));
    } catch {
    }
  }, [T, head.customer_id]);
  useEffect(() => {
    if (phase === "ready") loadStock();
  }, [phase, loadStock]);
  useLiveStock(() => {
    if (phase === "ready") loadStock();
  }, { pollMs: 45e3 });
  const variantsOf = useCallback((pid) => {
    const m = /* @__PURE__ */ new Map();
    for (const l of stockLots) {
      if (l.product_id !== pid) continue;
      const key = `${Number(l.mrp)}|${Number(l.gst_pct)}`;
      const v = m.get(key) || { key, mrp: Number(l.mrp), gst_pct: Number(l.gst_pct), qty: 0, oldest: 0, racks: /* @__PURE__ */ new Set() };
      v.qty += l.qty_on_hand;
      v.oldest = Math.max(v.oldest, l.age_days);
      v.racks.add(l.rack_code);
      m.set(key, v);
    }
    return [...m.values()].map((v) => ({ ...v, racks: [...v.racks].sort().join(", ") })).sort((a, b) => a.mrp - b.mrp || a.gst_pct - b.gst_pct);
  }, [stockLots]);
  const stockProductOptions = useMemo(() => {
    const qty = /* @__PURE__ */ new Map();
    stockLots.forEach((l) => qty.set(l.product_id, (qty.get(l.product_id) || 0) + l.qty_on_hand));
    return productOptions.filter((o) => qty.has(o.value)).map((o) => ({ ...o, sub: `${o.sub} \xB7 ${int(qty.get(o.value))} pcs in stock` }));
  }, [productOptions, stockLots]);
  const vendorLots = useMemo(() => stockLots.filter((l) => l.vendor_id === head.vendor_id), [stockLots, head.vendor_id]);
  const lotsById = useMemo(() => Object.fromEntries(stockLots.map((l) => [l.id, l])), [stockLots]);
  const lotOptions = useMemo(() => vendorLots.map((l) => ({
    value: l.id,
    label: `${l.product_code} \xB7 MRP ${money(l.mrp)} \xB7 GST ${Number(l.gst_pct)}%`,
    sub: `${l.product_description} \xB7 Rack ${l.rack_code} \xB7 ${int(l.qty_on_hand)} pcs \xB7 ${l.inward_doc_no} (${ageLabel(l.age_days)})`,
    keywords: l.product_description
  })), [vendorLots]);
  const srcById = useMemo(() => Object.fromEntries(returnable.map((r) => [r.line_id, r])), [returnable]);
  const srcOptions = useMemo(() => returnable.map((r) => ({
    value: r.line_id,
    label: `${r.doc_no} \xB7 ${r.product_code} \xB7 MRP ${money(r.mrp)}`,
    sub: `${r.product_description} \xB7 sold ${int(r.qty)} \xB7 returnable ${int(r.remaining_qty)}`,
    keywords: r.product_description
  })), [returnable]);
  const ctx = useMemo(
    () => ({
      productsById,
      productOptions,
      rackOptions,
      stockProductOptions,
      variantsOf,
      custCode: custCodeMap,
      inclusive: profile.prices_include_gst,
      lotsById,
      lotOptions,
      vendorChosen: !!head.vendor_id,
      srcById,
      srcOptions,
      customerChosen: !!head.customer_id
    }),
    [productsById, productOptions, rackOptions, stockProductOptions, variantsOf, custCodeMap, profile.prices_include_gst, lotsById, lotOptions, head.vendor_id, srcById, srcOptions, head.customer_id]
  );
  useEffect(() => {
    if (!look) return void 0;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        await rpc("acquire_lock", { p_type: T, p_doc: draftId || null });
        holding.current = true;
        if (draftId) {
          const [d, ls] = await Promise.all([
            run(supabase.from("documents").select("*").eq("id", draftId).single()),
            run(supabase.from("document_lines").select("*").eq("document_id", draftId).order("line_no"))
          ]);
          if (cancelled) return;
          setHead({ doc_date: d.doc_date, vendor_id: d.vendor_id || "", customer_id: d.customer_id || "", location_id: d.location_id || "", reference_no: d.reference_no || "", reason: d.reason || "", notes: d.notes || "" });
          setLines(ls.length ? ls.map((l) => ({
            key: l.id,
            product_id: l.product_id,
            rack_id: l.rack_id || "",
            lot_id: l.lot_id || "",
            source_line_id: l.source_line_id || "",
            mrp: l.mrp ?? "",
            gst_pct: l.gst_pct ?? "",
            sale_gst_pct: l.sale_gst_pct ?? "",
            rate: l.rate ?? "",
            discount_pct: Number(l.discount_pct) || 0,
            qtyInput: String(l.qty),
            unit: "PCS"
          })) : [newLine()]);
        }
        if (!cancelled) setPhase("ready");
      } catch (e) {
        const a = toAppError(e);
        if (cancelled) return;
        if (a.code === "LOCKED") {
          setBlockedBy(a.message);
          setPhase("blocked");
        } else {
          setErr(a.message);
          setPhase("error");
        }
      }
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (holding.current) {
        holding.current = false;
        supabase.rpc("release_lock", { p_type: T }).then(() => {
        }, () => {
        });
      }
    };
  }, [look, T, draftId]);
  useEffect(() => {
    const onHide = async () => {
      if (!holding.current) return;
      try {
        const { data } = await supabase.auth.getSession();
        const tok = data?.session?.access_token;
        if (!tok) return;
        fetch(`${SUPABASE_URL}/rest/v1/rpc/release_lock`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${tok}` }, body: JSON.stringify({ p_type: T }) });
      } catch {
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [T]);
  useEffect(() => {
    if (phase !== "ready") return void 0;
    const t = setInterval(async () => {
      if (finished.current) return;
      const { data, error } = await supabase.rpc("heartbeat_lock", { p_type: T });
      if (!error && data === false) lostLock();
    }, LOCK_BEAT_MS);
    return () => clearInterval(t);
  }, [phase, T]);
  useEffect(() => {
    if (!dirty) return void 0;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  const lostLock = () => {
    if (finished.current) return;
    finished.current = true;
    holding.current = false;
    setNotice({ tone: "warn", title: "Another user has taken over", text: "You were away for too long, so someone else started working on this module. Your last saved draft (if any) is safe in the list." });
  };
  const packOf = (l) => (T === "VENDOR_RETURN" ? lotsById[l.lot_id]?.pack_size : T === "CUSTOMER_RETURN" ? srcById[l.source_line_id]?.pack_size : productsById[l.product_id]?.pack_size) || 1;
  const lineAmounts = (l) => {
    const qty = qtyPcs(l, packOf(l));
    if (T === "INWARD") return calcLine({ kind: "cost", qty, pack: packOf(l), rate: l.rate, gst: l.gst_pct });
    if (T === "OUTWARD") return calcLine({ kind: "sale", qty, pack: packOf(l), rate: l.rate, disc: l.discount_pct, gst: l.sale_gst_pct, inclusive: ctx.inclusive });
    if (T === "VENDOR_RETURN") {
      const x = lotsById[l.lot_id];
      return x && x.cost !== null ? calcLine({ kind: "cost", qty, pack: x.pack_size, rate: x.cost, gst: x.gst_pct }) : { taxable: 0, gstAmount: 0, total: 0 };
    }
    const s = srcById[l.source_line_id];
    return s ? calcLine({ kind: "sale", qty, pack: s.pack_size, rate: s.rate, disc: s.discount_pct, gst: s.sale_gst_pct, inclusive: ctx.inclusive }) : { taxable: 0, gstAmount: 0, total: 0 };
  };
  const totals = sumLines(lines.map(lineAmounts));
  const isBlank = (l) => !l.product_id && !l.lot_id && !l.source_line_id;
  const lineIssue = (l, n) => {
    const q = qtyPcs(l, packOf(l));
    const p = `Line ${n}: `;
    if (T === "VENDOR_RETURN") {
      if (!l.lot_id) return p + "select the lot to return.";
      if (!q) return p + "enter a quantity.";
      if (q > lotsById[l.lot_id]?.qty_on_hand) return p + "quantity is more than the lot holds.";
      return "";
    }
    if (T === "CUSTOMER_RETURN") {
      if (!l.source_line_id) return p + "select the item being returned.";
      if (!q) return p + "enter a quantity.";
      if (q > srcById[l.source_line_id]?.remaining_qty) return p + "quantity is more than can be returned.";
      return "";
    }
    if (!l.product_id) return p + "select a product.";
    if (!q) return p + "enter a quantity.";
    if (T === "INWARD") {
      if (!l.rack_id) return p + "choose the rack / location.";
      if (l.mrp === "" || Number(l.mrp) < 0) return p + "enter the MRP.";
      if (l.rate === "" || Number(l.rate) < 0) return p + "enter the cost price.";
      if (l.gst_pct === "") return p + "choose the GST %.";
    } else {
      if (l.mrp === "" || l.gst_pct === "") return p + "select the MRP / GST stock to sell from.";
      if (l.rate === "" || Number(l.rate) < 0) return p + "enter the selling rate.";
      if (Number(l.rate) > Number(l.mrp)) return p + "rate cannot be above MRP.";
      if (l.sale_gst_pct === "") return p + "choose the sale GST %.";
      const v = variantsOf(l.product_id).find((x) => x.key === `${Number(l.mrp)}|${Number(l.gst_pct)}`);
      if (!v || q > v.qty) return p + "not enough stock.";
    }
    return "";
  };
  const payload = (onlyValid) => {
    const usable = lines.filter((l) => !isBlank(l) && (!onlyValid || !lineIssue(l, 0).replace(/^Line 0: /, "")));
    return {
      id: docId,
      doc_type: T,
      doc_date: head.doc_date,
      vendor_id: head.vendor_id || null,
      customer_id: head.customer_id || null,
      location_id: head.location_id || null,
      reference_no: head.reference_no,
      reason: head.reason,
      notes: head.notes,
      lines: usable.map((l) => {
        const q = qtyPcs(l, packOf(l));
        const base = { qty: q };
        if (T === "INWARD") return { ...base, product_id: l.product_id, rack_id: l.rack_id, mrp: Number(l.mrp), rate: Number(l.rate), gst_pct: Number(l.gst_pct) };
        if (T === "OUTWARD") return { ...base, product_id: l.product_id, mrp: Number(l.mrp), gst_pct: Number(l.gst_pct), sale_gst_pct: Number(l.sale_gst_pct), rate: Number(l.rate), discount_pct: Number(l.discount_pct) || 0 };
        if (T === "VENDOR_RETURN") return { ...base, lot_id: l.lot_id };
        return { ...base, source_line_id: l.source_line_id };
      })
    };
  };
  const persist = async (onlyValid = false) => {
    const id = await rpc("save_document", { p: payload(onlyValid) });
    setDocId(id);
    setDirty(false);
    return id;
  };
  const handleErr = (e) => {
    const a = toAppError(e);
    if (a.code === "LOCK_LOST") lostLock();
    else if (a.code === "LOCKED") lostLock();
    else toast.error("Could not complete", a.message);
  };
  const validateHead = () => {
    if (!head.doc_date) return "Choose the document date.";
    if (isVendor && !head.vendor_id) return "Select the vendor.";
    if (!isVendor && !head.customer_id) return "Select the customer.";
    if (T === "OUTWARD" && !head.location_id) return "Select the customer location.";
    if (cfg.refRequired && !head.reference_no.trim()) return `Enter the ${cfg.refLabel.toLowerCase()}.`;
    if (cfg.showReason && !head.reason.trim()) return "Enter the reason for the return.";
    return "";
  };
  const saveDraft = async () => {
    setBusy("save");
    try {
      const skipped = lines.filter((l, i) => !isBlank(l) && lineIssue(l, i + 1)).length;
      await persist(true);
      toast.success("Draft saved", skipped ? `${skipped} incomplete line(s) were left out \u2014 add them again when ready.` : "You can continue later from the list.");
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy("");
    }
  };
  const post = async () => {
    const he = validateHead();
    if (he) return toast.warn("Please complete the form", he);
    const real = lines.filter((l) => !isBlank(l));
    if (!real.length) return toast.warn("Add at least one line");
    for (let i = 0; i < real.length; i++) {
      const m = lineIssue(real[i], i + 1);
      if (m) return toast.warn("Please fix the lines", m);
    }
    const ok = await dlg.confirm({
      title: `Post this ${cfg.title.toLowerCase()}?`,
      confirmText: "Post & update stock",
      message: `Total ${money(totals.total)}. Stock will be updated immediately. A posted entry cannot be edited or deleted \u2014 it can only be reversed step by step.`
    });
    if (!ok) return;
    setBusy("post");
    try {
      const id = await persist(false);
      const no = await rpc("post_document", { p_id: id });
      finished.current = true;
      holding.current = false;
      setDirty(false);
      toast.success(`${no} posted`, "Stock updated.");
      nav(`${listPath}/${id}`, { replace: true });
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy("");
    }
  };
  const discard = async () => {
    const ok = await dlg.confirm({ title: "Discard this draft?", message: "The draft is closed and stays in history as \u201CCancelled\u201D. Nothing is deleted.", confirmText: "Discard draft", danger: true });
    if (!ok) return;
    setBusy("discard");
    try {
      if (docId) await rpc("cancel_draft", { p_id: docId });
      finished.current = true;
      holding.current = false;
      setDirty(false);
      toast.info("Draft discarded");
      nav(listPath, { replace: true });
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy("");
    }
  };
  useIdleTimer({ ms: idleMs, enabled: phase === "ready" && !notice, onTick: setLeft, onIdle: async () => {
    if (finished.current) return;
    finished.current = true;
    let saved = false;
    const hasContent = lines.some((l) => !isBlank(l)) || head.reference_no || head.vendor_id || head.customer_id;
    if (hasContent) {
      try {
        await persist(true);
        saved = true;
      } catch {
      }
    }
    if (holding.current) {
      holding.current = false;
      await supabase.rpc("release_lock", { p_type: T }).catch(() => {
      });
    }
    setNotice({
      tone: "warn",
      title: "Saved as draft \u2014 you were idle",
      saved,
      text: saved ? `You were inactive for ${profile.idle_minutes || 5} minutes, so your work was saved as a draft and the ${cfg.title.toLowerCase()} screen was released. You or any colleague can continue it from the list.` : `You were inactive for ${profile.idle_minutes || 5} minutes, so the ${cfg.title.toLowerCase()} screen was released for others.`
    });
  } });
  const setH = (patch) => {
    setHead((h) => ({ ...h, ...patch }));
    setDirty(true);
  };
  const setLine = (key, patch) => {
    setLines((ls) => ls.map((l) => l.key === key ? { ...l, ...patch } : l));
    setDirty(true);
  };
  const removeLine = (key) => {
    setLines((ls) => ls.length > 1 ? ls.filter((l) => l.key !== key) : [newLine()]);
    setDirty(true);
  };
  const addLine = () => {
    setLines((ls) => [...ls, newLine()]);
    setDirty(true);
  };
  const changeParty = async (key, v) => {
    if ((T === "VENDOR_RETURN" || T === "CUSTOMER_RETURN") && lines.some((l) => !isBlank(l)) && v !== head[key]) {
      const ok = await dlg.confirm({ title: "Change party?", message: "The lines already added belong to the previous party and will be cleared.", confirmText: "Clear lines & change" });
      if (!ok) return;
      setLines([newLine()]);
    }
    setH({ [key]: v, ...key === "customer_id" ? { location_id: "" } : {} });
  };
  const Line = LINE_COMPONENT[T];
  if (phase === "starting" || !look) return /* @__PURE__ */ jsx(PageLoader, { text: "Opening\u2026" });
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: `${docId ? "Continue" : "New"} ${cfg.long.toLowerCase()}`,
        subtitle: cfg.blurb,
        actions: /* @__PURE__ */ jsxs("button", { className: "btn", onClick: () => nav(listPath), children: [
          /* @__PURE__ */ jsx(ArrowLeft, {}),
          " Back to list"
        ] })
      }
    ),
    phase === "error" && /* @__PURE__ */ jsx(Alert, { tone: "danger", children: err }),
    /* @__PURE__ */ jsxs(
      Modal,
      {
        open: phase === "blocked",
        dismissable: false,
        size: "sm",
        title: `${cfg.title} is in use`,
        icon: Lock,
        tone: "warn",
        footer: /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => nav(listPath, { replace: true }), children: "Back to list" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-primary", onClick: () => window.location.reload(), children: "Try again" })
        ] }),
        children: [
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("b", { children: blockedBy }),
            " is working on ",
            cfg.title.toLowerCase(),
            " right now. To keep records clean only one person can use this screen at a time."
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "muted", style: { marginTop: 8 }, children: [
            "If they stay idle for ",
            profile.idle_minutes || 5,
            " minutes their work is saved as a draft and the screen is released."
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!notice,
        dismissable: false,
        size: "sm",
        title: notice?.title || "",
        icon: notice?.saved ? FileClock : Timer,
        tone: "warn",
        footer: /* @__PURE__ */ jsx("button", { className: "btn btn-primary", onClick: () => nav(listPath, { replace: true }), children: "Go to list" }),
        children: /* @__PURE__ */ jsx("p", { children: notice?.text })
      }
    ),
    phase === "ready" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "doc-status-bar", children: [
        /* @__PURE__ */ jsxs("span", { className: "badge warn", children: [
          /* @__PURE__ */ jsx("i", { className: "dot" }),
          " ",
          docId ? "Draft" : "New entry"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "muted", children: "You have exclusive use of this screen." }),
        /* @__PURE__ */ jsxs("span", { className: `timer ${left !== null && left <= 60 ? "warn" : ""}`, children: [
          /* @__PURE__ */ jsx(Timer, { size: 15 }),
          left !== null && left <= 60 ? `Auto-saving as draft in ${left}s` : `Auto-saves as draft after ${profile.idle_minutes || 5} min idle`
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "card doc-head-card", children: /* @__PURE__ */ jsxs("div", { className: "form-grid cols-4", children: [
        /* @__PURE__ */ jsx(Field, { label: isVendor ? "Vendor" : "Customer", required: true, className: "span-2", children: /* @__PURE__ */ jsx(SearchSelect, { value: head[isVendor ? "vendor_id" : "customer_id"], options: partyOptions, placeholder: `Select ${isVendor ? "vendor" : "customer"}\u2026`, onChange: (v) => changeParty(isVendor ? "vendor_id" : "customer_id", v) }) }),
        !isVendor && /* @__PURE__ */ jsx(Field, { label: "Location", required: T === "OUTWARD", className: "span-2", children: /* @__PURE__ */ jsx(SearchSelect, { value: head.location_id, options: locationOptions, disabled: !head.customer_id, placeholder: head.customer_id ? locationOptions.length ? "Select location\u2026" : "No locations \u2014 add in Customers" : "Choose a customer first", onChange: (v) => setH({ location_id: v }) }) }),
        /* @__PURE__ */ jsx(Field, { label: cfg.refLabel, required: cfg.refRequired, children: /* @__PURE__ */ jsx("input", { className: "input", value: head.reference_no, onChange: (e) => setH({ reference_no: e.target.value }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Date", required: true, children: /* @__PURE__ */ jsx("input", { className: "input", type: "date", max: todayISO(), value: head.doc_date, onChange: (e) => setH({ doc_date: e.target.value }) }) }),
        cfg.showReason && /* @__PURE__ */ jsx(Field, { label: "Reason", required: true, className: "span-2", children: /* @__PURE__ */ jsx("input", { className: "input", value: head.reason, onChange: (e) => setH({ reason: e.target.value }), placeholder: "e.g. damaged in transit / wrong part" }) }),
        /* @__PURE__ */ jsx(Field, { label: "Notes", className: cfg.showReason ? "span-2" : "span-2", children: /* @__PURE__ */ jsx("input", { className: "input", value: head.notes, onChange: (e) => setH({ notes: e.target.value }) }) })
      ] }) }),
      T === "OUTWARD" && head.customer_id && Object.keys(custCodeMap).length === 0 && /* @__PURE__ */ jsx("div", { style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxs(Alert, { tone: "info", children: [
        "This customer has no code mapping yet. Add it under ",
        /* @__PURE__ */ jsx("b", { children: "Customer Codes" }),
        " to print their own item code on outwards."
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 14 }, children: [
        /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
          /* @__PURE__ */ jsx("h3", { children: "Items" }),
          /* @__PURE__ */ jsxs("button", { className: "btn btn-sm", onClick: addLine, children: [
            /* @__PURE__ */ jsx(Plus, {}),
            " Add line"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "lines-wrap", children: /* @__PURE__ */ jsxs("table", { className: "lines", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: LINE_HEADS[T].map((h, i) => /* @__PURE__ */ jsx("th", { className: ["Amount", "Credit"].includes(h) || /MRP|Cost|Rate|Disc|GST/.test(h) ? "num" : "", children: h }, i)) }) }),
          /* @__PURE__ */ jsx("tbody", { children: lines.map((l, i) => /* @__PURE__ */ jsx(Line, { line: l, idx: i, ctx, set: (p) => setLine(l.key, p), remove: () => removeLine(l.key) }, l.key)) })
        ] }) }),
        /* @__PURE__ */ jsx("div", { style: { padding: 14 }, children: /* @__PURE__ */ jsxs("button", { className: "btn btn-sm btn-ghost", onClick: addLine, children: [
          /* @__PURE__ */ jsx(Plus, {}),
          " Add another line"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card totals", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "muted", children: "Taxable value" }),
          /* @__PURE__ */ jsx("b", { children: money(totals.taxable) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "muted", children: "GST" }),
          /* @__PURE__ */ jsx("b", { children: money(totals.gst) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grand", children: [
          /* @__PURE__ */ jsx("span", { children: "Total" }),
          /* @__PURE__ */ jsx("span", { children: money(totals.total) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "doc-footer-bar", children: [
        docId && /* @__PURE__ */ jsxs("button", { className: "btn btn-danger", onClick: discard, disabled: !!busy, children: [
          /* @__PURE__ */ jsx(Trash2, {}),
          " Discard draft"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grow" }),
        /* @__PURE__ */ jsxs("button", { className: "btn", onClick: saveDraft, disabled: !!busy, children: [
          /* @__PURE__ */ jsx(Save, {}),
          " ",
          busy === "save" ? "Saving\u2026" : "Save draft"
        ] }),
        can(profile, cfg.perm) && /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: post, disabled: !!busy, children: [
          /* @__PURE__ */ jsx(Send, {}),
          " ",
          busy === "post" ? "Posting\u2026" : "Post"
        ] })
      ] })
    ] })
  ] });
}
const can = (profile, perm) => profile.user_type === "admin" || profile.permissions?.includes(`${perm}.post`);
export {
  DocumentEditor as default
};
