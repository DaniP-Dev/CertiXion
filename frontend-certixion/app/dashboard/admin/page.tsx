"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const BACKEND_URL = "http://localhost:3001";
const TENANT_ID = "danidevcol@gmail.com";

const ROLES = ["admin", "operador", "inspector", "director", "pendiente"];

const rolColors: Record<string, string> = {
  admin:     "bg-blue-100 text-blue-800",
  operador:  "bg-green-100 text-green-800",
  inspector: "bg-yellow-100 text-yellow-800",
  director:  "bg-purple-100 text-purple-800",
  pendiente: "bg-orange-100 text-orange-800",
};

interface Usuario {
  email: string;
  displayName: string;
  photoURL: string;
  rol: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [selectedRol, setSelectedRol] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/usuarios?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleEditStart = (usuario: Usuario) => {
    setEditingEmail(usuario.email);
    setSelectedRol(usuario.rol);
    setSuccessMsg(null);
  };

  const handleSaveRol = async (email: string) => {
    setIsSaving(true);
    try {
      const encodedEmail = encodeURIComponent(email);
      await fetch(`${BACKEND_URL}/usuarios/${encodedEmail}/rol?tenantId=${TENANT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: selectedRol }),
      });
      setSuccessMsg(`✅ Rol de ${email} actualizado a "${selectedRol}".`);
      setEditingEmail(null);
      fetchUsuarios();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios y Roles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Asigna roles a los miembros de tu organización. Solo el Admin puede modificar esto.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-200">
          {successMsg}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Equipo de Trabajo</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl">👥</p>
            <p className="mt-4 font-medium">Aún no hay usuarios registrados.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {usuarios.map((usuario) => (
              <li key={usuario.email} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <img
                    src={usuario.photoURL || `https://ui-avatars.com/api/?name=${usuario.email}`}
                    alt={usuario.displayName}
                    className="h-10 w-10 rounded-full border border-gray-200"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{usuario.displayName || usuario.email}</p>
                    <p className="text-sm text-gray-500">{usuario.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editingEmail === usuario.email ? (
                    <>
                      <select
                        value={selectedRol}
                        onChange={(e) => setSelectedRol(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveRol(usuario.email)}
                        disabled={isSaving}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? "..." : "Guardar"}
                      </button>
                      <button
                        onClick={() => setEditingEmail(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${rolColors[usuario.rol] || "bg-gray-100 text-gray-700"}`}>
                        {usuario.rol}
                      </span>
                      {usuario.email !== currentUser?.email && (
                        <button
                          onClick={() => handleEditStart(usuario)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Editar Rol
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
