"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { AlertCircle, X } from "lucide-react";

type MissingField = { field: string; label: string };

function getMissingFields(s: any): MissingField[] {
  const missing: MissingField[] = [];
  if (!s.date_of_birth) missing.push({ field: "date_of_birth", label: "Date of Birth" });
  if (!s.guardian_name) missing.push({ field: "guardian_name", label: "Guardian Name" });
  if (!s.guardian_phone) missing.push({ field: "guardian_phone", label: "Guardian Phone" });
  if (!s.address) missing.push({ field: "address", label: "Address" });
  return missing;
}

export default function IncompletePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes] = await Promise.all([
        api.get("/api/v1/students/?limit=500&status=ACTIVE"),
        api.get("/api/v1/classes/?limit=200"),
      ]);
      setStudents(stuRes.data.data || []);
      setClasses(clsRes.data.data || []);
    } catch {
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const incomplete = students.filter(s => getMissingFields(s).length > 0);
  const getClass = (id: number | null) => id ? (classes.find((c: any) => c.id === id)?.name || `Class #${id}`) : "—";

  const startEdit = (s: any) => {
    setEditing(s);
    setForm({
      date_of_birth: s.date_of_birth || "",
      guardian_name: s.guardian_name || "",
      guardian_phone: s.guardian_phone || "",
      address: s.address || "",
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/students/${editing.id}`, {
        date_of_birth: form.date_of_birth || null,
        guardian_name: form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
        address: form.address || null,
      });
      toast.success("Profile updated");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Incomplete Profiles</h1>
          <p className="t-page-subtitle">
            {loading ? "Loading..." : `${incomplete.length} student${incomplete.length !== 1 ? "s" : ""} with missing information`}
          </p>
        </div>
      </div>

      {editing && (
        <div className="t-card mb-5 animate-fade-in" style={{ borderColor: "var(--accent)", borderWidth: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="font-semibold t-text-primary">
              Edit Profile — {editing.first_name} {editing.last_name}
              <span className="t-text-secondary font-normal" style={{ fontSize: "0.8125rem", marginLeft: 8 }}>({editing.admission_number})</span>
            </h2>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="t-label">Date of Birth</label>
              <input className="t-input" type="date" value={form.date_of_birth}
                onChange={e => setForm((p: any) => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <label className="t-label">Guardian Name</label>
              <input className="t-input" placeholder="Parent / guardian" value={form.guardian_name}
                onChange={e => setForm((p: any) => ({ ...p, guardian_name: e.target.value }))} />
            </div>
            <div>
              <label className="t-label">Guardian Phone</label>
              <input className="t-input" placeholder="+234..." value={form.guardian_phone}
                onChange={e => setForm((p: any) => ({ ...p, guardian_phone: e.target.value }))} />
            </div>
            <div>
              <label className="t-label">Address</label>
              <input className="t-input" placeholder="Home address" value={form.address}
                onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <button className="t-btn-primary mt-4" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      <div className="t-card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="t-spinner" /></div>
        ) : incomplete.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-semibold t-text-primary">All student profiles are complete!</p>
            <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 4 }}>No missing information found.</p>
          </div>
        ) : (
          <table className="t-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Adm. No.</th>
                <th>Class</th>
                <th>Missing Fields</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incomplete.map((s: any) => {
                const missing = getMissingFields(s);
                return (
                  <tr key={s.id}>
                    <td className="font-medium t-text-primary">{s.first_name} {s.last_name}</td>
                    <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{s.admission_number}</td>
                    <td className="t-text-secondary">{getClass(s.current_class_id)}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {missing.map(m => (
                          <span key={m.field} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "var(--badge-warning-bg, #fef9c3)", color: "var(--badge-warning-text, #854d0e)", fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>
                            <AlertCircle size={10} /> {m.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => startEdit(s)}
                        style={{ padding: "4px 12px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                      >
                        Fill In
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
