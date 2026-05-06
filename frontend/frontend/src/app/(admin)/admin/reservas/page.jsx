"use client";

import { useState } from "react";

const ALL_RESERVATIONS = [
  { id: "r1", user: "Juan Carlos Díaz", code: "1234567", space: "Laboratorio de Sistemas", spaceCode: "SB-201", type: "Laboratorio", date: "2025-04-14", start: 8, end: 10, status: "confirmed", createdAt: "2025-04-10" },
  { id: "r2", user: "María Fernanda López", code: "7654321", space: "Sala de Conferencias A", spaceCode: "SB-301", type: "Auditorio", date: "2025-04-14", start: 9, end: 12, status: "confirmed", createdAt: "2025-04-11" },
  { id: "r3", user: "Carlos Andrés Ruiz", code: "2345678", space: "Aula 101", spaceCode: "SB-101", type: "Aula", date: "2025-04-15", start: 14, end: 16, status: "confirmed", createdAt: "2025-04-12" },
  { id: "r4", user: "Laura Milena Torres", code: "8765432", space: "Aula de Postgrado", spaceCode: "SB-401", type: "Aula", date: "2025-04-13", start: 10, end: 11, status: "cancelled", createdAt: "2025-04-09" },
  { id: "r5", user: "Andrés Felipe Mora", code: "3456789", space: "Laboratorio de Redes", spaceCode: "SB-202", type: "Laboratorio", date: "2025-04-10", start: 13, end: 15, status: "confirmed", createdAt: "2025-04-07" },
  { id: "r6", user: "Sandra Patricia Gómez", code: "9876543", space: "Sala de Conferencias B", spaceCode: "SB-302", type: "Auditorio", date: "2025-04-08", start: 8, end: 13, status: "confirmed", createdAt: "2025-04-05" },
  { id: "r7", user: "Juan Carlos Díaz", code: "1234567", space: "Aula 102", spaceCode: "SB-102", type: "Aula", date: "2025-04-05", start: 10, end: 11, status: "cancelled", createdAt: "2025-04-02" },
];

const typeColors = {
  Aula: { bg: "#EBF5FB", color: "#1A5276" },
  Laboratorio: { bg: "#EAFAF1", color: "#1E8449" },
  Auditorio: { bg: "#FEF9E7", color: "#9A7D0A" },
};

function StatusBadge({ status }) {
  return status === "confirmed" ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#D5F5E3", color: "#1E8449" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      Confirmada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#FDEDEC", color: "#C0392B" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Cancelada
    </span>
  );
}

export default function AdminReservationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [dateFilter, setDateFilter] = useState("");
  const [reservations, setReservations] = useState(ALL_RESERVATIONS);

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.user.toLowerCase().includes(q) ||
      r.space.toLowerCase().includes(q) ||
      r.code.includes(q);
    const matchStatus =
      statusFilter === "Todos" ||
      (statusFilter === "Confirmada" && r.status === "confirmed") ||
      (statusFilter === "Cancelada" && r.status === "cancelled");
    const matchDate = !dateFilter || r.date === dateFilter;
    return matchSearch && matchStatus && matchDate;
  });

  const cancelReservation = (id) => {
    setReservations(reservations.map((r) =>
      r.id === id ? { ...r, status: "cancelled" } : r
    ));
  };

  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;
  const totalHours = reservations
    .filter((r) => r.status === "confirmed")
    .reduce((acc, r) => acc + (r.end - r.start), 0);

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Supervisión de Reservas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitorea y gestiona todas las reservas del sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total reservas", value: reservations.length, color: "#1A1A2E", sub: "registradas" },
          { label: "Confirmadas", value: confirmedCount, color: "#1E8449", sub: "activas" },
          { label: "Canceladas", value: cancelledCount, color: "#C0392B", sub: "en historial" },
          { label: "Horas reservadas", value: totalHours, color: "#1A5276", sub: "horas confirmadas" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Ocupación por espacio (mini chart visual) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Espacios más reservados</h3>
        <div className="space-y-3">
          {[
            { name: "Lab. de Sistemas", code: "SB-201", count: 3, max: 5 },
            { name: "Sala Conf. A", code: "SB-301", count: 2, max: 5 },
            { name: "Aula 101", code: "SB-101", count: 2, max: 5 },
            { name: "Sala Conf. B", code: "SB-302", count: 1, max: 5 },
          ].map((item) => (
            <div key={item.code} className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-36 truncate">{item.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(item.count / item.max) * 100}%`, background: "#C0392B" }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-6 text-right">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por usuario, espacio o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {["Todos", "Confirmada", "Cancelada"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={statusFilter === s ? { background: "#C0392B", color: "white" } : { color: "#6B7280" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de reservas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
              {["Usuario", "Espacio", "Tipo", "Fecha", "Horario", "Estado", "Solicitud", "Acciones"].map((h) => (
                <th
                  key={h}
                  className={`text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4 ${h === "Acciones" ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const tc = typeColors[r.type] || typeColors.Aula;
              return (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #F9FAFB" : "none" }}
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{r.user}</p>
                    <p className="text-xs font-mono text-gray-400">{r.code}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900 font-medium leading-tight">{r.space}</p>
                    <p className="text-xs font-mono text-gray-400">{r.spaceCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: tc.bg, color: tc.color }}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-700">{r.date}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-gray-700">
                      {r.start}:00 – {r.end}:00
                    </span>
                    <p className="text-xs text-gray-400">{r.end - r.start}h</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-400">{r.createdAt}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "confirmed" && (
                        <button
                          onClick={() => cancelReservation(r.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                          style={{ borderColor: "#F1948A", color: "#C0392B" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FDEDEC")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          Cancelar
                        </button>
                      )}
                      <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400">No se encontraron reservas con los filtros aplicados</p>
          </div>
        )}

        <div
          className="px-6 py-3 text-xs text-gray-400 flex items-center justify-between"
          style={{ borderTop: "1px solid #F9FAFB" }}
        >
          <span>Mostrando {filtered.length} de {reservations.length} reservas</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Anterior</button>
            <button className="px-3 py-1 rounded-lg border text-white" style={{ background: "#C0392B", borderColor: "#C0392B" }}>1</button>
            <button className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
