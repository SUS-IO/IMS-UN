
import { supabase } from "../lib/supabase.js";
import {
  LOGIN_DOMAIN,
  SESSION_POLL_MS
} from "../config.js";

// ==========================================
// IMS VANILLA JAVASCRIPT AUTHENTICATION
// No React / No Context / No Hooks
// ==========================================

const REASONS = {
  DISABLED:
    "Your account has been disabled. Please contact the administrator.",

  FORCED_LOGOUT:
    "The administrator ended your session. Please sign in again.",

  NO_PROFILE:
    "This login is not set up in IMS. Please contact the administrator."
};

const NOTE_KEY = "ims.loginNote";

// ------------------------------------------
// AUTH STATE
// ------------------------------------------

let state = {
  loading: true,
  profile: null
};

let listeners = new Set();

let pollTimer = null;
let authSubscription = null;
let initialized = false;
let initializationPromise = null;
let pollInProgress = false;

// ------------------------------------------
// LOGIN NOTIFICATION
// ------------------------------------------

function setNote(message) {
  try {
    sessionStorage.setItem(NOTE_KEY, message);
  } catch (error) {
    console.warn("Unable to save login notification:", error);
  }
}

export function takeLoginNote() {
  try {
    const message = sessionStorage.getItem(NOTE_KEY);

    sessionStorage.removeItem(NOTE_KEY);

    return message;
  } catch {
    return null;
  }
}

// ------------------------------------------
// STATE MANAGEMENT
// ------------------------------------------

function updateState(newState) {
  state = {
    ...state,
    ...newState
  };

  notify();
}

function notify() {
  const auth = getAuthState();

  listeners.forEach(callback => {
    try {
      callback(auth);
    } catch (error) {
      console.error("Auth listener error:", error);
    }
  });
}

export function subscribe(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Auth subscriber must be a function.");
  }

  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

// ------------------------------------------
// AUTH INFORMATION
// ------------------------------------------

export function getAuthState() {
  const p = state.profile;

  return {
    loading: state.loading,

    profile: p,

    isAdmin: p?.user_type === "admin",

    isCustomer: p?.user_type === "customer",

    can(permission) {
      if (!p) return false;

      if (p.user_type === "admin") {
        return true;
      }

      if (p.user_type === "staff") {
        return !!p.permissions?.includes(permission);
      }

      return false;
    }
  };
}

// ------------------------------------------
// FETCH USER PROFILE
// ------------------------------------------

async function fetchProfile(login = false) {
  const { data, error } = await supabase.rpc(
    "my_session",
    {
      p_login: login
    }
  );

  if (error) throw error;

  return data;
}

// ------------------------------------------
// STOP SESSION MONITORING
// ------------------------------------------

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  pollInProgress = false;
}

// ------------------------------------------
// LOGOUT / TERMINATE SESSION
// ------------------------------------------

async function kill(note = null) {
  if (note) {
    setNote(note);
  }

  stopPolling();

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("Sign out error:", error);
  }

  updateState({
    loading: false,
    profile: null
  });
}

export async function signOut() {
  await kill();
}

// ------------------------------------------
// SESSION MONITORING
// ------------------------------------------

function startPolling() {
  stopPolling();

  if (!state.profile) return;

  const interval = Math.max(
    Number(SESSION_POLL_MS) || 30000,
    5000
  );

  pollTimer = setInterval(async () => {
    if (pollInProgress || !state.profile) return;

    pollInProgress = true;

    try {
      const profile = await fetchProfile(false);

      if (!profile?.ok) {
        await kill(
          REASONS[profile?.reason] ||
          REASONS.FORCED_LOGOUT
        );

        return;
      }

      if (
        JSON.stringify(profile) !==
        JSON.stringify(state.profile)
      ) {
        updateState({
          loading: false,
          profile
        });
      }

    } catch (error) {
      const message = error?.message || "";

      if (
        /jwt|token|401|403|not authenticated/i.test(message) ||
        error?.status === 401
      ) {
        await kill(REASONS.FORCED_LOGOUT);
      } else {
        console.error("Session check failed:", error);
      }

    } finally {
      pollInProgress = false;
    }

  }, interval);
}

// ------------------------------------------
// LOGIN
// ------------------------------------------

export async function signIn(userId, password) {
  const uid = String(userId || "").trim().toLowerCase();

  if (!uid || !password) {
    throw new Error("Please enter your User ID and password.");
  }

  const email = `${uid}@${LOGIN_DOMAIN}`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error("Invalid User ID or password.");
  }

  let profile;

  try {
    profile = await fetchProfile(true);

  } catch (error) {
    console.error("Profile loading failed:", error);
    profile = null;
  }

  if (!profile?.ok) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out errors.
    }

    throw new Error(
      REASONS[profile?.reason] ||
      "Could not complete sign-in. Please try again."
    );
  }

  updateState({
    loading: false,
    profile
  });

  startPolling();

  return profile;
}

// ------------------------------------------
// CHANGE PASSWORD
// ------------------------------------------

export async function changePassword(current, next) {
  const profile = state.profile;

  if (!profile) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!next || next.length < 6) {
    throw new Error("New password must contain at least 6 characters.");
  }

  const email =
    `${profile.user_code}@${LOGIN_DOMAIN}`;

  const { error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password: current
    });

  if (loginError) {
    throw new Error("Current password is not correct.");
  }

  const { error: passwordError } =
    await supabase.auth.updateUser({
      password: next
    });

  if (passwordError) {
    throw new Error(passwordError.message);
  }

  const { error: ackError } = await supabase.rpc(
    "ack_password_changed"
  );

  if (ackError) {
    throw new Error(ackError.message);
  }

  const profileUpdated = await fetchProfile(false);

  if (!profileUpdated?.ok) {
    await kill(REASONS.FORCED_LOGOUT);

    throw new Error("Unable to refresh your profile.");
  }

  updateState({
    loading: false,
    profile: profileUpdated
  });

  startPolling();

  return profileUpdated;
}

// ------------------------------------------
// INITIALIZE AUTHENTICATION
// ------------------------------------------

export function initAuth() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initialize();

  return initializationPromise;
}

async function initialize() {
  if (initialized) return getAuthState();

  initialized = true;

  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      updateState({
        loading: false,
        profile: null
      });

    } else {
      try {
        const profile = await fetchProfile(false);

        if (profile?.ok) {
          updateState({
            loading: false,
            profile
          });

          startPolling();

        } else {
          await kill(
            REASONS[profile?.reason] ||
            REASONS.NO_PROFILE
          );
        }

      } catch (error) {
        console.error("Session profile error:", error);

        await kill();
      }
    }

  } catch (error) {
    console.error("Authentication initialization error:", error);

    updateState({
      loading: false,
      profile: null
    });
  }

  // Listen for authentication changes.
  const { data } = supabase.auth.onAuthStateChange(
    (event) => {
      if (event === "SIGNED_OUT") {
        stopPolling();

        updateState({
          loading: false,
          profile: null
        });
      }
    }
  );

  authSubscription = data?.subscription || null;

  return getAuthState();
}

// ------------------------------------------
// CLEANUP
// ------------------------------------------

export function destroyAuth() {
  stopPolling();

  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  listeners.clear();

  initialized = false;
  initializationPromise = null;
}

// ------------------------------------------
// DEFAULT EXPORT
// ------------------------------------------

export default {
  initAuth,
  getAuthState,
  subscribe,
  signIn,
  signOut,
  changePassword,
  takeLoginNote,
  destroyAuth
};
