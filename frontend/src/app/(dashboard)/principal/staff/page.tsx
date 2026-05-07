"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStaff, createStaff } from "@/lib/api";
import api from "@/lib/api";
import { getRole } from "@/lib/auth";
import toast from "react-hot-toast";
import { Users, X, Trash2, Pencil } from "lucide-react";

const typeColors: Record<string, string> = {
  TEACHER: "badge-blue",
  ADMIN: "badge-blue",
  PRINCIPAL: "badge-yellow",
  NON_TEACHING: "badge-red",
};

const typeLabel: Record<string, string> = {
  TEACHER: "Teacher",
  ADMIN: "Principal",
  PRINCIPAL: "Vice Principal",
  NON_TEACHING: "Non-Teaching Staff",
};

const blankForm = {
  full_name: "", email: "", user_email: "", user_password: "",
  phone_number: "", address: "", salary_amount: "",
  employment_date: new Date().toISOString().split("T")[0],
  staff_type: "TEACHER",
};

const blankEdit = {
  full_name: "", phone_number: "", address: "",
  salary_amount: "", employment_date: "",
  staff_type: "TEACHER", status: "ACTIVE",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [role, setRole] = useState("");

  // Edit state
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(blankEdit);
  const [editSaving, setEditSaving] = useState(false);

  const limit = 20;

  useEffect(() => { setRole(getRole() || ""); }, []);

  // Lock body scroll when edit modal is open
  useEffect(() => {
    if (editingStaff) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [editingStaff]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { skip: (page - 1) * limit, limit };
      if (typeFilter) params.staff_type = typeFilter;
      const res = await getStaff(params);
      setStaff(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load staff");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, typeFilter]);

  const totalPages = Math.ceil(total / limit);

  const deleteStaff = async (s: any) => {
    if (!confirm(`Delete ${s.full_name}? This also removes their login account.`)) return;
    setDeleting(s.id);
    try {
      await api.delete(`/api/v1/staff/${s.id}`);
      toast.success("Staff member deleted");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to delete"); }
    setDeleting(null);
  };

  const openEdit = (s: any) => {
    setEditingStaff(s);
    setEditForm({
      full_name: s.full_name || "",
      phone_number: s.phone_number || "",
      address: s.address || "",
      salary_amount: s.salary_amount ? String(s.salary_amount) : "",
      employment_date: s.employment_date || "",
      staff_type: s.staff_type || "TEACHER",
      status: s.status || "ACTIVE",
    });
  };

  const saveEdit = async () => {
    if (!editForm.full_name.trim()) { toast.error("Full name is required"); return; }
    setEditSaving(true);
    try {
      await api.put(`/api/v1/staff/${editingStaff.id}`, {
        full_name: editForm.full_name,
        phone_number: editForm.phone_number || null,
        address: editForm.address || null,
        salary_amount: editForm.salary_amount ? Number(editForm.salary_amount) : null,
        employment_date: editForm.employment_date || null,
        staff_type: editForm.staff_type,
        status: editForm.status,
      });
      toast.success("Staff member updated");
      setEditingStaff(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update staff");
    }
    setEditSaving(false);
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const setE = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.full_name || !form.email || !form.user_email || !form.user_password || !form.staff_type) {
      toast.error("Fill all required fields"); return;
    }
    setSaving(true);
    try {
      await createStaff({
        ...form,
        salary_amount: form.salary_amount ? Number(form.salary_amount) : 0,
        employment_date: form.employment_date || null,
      });
      toast.success("Staff member created — login credentials sent by email");
      setShowForm(false);
      setForm(blankForm);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create staff");
    }
    setSaving(false);
  };

  const canEdit = role === "SUPER_ADMIN";

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Staff</h1>
          <p className="t-page-subtitle">{total} total staff members</p>
        </div>
        <button className="t-btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X size={14} /> Cancel</> : "+ Add Staff"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="t-card mb-5 animate-fade-in">
          <h2 className="font-semibold t-text-primary mb-4">New Staff Member</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="t-label">Full Name *</label>
              <input className="t-input" placeholder="e.g. John Doe" value={form.full_name} onChange={e => set("full_name", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Staff Type *</label>
              <select className="t-input" value={form.staff_type} onChange={e => set("staff_type", e.target.value)}>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Principal</option>
                <option value="PRINCIPAL">Vice Principal</option>
                <option value="NON_TEACHING">Non-Teaching Staff</option>
              </select>
            </div>
            <div>
              <label className="t-label">Contact Email *</label>
              <input className="t-input" type="email" placeholder="staff@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Login Email * <span className="t-text-secondary font-normal">(used to sign in)</span></label>
              <input className="t-input" type="email" placeholder="login@school.com" value={form.user_email} onChange={e => set("user_email", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Login Password *</label>
              <input className="t-input" type="password" placeholder="Temporary password" value={form.user_password} onChange={e => set("user_password", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Phone Number</label>
              <input className="t-input" placeholder="+234..." value={form.phone_number} onChange={e => set("phone_number", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Salary (₦)</label>
              <input className="t-input" type="number" placeholder="0" value={form.salary_amount} onChange={e => set("salary_amount", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Employment Date</label>
              <input className="t-input" type="date" value={form.employment_date} onChange={e => set("employment_date", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Address</label>
              <input className="t-input" placeholder="Home address" value={form.address} onChange={e => set("address", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="t-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Creating..." : "Create Staff Member"}
            </button>
            <button className="t-btn-secondary" onClick={() => { setShowForm(false); setForm(blankForm); }}>
              Cancel
            </button>
          </div>
          <p className="t-text-secondary" style={{ fontSize: "0.75rem", marginTop: 10 }}>
            Login credentials will be emailed automatically after creation.
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="t-card mb-4" style={{ padding: "14px 20px" }}>
        <select
          className="t-input"
          style={{ width: 180 }}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN">Principal</option>
          <option value="PRINCIPAL">Vice Principal</option>
          <option value="NON_TEACHING">Non-Teaching Staff</option>
        </select>
      </div>

      <div className="t-card overflow-x-auto">
        <table className="t-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Salary</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="flex justify-center py-12"><div className="t-spinner" /></div></td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="t-empty"><Users size={40} /><p>No staff found.</p><p className="text-xs">Click "+ Add Staff" to create the first member.</p></div>
              </td></tr>
            ) : staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-light)", color: "var(--accent-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      {s.full_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </div>
                    <span className="t-text-primary font-medium">{s.full_name}</span>
                  </div>
                </td>
                <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{s.email}</td>
                <td className="t-text-secondary">{s.phone_number || "—"}</td>
                <td><span className={typeColors[s.staff_type] || "badge-blue"}>{typeLabel[s.staff_type] || s.staff_type}</span></td>
                <td className="t-text-primary">₦{Number(s.salary_amount || 0).toLocaleString()}</td>
                <td><span className={s.status === "ACTIVE" ? "badge-green" : "badge-red"}>{s.status}</span></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {canEdit && (
                      <button
                        onClick={() => openEdit(s)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => deleteStaff(s)}
                      disabled={deleting === s.id}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                    >
                      <Trash2 size={12} /> {deleting === s.id ? "..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p className="t-text-secondary" style={{ fontSize: "0.875rem" }}>Page {page} of {totalPages} &mdash; {total} members</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="t-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="t-btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingStaff && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setEditingStaff(null); }}
        >
          <div className="modal-box-md" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div>
                <h2 className="font-semibold t-text-primary" style={{ fontSize: "1rem" }}>Edit Staff</h2>
                <p className="t-text-secondary" style={{ fontSize: "0.78rem", marginTop: 2 }}>{editingStaff.full_name}</p>
              </div>
              <button onClick={() => setEditingStaff(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="t-label">Full Name *</label>
                  <input className="t-input" value={editForm.full_name} onChange={e => setE("full_name", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Staff Type</label>
                  <select className="t-input" value={editForm.staff_type} onChange={e => setE("staff_type", e.target.value)}>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Principal</option>
                    <option value="PRINCIPAL">Vice Principal</option>
                    <option value="NON_TEACHING">Non-Teaching Staff</option>
                  </select>
                </div>
                <div>
                  <label className="t-label">Status</label>
                  <select className="t-input" value={editForm.status} onChange={e => setE("status", e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="t-label">Phone Number</label>
                  <input className="t-input" placeholder="+234..." value={editForm.phone_number} onChange={e => setE("phone_number", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Salary (₦)</label>
                  <input className="t-input" type="number" placeholder="0" value={editForm.salary_amount} onChange={e => setE("salary_amount", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Employment Date</label>
                  <input className="t-input" type="date" value={editForm.employment_date} onChange={e => setE("employment_date", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Address</label>
                  <input className="t-input" placeholder="Home address" value={editForm.address} onChange={e => setE("address", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="t-btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
              <button className="t-btn-secondary" onClick={() => setEditingStaff(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
