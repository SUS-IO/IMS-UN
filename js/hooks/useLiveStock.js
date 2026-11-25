import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";
function useLiveStock(onChange, { pollMs = 6e4 } = {}) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    let timer;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current?.(), 400);
    };
    const ch = supabase.channel("stock-live-" + Math.random().toString(36).slice(2)).on("postgres_changes", { event: "INSERT", schema: "public", table: "stock_movements" }, fire).subscribe();
    const poll = setInterval(() => cb.current?.(), pollMs);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, [pollMs]);
}
export {
  useLiveStock
};
