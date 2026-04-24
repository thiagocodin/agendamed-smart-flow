import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppointments, usePatients, formatBRL, parseDateTime, Appointment } from "@/lib/storage";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — AgendaMed" },
      { name: "description", content: "Visualize suas consultas em um calendário mensal." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const { appointments } = useAppointments();
  const { patients } = usePatients();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const patientName = (id: string) => patients.find((p) => p.id === id)?.nome ?? "—";

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const apptsOf = (d: Date) =>
    appointments
      .filter((a) => isSameDay(parseDateTime(a.data, a.hora), d))
      .sort((a, b) => a.hora.localeCompare(b.hora));

  const dayList = apptsOf(selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Clique em um dia para ver suas consultas.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shadow-[var(--shadow-elegant)]">
          <Plus className="mr-1 h-4 w-4" /> Nova consulta
        </Button>
      </div>

      <Card className="p-4 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold capitalize">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isCur = isSameMonth(d, cursor);
            const isSel = isSameDay(d, selected);
            const today = isToday(d);
            const count = apptsOf(d).length;
            const hasAppts = count > 0;
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-all ${
                  isSel
                    ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : today
                    ? "border-2 border-primary bg-primary/10 font-bold text-primary ring-2 ring-primary/20"
                    : hasAppts && isCur
                    ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                    : isCur
                    ? "border-transparent text-foreground hover:bg-secondary"
                    : "border-transparent text-muted-foreground/50 hover:bg-secondary/50"
                }`}
              >
                <span className="font-medium">{format(d, "d")}</span>
                {hasAppts && (
                  <span className="mt-1 flex gap-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSel ? "bg-primary-foreground" : today ? "bg-primary" : "bg-primary"
                        }`}
                      />
                    ))}
                  </span>
                )}
                {today && !isSel && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="mb-4 text-base font-semibold capitalize">
          {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {dayList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem consultas neste dia.</p>
        ) : (
          <ul className="space-y-2">
            {dayList.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => { setEditing(a); setOpen(true); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-bold text-primary">{a.hora}</div>
                    <div>
                      <p className="font-medium">{patientName(a.pacienteId)}</p>
                      {a.observacao && <p className="line-clamp-1 text-xs text-muted-foreground">{a.observacao}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatBRL(a.valor)}</p>
                    {a.pago ? (
                      <Badge className="bg-[var(--success)] text-white">Pago</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        appointment={editing}
        defaultDate={format(selected, "yyyy-MM-dd")}
      />
    </div>
  );
}