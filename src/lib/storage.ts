import { useEffect, useState, useCallback } from "react";

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

const PATIENTS_KEY = "agendamed:patients";
const APPTS_KEY = "agendamed:appointments";

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

function seedIfEmpty() {
  const patients = read<Patient[]>(PATIENTS_KEY, []);
  const appts = read<Appointment[]>(APPTS_KEY, []);
  if (patients.length === 0 && appts.length === 0) {
    const p1: Patient = { id: uid(), nome: "Maria Silva", telefone: "(11) 98888-1111", createdAt: new Date().toISOString() };
    const p2: Patient = { id: uid(), nome: "João Pereira", telefone: "(11) 97777-2222", createdAt: new Date().toISOString() };
    const p3: Patient = { id: uid(), nome: "Ana Costa", telefone: "(11) 96666-3333", createdAt: new Date().toISOString() };
    write(PATIENTS_KEY, [p1, p2, p3]);
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const inThree = new Date(today); inThree.setDate(today.getDate() + 3);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 2);
    write<Appointment[]>(APPTS_KEY, [
      { id: uid(), pacienteId: p1.id, data: fmt(today), hora: "14:00", valor: 200, observacao: "Sessão de acompanhamento.", pago: false },
      { id: uid(), pacienteId: p2.id, data: fmt(tomorrow), hora: "10:30", valor: 180, observacao: "Primeira consulta.", pago: false },
      { id: uid(), pacienteId: p3.id, data: fmt(inThree), hora: "16:00", valor: 220, observacao: "", pago: false },
      { id: uid(), pacienteId: p1.id, data: fmt(yesterday), hora: "15:00", valor: 200, observacao: "Conclusão do ciclo.", pago: true },
    ]);
  }
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  useEffect(() => {
    seedIfEmpty();
    setPatients(read<Patient[]>(PATIENTS_KEY, []));
    const handler = () => setPatients(read<Patient[]>(PATIENTS_KEY, []));
    window.addEventListener("agendamed:update", handler);
    return () => window.removeEventListener("agendamed:update", handler);
  }, []);

  const save = useCallback((p: Omit<Patient, "id" | "createdAt"> & { id?: string }) => {
    const all = read<Patient[]>(PATIENTS_KEY, []);
    if (p.id) {
      const next = all.map((x) => (x.id === p.id ? { ...x, nome: p.nome, telefone: p.telefone } : x));
      write(PATIENTS_KEY, next);
    } else {
      const novo: Patient = { id: uid(), nome: p.nome, telefone: p.telefone, createdAt: new Date().toISOString() };
      write(PATIENTS_KEY, [...all, novo]);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const all = read<Patient[]>(PATIENTS_KEY, []);
    write(PATIENTS_KEY, all.filter((x) => x.id !== id));
    const appts = read<Appointment[]>(APPTS_KEY, []);
    write(APPTS_KEY, appts.filter((a) => a.pacienteId !== id));
  }, []);

  return { patients, save, remove };
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  useEffect(() => {
    seedIfEmpty();
    setAppointments(read<Appointment[]>(APPTS_KEY, []));
    const handler = () => setAppointments(read<Appointment[]>(APPTS_KEY, []));
    window.addEventListener("agendamed:update", handler);
    return () => window.removeEventListener("agendamed:update", handler);
  }, []);

  const save = useCallback((a: Omit<Appointment, "id"> & { id?: string }) => {
    const all = read<Appointment[]>(APPTS_KEY, []);
    if (a.id) {
      const next = all.map((x) => (x.id === a.id ? { ...(x as Appointment), ...a } as Appointment : x));
      write(APPTS_KEY, next);
    } else {
      const novo: Appointment = { id: uid(), ...a } as Appointment;
      write(APPTS_KEY, [...all, novo]);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const all = read<Appointment[]>(APPTS_KEY, []);
    write(APPTS_KEY, all.filter((x) => x.id !== id));
  }, []);

  const togglePago = useCallback((id: string) => {
    const all = read<Appointment[]>(APPTS_KEY, []);
    write(APPTS_KEY, all.map((x) => (x.id === id ? { ...x, pago: !x.pago } : x)));
  }, []);

  return { appointments, save, remove, togglePago };
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseDateTime(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00`);
}