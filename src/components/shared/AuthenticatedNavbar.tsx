
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Home, User, LogOut, Edit3, Users, FileText, CalendarClock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth.actions";

interface NavItemBase {
  label: string;
  icon: React.ElementType;
  pathSegment: string;
}

interface AuthenticatedNavbarProps {
  userRole: "teacher" | "student";
  userFullName?: string | null;
}

export function AuthenticatedNavbar({
  userRole,
  userFullName,
}: AuthenticatedNavbarProps) {
  const pathname = usePathname();

  const isPrintPage = pathname.includes("/print");
  if (isPrintPage) {
    return null;
  }

  let navItems: NavItemBase[];
  let profileHref: string;

  if (userRole === "teacher") {
    navItems = [
      { label: "Panel Principal", icon: Home, pathSegment: "dashboard" },
      { label: "Crear Examen", icon: Edit3, pathSegment: "exams/create" },
      { label: "Gestionar Estudiantes", icon: Users, pathSegment: "students" },
    ];
    profileHref = "/teacher/profile";
  } else { // student
    navItems = [
      { label: "Panel Principal", icon: Home, pathSegment: "profile" },
      { label: "Nueva Evaluación", icon: FileText, pathSegment: "exam/join" },
      { label: "Mis Evaluaciones", icon: ClipboardList, pathSegment: "evaluations" },
      { label: "Cronograma y Avisos", icon: CalendarClock, pathSegment: "schedule" },
    ];
    profileHref = "/student/profile";
  }

  const handleSignOut = async () => {
    await signOutAction();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Logo showText={false} iconClassName="h-7 w-7" />
        <nav className="flex items-center gap-4">
          {navItems.map((item) => {
            const itemHref = `/${userRole}/${item.pathSegment}`;
            const isActive = pathname.startsWith(itemHref);
            return (
              <Link
                key={item.label}
                href={itemHref}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={profileHref}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
               pathname === profileHref
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
            >
            <User className="h-4 w-4" />
            Mi Perfil
          </Link>
          <form action={handleSignOut}>
            <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Cerrar Sesión</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
