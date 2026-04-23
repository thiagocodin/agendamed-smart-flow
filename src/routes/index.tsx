import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, TrendingUp, Clock, Users } from "lucide-react";
import { useAppointments, usePatients, formatBRL, parseDateTime } from "@/lib/storage";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { format, isSameWeek, isSameMonth, isFuture, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AgendaMed" },
      { name: "description", content: "Visão geral das suas consultas e faturamento." },
    ],
  }),
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className="p-5" style={accent ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" } : { boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {hint && <p className={`mt-1 text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { appointments } = useAppointments();
  const { patients } = usePatients();
  const [open, setOpen] = useState(false);

  const now = new Date();

  const upcoming = useMemo(
    () =>
      appointments
        .map((a) => ({ a, dt: parseDateTime(a.data, a.hora) }))
        .filter((x) => x.dt.getTime() > now.getTime())
        .sort((a, b) => a.dt.getTime() - b.dt.getTime()),
    [appointments]
  );

  const weekCount = appointments.filter((a) => isSameWeek(parseDateTime(a.data, a.hora), now, { weekStartsOn: 1 })).length;
  const monthAppts = appointments.filter((a) => isSameMonth(parseDateTime(a.data, a.hora), now));
  const totalMes = monthAppts.reduce((s, a) => s + a.valor, 0);
  const aReceber = monthAppts.filter((a) => !a.pago && isFuture(parseDateTime(a.data, a.hora))).reduce((s, a) => s + a.valor, 0);

  const patientName = (id: string) => patients.find((p) => p.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Olá, doutor(a) 👋</h1>
          <p className="text-sm text-muted-foreground">Aqui está um resumo da sua agenda.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="shadow-[var(--shadow-elegant)]">
          <Plus className="mr-1 h-4 w-4" /> Nova consulta
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Próximas" value={String(upcoming.length)} hint="consultas agendadas" />
        <StatCard icon={CalendarDays} label="Esta semana" value={String(weekCount)} hint="consultas" />
        <StatCard icon={Users} label="Pacientes" value={String(patients.length)} hint="ativos" />
        <StatCard icon={TrendingUp} label="Faturamento do mês" value={formatBRL(totalMes)} hint={`A receber ${formatBRL(aReceber)}`} accent />
      </div>

      <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Próximas consultas</h2>
          <Link to="/agenda" className="text-sm font-medium text-primary hover:underline">Ver agenda →</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.slice(0, 6).map(({ a, dt }) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-semibold uppercase">{format(dt, "MMM", { locale: ptBR })}</span>
                    <span className="text-base font-bold leading-none">{format(dt, "dd")}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patientName(a.pacienteId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(dt, "EEEE, HH:mm", { locale: ptBR })}
                      {isToday(dt) && <Badge variant="secondary" className="ml-2">Hoje</Badge>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatBRL(a.valor)}</p>
                  {a.pago && <Badge className="bg-[var(--success)] text-white">Pago</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AppointmentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
