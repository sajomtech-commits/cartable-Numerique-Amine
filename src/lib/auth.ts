// Auth Supabase côté client (session stockée en localStorage)
const BASE = import.meta.env.PUBLIC_SUPABASE_URL || '';
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY || '';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
}

const SKEY = 'cartable_auth';

export function getSession(): Session | null {
  try {
    const s: Session | null = JSON.parse(localStorage.getItem(SKEY) || 'null');
    if (!s) return null;
    if (s.expires_at && Date.now() > s.expires_at) {
      // token expiré : on tente un refresh silencieux au prochain appel
      return s; // renvoyé quand même, refreshAuth() gèrera
    }
    return s;
  } catch { return null; }
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function logout(): void {
  localStorage.removeItem(SKEY);
}

/** Identifiant de l'utilisateur connecté (champ « sub » du JWT), ou null. */
export function userID(): string | null {
  const s = getSession();
  if (!s) return null;
  try {
    const part = s.access_token.split('.')[1] || '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return json.sub || null;
  } catch { return null; }
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'Connexion refusée');
  const session: Session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    email,
  };
  localStorage.setItem(SKEY, JSON.stringify(session));
  return session;
}

// Refresh le token si besoin ; renvoie un access_token valide ou null
export async function validToken(): Promise<string | null> {
  const s = getSession();
  if (!s) return null;
  if (Date.now() < s.expires_at - 30_000) return s.access_token;
  try {
    const res = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { logout(); return null; }
    const data = await res.json();
    const fresh: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      email: s.email,
    };
    localStorage.setItem(SKEY, JSON.stringify(fresh));
    return fresh.access_token;
  } catch { logout(); return null; }
}

// ---------- Bascule famille (parent ↔ enfant) ----------
// Le parent s'authentifie une fois ; la bascule s'échange contre une session enfant
// (edge /basculer). On garde la session parent de côté pour pouvoir revenir.

const PKEY = 'cartable_auth_parent';

/** Remplace la session courante par celle de quelqu'un d'autre (enfant) et mémorise l'actuelle. */
export function basculerSession(access: string, refresh: string, expiresAtMs: number, email: string): void {
  const actuelle = getSession();
  if (actuelle) localStorage.setItem(PKEY, JSON.stringify(actuelle));
  localStorage.setItem(SKEY, JSON.stringify({
    access_token: access,
    refresh_token: refresh,
    expires_at: expiresAtMs,
    email,
  }));
}

/** Retourne true s'il existe une session parent mémorisée (bascule en cours vers un enfant). */
export function parentMemo(): boolean {
  return localStorage.getItem(PKEY) !== null;
}

/** Restaure la session du parent (retour depuis un enfant). */
export function revenirParent(): boolean {
  const p = localStorage.getItem(PKEY);
  if (!p) return false;
  localStorage.setItem(SKEY, p);
  localStorage.removeItem(PKEY);
  return true;
}
