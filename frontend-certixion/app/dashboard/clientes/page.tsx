"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

interface Cliente {
  id: string;
  nombre: string;
  nit?: string;
  ciudad?: string;
  departamento?: string;
  representanteLegal?: string;
  email?: string;
  contacto?: string;
  telefono?: string;
  createdAt: string;
  driveFolderId?: string;
  documentosFolderId?: string;
}

const emptyForm = { 
  nombre: "", 
  nit: "", 
  ciudad: "",
  departamento: "",
  representanteLegal: "",
  email: "",
  contacto: "", 
  telefono: "" 
};

export default function ClientesPage() {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const fetchClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/clientes?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setErrorMsg("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleCrearCliente = async () => {
    if (!form.nombre.trim()) { setErrorMsg("El nombre es obligatorio."); return; }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, ...form }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al guardar el cliente.");
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      fetchClientes();
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
          <p className="mt-1 text-sm text-gray-500">Gestiona los clientes y sus documentos de soporte.</p>
        </div>
        {(role === "admin" || role === "operador") && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
            📝 Nuevo Cliente
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
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Empresa / NIT</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Ubicación Corp.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {clientes.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-bold text-blue-700">{c.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                    {c.nit && <p className="text-xs text-gray-400">NIT: {c.nit}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{c.contacto || "—"}</p>
                    {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.ciudad || "—"}, {c.departamento || "—"}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {c.driveFolderId && (
                      <a href={`https://drive.google.com/drive/folders/${c.driveFolderId}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-900">Expediente →</a>
                    )}
                    {c.documentosFolderId && (
                      <a href={`https://drive.google.com/drive/folders/${c.documentosFolderId}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-green-600 hover:text-green-900">Docs →</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Registrar Cliente</h3>
                <p className="text-xs text-gray-500">Esta info se pre-cargará automáticamente en cada orden.</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); setForm(emptyForm); }}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
            </div>

            <div className="space-y-4 p-6">
              {errorMsg && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Nombre / Razón Social <span className="text-red-500">*</span></label>
                  <input type="text" value={form.nombre} onChange={e => setField("nombre", e.target.value)} placeholder="Ej. Estación EDS Los Pinos"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">NIT</label>
                  <input type="text" value={form.nit} onChange={e => setField("nit", e.target.value)} placeholder="900.123.456-7"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input type="text" value={form.ciudad} onChange={e => setField("ciudad", e.target.value)} placeholder="Ej. Bogotá"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departamento</label>
                  <input type="text" value={form.departamento} onChange={e => setField("departamento", e.target.value)} placeholder="Ej. Cundinamarca"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Representante Legal</label>
                  <input type="text" value={form.representanteLegal} onChange={e => setField("representanteLegal", e.target.value)} placeholder="Nombre completo"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                  <input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="cliente@empresa.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Persona de Contacto</label>
                  <input type="text" value={form.contacto} onChange={e => setField("contacto", e.target.value)} placeholder="Gerente / Administrador"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setField("telefono", e.target.value)} placeholder="300 000 0000"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                <p>📁 Se creará automáticamente en Drive:</p>
                <p className="mt-1 font-medium text-gray-700">Clientes → <span className="text-blue-700">{form.nombre || "Nombre de empresa"}</span> → Documentos</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); setForm(emptyForm); }}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCrearCliente} disabled={isSaving || !form.nombre.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                {isSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {isSaving ? "Creando..." : "Guardar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
