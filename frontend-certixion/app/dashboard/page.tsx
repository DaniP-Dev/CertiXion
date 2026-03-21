"use client";

import { useAuth } from "@/context/AuthContext";

export default function DashboardHomePage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Hola, {user?.displayName || "Usuario"} 👋
        </h2>
        <p className="mt-2 text-gray-600">
          Bienvenido al centro de operaciones de CertiXion. Tu nivel de acceso
          actual es: <strong className="uppercase text-blue-600">{role}</strong>.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Example KPI Cards */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Clientes Activos
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">12</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Órdenes Pendientes
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">4</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Informes Aprobados
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">28</p>
        </div>
      </div>
    </div>
  );
}
