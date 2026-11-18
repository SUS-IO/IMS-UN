import { jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { LOGIN_DOMAIN, SESSION_POLL_MS } from "../config.js";
const Ctx = createContext(null);
const REASONS = {
  DISABLED: "Your account has been disabled. Please contact the administrator.",
  FORCED_LOGOUT: "The administrator ended your session. Please sign in again.",
  NO_PROFILE: "This login is not set up in IMS. Please contact the administrator."
};
const NOTE_KEY = "ims.loginNote";
const setNote = (m) => {
  try {
    sessionStorage.setItem(NOTE_KEY, m);
  } catch {
  }
};
const takeLoginNote = () => {
  try {
    const m = sessionStorage.getItem(NOTE_KEY);
    sessionStorage.removeItem(NOTE_KEY);
    return m;
  } catch {
    return null;
  }
};
function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, profile: null });
  const profileRef = useRef(null);
  profileRef.current = state.profile;
  const fetchProfile = useCallback(async (login = false) => {
    const { data, error } = await supabase.rpc("my_session", { p_login: login });
    if (error) throw error;
    return data;
  }, []);
  const kill = useCallback(async (note) => {
    if (note) setNote(note);
    await supabase.auth.signOut().catch(() => {
    });
    setState({ loading: false, profile: null });
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (live) setState({ loading: false, profile: null });
        return;
      }
      try {
        const p = await fetchProfile(false);
        if (!live) return;
        if (p?.ok) setState({ loading: false, profile: p });
        else await kill(REASONS[p?.reason]);
      } catch {
        if (live) await kill();
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_OUT") setState({ loading: false, profile: null });
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile, kill]);
  useEffect(() => {
    if (!state.profile) return void 0;
    const t = setInterval(async () => {
      try {
        const p = await fetchProfile(false);
        if (!p?.ok) kill(REASONS[p?.reason]);
        else if (JSON.stringify(p) !== JSON.stringify(profileRef.current)) setState({ loading: false, profile: p });
      } catch (e) {
        if (/jwt|token|401|403|not authenticated/i.test(e?.message || "") || e?.status === 401) kill(REASONS.FORCED_LOGOUT);
      }
    }, SESSION_POLL_MS);
    return () => clearInterval(t);
  }, [state.profile?.id, fetchProfile, kill]);
  const signIn = useCallback(async (userId, password) => {
    const email = `${userId.trim().toLowerCase()}@${LOGIN_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Invalid User ID or password.");
    let p;
    try {
      p = await fetchProfile(true);
    } catch {
      p = null;
    }
    if (!p?.ok) {
      await supabase.auth.signOut().catch(() => {
      });
      throw new Error(REASONS[p?.reason] || "Could not complete sign-in. Please try again.");
    }
    setState({ loading: false, profile: p });
    return p;
  }, [fetchProfile]);
  const signOut = useCallback(async () => {
    await kill();
  }, [kill]);
  const changePassword = useCallback(async (current, next) => {
    const email = `${profileRef.current.user_code}@${LOGIN_DOMAIN}`;
    const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: current });
    if (e1) throw new Error("Current password is not correct.");
    const { error: e2 } = await supabase.auth.updateUser({ password: next });
    if (e2) throw new Error(e2.message);
    await supabase.rpc("ack_password_changed");
    setState({ loading: false, profile: await fetchProfile(false) });
  }, [fetchProfile]);
  const value = useMemo(() => {
    const p = state.profile;
    return {
      loading: state.loading,
      profile: p,
      signIn,
      signOut,
      changePassword,
      isAdmin: p?.user_type === "admin",
      isCustomer: p?.user_type === "customer",
      can: (perm) => !!p && (p.user_type === "admin" || p.user_type === "staff" && p.permissions?.includes(perm))
    };
  }, [state, signIn, signOut, changePassword]);
  return /* @__PURE__ */ jsx(Ctx.Provider, { value, children });
}
const useAuth = () => useContext(Ctx);
export {
  AuthProvider,
  takeLoginNote,
  useAuth
};
