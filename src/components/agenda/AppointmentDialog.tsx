import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Appointment, useAppointments, usePatients } from "@/lib/storage";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: string;
  defaultPatientId?: string;
}

export function AppointmentDialog({ open, onOpenChange, appointment, defaultDate, defaultPatientId }: Props) {
  const { patients } = usePatients();
  const { save, remove } = useAppointments();
  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [valor, setValor] = useState("200");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      setPacienteId(appointment?.pacienteId ?? defaultPatientId ?? patients[0]?.id ?? "");
      setData(appointment?.data ?? defaultDate ?? new Date().toISOString().slice(0, 10));
      setHora(appointment?.hora ?? "09:00");
      setValor(String(appointment?.valor ?? 200));
      setObservacao(appointment?.observacao ?? "");
    }
  }, [open, appointment, defaultDate, defaultPatientId, patients]);

  const handleSave = () => {
    if (!pacienteId) {
      toast.error("Cadastre um paciente primeiro.");
      return;
    }
    if (!data || !hora) {
      toast.error("Informe data e horário.");
      return;
    }
    save({
      id: appointment?.id,
      pacienteId,
      data,
      hora,
      valor: Number(valor) || 0,
      observacao,
      pago: appointment?.pago ?? false,
    });
    toast.success(appointment ? "Consulta atualizada." : "Consulta criada.");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!appointment) return;
    remove(appointment.id);
    toast.success("Consulta excluída.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar consulta" : "Nova consulta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={pacienteId} onValueChange={setPacienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" min="0" step="10" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Notas da sessão..." />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {appointment ? (
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}