"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

interface PuntoHermeticidad {
  punto: string;
  presionInicio: string;
  presionFinal: string;
  tiempoPrueba: string;
  temperatura: string;
  resultado: "Aprueba" | "No Aprueba";
  observaciones: string;
}

const emptyPunto = (): PuntoHermeticidad => ({
  punto: "", presionInicio: "", presionFinal: "", tiempoPrueba: "",
  temperatura: "", resultado: "Aprueba", observaciones: "",
});

export default function ChecklistHermeticidadPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const ordenId = params?.ordenId as string;

  const [fechaInspeccion, setFechaInspeccion] = useState("");
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [puntos, setPuntos] = useState<PuntoHermeticidad[]>([emptyPunto()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updatePunto = (idx: number, key: keyof PuntoHermeticidad, value: string) => {
    setPuntos(prev => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  };

  const addPunto = () => setPuntos(prev => [...prev, emptyPunto()]);
  const removePunto = (idx: number) => setPuntos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!fechaInspeccion) { setErrorMsg("La fecha es obligatoria"); return; }
    if (puntos.some(p => !p.punto.trim())) { setErrorMsg("El nombre del punto es obligatorio"); return; }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/datos-campo/hermeticidad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          datos: {
            ordenId,
            inspector: user?.displayName || user?.email || "Inspector",
            fechaInspeccion,
            observacionesGenerales,
            puntos: puntos.map(p => ({
              ...p,
              presionInicio: parseFloat(p.presionInicio) || 0,
              presionFinal: parseFloat(p.presionFinal) || 0,
              tiempoPrueba: parseFloat(p.tiempoPrueba) || 0,
              temperatura: parseFloat(p.temperatura) || 0,
            })),
          },
        }),
      });

      if (!res.ok) throw new Error("Error al generar el reporte");
      const data = await res.json();
      setSuccessLink(data.driveLink);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successLink) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
        <h2 className="text-xl font-bold">¡Excel Generado!</h2>
        <p className="text-gray-500">El informe se ha guardado en la carpeta de la orden en Drive.</p>
        <div className="flex gap-4">
          <a href={successLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700">Ver en Drive</a>
          <button onClick={() => router.push("/dashboard/ordenes")} className="rounded-lg border border-gray-300 px-6 py-2 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.back()} className="hover:underline">Órdenes</button>
        <span>/</span>
        <span className="font-mono">{ordenId}</span>
      </div>
      
      <h1 className="text-2xl font-bold">Informe de Campo: Hermeticidad</h1>

      {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{errorMsg}</div>}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Inspector</label>
          <input type="text" value={user?.displayName || user?.email || ""} readOnly className="mt-1 w-full rounded-lg border-gray-100 bg-gray-50 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha Inspección *</label>
          <input type="date" value={fechaInspeccion} onChange={e => setFechaInspeccion(e.target.value)} className="mt-1 w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-blue-500" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700 text-sm">PUNTOS DE PRUEBA</h3>
          <button onClick={addPunto} className="text-sm font-semibold text-blue-600 hover:text-blue-800">+ Agregar Punto</button>
        </div>
        <div className="divide-y divide-gray-100">
          {puntos.map((p, idx) => (
            <div key={idx} className="p-6 space-y-4 bg-white">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">PUNTO #{idx + 1}</span>
                {puntos.length > 1 && <button onClick={() => removePunto(idx)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>}
              </div>
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-3">
                  <label className="block text-xs text-gray-500">Lugar / Tubería</label>
                  <input type="text" value={p.punto} onChange={e => updatePunto(idx, "punto", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">P. Inicio</label>
                  <input type="number" value={p.presionInicio} onChange={e => updatePunto(idx, "presionInicio", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">P. Final</label>
                  <input type="number" value={p.presionFinal} onChange={e => updatePunto(idx, "presionFinal", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Tiempo (min)</label>
                  <input type="number" value={p.tiempoPrueba} onChange={e => updatePunto(idx, "tiempoPrueba", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Temp (°C)</label>
                  <input type="number" value={p.temperatura} onChange={e => updatePunto(idx, "temperatura", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500">Resultado</label>
                  <select value={p.resultado} onChange={e => updatePunto(idx, "resultado", e.target.value as any)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm">
                    <option value="Aprueba">Aprueba</option>
                    <option value="No Aprueba">No Aprueba</option>
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs text-gray-500">Observaciones</label>
                  <input type="text" value={p.observaciones} onChange={e => updatePunto(idx, "observaciones", e.target.value)} className="mt-1 w-full rounded border-gray-300 px-2 py-1.5 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Observaciones Generales</label>
        <textarea value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} className="mt-2 w-full rounded-lg border-gray-300 px-3 py-2 text-sm h-24" />
      </div>

      <button onClick={handleSubmit} disabled={isSubmitting} className="w-full rounded-xl bg-blue-600 py-4 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg">
        {isSubmitting ? "GENERANDO EXCEL..." : "📊 GUARDAR Y GENERAR EXCEL"}
      </button>
    </div>
  );
}
