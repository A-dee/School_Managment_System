"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAuditLogs } from "@/lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    getAuditLogs({ skip: (page - 1) * limit, limit })
      .then(res => { setLogs(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 text-sm">{total} total actions logged</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 pr-4 text-gray-500 font-medium">Action</th>
              <th className="pb-3 pr-4 text-gray-500 font-medium">Entity</th>
              <th className="pb-3 pr-4 text-gray-500 font-medium">Performed By</th>
              <th className="pb-3 text-gray-500 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
              : logs.length === 0
              ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">No audit logs</td></tr>
              : logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 pr-4"><span className="badge-blue">{log.action}</span></td>
                  <td className="py-3 pr-4">{log.entity_type} #{log.entity_id}</td>
                  <td className="py-3 pr-4">User #{log.performed_by_user_id}</td>
                  <td className="py-3 text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {Math.ceil(total / limit) > 1 && (
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn-secondary text-sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
