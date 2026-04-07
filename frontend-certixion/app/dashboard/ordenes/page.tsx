     "use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BACKEND_URL, TENANT_ID } from "@/lib/api";

// interface Alcance { id: string; nombre: string; } // Defined below or inline


const VENTANAS_HORARIAS = ["Mañana (6am - 12pm)", "Tarde (12pm - 6pm)", "Día completo"];

interface Cliente { id: string; nombre: string; direccion?: string; contacto?: string; telefono?: string; }
interface Inspector { email: string; displayName: string; }
interface Alcance { id: string; nombre: string; }
interface Estacion {
  id: string; clienteId: string; nombreEDS: string;
  direccion?: string; ciudad?: string; departamento?: string;
}
interface Orden {
  id: string; clienteId: string; clienteNombre?: string; estacionId?: string; estacionNombre?: string; edsNombre?: string; descripcion?: string;
  tipoInspeccion?: string; estado: string; driveFolderId?: string;
  fechaProgramada?: string; inspectorEmail?: string; createdAt: string;
  informeCampoLink?: string;
}

const estadoColors: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  "en proceso": "bg-blue-100 text-blue-800",
  finalizada: "bg-green-100 text-green-800",
  aprobada: "bg-purple-100 text-purple-800",
};

export default function OrdenesPage() {
  const { role } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [inspectores, setInspectores] = useState<Inspector[]>([]);
  const [alcances, setAlcances] = useState<Alcance[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    clienteId: "",
    estacionId: "", 
    itemId: "", 
    tipoInspeccion: [] as string[], 
    descripcion: "",
    fechaProgramada: "",
    fechaSugerida: "", 
    inspectorEmail: "",
    inspectorCelular: "",
    inspectorCompetencia: "Técnica - ISO 17020",
    inspectorAutorizacion: "Vigente",
    ventanaHoraria: "",
    observacionesLogisticas: "",
    horarioEspecial: "", 
    condiciones: "", 
    solicitanteNombre: "", 
    solicitanteCargo: "", 
    resultadoValidacion: "La orden se acepta sin observaciones",
  });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordenesRes, clientesRes, usuariosRes, alcancesRes, estacionesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/ordenes?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/clientes?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/usuarios?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/alcances/${TENANT_ID}`),
        fetch(`${BACKEND_URL}/estaciones?tenantId=${TENANT_ID}`),
      ]);
      const [ordenesData, clientesData, usuariosData, alcancesData, estacionesData] = await Promise.all([
        ordenesRes.json(), clientesRes.json(), usuariosRes.json(), alcancesRes.json(), estacionesRes.json()
      ]);
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setEstaciones(Array.isArray(estacionesData) ? estacionesData : []);
      // Filtrar inspectores y administradores
      setInspectores(Array.isArray(usuariosData)
        ? usuariosData.filter((u: any) => u.rol === "inspector" || u.rol === "admin")
        : []);
      setAlcances(Array.isArray(alcancesData) ? alcancesData : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Pre-load client info when client is selected
  const handleClienteChange = (clienteId: string) => {
    setForm(prev => ({
      ...prev,
      clienteId,
      estacionId: "", // reset station
    }));
  };

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleAlcance = (id: string) => {
    setForm(prev => ({
      ...prev,
      tipoInspeccion: prev.tipoInspeccion.includes(id)
        ? prev.tipoInspeccion.filter(t => t !== id)
        : [...prev.tipoInspeccion, id]
    }));
  };

  const resetForm = () => {
    setForm({
      clienteId: "",
      estacionId: "",
      itemId: "",
      tipoInspeccion: [],
      descripcion: "",
      fechaProgramada: "",
      fechaSugerida: "",
      inspectorEmail: "",
      inspectorCelular: "",
      inspectorCompetencia: "Técnica - ISO 17020",
      inspectorAutorizacion: "Vigente",
      ventanaHoraria: "",
      observacionesLogisticas: "",
      horarioEspecial: "",
      condiciones: "",
      solicitanteNombre: "",
      solicitanteCargo: "",
      resultadoValidacion: "La orden se acepta sin observaciones",
    });
  };

  const handleCrearOrden = async () => {
    if (!form.clienteId || !form.estacionId || form.tipoInspeccion.length === 0 || !form.fechaProgramada || !form.inspectorEmail) {
      setErrorMsg("Por favor completa los campos obligatorios (*). Debe seleccionar al menos un tipo de inspección.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const creationPromises = form.tipoInspeccion.map(tipo => {
        const formData = {
          ...form,
          tipoInspeccion: tipo,
        };
        
        const cleanData = Object.fromEntries(
          Object.entries(formData).filter(([_, value]) => value !== "" && (!Array.isArray(value) || value.length > 0))
        );

        return fetch(`${BACKEND_URL}/ordenes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: TENANT_ID, ...cleanData }),
        });
      });

      const responses = await Promise.all(creationPromises);
      
      for (const res of responses) {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.message || `Error ${res.status}: ${res.statusText}`);
        }
      }

      resetForm();
      setErrorMsg(null);
      setIsModalOpen(false);
      await fetchAll();
    } catch (e: any) {
      console.error('Error creando orden:', e);
      setErrorMsg(e.message || "Error desconocido al crear la orden.");
    } finally {
      setIsSaving(false);
    }
  };

  // Group orders by clienteNombre / clienteId
  const [filterCliente, setFilterCliente] = useState("");
  const filteredOrdenes = filterCliente
    ? ordenes.filter(o => o.clienteId === filterCliente)
    : ordenes;

  const grouped = filteredOrdenes.reduce<Record<string, { nombre: string; ordenes: Orden[] }>>((acc, orden) => {
    const key = orden.clienteId;
    const nombre = orden.clienteNombre || orden.clienteId;
    if (!acc[key]) acc[key] = { nombre, ordenes: [] };
    acc[key].ordenes.push(orden);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="mt-1 text-sm text-gray-500">Programación y seguimiento de inspecciones.</p>
        </div>
        {(role === "admin" || role === "operador") && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors">
            ➕ Nueva Orden
          </button>
        )}
      </div>

      {clientes.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Filtrar por cliente:</label>
          <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {filterCliente && (
            <button onClick={() => setFilterCliente("")} className="text-sm text-gray-400 hover:text-gray-600">✕ Limpiar</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center text-gray-400">
          <p className="text-4xl">📋</p>
          <p className="mt-4 font-medium">No hay órdenes de trabajo aún.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([clienteId, { nombre, ordenes: grupoOrdenes }]) => (
            <div key={clienteId}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{nombre}</h2>
                  <p className="text-xs text-gray-400 font-mono">{clienteId} · {grupoOrdenes.length} orden{grupoOrdenes.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grupoOrdenes.map(orden => (
                  <div key={orden.id} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-blue-600">
                          {orden.id} {(orden as any).itemId && <span className="text-gray-400 ml-1">({(orden as any).itemId})</span>}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[orden.estado] || "bg-gray-100 text-gray-700"}`}>
                          {orden.estado}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 uppercase">{(orden as any).edsNombre || "EDS no especificada"}</p>
                      {orden.tipoInspeccion && <p className="text-xs font-semibold text-blue-700 mt-1">{orden.tipoInspeccion}</p>}
                      {orden.descripcion && <p className="mt-2 text-sm text-gray-500">{orden.descripcion}</p>}
                      {orden.fechaProgramada && (
                        <p className="mt-2 text-xs text-gray-400">
                          📅 {new Date(orden.fechaProgramada + "T00:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                      {orden.inspectorEmail && <p className="mt-1 text-xs text-gray-400">👷 {orden.inspectorEmail}</p>}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {orden.driveFolderId && (
                        <a href={`https://drive.google.com/drive/folders/${orden.driveFolderId}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 rounded-md border border-gray-300 bg-white py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          Ver Drive
                        </a>
                      )}
                      {(role === "inspector" || role === "admin") && !orden.informeCampoLink && (
                        <Link href={`/dashboard/campo/${orden.id}`} className="flex-1 rounded-md bg-blue-50 py-1.5 text-center text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                          Informe Campo
                        </Link>
                      )}
                      {orden.informeCampoLink && (
                        <a href={orden.informeCampoLink} target="_blank" rel="noopener noreferrer"
                          className="flex-1 rounded-md bg-green-50 py-1.5 text-center text-sm font-medium text-green-700 hover:bg-green-100 transition-colors">
                          Ver Informe
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Nueva Orden de Trabajo</h3>
                <p className="text-xs text-gray-500">Los campos con <span className="text-red-500">*</span> son obligatorios</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); resetForm(); }} disabled={isSaving}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50">✕</button>
            </div>

            <div className="space-y-6 p-6">
              {errorMsg && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{errorMsg}</div>}

              {/* SECCIÓN 1: Cliente */}
              <section>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cliente <span className="text-red-500">*</span></label>
                    <select value={form.clienteId} onChange={(e) => handleClienteChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Seleccionar cliente —</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.id} · {c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estación (Sede) <span className="text-red-500">*</span></label>
                    <select value={form.estacionId} onChange={(e) => setField("estacionId", e.target.value)} disabled={!form.clienteId}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50">
                      <option value="">{form.clienteId ? "— Seleccionar estación —" : "— Primero selecciona un cliente —"}</option>
                      {estaciones.filter(e => e.clienteId === form.clienteId).map(e => <option key={e.id} value={e.id}>{e.nombreEDS} ({e.ciudad || 'Sin ciudad'})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID del Ítem (Tanque/Línea)</label>
                    <input type="text" value={form.itemId} onChange={(e) => setField("itemId", e.target.value)}
                      placeholder="Ej. T1, L2, L1T3"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 2: Tipos de Inspección */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Tipos de Inspección <span className="text-red-500">*</span></h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {alcances.map(a => (
                    <label key={a.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${form.tipoInspeccion.includes(a.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={form.tipoInspeccion.includes(a.id)} onChange={() => toggleAlcance(a.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-500">{a.id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* SECCIÓN 3: Programación e Inspector */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Programación e Inspector</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha Programada <span className="text-red-500">*</span></label>
                    <input type="date" value={form.fechaProgramada} onChange={(e) => setField("fechaProgramada", e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Inspector Asignado <span className="text-red-500">*</span></label>
                    <select value={form.inspectorEmail} onChange={(e) => setField("inspectorEmail", e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Seleccionar inspector —</option>
                      {inspectores.map(i => <option key={i.email} value={i.email}>{i.displayName || i.email}</option>)}
                    </select>
                  </div>
                  {/* Nuevos Datos del Inspector para la Plantilla */}
                  {form.inspectorEmail && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Celular del Inspector</label>
                        <input type="tel" value={form.inspectorCelular} onChange={(e) => setField("inspectorCelular", e.target.value)}
                          placeholder="300 000 0000"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Competencia Validada</label>
                        <input type="text" value={form.inspectorCompetencia} onChange={(e) => setField("inspectorCompetencia", e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Autorización Vigente</label>
                        <input type="text" value={form.inspectorAutorizacion} onChange={(e) => setField("inspectorAutorizacion", e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* SECCIÓN 4: Validación y Otros */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Validación de la Orden</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resultado de Validación <span className="text-red-500">*</span></label>
                    <select value={form.resultadoValidacion} onChange={(e) => setField("resultadoValidacion", e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="La orden se acepta sin observaciones">La orden se acepta sin observaciones</option>
                      <option value="La orden se acepta con condiciones especiales (anexar soporte)">La orden se acepta con condiciones especiales (anexar soporte)</option>
                      <option value="La orden se rechaza por estar fuera del alcance o por falta de disponibilidad técnica">La orden se rechaza por estar fuera del alcance o por falta de disponibilidad técnica</option>
                    </select>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Ubicación y Contacto Automático</p>
                      <p className="text-xs text-blue-700 mt-1">
                        La dirección, ciudad y datos de contacto se cargarán automáticamente desde el perfil de la <strong>Estación (Sede)</strong> que elegiste arriba. Si necesitas modificarlos, edita el perfil de la EDS en el directorio.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observaciones / Descripción</label>
                    <textarea value={form.descripcion} onChange={(e) => setField("descripcion", e.target.value)}
                      rows={2} placeholder="Detalles u observaciones adicionales"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Solicitante</label>
                      <input type="text" value={form.solicitanteNombre} onChange={(e) => setField("solicitanteNombre", e.target.value)}
                        placeholder="Quien solicita"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cargo Solicitante</label>
                      <input type="text" value={form.solicitanteCargo} onChange={(e) => setField("solicitanteCargo", e.target.value)}
                        placeholder="Ej. Gerente"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(null); resetForm(); }} disabled={isSaving}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleCrearOrden} disabled={isSaving}
                className="flex items-center gap-2 rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                {isSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {isSaving ? "Creando orden..." : "Crear Orden de Trabajo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
