"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

interface Cliente {
  id: string;
  nombre: string;
}

interface Estacion {
  id: string;
  clienteId: string;
  nombreEDS: string;
  sicom?: string;
  ciudad?: string;
  departamento?: string;
  direccion?: string;
  contactoLocal?: string;
  telefonoContacto?: string;
}

const emptyForm = {
  clienteId: "",
  nombreEDS: "",
  sicom: "",
  ciudad: "",
  departamento: "",
  direccion: "",
  contactoLocal: "",
  telefonoContacto: ""
};

export default function EstacionesPage() {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [estRes, cliRes] = await Promise.all([
        fetch(`${BACKEND_URL}/estaciones?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/clientes?tenantId=${TENANT_ID}`)
      ]);
      const estData = await estRes.json();
      const cliData = await cliRes.json();
      setEstaciones(Array.isArray(estData) ? estData : []);
      setClientes(Array.isArray(cliData) ? cliData : []);
    } catch {
      setErrorMsg("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCrearEstacion = async () => {
    if (!form.clienteId || !form.nombreEDS.trim()) { 
      setErrorMsg("Cliente y Nombre de la Estación son obligatorios."); 
      return; 
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/estaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, ...form }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al guardar la estación.");
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      fetchAll();
    } catch (e: any) {
      setErrorMsg(e.message || "Error inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  const [filterCliente, setFilterCliente] = useState("");
  const filteredEstaciones = filterCliente
    ? estaciones.filter(e => e.clienteId === filterCliente)
    : estaciones;

  const getClienteNombre = (id: string) => {
    return clientes.find(c => c.id === id)?.nombre || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Directorio de Sedes (EDS)</h1>
          <p className="mt-1 text-sm text-gray-500">Administra las ubicaciones físicas vinculadas a tus clientes.</p>
        </div>
        {(role === "admin" || role === "operador") && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors">
            📍 Nueva Sede / EDS
          </button>
        )}
      </div>

      {clientes.length > 0 && (
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
          <label className="text-sm font-medium text-gray-600">Filtrar Sedes del Cliente:</label>
          <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[250px]">
            <option value="">Todas las sedes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : estaciones.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <p className="text-4xl">📍</p>
            <p className="mt-4 font-medium">Aún no hay estaciones registradas.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">EDS</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente (Propietario)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Ubicación</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SICOM</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contacto Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredEstaciones.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{e.nombreEDS}</p>
                    <p className="text-xs font-mono text-gray-400">ID: {e.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-blue-700">{getClienteNombre(e.clienteId)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{e.ciudad || "—"}, {e.departamento || "—"}</p>
                    {e.direccion && <p className="text-xs text-gray-500">{e.direccion}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono font-medium">{e.sicom || "—"}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{e.contactoLocal || "—"}</p>
                    {e.telefonoContacto && <p className="text-xs text-gray-500">{e.telefonoContacto}</p>}
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
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Registrar Nueva Estación / Sede</h3>
                <p className="text-xs text-gray-500">Asigna la sede física a la organización correspondiente.</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); setForm(emptyForm); }}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
            </div>

            <div className="space-y-4 p-6">
              {errorMsg && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">{errorMsg}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Cliente (Dueño) <span className="text-red-500">*</span></label>
                  <select value={form.clienteId} onChange={e => setField("clienteId", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50 font-medium">
                    <option value="">— Seleccionar cliente a vincular —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              <hr className="my-2 border-gray-100" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Datos Físicos de la Estación</h4>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Nombre de la EDS <span className="text-red-500">*</span></label>
                  <input type="text" value={form.nombreEDS} onChange={e => setField("nombreEDS", e.target.value)} placeholder="Ej. EDS Los Pinos"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" autoFocus />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Código SICOM</label>
                  <input type="text" value={form.sicom} onChange={e => setField("sicom", e.target.value)} placeholder="Ej. 123456"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input type="text" value={form.ciudad} onChange={e => setField("ciudad", e.target.value)} placeholder="Ej. Bogotá"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departamento</label>
                  <input type="text" value={form.departamento} onChange={e => setField("departamento", e.target.value)} placeholder="Ej. Cundinamarca"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Dirección Exacta</label>
                  <input type="text" value={form.direccion} onChange={e => setField("direccion", e.target.value)} placeholder="Ej. Km 3 Vía..."
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Administrador / Contacto Local</label>
                  <input type="text" value={form.contactoLocal} onChange={e => setField("contactoLocal", e.target.value)} placeholder="Nombre del contacto"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono Local</label>
                  <input type="tel" value={form.telefonoContacto} onChange={e => setField("telefonoContacto", e.target.value)} placeholder="300 000 0000"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); setForm(emptyForm); }}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCrearEstacion} disabled={isSaving || !form.nombreEDS.trim() || !form.clienteId}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {isSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {isSaving ? "Guardando..." : "Guardar Estación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
