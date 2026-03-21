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
interface Orden {
  id: string; clienteId: string; clienteNombre?: string; descripcion?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    clienteId: "",
    tipoInspeccion: "",
    descripcion: "",
    direccion: "",
    contacto: "",
    telefono: "",
    fechaProgramada: "",
    inspectorEmail: "",
    ventanaHoraria: "",
    observacionesLogisticas: "",
  });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordenesRes, clientesRes, usuariosRes, alcancesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/ordenes?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/clientes?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/usuarios?tenantId=${TENANT_ID}`),
        fetch(`${BACKEND_URL}/alcances/${TENANT_ID}`),
      ]);
      const [ordenesData, clientesData, usuariosData, alcancesData] = await Promise.all([
        ordenesRes.json(), clientesRes.json(), usuariosRes.json(), alcancesRes.json(),
      ]);
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
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
    const cliente = clientes.find(c => c.id === clienteId);
    setForm(prev => ({
      ...prev,
      clienteId,
      direccion: cliente?.direccion || "",
      contacto: cliente?.contacto || "",
      telefono: cliente?.telefono || "",
    }));
  };

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({
      clienteId: "",
      tipoInspeccion: "",
      descripcion: "",
      direccion: "",
      contacto: "",
      telefono: "",
      fechaProgramada: "",
      inspectorEmail: "",
      ventanaHoraria: "",
      observacionesLogisticas: "",
    });
  };

  const handleCrearOrden = async () => {
    if (!form.clienteId || !form.tipoInspeccion || !form.fechaProgramada || !form.inspectorEmail) {
      setErrorMsg("Por favor completa los campos obligatorios (Cliente, Tipo, Fecha e Inspector).");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Filtrar campos vacíos antes de enviar
      const formData = Object.fromEntries(
        Object.entries(form).filter(([_, value]) => value !== "")
      );
      
      const res = await fetch(`${BACKEND_URL}/ordenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: TENANT_ID, ...formData }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.message || `Error ${res.status}: ${res.statusText}`);
      }
      const result = await res.json();
      console.log('Orden creada:', result);
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

  // Group into { [clienteNombre]: Orden[] }
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

      {/* Filtro por cliente */}
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
              {/* Encabezado de grupo */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{nombre}</h2>
                  <p className="text-xs text-gray-400 font-mono">{clienteId} · {grupoOrdenes.length} orden{grupoOrdenes.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              {/* Cards de órdenes */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grupoOrdenes.map(orden => (
                  <div key={orden.id} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-blue-600">{orden.id}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[orden.estado] || "bg-gray-100 text-gray-700"}`}>
                          {orden.estado}
                        </span>
                      </div>
                      {orden.tipoInspeccion && <p className="text-sm font-semibold text-blue-700">{orden.tipoInspeccion}</p>}
                      {orden.descripcion && <p className="mt-1 text-sm text-gray-500">{orden.descripcion}</p>}
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
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Identificación del Cliente</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cliente <span className="text-red-500">*</span></label>
                    <select value={form.clienteId} onChange={(e) => handleClienteChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Seleccionar cliente —</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.id} · {c.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* SECCIÓN 2: Inspección */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Identificación de la Inspección</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Inspección <span className="text-red-500">*</span></label>
                    <select value={form.tipoInspeccion} onChange={(e) => setField("tipoInspeccion", e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Seleccionar tipo —</option>
                      {alcances.map(a => <option key={a.id} value={a.id}>{a.id} · {a.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alcance / Descripción</label>
                    <input type="text" value={form.descripcion} onChange={(e) => setField("descripcion", e.target.value)}
                      placeholder="Ej. Inspección anual estación Norte"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 3: Ubicación */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Ubicación y Contacto</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dirección del Sitio</label>
                    <input type="text" value={form.direccion} onChange={(e) => setField("direccion", e.target.value)}
                      placeholder="Cll 123 # 45-67, Bogotá"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Persona de Contacto</label>
                      <input type="text" value={form.contacto} onChange={(e) => setField("contacto", e.target.value)}
                        placeholder="Nombre del contacto"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input type="tel" value={form.telefono} onChange={(e) => setField("telefono", e.target.value)}
                        placeholder="300 000 0000"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </section>

              {/* SECCIÓN 4: Programación */}
              <section>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Programación y Logística</h4>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ventana Horaria</label>
                    <select value={form.ventanaHoraria} onChange={(e) => setField("ventanaHoraria", e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Seleccionar ventana —</option>
                      {VENTANAS_HORARIAS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observaciones Logísticas</label>
                    <input type="text" value={form.observacionesLogisticas} onChange={(e) => setField("observacionesLogisticas", e.target.value)}
                      placeholder="Ej. Acceso por portería 2"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
