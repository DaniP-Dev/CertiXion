"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

interface Alcance {
  id: string;
  nombre: string;
  folderId: string;
  subFolders: {
    procedimientos: string;
    informes: string;
    registros: string;
  };
}

export default function AlcancesPage() {
  const { role } = useAuth();
  const [alcances, setAlcances] = useState<Alcance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ id: "", nombre: "" });

  const fetchAlcances = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/alcances/${TENANT_ID}`);
      const data = await res.json();
      setAlcances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching alcances:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlcances();
  }, []);

  const PREDEFINED_ALCANCES = [
    { id: "INS-EDS", nombre: "Inspección de Estación de Servicio" },
    { id: "INS-HERM-L", nombre: "Hermeticidad en Líneas" },
    { id: "INS-HERM-T", nombre: "Hermeticidad en Tanques" },
  ];

  const handleCreate = async () => {
    if (!form.id) {
      setErrorMsg("Debes seleccionar un alcance de la lista");
      return;
    }
    const selected = PREDEFINED_ALCANCES.find(a => a.id === form.id);
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/alcances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, id: selected?.id, nombre: selected?.nombre }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al crear alcance");
      }
      await fetchAlcances();
      setIsModalOpen(false);
      setForm({ id: "", nombre: "" });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-gray-500">Solo administradores pueden gestionar el Alcance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Alcance</h1>
          <p className="text-sm text-gray-500">Define los tipos de inspección acreditados y sus carpetas de procedimientos.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all">
          ➕ Definir Alcance
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : alcances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center text-gray-400">
          <p className="text-4xl">📚</p>
          <p className="mt-4">No se han definido alcances técnicos aún.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {alcances.map((alcance) => (
            <div key={alcance.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600 uppercase">{alcance.id}</span>
                  <h3 className="text-lg font-bold text-gray-900">{alcance.nombre}</h3>
                </div>
                <a href={`https://drive.google.com/drive/folders/${alcance.folderId}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline">Abrir en Drive ↗</a>
              </div>
              
              <div className="space-y-2 border-t border-gray-50 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Procedimientos y Formatos</span>
                  <a href={`https://drive.google.com/drive/folders/${alcance.subFolders.procedimientos}`} target="_blank" className="text-blue-500 hover:underline">00_📂</a>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Informes Modelo</span>
                  <a href={`https://drive.google.com/drive/folders/${alcance.subFolders.informes}`} target="_blank" className="text-blue-500 hover:underline">01_📂</a>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Registros Piloto</span>
                  <a href={`https://drive.google.com/drive/folders/${alcance.subFolders.registros}`} target="_blank" className="text-blue-500 hover:underline">02_📂</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900">Definir Nuevo Alcance</h2>
            <p className="text-xs text-gray-500 mb-6">Selecciona uno de los alcances permitidos para inicializar su estructura en Drive.</p>
            
            {errorMsg && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Alcance <span className="text-red-500">*</span></label>
                <select value={form.id} onChange={e => setForm({ ...form, id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none">
                  <option value="">— Seleccionar alcance —</option>
                  {PREDEFINED_ALCANCES.filter(pa => !alcances.some(a => a.id === pa.id)).map(pa => (
                    <option key={pa.id} value={pa.id}>{pa.nombre}</option>
                  ))}
                </select>
                {alcances.length >= PREDEFINED_ALCANCES.length && (
                  <p className="mt-2 text-xs text-amber-600 italic">Ya has definido todos los alcances disponibles.</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={isSaving || !form.id}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? "Creando..." : "Definir Alcance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
