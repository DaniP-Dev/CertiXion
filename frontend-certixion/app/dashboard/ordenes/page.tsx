"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";

const BACKEND_URL = "http://localhost:3001";
const TENANT_ID = "danidevcol@gmail.com";

interface Orden {
  id: string;
  clienteId: string;
  descripcion: string;
  estado: string;
  driveFolderId?: string;
  createdAt: string;
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrdenes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ordenes?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setOrdenes(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="mt-1 text-sm text-gray-500">Seguimiento y gestión documental de inspecciones.</p>
        </div>
        {(role === "admin" || role === "operador") && (
          <button className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
            ➕ Nueva Orden
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      ) : ordenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center text-gray-400">
          <p className="text-4xl">📋</p>
          <p className="mt-4 font-medium">No hay órdenes de trabajo aún.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ordenes.map((orden) => (
            <div key={orden.id} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-blue-600">{orden.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[orden.estado] || "bg-gray-100 text-gray-700"}`}>
                    {orden.estado}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">{orden.clienteId}</p>
                <p className="mt-1 text-sm text-gray-500">{orden.descripcion}</p>
                <p className="mt-3 text-xs text-gray-400">
                  Creada: {new Date(orden.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
              <div className="mt-5 flex gap-2">
                {orden.driveFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${orden.driveFolderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Ver en Drive
                  </a>
                )}
                {(role === "inspector" || role === "admin") && (
                  <button className="flex-1 rounded-md bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                    Informe Campo
                  </button>
                )}
                {(role === "director" || role === "admin") && orden.estado === "finalizada" && (
                  <button className="flex-1 rounded-md bg-purple-50 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                    Aprobar ✅
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
