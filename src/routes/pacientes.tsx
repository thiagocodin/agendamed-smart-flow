import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Phone, Pencil, Trash2, User } from "lucide-react";
import { Patient, useAppointments, usePatients } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — AgendaMed" },
      { name: "description", content: "Cadastre e gerencie seus pacientes." },
    ],
  }),
  component: PacientesPage,
});

function PacientesPage() {
  const { patients, save, remove } = usePatients();
  const { appointments } = useAppointments();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const openNew = () => { setEditing(null); setNome(""); setTelefone(""); setOpen(true); };
  const openEdit = (p: Patient) => { setEditing(p); setNome(p.nome); setTelefone(p.telefone); setOpen(true); };

  const handleSave = () => {
    if (!nome.trim()) { toast.error("Informe o nome."); return; }
    save({ id: editing?.id, nome: nome.trim(), telefone: telefone.trim() });
    toast.success(editing ? "Paciente atualizado." : "Paciente cadastrado.");
    setOpen(false);
  };

  const handleDelete = (p: Patient) => {
    if (!confirm(`Excluir ${p.nome}? Suas consultas também serão removidas.`)) return;
    remove(p.id);
    toast.success("Paciente excluído.");
  };

  const countOf = (id: string) => appointments.filter((a) => a.pacienteId === id).length;

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
        <div className="grid gap-3 sm:grid-cols-2">
          {patients.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{p.nome}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {p.telefone || "—"} • {countOf(p.id)} consultas
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-0000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}