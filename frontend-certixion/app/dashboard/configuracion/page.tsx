"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

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
    if (!confirm("¿Estás seguro de que deseas reiniciar el mapeo de carpetas? Esto hará que CertiXion cree nuevas carpetas (01_..., 02_...) en tu Drive la próxima vez que realices una acción.")) {
      return;
    }
    setIsResetting(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/configuracion/reset-drive/${TENANT_ID}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al reiniciar");
      setMessage({ text: "Mapeo reiniciado. Las carpetas se regenerarán al crear un cliente o alcance.", type: "success" });
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500">Personaliza la identidad de tu empresa y gestiona la integración con Drive.</p>
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

      <div className="flex justify-end">
        <button onClick={handleSaveSettings} disabled={isSaving}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {/* Sección Peligrosa: Reset Drive */}
      <div className="rounded-xl border border-red-100 bg-red-50/30 p-6 mt-12">
        <h2 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">⚠️ Zona de Peligro</h2>
        <p className="text-sm text-red-600 mb-6 line-clamp-2">
          Si cambiaste de cuenta de Google Drive o deseas regenerar la estructura de carpetas (01_Alcance, 02_Clientes), puedes reiniciar el mapeo. 
          CertiXion volverá a crear las carpetas en tu Drive la próxima vez que crees un cliente o servicio.
        </p>
        <button onClick={handleResetDrive} disabled={isResetting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-50">
          {isResetting ? "Reiniciando..." : "Reiniciar Mapeo de Carpetas"}
        </button>
      </div>
    </div>
  );
}
