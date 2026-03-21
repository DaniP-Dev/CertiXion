"use client";

export default function AprobacionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-24 text-center">
        <span className="mb-4 text-5xl">✅</span>
        <h2 className="text-xl font-bold text-gray-900">Panel del Director Técnico</h2>
        <p className="mx-auto mt-2 max-w-md text-gray-500">
          No hay informes pendientes de aprobación en este momento. Cuando el operador finalice un informe, aparecerá aquí para tu revisión y firma definitiva.
        </p>
      </div>
    </div>
  );
}
