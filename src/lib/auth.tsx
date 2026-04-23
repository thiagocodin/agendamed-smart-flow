import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

interface StoredUser extends AuthUser {
  senhaHash: string;
}

const USERS_KEY = "agendamed:users";
const SESSION_KEY = "agendamed:session";

async function hashPassword(pw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return btoa(pw);
}

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function writeUsers(u: StoredUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signUp: (data: { nome: string; email: string; telefone: string; senha: string }) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const users = readUsers();
    const hash = await hashPassword(senha);
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.senhaHash === hash);
    if (!found) throw new Error("E-mail ou senha inválidos.");
    const sess: AuthUser = { id: found.id, nome: found.nome, email: found.email, telefone: found.telefone };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setUser(sess);
  }, []);

  const signUp = useCallback(async (data: { nome: string; email: string; telefone: string; senha: string }) => {
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error("Já existe uma conta com este e-mail.");
    }
    const hash = await hashPassword(data.senha);
    const novo: StoredUser = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      nome: data.nome, email: data.email, telefone: data.telefone, senhaHash: hash,
    };
    writeUsers([...users, novo]);
    const sess: AuthUser = { id: novo.id, nome: novo.nome, email: novo.email, telefone: novo.telefone };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setUser(sess);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
