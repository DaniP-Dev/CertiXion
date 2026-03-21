"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [isSignOut, setIsSignOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || isSignOut) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    setIsSignOut(true);
    await auth.signOut();
    router.replace("/login");
  };

  // PANTALLA DE ESPERA: El usuario existe pero aún no tiene un rol asignado
  if (role === "pendiente") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-900/5">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Acceso Pendiente</h2>
          <p className="mt-3 text-sm text-gray-500">
            Tu cuenta <strong className="text-gray-800">{user.email}</strong> ha sido registrada exitosamente. El administrador del sistema debe asignarte un rol para que puedas acceder al panel de control.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Comunícate con el administrador de tu empresa y luego vuelve a iniciar sesión.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // RBAC Navigation Links
  const navLinks = [
    { name: "Inicio", href: "/dashboard", icon: "🏠", roles: ["admin", "operador", "inspector", "director"] },
    { name: "Clientes", href: "/dashboard/clientes", icon: "🏢", roles: ["admin", "operador"] },
    { name: "Alcance", href: "/dashboard/alcances", icon: "📚", roles: ["admin"] },
    { name: "Órdenes de Trabajo", href: "/dashboard/ordenes", icon: "📋", roles: ["admin", "operador", "inspector", "director"] },
    { name: "Aprobaciones", href: "/dashboard/aprobaciones", icon: "✅", roles: ["admin", "director"] },
    { name: "Usuarios y Roles", href: "/dashboard/admin", icon: "⚙️", roles: ["admin"] },
  ];

  const visibleLinks = navLinks.filter((link) => role && link.roles.includes(role));

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col shadow-sm">
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold tracking-tight text-blue-600">CertiXion</span>
          <span className="ml-2 text-xs font-medium text-gray-500 uppercase tracking-widest">{role}</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {visibleLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="text-lg">{link.icon}</span>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`}
              alt="User Avatar"
              className="h-10 w-10 rounded-full border border-gray-200"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-gray-900">{user.displayName || "Usuario"}</span>
              <span className="truncate text-xs text-gray-500">{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">Panel de Control</h1>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
