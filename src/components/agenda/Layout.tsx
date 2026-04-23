import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Calendar, LayoutDashboard, Users, Wallet, Stethoscope, Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppointments, usePatients, parseDateTime } from "@/lib/storage";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
] as const;

const PUBLIC_ROUTES = ["/login", "/cadastro"];

function NotificationWatcher() {
  const { appointments } = useAppointments();
  const { patients } = usePatients();
  const [notified, setNotified] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      appointments.forEach((a) => {
        const start = parseDateTime(a.data, a.hora).getTime();
        const diff = start - now;
        if (diff > 0 && diff <= 30 * 60 * 1000 && !notified.has(a.id)) {
          const p = patients.find((x) => x.id === a.pacienteId);
          toast(`Consulta em ${Math.round(diff / 60000)} min`, {
            description: `${p?.nome ?? "Paciente"} • ${a.hora}`,
          });
          setNotified((prev) => new Set(prev).add(a.id));
        }
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [appointments, patients, notified]);

  return null;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      navigate({ to: "/login" });
    }
  }, [loading, user, isPublic, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Toaster position="top-right" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isPublic || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Toaster position="top-right" />
        <div className="absolute right-4 top-4 z-50"><ThemeToggle /></div>
        <Outlet />
      </div>
    );
  }

  const handleSignOut = () => {
    signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <NotificationWatcher />
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight text-foreground">AgendaMed</div>
              <div className="text-[11px] text-muted-foreground">Olá, {user.nome.split(" ")[0]}</div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => {
              const active =
                n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-4">
          {nav.map((n) => {
            const active =
              n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
