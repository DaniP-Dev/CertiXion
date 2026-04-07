"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";
import Link from "next/link";

interface Plantilla {
  id: string;
  driveFileId: string;
  nombre: string;
  tipo: 'Google_Docs' | 'Google_Sheets' | 'Google_Slides';
  updatedAt?: string;
}

export default function PlantillasPage() {
  const { role } = useAuth();
  const [plantillas, setPlantillas] = useState<Record<string, Plantilla>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/plantillas?tenantId=${TENANT_ID}`);
      const data = await res.json();
      const mapped = (data as Plantilla[]).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      setPlantillas(mapped);
    } catch (e) {
      console.error("Error fetching plantillas", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string, driveFileId: string, nombre: string, tipo: Plantilla['tipo']) => {
    setSaving(id);
    try {
      const res = await fetch(`${BACKEND_URL}/plantillas/${id}?tenantId=${TENANT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId, nombre, tipo }),
      });
      if (res.ok) {
        await fetchPlantillas();
      }
    } catch (e) {
      console.error("Error saving plantilla", e);
    } finally {
      setSaving(null);
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-gray-500">Solo administradores pueden gestionar las plantillas.</p>
      </div>
    );
  }

  const PlantillaCard = ({ id, label, icon, tipo, colorClass, placeholder }: { id: string, label: string, icon: string, tipo: Plantilla['tipo'], colorClass: string, placeholder: string }) => {
    const p = plantillas[id] || { driveFileId: "", nombre: "" };
    const [tempId, setTempId] = useState(p.driveFileId);

    // Actualizar tempId si p.driveFileId cambia (cuando se cargan los datos)
    useEffect(() => {
      setTempId(p.driveFileId);
    }, [p.driveFileId]);

    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4 border-t-4 ${colorClass}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">{tipo.replace('_', ' ')}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ID de Google Drive</label>
          <input 
            type="text" 
            placeholder={placeholder}
            value={tempId}
            onChange={(e) => setTempId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono"
          />
        </div>

        <button 
          onClick={() => handleSave(id, tempId, label, tipo)}
          disabled={saving === id || tempId === p.driveFileId}
          className={`w-full py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
            tempId === p.driveFileId 
            ? 'bg-gray-100 text-gray-400 cursor-default' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          {saving === id ? "Guardando..." : tempId === p.driveFileId ? "Viculado ✅" : "Vincular Plantilla"}
        </button>
        
        {p.updatedAt && (
          <p className="text-[10px] text-center text-gray-400">
            Última actualización: {new Date(p.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/configuracion" className="text-sm font-medium text-blue-600 hover:underline">
              ← Volver a Configuración
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gestor de Plantillas</h1>
          <p className="text-sm text-gray-500">Pega el ID de tus archivos de Google Drive para usarlos como base en la generación de documentos.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <PlantillaCard 
            id="OT" 
            label="Orden de Trabajo" 
            icon="📄" 
            tipo="Google_Docs" 
            colorClass="border-t-blue-500"
            placeholder="ID del Google Doc..."
          />
          <PlantillaCard 
            id="CAMPO" 
            label="Informe de Campo" 
            icon="📊" 
            tipo="Google_Sheets" 
            colorClass="border-t-green-500"
            placeholder="ID del Google Sheet..."
          />
          <PlantillaCard 
            id="CERTIFICADO" 
            label="Certificado Final" 
            icon="🖼️" 
            tipo="Google_Slides" 
            colorClass="border-t-yellow-500"
            placeholder="ID del Google Slide..."
          />
        </div>
      )}

      <div className="rounded-xl bg-blue-50 p-6 border border-blue-100">
        <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">💡 ¿Cómo obtener el ID?</h3>
        <p className="text-blue-800 text-sm">
          Abre tu archivo en Google Drive. El ID es la cadena de caracteres que aparece después de <code className="bg-blue-100 px-1 rounded">/d/</code> y antes de <code className="bg-blue-100 px-1 rounded">/edit</code> en la URL.
        </p>
        <p className="text-blue-700 text-xs mt-2 italic">
          Ejemplo: docs.google.com/document/d/<span className="font-bold underline">1ABC...XYZ</span>/edit
        </p>
      </div>
    </div>
  );
}
