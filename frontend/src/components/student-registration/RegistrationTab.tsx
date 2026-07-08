import React from "react";
import { SectionTitle } from "./helpers";

interface RegistrationTabProps {
  reg: {
    father_full_name: string;
    father_occupation: string;
    father_genotype: string;
    father_state: string;
    father_local_government: string;
    father_age: string;
    father_work_address: string;
    father_house_address: string;
    father_phone: string;
    mother_full_name: string;
    mother_occupation: string;
    mother_genotype: string;
    mother_state: string;
    mother_local_government: string;
    mother_age: string;
    mother_work_address: string;
    mother_house_address: string;
    mother_phone: string;
  };
  setR: (k: string, v: any) => void;
}

export default function RegistrationTab({ reg, setR }: RegistrationTabProps) {
  return (
    <div>
      <SectionTitle>Father's Information</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <label className="t-label">Father's Full Name</label>
          <input className="t-input" placeholder="Father's full name" value={reg.father_full_name}
            onChange={e => setR("father_full_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Occupation</label>
          <input className="t-input" placeholder="Occupation" value={reg.father_occupation}
            onChange={e => setR("father_occupation", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Genotype</label>
          <input className="t-input" placeholder="e.g. AA" value={reg.father_genotype}
            onChange={e => setR("father_genotype", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Age</label>
          <input className="t-input" type="number" placeholder="Age" value={reg.father_age}
            onChange={e => setR("father_age", e.target.value)} />
        </div>
        <div>
          <label className="t-label">State</label>
          <input className="t-input" placeholder="State of origin" value={reg.father_state}
            onChange={e => setR("father_state", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Local Government</label>
          <input className="t-input" placeholder="LGA" value={reg.father_local_government}
            onChange={e => setR("father_local_government", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Phone Number</label>
          <input className="t-input" placeholder="+234..." value={reg.father_phone}
            onChange={e => setR("father_phone", e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="t-label">Address of Place of Work</label>
          <input className="t-input" placeholder="Father's work address" value={reg.father_work_address}
            onChange={e => setR("father_work_address", e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="t-label">House Address</label>
          <input className="t-input" placeholder="House address and phone number" value={reg.father_house_address}
            onChange={e => setR("father_house_address", e.target.value)} />
        </div>
      </div>

      <SectionTitle>Mother's Information</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <label className="t-label">Mother's Full Name</label>
          <input className="t-input" placeholder="Mother's full name" value={reg.mother_full_name}
            onChange={e => setR("mother_full_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Occupation</label>
          <input className="t-input" placeholder="Occupation" value={reg.mother_occupation}
            onChange={e => setR("mother_occupation", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Genotype</label>
          <input className="t-input" placeholder="e.g. AA" value={reg.mother_genotype}
            onChange={e => setR("mother_genotype", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Age</label>
          <input className="t-input" type="number" placeholder="Age" value={reg.mother_age}
            onChange={e => setR("mother_age", e.target.value)} />
        </div>
        <div>
          <label className="t-label">State</label>
          <input className="t-input" placeholder="State of origin" value={reg.mother_state}
            onChange={e => setR("mother_state", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Local Government</label>
          <input className="t-input" placeholder="LGA" value={reg.mother_local_government}
            onChange={e => setR("mother_local_government", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Phone Number</label>
          <input className="t-input" placeholder="+234..." value={reg.mother_phone}
            onChange={e => setR("mother_phone", e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="t-label">Address of Place of Work</label>
          <input className="t-input" placeholder="Mother's work address" value={reg.mother_work_address}
            onChange={e => setR("mother_work_address", e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="t-label">House Address</label>
          <input className="t-input" placeholder="House address and phone number" value={reg.mother_house_address}
            onChange={e => setR("mother_house_address", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "var(--accent-light)", fontSize: "0.78rem", color: "var(--accent)" }}>
        <strong>NOTE:</strong> Every parent should please come along with their child's immunization certificate.<br />
        Bank Account: Hope Hills Academy &nbsp;·&nbsp; 1015842401 Zenith Bank
      </div>
    </div>
  );
}
