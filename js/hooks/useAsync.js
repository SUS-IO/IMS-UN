import { useCallback, useEffect, useRef, useState } from "react";
import { toAppError } from "../lib/api.js";
function useAsync(fn, deps = [], { initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);
  const reload = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const d = await fnRef.current();
      if (id === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(toAppError(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, deps);
  return { data, loading, error, reload, setData };
}
export {
  useAsync
};
