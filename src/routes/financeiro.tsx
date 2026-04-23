import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, TrendingUp, Wallet, Clock } from "lucide-react";
import { useAppointments, usePatients, formatBRL, parseDateTime } from "@/lib/storage";
import { addMonths, format, isFuture, isSameMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — AgendaMed" },
      { name: "description", content: "Acompanhe seu faturamento mensal e valores a receber." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { appointments, togglePago } = useAppointments();
  const { patients } = usePatients();
  const [cursor, setCursor] = useState(new Date());

  const patientName = (id: string) => patients.find((p) => p.id === id)?.nome ?? "—";

  const monthAppts = useMemo(
    () =>
      appointments
        .filter((a) => isSameMonth(parseDateTime(a.data, a.hora), cursor))
        .sort((a, b) => parseDateTime(a.data, a.hora).getTime() - parseDateTime(b.data, b.hora).getTime()),
    [appointments, cursor]
  );

  const total = monthAppts.reduce((s, a) => s + a.valor, 0);
  const recebido = monthAppts.filter((a) => a.pago).reduce((s, a) => s + a.valor, 0);
  const aReceber = monthAppts.filter((a) => !a.pago && isFuture(parseDateTime(a.data, a.hora))).reduce((s, a) => s + a.valor, 0);
  const pendente = monthAppts.filter((a) => !a.pago && !isFuture(parseDateTime(a.data, a.hora))).reduce((s, a) => s + a.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground capitalize">{format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Mês atual</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" }}>
          <p className="text-xs font-medium uppercase opacity-80">Faturamento total</p>
          <p className="mt-2 text-2xl font-bold">{formatBRL(total)}</p>
          <TrendingUp className="mt-3 h-5 w-5 opacity-80" />
        </Card>
        <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-medium uppercase text-muted-foreground">Recebido</p>
          <p className="mt-2 text-2xl font-bold text-[var(--success)]">{formatBRL(recebido)}</p>
          <Wallet className="mt-3 h-5 w-5 text-[var(--success)]" />
        </Card>
        <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-medium uppercase text-muted-foreground">A receber</p>
          <p className="mt-2 text-2xl font-bold text-primary">{formatBRL(aReceber)}</p>
          <Clock className="mt-3 h-5 w-5 text-primary" />
        </Card>
        <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-medium uppercase text-muted-foreground">Pendente</p>
          <p className="mt-2 text-2xl font-bold text-[var(--warning)]">{formatBRL(pendente)}</p>
          <Clock className="mt-3 h-5 w-5 text-[var(--warning)]" />
        </Card>
      </div>

      <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="mb-4 text-lg font-semibold">Consultas do mês</h2>
        {monthAppts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma consulta neste mês.</p>
        ) : (
          <ul className="divide-y divide-border">
            {monthAppts.map((a) => {
              const dt = parseDateTime(a.data, a.hora);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{patientName(a.pacienteId)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(dt, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatBRL(a.valor)}</span>
                    <Badge
                      onClick={() => togglePago(a.id)}
                      className={`cursor-pointer ${a.pago ? "bg-[var(--success)] text-white" : "bg-secondary text-secondary-foreground"}`}
                    >
                      {a.pago ? "Pago" : "Marcar pago"}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}