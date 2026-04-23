import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — AgendaMed" }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe seu nome.");
    if (!isValidPhoneBR(telefone)) return toast.error("Telefone inválido. Use apenas números, com DDD.");
    if (senha.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    setBusy(true);
    try {
      await signUp({ nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), senha });
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Comece a organizar sua prática agora.</p>
        </div>
        <Card className="p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome completo</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                inputMode="numeric"
                required
                value={telefone}
                placeholder="(11) 99999-0000"
                onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
              />
            </div>
            <div className="space-y-2"><Label>Senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Criando..." : "Criar conta"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
