import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";

export interface Patient {
  id: string;
  nome: string;
  telefone: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  pacienteId: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:mm
  valor: number;
  observacao: string;
  pago: boolean;
}

// Per-user namespaced keys
const patientsKey = (uid: string) => `agendamed:v2:${uid}:patients`;
const apptsKey = (uid: string) => `agendamed:v2:${uid}:appointments`;

// One-time cleanup of legacy/global data from previous versions
const RESET_FLAG = "agendamed:v2:reset";
function cleanupLegacy() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(RESET_FLAG)) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Remove old unscoped keys
      if (k === "agendamed:patients" || k === "agendamed:appointments") {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(RESET_FLAG, "1");
  } catch { /* noop */ }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("agendamed:update", { detail: { key } }));
}

export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export function usePatients() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    cleanupLegacy();
    if (!userId) { setPatients([]); return; }
    const key = patientsKey(userId);
    setPatients(read<Patient[]>(key, []));
    const handler = () => setPatients(read<Patient[]>(key, []));
    window.addEventListener("agendamed:update", handler);
    return () => window.removeEventListener("agendamed:update", handler);
  }, [userId]);

  const save = useCallback((p: Omit<Patient, "id" | "createdAt"> & { id?: string }) => {
    if (!userId) return;
    const key = patientsKey(userId);
    const all = read<Patient[]>(key, []);
    if (p.id) {
      const next = all.map((x) => (x.id === p.id ? { ...x, nome: p.nome, telefone: p.telefone } : x));
      write(key, next);
    } else {
      const novo: Patient = { id: uid(), nome: p.nome, telefone: p.telefone, createdAt: new Date().toISOString() };
      write(key, [...all, novo]);
    }
  }, [userId]);

  const remove = useCallback((id: string) => {
    if (!userId) return;
    const pKey = patientsKey(userId);
    const aKey = apptsKey(userId);
    const all = read<Patient[]>(pKey, []);
    write(pKey, all.filter((x) => x.id !== id));
    const appts = read<Appointment[]>(aKey, []);
    write(aKey, appts.filter((a) => a.pacienteId !== id));
  }, [userId]);

  return { patients, save, remove };
}

export function useAppointments() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    cleanupLegacy();
    if (!userId) { setAppointments([]); return; }
    const key = apptsKey(userId);
    setAppointments(read<Appointment[]>(key, []));
    const handler = () => setAppointments(read<Appointment[]>(key, []));
    window.addEventListener("agendamed:update", handler);
    return () => window.removeEventListener("agendamed:update", handler);
  }, [userId]);

  const save = useCallback((a: Omit<Appointment, "id"> & { id?: string }) => {
    if (!userId) return;
    const key = apptsKey(userId);
    const all = read<Appointment[]>(key, []);
    if (a.id) {
      const next = all.map((x) => (x.id === a.id ? { ...(x as Appointment), ...a } as Appointment : x));
      write(key, next);
    } else {
      const existingIds = new Set(all.map((x) => x.id));
      let newId = uid();
      while (existingIds.has(newId)) newId = uid();
      // Build explicitly to guarantee the generated id is not overwritten by spread
      const novo: Appointment = {
        id: newId,
        pacienteId: a.pacienteId,
        data: a.data,
        hora: a.hora,
        valor: a.valor,
        observacao: a.observacao,
        pago: a.pago,
      };
      write(key, [...all, novo]);
    }
  }, [userId]);

  const remove = useCallback((id: string) => {
    if (!userId) return;
    const key = apptsKey(userId);
    const all = read<Appointment[]>(key, []);
    write(key, all.filter((x) => x.id !== id));
  }, [userId]);

  const togglePago = useCallback((id: string) => {
    if (!userId) return;
    const key = apptsKey(userId);
    const all = read<Appointment[]>(key, []);
    // Repair any duplicate ids on the fly so toggling only affects one row
    const seen = new Set<string>();
    const repaired = all.map((x) => {
      if (!x.id || seen.has(x.id)) {
        const nid = uid();
        seen.add(nid);
        return { ...x, id: nid };
      }
      seen.add(x.id);
      return x;
    });
    const target = repaired.find((x) => x.id === id);
    const newPago = target ? !target.pago : true;
    write(key, repaired.map((x) => (x.id === id ? { ...x, pago: newPago } : x)));
  }, [userId]);

  return { appointments, save, remove, togglePago };
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseDateTime(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00`);
}

// Also reset users/sessions to start fresh (one-time)
const USERS_RESET_FLAG = "agendamed:v2:users_reset";
if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem(USERS_RESET_FLAG)) {
      localStorage.removeItem("agendamed:users");
      localStorage.removeItem("agendamed:session");
      localStorage.setItem(USERS_RESET_FLAG, "1");
    }
  } catch { /* noop */ }
}

// One-time fix: ensure every appointment has a unique id (repair legacy duplicates)
const DEDUPE_FLAG = "agendamed:v2:appts_dedupe";
if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem(DEDUPE_FLAG)) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("agendamed:v2:") || !k.endsWith(":appointments")) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const list = JSON.parse(raw) as Appointment[];
        const seen = new Set<string>();
        const fixed = list.map((a) => {
          if (!a.id || seen.has(a.id)) {
            const newId = uid();
            seen.add(newId);
            return { ...a, id: newId };
          }
          seen.add(a.id);
          return a;
        });
        localStorage.setItem(k, JSON.stringify(fixed));
      }
      localStorage.setItem(DEDUPE_FLAG, "1");
    }
  } catch { /* noop */ }
}
