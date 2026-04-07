"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";
import Link from "next/link";

export default function ConfiguracionPage() {
  const { role } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    nombreEmpresa: "",
    logoUrl: "",
    prefijoCliente: "CLI",
    prefijoOrden: "INS",
  });

  const handleResetDrive = async () => {
    setIsResetting(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/configuracion/sync-drive/${TENANT_ID}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al sincronizar");
      setMessage({ text: "Estructura de Drive sincronizada exitosamente.", type: "success" });
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/configuracion/${TENANT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setMessage({ text: "Configuración guardada correctamente.", type: "success" });
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-gray-500">Solo administradores pueden acceder a la configuración global.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500">Personaliza la identidad de tu empresa y gestiona la integración con Drive.</p>
        </div>
        <Link 
          href="/dashboard/configuracion/plantillas" 
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
        >
          📄 Gestión de Plantillas
        </Link>
      </div>

      {message && (
        <div className={`rounded-lg p-4 text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Sección 1: Identidad */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">🏢 Identidad de la Empresa</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de la Organización</label>
            <input type="text" value={form.nombreEmpresa} onChange={e => setForm({ ...form, nombreEmpresa: e.target.value })}
              placeholder="Ej. Soluciones Técnicas S.A.S" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">URL del Logo (Próximamente subida de archivo)</label>
            <input type="text" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Sección 2: Consecutivos */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">🔢 Prefijos y Consecutivos</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Prefijo Clientes</label>
            <input type="text" value={form.prefijoCliente} onChange={e => setForm({ ...form, prefijoCliente: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500" />
            <p className="mt-1 text-xs text-gray-400 italic font-mono">Generará: {form.prefijoCliente}-001</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Prefijo Órdenes</label>
            <input type="text" value={form.prefijoOrden} onChange={e => setForm({ ...form, prefijoOrden: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500" />
            <p className="mt-1 text-xs text-gray-400 italic font-mono">Generará: {form.prefijoOrden}-2026-001</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={handleSaveSettings} disabled={isSaving}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Sincronización de Drive</h3>
          <p className="text-xs text-gray-500">¿Faltan carpetas? El sistema las detectará y vinculará automáticamente. Si los permisos caducan, debes volver a autorizar la cuenta.</p>
        </div>
        <div className="flex gap-4">
          <a href={`${BACKEND_URL}/auth/google`} target="_blank" rel="noopener noreferrer"
             className="text-sm font-medium rounded bg-red-50 text-red-600 border border-red-200 px-4 py-2 hover:bg-red-100 transition-colors">
            🔑 Autorizar Google Drive
          </a>
          <button onClick={handleResetDrive} disabled={isResetting}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-4 py-2">
            {isResetting ? "Sincronizando..." : "Sincronizar Estructura"}
          </button>
        </div>
      </div>
    </div>
  );
}
