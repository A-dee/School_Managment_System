"use client";
import Link from "next/link";

const EFFECTIVE_DATE = "7 May 2026";
const CONTROLLER = "Lenage Management Systems";
const ADDRESS = "Plot A/MF/5, Mpape 2 Layout, Opposite Zenith Bank, Mpape, 901101, FCT, Nigeria";
const EMAIL_DPO = "info@lenagetechnologies.com";
const PHONE = "08065598994";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1e293b", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>{title}</h2>
    <div style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.85 }}>{children}</div>
  </section>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <li style={{ marginBottom: 6, paddingLeft: 4 }}>{children}</li>
);

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", padding: "32px 24px 28px", color: "#fff" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
            ← Back to Home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "6px 14px", display: "inline-flex", alignItems: "center" }}>
              <img src="/lenage-logo.png" alt={CONTROLLER} style={{ height: 28, width: "auto", objectFit: "contain" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: 2 }}>Privacy Policy</h1>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>{CONTROLLER} — School Management Portal</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 12px", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.2)" }}>
              Effective: {EFFECTIVE_DATE}
            </span>
            <span style={{ background: "rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 12px", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.2)" }}>
              GDPR · NDPA 2023 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px", display: "grid", gridTemplateColumns: "1fr 240px", gap: 40, alignItems: "start" }}>
        {/* Main content */}
        <article>
          {/* Intro */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "16px 20px", marginBottom: 36 }}>
            <p style={{ color: "#1e40af", fontSize: "0.875rem", lineHeight: 1.8 }}>
              <strong>Hope Hills Academy</strong> takes the privacy of children, parents, and staff seriously. This policy explains what personal data we collect, why, how we protect it, and your rights under the <strong>Nigeria Data Protection Act 2023 (NDPA)</strong> and the <strong>EU General Data Protection Regulation (GDPR)</strong>.
            </p>
          </div>

          <Section id="controller" title="1. Data Controller">
            <p>The Data Controller responsible for your personal data is:</p>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", margin: "12px 0", fontWeight: 500 }}>
              <strong>{CONTROLLER}</strong><br />
              {ADDRESS}<br />
              <a href={`tel:${PHONE}`} style={{ color: "#2563eb" }}>{PHONE}</a><br />
              <a href={`mailto:${EMAIL_DPO}`} style={{ color: "#2563eb" }}>{EMAIL_DPO}</a>
            </div>
            <p>For all data-related queries or requests, contact us at the email above and mark your subject line <em>"DATA REQUEST"</em>.</p>
          </Section>

          <Section id="data-collected" title="2. What Personal Data We Collect">
            <p style={{ marginBottom: 12 }}>We collect the following categories of personal data depending on your role:</p>

            <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4, marginTop: 16 }}>Students (Children)</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Full name, date of birth, gender, genotype, admission number</Li>
              <Li>Class assignment, enrolment date, academic status</Li>
              <Li>Medical information: height, weight, immunisation status, health conditions, doctor details</Li>
              <Li>Developmental information: language milestones, dietary preferences, behavioural notes</Li>
              <Li>Academic results, attendance records, disciplinary records</Li>
              <Li>Scanned registration documents (uploaded PDFs)</Li>
            </ul>

            <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4, marginTop: 16 }}>Parents / Guardians</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Full name, phone number, email address</Li>
              <Li>Occupation, home address, work address, state, local government</Li>
              <Li>Genotype (as provided on registration forms)</Li>
              <Li>Financial records: fee invoices, payment declarations and receipts</Li>
              <Li>Login credentials (passwords stored as cryptographic hashes — never in plain text)</Li>
            </ul>

            <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4, marginTop: 16 }}>Staff</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Full name, email, phone number, home address</Li>
              <Li>Employment date, staff type, salary information</Li>
              <Li>Login credentials (hashed passwords)</Li>
              <Li>Class assignments and teaching records</Li>
              <Li>Attendance and payroll records</Li>
            </ul>

            <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4, marginTop: 16 }}>Technical / System Data</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Session authentication tokens (stored in browser cookies, expire automatically)</Li>
              <Li>System audit logs: who performed which action and when</Li>
              <Li>IP address and browser information (collected by hosting infrastructure)</Li>
            </ul>
          </Section>

          <Section id="legal-basis" title="3. Legal Basis for Processing">
            <p style={{ marginBottom: 12 }}>We process personal data on the following legal grounds:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li><strong>Contractual necessity</strong> — processing is required to provide school management services (enrolment, fee management, academic records).</Li>
              <Li><strong>Legitimate interests</strong> — ensuring school safety, operational continuity, and communication between staff, parents, and management.</Li>
              <Li><strong>Legal obligation</strong> — maintaining educational records as required by Nigerian education regulations.</Li>
              <Li><strong>Consent</strong> — where we rely on consent (e.g. storing non-essential data fields), you may withdraw consent at any time.</Li>
            </ul>
            <p style={{ marginTop: 12 }}>For children&apos;s data, we rely on the consent of a parent or guardian at the time of enrolment.</p>
          </Section>

          <Section id="children" title="4. Children's Data — Special Protection">
            <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "14px 18px", marginBottom: 12 }}>
              <p style={{ color: "#92400e", fontWeight: 600, marginBottom: 4 }}>⚠ Children's data receives heightened protection.</p>
              <p style={{ color: "#78350f" }}>All students are minors. Their data is only accessible to authorised school staff, and parents/guardians through their dedicated portal. Children&apos;s medical and developmental information is restricted to administrative roles only.</p>
            </div>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Student data is never shared with third parties for commercial purposes.</Li>
              <Li>Medical information is only visible to Principal, Admin, and designated staff.</Li>
              <Li>Parents can request a full export of their child&apos;s data at any time.</Li>
              <Li>Students aged 13+ may request access to their own academic records through school administration.</Li>
            </ul>
          </Section>

          <Section id="use" title="5. How We Use Your Data">
            <ul style={{ paddingLeft: 20 }}>
              <Li>Enrolling and managing student academic records</Li>
              <Li>Generating and tracking fee invoices and payments</Li>
              <Li>Recording and communicating academic results and report cards</Li>
              <Li>Managing staff employment, payroll, and class assignments</Li>
              <Li>Sending messages and announcements within the portal</Li>
              <Li>Maintaining attendance and disciplinary records</Li>
              <Li>Complying with statutory educational reporting obligations</Li>
              <Li>Ensuring system security through audit logs</Li>
            </ul>
            <p style={{ marginTop: 12 }}>We do <strong>not</strong> sell, rent, or share personal data with third parties for marketing purposes.</p>
          </Section>

          <Section id="retention" title="6. Data Retention">
            <p style={{ marginBottom: 12 }}>We retain personal data for the following periods:</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e2e8f0", color: "#1e293b" }}>Data Category</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e2e8f0", color: "#1e293b" }}>Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Student academic records", "7 years after graduation / withdrawal"],
                    ["Medical information", "5 years after last attendance"],
                    ["Fee & payment records", "7 years (financial regulation requirement)"],
                    ["Staff employment records", "7 years after end of employment"],
                    ["Audit logs", "2 years"],
                    ["Session tokens (cookies)", "24 hours (auto-expiring)"],
                    ["Disciplinary records", "3 years after incident"],
                  ].map(([cat, period]) => (
                    <tr key={cat}>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0" }}>{cat}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#64748b" }}>{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 12 }}>After retention periods expire, data is permanently deleted or anonymised.</p>
          </Section>

          <Section id="security" title="7. Data Security">
            <ul style={{ paddingLeft: 20 }}>
              <Li>All passwords are stored as one-way cryptographic hashes (bcrypt). We cannot recover plain-text passwords.</Li>
              <Li>Authentication uses short-lived JWT access tokens (expires in 24h) and secure refresh tokens.</Li>
              <Li>All data is transmitted over HTTPS/TLS encryption.</Li>
              <Li>Role-based access control (RBAC) ensures each user only accesses data relevant to their role.</Li>
              <Li>All administrative actions are recorded in tamper-evident audit logs.</Li>
              <Li>The system is hosted on secure cloud infrastructure with automated backups.</Li>
            </ul>
            <p style={{ marginTop: 12 }}>Despite these measures, no system is 100% secure. In the event of a data breach affecting your rights, we will notify affected individuals within 72 hours as required by law.</p>
          </Section>

          <Section id="sharing" title="8. Data Sharing">
            <p>We do not share personal data with third parties except:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <Li><strong>Cloud infrastructure provider</strong> — our hosting partner processes data solely to deliver the service (acting as Data Processor under a processing agreement).</Li>
              <Li><strong>Email service</strong> — used only to send system-generated notifications (password resets, announcements). No marketing.</Li>
              <Li><strong>Legal authorities</strong> — if required by Nigerian law or a valid court order.</Li>
            </ul>
          </Section>

          <Section id="cookies" title="9. Cookies and Session Tokens">
            <p>This portal uses the following cookies:</p>
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e2e8f0", color: "#1e293b" }}>Cookie</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e2e8f0", color: "#1e293b" }}>Purpose</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e2e8f0", color: "#1e293b" }}>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["access_token", "Authenticates your session (strictly necessary)", "24 hours"],
                    ["refresh_token", "Renews session without re-login (strictly necessary)", "7 days"],
                    ["sms_consent", "Records that you have acknowledged this privacy notice", "1 year"],
                  ].map(([name, purpose, expiry]) => (
                    <tr key={name}>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontFamily: "monospace", color: "#1e293b" }}>{name}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#64748b" }}>{purpose}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#64748b" }}>{expiry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 12 }}>We do not use advertising, analytics, or tracking cookies. All cookies are strictly necessary for the portal to function.</p>
          </Section>

          <Section id="rights" title="10. Your Data Rights">
            <p style={{ marginBottom: 12 }}>Under the NDPA 2023 and GDPR you have the following rights:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li><strong>Right of access</strong> — request a copy of all personal data we hold about you.</Li>
              <Li><strong>Right to rectification</strong> — request correction of inaccurate or incomplete data.</Li>
              <Li><strong>Right to erasure</strong> — request deletion of your data, subject to legal retention requirements.</Li>
              <Li><strong>Right to portability</strong> — receive your data in a machine-readable format.</Li>
              <Li><strong>Right to restrict processing</strong> — ask us to pause processing while a dispute is resolved.</Li>
              <Li><strong>Right to object</strong> — object to processing based on legitimate interests.</Li>
              <Li><strong>Right to withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</Li>
            </ul>
            <p style={{ marginTop: 12 }}>To exercise any right, email <a href={`mailto:${EMAIL_DPO}`} style={{ color: "#2563eb" }}>{EMAIL_DPO}</a> with subject line <em>"DATA REQUEST"</em>. We will respond within <strong>30 days</strong>.</p>
            <p style={{ marginTop: 8 }}>If you believe your data rights have been violated, you may lodge a complaint with the <strong>Nigeria Data Protection Commission (NDPC)</strong> at <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>ndpc.gov.ng</a>.</p>
          </Section>

          <Section id="changes" title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. The effective date at the top of this page reflects the latest revision. Material changes will be notified to active users via the portal announcement system.</p>
          </Section>

          <Section id="contact" title="12. Contact">
            <p>For any privacy-related questions or requests:</p>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", margin: "12px 0" }}>
              <strong>{CONTROLLER}</strong><br />
              {ADDRESS}<br />
              Phone: <a href={`tel:${PHONE}`} style={{ color: "#2563eb" }}>{PHONE}</a><br />
              Email: <a href={`mailto:${EMAIL_DPO}`} style={{ color: "#2563eb" }}>{EMAIL_DPO}</a>
            </div>
          </Section>
        </article>

        {/* Sidebar TOC */}
        <aside style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>Contents</p>
            {[
              ["controller",    "1. Data Controller"],
              ["data-collected","2. Data Collected"],
              ["legal-basis",   "3. Legal Basis"],
              ["children",      "4. Children's Data"],
              ["use",           "5. How We Use Data"],
              ["retention",     "6. Retention"],
              ["security",      "7. Security"],
              ["sharing",       "8. Data Sharing"],
              ["cookies",       "9. Cookies"],
              ["rights",        "10. Your Rights"],
              ["changes",       "11. Changes"],
              ["contact",       "12. Contact"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} style={{ display: "block", color: "#475569", textDecoration: "none", fontSize: "0.8125rem", padding: "5px 0", borderLeft: "2px solid transparent", paddingLeft: 10, marginBottom: 2, transition: "color 0.15s, border-color 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#2563eb"; (e.currentTarget as HTMLElement).style.borderLeftColor = "#2563eb"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#475569"; (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
            <p style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600, marginBottom: 6 }}>Data Request?</p>
            <p style={{ fontSize: "0.75rem", color: "#166534", lineHeight: 1.6 }}>Email us at</p>
            <a href={`mailto:${EMAIL_DPO}`} style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 700, wordBreak: "break-all" }}>{EMAIL_DPO}</a>
            <p style={{ fontSize: "0.72rem", color: "#166534", marginTop: 4 }}>Subject: DATA REQUEST</p>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "16px 24px", textAlign: "center" }}>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.8125rem" }}>← Return to Home</Link>
        <span style={{ color: "#cbd5e1", margin: "0 12px" }}>·</span>
        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>© {new Date().getFullYear()} {CONTROLLER}. All rights reserved.</span>
      </div>
    </div>
  );
}
