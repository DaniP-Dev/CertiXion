"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";

const BACKEND_URL = "http://localhost:3000";
const TENANT_ID = "danidevcol@gmail.com"; // Temporal: se obtiene del perfil del usuario

interface Cliente {
  id: string;
  nombre: string;
  createdAt: string;
  driveFolderId?: string;
}

export default function ClientesPage() {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/clientes?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setClientes(data);
    } catch {
      setErrorMsg("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleCrearCliente = async () => {
    if (!nuevoNombre.trim()) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, nombre: nuevoNombre }),
      });
      if (!res.ok) throw new Error("Error al guardar el cliente.");
      setIsModalOpen(false);
      setNuevoNombre("");
      fetchClientes(); // Refresca la tabla
    } catch (e: any) {
      setErrorMsg(e.message || "Error inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Directorio de Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los clientes de tu organización y sus inspecciones.
          </p>
        </div>
        {(role === "admin" || role === "operador") && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>📝</span>
            Nuevo Cliente
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <p className="text-4xl">📂</p>
            <p className="mt-4 font-medium">Aún no hay clientes registrados.</p>
            <p className="text-sm">Crea el primero con el botón de arriba.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Empresa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha de Creación</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {clientes.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-blue-700">{c.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{c.nombre}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {c.driveFolderId ? (
                      <a
                        href={`https://drive.google.com/drive/folders/${c.driveFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        Abrir en Drive →
                      </a>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Registrar Nuevo Cliente</h3>
            <p className="mt-1 text-sm text-gray-500">Se creará automáticamente su carpeta en Google Drive.</p>
            {errorMsg && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCrearCliente()}
                placeholder="Ej. Ingeniería López S.A.S."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setIsModalOpen(false); setNuevoNombre(""); setErrorMsg(null); }}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCliente}
                disabled={isSaving || !nuevoNombre.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {isSaving ? "Creando..." : "Guardar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
