import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Phone, Pencil, Trash2, User, CalendarDays, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Appointment, Patient, useAppointments, usePatients, formatBRL, parseDateTime } from "@/lib/storage";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { toast } from "sonner";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — AgendaMed" },
      { name: "description", content: "Cadastre e gerencie seus pacientes." },
    ],
  }),
  component: PacientesPage,
});

type Status = "receber" | "pendente" | "pago";

function statusOf(a: Appointment): Status {
  if (a.pago) return "pago";
  const dt = parseDateTime(a.data, a.hora);
  if (dt.getTime() > Date.now()) return "receber";
  return "pendente";
}

function StatusBadge({ s }: { s: Status }) {
  if (s === "pago") return <Badge className="bg-[var(--success)] text-white">Pago</Badge>;
  if (s === "receber") return <Badge className="bg-primary text-primary-foreground">Receber</Badge>;
  return <Badge className="bg-[var(--warning)] text-white">Pendente</Badge>;
}

function PacientesPage() {
  const { patients, save, remove } = usePatients();
  const { appointments } = useAppointments();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  // Calendar modal state
  const [calendarFor, setCalendarFor] = useState<Patient | null>(null);
  const [calCursor, setCalCursor] = useState(new Date());
  const [calSelected, setCalSelected] = useState<Date | null>(null);

  // Appointment dialog
  const [apptOpen, setApptOpen] = useState(false);
  const [apptDefaultDate, setApptDefaultDate] = useState<string | undefined>(undefined);
  const [apptEditing, setApptEditing] = useState<Appointment | null>(null);

  const openNew = () => { setEditing(null); setNome(""); setTelefone(""); setOpen(true); };
  const openEdit = (p: Patient) => { setEditing(p); setNome(p.nome); setTelefone(p.telefone); setOpen(true); };

  const handleSave = () => {
    if (!nome.trim()) { toast.error("Informe o nome."); return; }
    if (!isValidPhoneBR(telefone)) {
      toast.error("Telefone inválido. Use apenas números, com DDD (10 ou 11 dígitos).");
      return;
    }
    save({ id: editing?.id, nome: nome.trim(), telefone: telefone.trim() });
    toast.success(editing ? "Paciente atualizado." : "Paciente cadastrado.");
    setOpen(false);
  };

  const handleDelete = (p: Patient) => {
    if (!confirm(`Excluir ${p.nome}? Suas consultas também serão removidas.`)) return;
    remove(p.id);
    toast.success("Paciente excluído.");
  };

  const apptsOf = (patientId: string) =>
    appointments
      .filter((a) => a.pacienteId === patientId)
      .sort((a, b) => parseDateTime(b.data, b.hora).getTime() - parseDateTime(a.data, a.hora).getTime());

  const openCalendar = (p: Patient) => {
    setCalendarFor(p);
    setCalCursor(new Date());
    setCalSelected(null);
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calCursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calCursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calCursor]);

  // Mostrar TODAS as consultas do dia (de todos os pacientes), não apenas as do paciente em foco.
  const apptsOnDay = (d: Date) =>
    appointments
      .filter((a) => isSameDay(parseDateTime(a.data, a.hora), d))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  const dayList = calSelected ? apptsOnDay(calSelected) : [];
  const patientNameById = (id: string) => patients.find((p) => p.id === id)?.nome ?? "—";

  const openNewApptForPatient = (p: Patient, dateStr?: string) => {
    setApptDefaultDate(dateStr);
    setApptEditing(null);
    // Pre-select patient by setting "editing" to a dummy with pacienteId via the appointment dialog init
    // AppointmentDialog uses appointment?.pacienteId first, so we pass a pseudo appointment for new too
    setApptEditing({
      id: "",
      pacienteId: p.id,
      data: dateStr ?? format(new Date(), "yyyy-MM-dd"),
      hora: "09:00",
      valor: 200,
      observacao: "",
      pago: false,
    } as Appointment);
    // Trick: set editing to null so the dialog treats as "new", but we want patient pre-filled.
    // Easier: just open with defaultDate and let user pick patient. Reset to null:
    setApptEditing(null);
    setApptOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">{patients.length} cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="shadow-[var(--shadow-elegant)]">
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </div>

      {patients.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum paciente cadastrado.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {patients.map((p) => {
            const hist = apptsOf(p.id);
            return (
              <Card key={p.id} className="p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.nome}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {p.telefone || "—"} • {hist.length} consultas
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openCalendar(p)}>
                    <CalendarDays className="mr-1 h-4 w-4" /> Agendar
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <History className="h-3 w-3" /> Histórico
                  </div>
                  {hist.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem consultas registradas.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {hist.slice(0, 20).map((a) => {
                        const dt = parseDateTime(a.data, a.hora);
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5 text-xs">
                            <div>
                              <p className="font-medium capitalize">{format(dt, "dd 'de' MMM, yyyy", { locale: ptBR })}</p>
                              <p className="text-muted-foreground">{a.hora} • {formatBRL(a.valor)}</p>
                            </div>
                            <StatusBadge s={statusOf(a)} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/create patient dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
              />
              <p className="text-xs text-muted-foreground">Apenas números — DDD + número.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar modal per patient */}
      <Dialog open={!!calendarFor} onOpenChange={(v) => !v && setCalendarFor(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Agenda de {calendarFor?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold capitalize">
              {format(calCursor, "MMMM 'de' yyyy", { locale: ptBR })}
            </h3>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setCalCursor(subMonths(calCursor, 1))} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCalCursor(addMonths(calCursor, 1))} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
                <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d) => {
              const isCur = isSameMonth(d, calCursor);
              const isSel = calSelected && isSameDay(d, calSelected);
              const today = isToday(d);
              const count = apptsOnDay(d).length;
              const hasAppts = count > 0;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setCalSelected(d)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-xs transition-all ${
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : today
                      ? "border-2 border-primary bg-primary/10 font-bold text-primary"
                      : hasAppts && isCur
                      ? "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/20"
                      : isCur
                      ? "border-transparent text-foreground hover:bg-secondary"
                      : "border-transparent text-muted-foreground/40"
                  }`}
                >
                  <span className="font-medium">{format(d, "d")}</span>
                  {hasAppts && (
                    <span className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span key={i} className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground" : "bg-primary"}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-h-[100px] rounded-lg border border-border bg-card/50 p-3">
            {!calSelected ? (
              <p className="text-center text-xs text-muted-foreground">Selecione um dia para ver as consultas.</p>
            ) : dayList.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Sem consultas em {format(calSelected, "dd/MM/yyyy")}.</p>
                {calendarFor && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setApptDefaultDate(format(calSelected, "yyyy-MM-dd"));
                      setApptEditing(null);
                      setCalendarFor(null);
                      setApptOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Nova consulta nesse dia
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {dayList.map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-background p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {patientNameById(a.pacienteId)}
                        {calendarFor && a.pacienteId === calendarFor.id && (
                          <span className="ml-1 text-[10px] uppercase text-primary">(este paciente)</span>
                        )}
                      </p>
                      <StatusBadge s={statusOf(a)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Horário: <span className="font-medium text-foreground">{a.hora}</span> • Valor: <span className="font-medium text-foreground">{formatBRL(a.valor)}</span>
                    </p>
                    {a.observacao && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Obs:</span> {a.observacao}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarFor(null)}>Fechar</Button>
            {calendarFor && (
              <Button
                onClick={() => {
                  setApptDefaultDate(calSelected ? format(calSelected, "yyyy-MM-dd") : undefined);
                  setApptEditing(null);
                  setCalendarFor(null);
                  setApptOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Nova consulta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        appointment={apptEditing}
        defaultDate={apptDefaultDate}
        defaultPatientId={calendarFor?.id}
      />
    </div>
  );
}
