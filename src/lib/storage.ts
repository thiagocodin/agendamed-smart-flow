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
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
      const novo: Appointment = { id: uid(), ...a } as Appointment;
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
    write(key, all.map((x) => (x.id === id ? { ...x, pago: !x.pago } : x)));
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
