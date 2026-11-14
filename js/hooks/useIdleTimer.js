import { useEffect, useRef } from "react";
function useIdleTimer({ ms, onIdle, onTick, enabled = true }) {
  const last = useRef(Date.now());
  const fired = useRef(false);
  const cb = useRef({ onIdle, onTick });
  cb.current = { onIdle, onTick };
  useEffect(() => {
    if (!enabled) return void 0;
    last.current = Date.now();
    fired.current = false;
    const bump = () => {
      last.current = Date.now();
    };
    const evts = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel", "click"];
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const left = ms - (Date.now() - last.current);
      cb.current.onTick?.(Math.max(0, Math.ceil(left / 1e3)));
      if (left <= 0 && !fired.current) {
        fired.current = true;
        cb.current.onIdle?.();
      }
    }, 1e3);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(t);
    };
  }, [ms, enabled]);
}
export {
  useIdleTimer
};
