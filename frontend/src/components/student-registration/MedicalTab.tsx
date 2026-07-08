import React from "react";
import { SectionTitle, YesNo } from "./helpers";

interface MedicalTabProps {
  med: {
    height: string;
    weight: string;
    bmi: string;
    immunization_age_appropriate: boolean | null;
    immunization_complete: boolean | null;
    has_asthma: boolean | null;
    has_epilepsy: boolean | null;
    has_allergies: boolean | null;
    has_bleeding_disorder: boolean | null;
    has_sight_issues: boolean | null;
    has_fear_phobia: boolean | null;
    has_hearing_issues: boolean | null;
    on_medications: boolean | null;
    had_major_surgery: boolean | null;
    medical_details: string;
    eye_left: string;
    eye_right: string;
    hearing_left: string;
    hearing_right: string;
    dental: string;
    chest_exam: string;
    abdomen_exam: string;
    blood_hbsag: string;
    blood_hiv: string;
    blood_group: string;
    blood_genotype: string;
    urinalysis: string;
    stool_microscopy: string;
    is_fit_for_activities: boolean | null;
    doctor_name: string;
    hospital_name: string;
    exam_date: string;
  };
  setM: (k: string, v: any) => void;
}

export default function MedicalTab({ med, setM }: MedicalTabProps) {
  return (
    <div>
      <SectionTitle>Child Medical Information</SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="t-label">Height</label>
          <input className="t-input" placeholder="e.g. 90cm" value={med.height}
            onChange={e => setM("height", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Weight</label>
          <input className="t-input" placeholder="e.g. 14kg" value={med.weight}
            onChange={e => setM("weight", e.target.value)} />
        </div>
        <div>
          <label className="t-label">BMI</label>
          <input className="t-input" placeholder="Body Mass Index" value={med.bmi}
            onChange={e => setM("bmi", e.target.value)} />
        </div>
      </div>

      <SectionTitle>Immunization Record</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <YesNo label="The child has had the age appropriate immunization"
          value={med.immunization_age_appropriate}
          onChange={v => setM("immunization_age_appropriate", v)} />
        <YesNo label="The child did not complete all necessary immunization"
          value={med.immunization_complete === null ? null : !med.immunization_complete}
          onChange={v => setM("immunization_complete", !v)} />
      </div>

      <SectionTitle>Medical History</SectionTitle>
      <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 12 }}>
        Has the child ever suffered from any of the following? Please circle the answer.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
        {[
          ["has_asthma", "Asthma"], ["has_epilepsy", "Epilepsy"],
          ["has_allergies", "Allergies"], ["has_bleeding_disorder", "Bleeding disorder (e.g. nose bleeding)"],
          ["has_sight_issues", "Sight issues"], ["has_fear_phobia", "Fear or phobia"],
          ["has_hearing_issues", "Hearing issues"], ["on_medications", "Is your child currently on any medications?"],
          ["had_major_surgery", "Any major injury or surgery since birth?"],
        ].map(([field, label]) => (
          <YesNo key={field} label={label}
            value={(med as any)[field]}
            onChange={v => setM(field, v)} />
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="t-label">Details</label>
        <textarea className="t-input" rows={3} placeholder="Provide any details here..."
          value={med.medical_details} onChange={e => setM("medical_details", e.target.value)}
          style={{ resize: "vertical" }} />
      </div>

      <SectionTitle>Medical Certificate Section</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="t-label">Eye — Left</label>
          <input className="t-input" placeholder="Result" value={med.eye_left}
            onChange={e => setM("eye_left", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Eye — Right</label>
          <input className="t-input" placeholder="Result" value={med.eye_right}
            onChange={e => setM("eye_right", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Hearing — Left</label>
          <input className="t-input" placeholder="Result" value={med.hearing_left}
            onChange={e => setM("hearing_left", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Hearing — Right</label>
          <input className="t-input" placeholder="Result" value={med.hearing_right}
            onChange={e => setM("hearing_right", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="t-label">Dental</label>
          <input className="t-input" placeholder="Dental result" value={med.dental}
            onChange={e => setM("dental", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Chest Exam</label>
          <input className="t-input" placeholder="Result" value={med.chest_exam}
            onChange={e => setM("chest_exam", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Abdomen Exam</label>
          <input className="t-input" placeholder="Result" value={med.abdomen_exam}
            onChange={e => setM("abdomen_exam", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Blood — HBsAg</label>
          <input className="t-input" placeholder="Reactive / NR" value={med.blood_hbsag}
            onChange={e => setM("blood_hbsag", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Blood — HIV</label>
          <input className="t-input" placeholder="+" value={med.blood_hiv}
            onChange={e => setM("blood_hiv", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Blood Group</label>
          <input className="t-input" placeholder="A / B / O / AB" value={med.blood_group}
            onChange={e => setM("blood_group", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Genotype</label>
          <input className="t-input" placeholder="AA / AS / SS" value={med.blood_genotype}
            onChange={e => setM("blood_genotype", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="t-label">Urinalysis</label>
          <input className="t-input" placeholder="Urinalysis result" value={med.urinalysis}
            onChange={e => setM("urinalysis", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="t-label">Stool Microscopy</label>
          <input className="t-input" placeholder="Stool microscopy result" value={med.stool_microscopy}
            onChange={e => setM("stool_microscopy", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="t-label">Fitness for Activities</label>
        <YesNo label="Physically fit to participate in group care and school activities"
          value={med.is_fit_for_activities}
          onChange={v => setM("is_fit_for_activities", v)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <div>
          <label className="t-label">Name of Doctor</label>
          <input className="t-input" placeholder="Doctor's name" value={med.doctor_name}
            onChange={e => setM("doctor_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Name of Hospital</label>
          <input className="t-input" placeholder="Hospital name" value={med.hospital_name}
            onChange={e => setM("hospital_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Exam Date</label>
          <input className="t-input" type="date" value={med.exam_date}
            onChange={e => setM("exam_date", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
