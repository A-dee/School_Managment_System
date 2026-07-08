import React from "react";
import { FolderOpen, Upload, Eye, Trash2 } from "lucide-react";
import { SectionTitle } from "./helpers";

interface DocumentsTabProps {
  isEdit: boolean;
  uploading: boolean;
  deletingDoc: number | null;
  documents: any[];
  uploadDocument: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  viewDocument: (docId: number, filename: string) => Promise<void>;
  deleteDocument: (docId: number) => Promise<void>;
}

export default function DocumentsTab({
  isEdit,
  uploading,
  deletingDoc,
  documents,
  uploadDocument,
  viewDocument,
  deleteDocument,
}: DocumentsTabProps) {
  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <SectionTitle>Archived Registration Documents</SectionTitle>

      {!isEdit ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <FolderOpen size={40} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
          <p className="t-text-secondary">Save the student first, then come back to upload documents.</p>
        </div>
      ) : (
        <>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 16 }}>
            Upload PDF scans of the physical registration form, medical certificate, or any other documentation for this student's file.
          </p>

          {/* Upload button */}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 8, background: "var(--accent)",
            color: "var(--btn-primary-text)", cursor: "pointer",
            fontSize: "0.8125rem", fontWeight: 600, marginBottom: 20,
            opacity: uploading ? 0.6 : 1,
          }}>
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload PDF"}
            <input type="file" accept=".pdf" style={{ display: "none" }} onChange={uploadDocument} disabled={uploading} />
          </label>

          {/* Document list */}
          {documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", border: "2px dashed var(--border)", borderRadius: 10 }}>
              <FolderOpen size={36} style={{ color: "var(--text-secondary)", margin: "0 auto 10px" }} />
              <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>No documents uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {documents.map((doc: any) => (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--bg-page)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#dc2626" }}>PDF</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="t-text-primary font-medium" style={{ fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.original_filename}
                      </p>
                      <p className="t-text-secondary" style={{ fontSize: "0.72rem" }}>
                        {formatSize(doc.file_size)} &nbsp;·&nbsp; {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <button
                      onClick={() => viewDocument(doc.id, doc.original_filename)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      disabled={deletingDoc === doc.id}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      <Trash2 size={12} /> {deletingDoc === doc.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
