"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";
import Link from "next/link";

interface Orden {
  id: string;
  clienteNombre: string;
  edsNombre?: string;
  tipoInspeccion: string;
  itemId?: string;
  estado: string;
  fieldData?: any;
}

export default function CampoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Order Details
  const fetchOrden = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ordenes/${id}?tenantId=${TENANT_ID}`);
      if (!res.ok) throw new Error("No se pudo cargar la orden.");
      const data = await res.json();
      setOrden(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrden(); }, [fetchOrden]);

  if (isLoading) return <div className="p-10 text-center">Cargando...</div>;
  if (!orden) return <div className="p-10 text-center text-red-500">Orden no encontrada.</div>;

  const isHermeticidad = orden.tipoInspeccion.includes("HERM");
  const isEDS = orden.tipoInspeccion.includes("EDS");

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <Link href="/dashboard/ordenes" className="text-sm text-blue-600 hover:underline">← Volver a Órdenes</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Diligenciamiento de Campo</h1>
          <p className="text-sm text-gray-500">Orden: <span className="font-mono font-bold text-blue-600">{orden.id}</span> | {orden.clienteNombre}</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase">
            {orden.tipoInspeccion}
          </span>
          {orden.itemId && <p className="text-sm font-bold text-gray-700 mt-1">Ítem: {orden.itemId}</p>}
        </div>
      </div>

      {isHermeticidad ? (
        <HermeticidadChecklist orden={orden} isSaving={isSaving} setIsSaving={setIsSaving} router={router} />
      ) : isEDS ? (
        <EdsChecklist orden={orden} isSaving={isSaving} setIsSaving={setIsSaving} router={router} />
      ) : (
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-yellow-800">
          Este tipo de inspección aún no tiene una lista de chequeo digitalizada.
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE: LISTA DE CHEQUEO EDS ---
function EdsChecklist({ orden, isSaving, setIsSaving, router }: { orden: Orden, isSaving: boolean, setIsSaving: any, router: any }) {
  const [fieldData, setFieldData] = useState(orden.fieldData || {
    secciones: {
      tanques: [
        { label: "Tanques sin corrosión severa", checked: false },
        { label: "Sin fugas visibles en cualquier tanque", checked: false },
        { label: "Válvulas de corte funcionando", checked: false },
        { label: "Respiraderos sin obstrucciones", checked: false },
        { label: "Bocas de llenado con tapa hermética", checked: false },
        { label: "Combustible sin agua (prueba pomada)", checked: false },
      ],
      tuberias: [
        { label: "Sin oxidación severa", checked: false },
        { label: "Sin fugas visibles", checked: false },
        { label: "Soportes en buen estado", checked: false },
      ],
      retie: [
        { label: "Equipos ATEX en zonas clasificadas", checked: false },
        { label: "Puesta a tierra presente", checked: false },
        { label: "Resistencia tierra < 25 Ω", checked: false, value: "" },
      ],
      seguridad: [
        { label: "Extintores vigentes", checked: false, value: "" },
        { label: "Señalización reglamentaria", checked: false },
        { label: "Botiquín presente", checked: false },
      ]
    },
    observaciones: "",
    resultado: "CONFORME"
  });

  const toggleCheck = (section: string, index: number) => {
    const newSecciones = { ...fieldData.secciones };
    newSecciones[section][index].checked = !newSecciones[section][index].checked;
    setFieldData({ ...fieldData, secciones: newSecciones });
  };

  const setSectionValue = (section: string, index: number, value: string) => {
    const newSecciones = { ...fieldData.secciones };
    newSecciones[section][index].value = value;
    setFieldData({ ...fieldData, secciones: newSecciones });
  };

  const handleSave = async () => {
    if (!confirm("¿Está seguro de finalizar esta inspección? Se generará el informe en Google Drive.")) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ordenes/${orden.id}/field-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, fieldData, estado: 'finalizada' }),
      });
      if (res.ok) {
        alert("Datos guardados y reporte generado satisfactoriamente.");
        router.push("/dashboard/ordenes");
      } else {
        throw new Error("Error al guardar");
      }
    } catch (e) {
      alert("Error al guardar los datos.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 bg-white p-8 rounded-2xl border shadow-sm">
      <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500 text-sm italic text-gray-600">
        Esta inspección es GENERAL para toda la estación. No se discrimina por ID interno.
      </div>

      {Object.entries(fieldData.secciones).map(([key, items]: [string, any]) => (
        <section key={key}>
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 tracking-widest">{key}</h3>
          <div className="grid gap-3">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleCheck(key, idx)} 
                    className="h-5 w-5 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                {item.value !== undefined && (
                  <input type="text" value={item.value} onChange={(e) => setSectionValue(key, idx, e.target.value)}
                    placeholder="Medición..."
                    className="w-32 border rounded px-2 py-1 text-xs" />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Observaciones</h3>
        <textarea value={fieldData.observaciones} onChange={(e) => setFieldData({ ...fieldData, observaciones: e.target.value })}
          className="w-full border rounded-lg p-3 text-sm min-h-[100px]" placeholder="Escriba aquí hallazgos o novedades..." />
      </section>

      <section className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-sm font-bold text-blue-900 mb-4 uppercase">Resultado de la Inspección</h3>
        <div className="flex gap-4">
          {["CONFORME", "CONFORME CON OBS.", "NO CONFORME"].map(res => (
            <label key={res} className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer font-bold text-xs transition-all ${fieldData.resultado === res ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'bg-white border-gray-200 text-gray-500'}`}>
              <input type="radio" className="hidden" name="resultado" value={res} checked={fieldData.resultado === res} onChange={() => setFieldData({ ...fieldData, resultado: res })} />
              {res}
            </label>
          ))}
        </div>
      </section>

      <button onClick={handleSave} disabled={isSaving}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50">
        {isSaving ? "Guardando..." : "FINALIZAR Y GENERAR INFORME"}
      </button>
    </div>
  );
}

// --- COMPONENTE: LISTA DE CHEQUEO HERMETICIDAD ---
function HermeticidadChecklist({ orden, isSaving, setIsSaving, router }: { orden: Orden, isSaving: boolean, setIsSaving: any, router: any }) {
  const [fieldData, setFieldData] = useState(orden.fieldData || {
    fuelType: "Gasolina",
    capacity: "",
    targetPSI: "",
    manometroId: "",
    readings: Array(13).fill(null).map((_, i) => ({ minute: i * 5, psi: "", temp: "", obs: i === 0 ? "INICIO" : (i === 12 ? "FIN" : "") })),
    resultado: "PENDIENTE"
  });

  const updateReading = (idx: number, field: string, value: string) => {
    const newReadings = [...fieldData.readings];
    newReadings[idx][field] = value;
    
    // Auto-calculate results if it's the 5 and 60 reading
    let newResultado = "PENDIENTE";
    const psi5 = parseFloat(newReadings[1]?.psi);
    const psi60 = parseFloat(newReadings[12]?.psi);
    
    if (!isNaN(psi5) && !isNaN(psi60)) {
       const drop = psi5 - psi60;
       newResultado = drop < 0.5 ? "CONFORME" : "NO CONFORME";
    }

    setFieldData({ ...fieldData, readings: newReadings, resultado: newResultado });
  };

  const handleSave = async () => {
    if (!confirm("¿Está seguro de finalizar la prueba? Se generará el informe en Google Drive.")) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ordenes/${orden.id}/field-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, fieldData, estado: 'finalizada' }),
      });
      if (res.ok) {
        alert("Prueba terminada satisfactoriamente.");
        router.push("/dashboard/ordenes");
      } else {
        throw new Error("Error al guardar");
      }
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 bg-white p-8 rounded-2xl border shadow-sm">
      <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase">Combustible</label>
          <select value={fieldData.fuelType} onChange={(e) => setFieldData({ ...fieldData, fuelType: e.target.value })}
            className="w-full bg-transparent border-b border-gray-300 py-1 font-bold focus:outline-none focus:border-blue-500">
            {["Gasolina", "ACPM", "Diesel", "Mezcla"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase">Capacidad (Gal)</label>
          <input type="text" value={fieldData.capacity} onChange={(e) => setFieldData({ ...fieldData, capacity: e.target.value })}
            className="w-full bg-transparent border-b border-gray-300 py-1 font-bold focus:outline-none focus:border-blue-500" placeholder="Ej. 10000" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase">Presión Objetivo (PSI)</label>
          <input type="text" value={fieldData.targetPSI} onChange={(e) => setFieldData({ ...fieldData, targetPSI: e.target.value })}
            className="w-full bg-transparent border-b border-gray-300 py-1 font-bold focus:outline-none focus:border-blue-500" placeholder="Ej. 5.0" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase">ID Manómetro</label>
          <input type="text" value={fieldData.manometroId} onChange={(e) => setFieldData({ ...fieldData, manometroId: e.target.value })}
            className="w-full bg-transparent border-b border-gray-300 py-1 font-bold focus:outline-none focus:border-blue-500" placeholder="Ej. CERT-098" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-white font-bold text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Minuto</th>
              <th className="px-4 py-3">PSI</th>
              <th className="px-4 py-3">Temp °C</th>
              <th className="px-4 py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fieldData.readings.map((reading: any, idx: number) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-mono font-bold text-gray-500">{reading.minute}</td>
                <td className="px-4 py-2"><input type="number" step="0.01" value={reading.psi} onChange={(e) => updateReading(idx, 'psi', e.target.value)} className="w-full border-none bg-transparent focus:ring-0 font-bold p-0" placeholder="0.00" /></td>
                <td className="px-4 py-2"><input type="number" step="0.1" value={reading.temp} onChange={(e) => updateReading(idx, 'temp', e.target.value)} className="w-full border-none bg-transparent focus:ring-0 p-0 text-gray-600" placeholder="0.0" /></td>
                <td className="px-4 py-2"><input type="text" value={reading.obs} onChange={(e) => updateReading(idx, 'obs', e.target.value)} className="w-full border-none bg-transparent focus:ring-0 p-0 text-xs text-gray-400 italic" placeholder="..." /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`p-6 rounded-2xl border-4 text-center transition-all ${fieldData.resultado === "CONFORME" ? 'bg-green-50 border-green-500 text-green-800' : fieldData.resultado === "NO CONFORME" ? 'bg-red-50 border-red-500 text-red-800' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1">Resultado del Análisis</p>
        <h2 className="text-3xl font-black">{fieldData.resultado}</h2>
        {fieldData.resultado !== "PENDIENTE" && (
          <p className="mt-2 text-xs font-medium">Caída permitida: &lt; 0.5 PSI | Caída detectada: {(parseFloat(fieldData.readings[1].psi) - parseFloat(fieldData.readings[12].psi)).toFixed(2)} PSI</p>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50">
        {isSaving ? "Guardando..." : "GUARDAR Y FINALIZAR PRUEBA"}
      </button>
    </div>
  );
}
