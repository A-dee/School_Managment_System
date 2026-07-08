import React from "react";
import { SectionTitle, YesNo } from "./helpers";

interface AboutMeTabProps {
  about: {
    nickname: string;
    been_in_childcare: boolean | null;
    childcare_terminated_reason: string;
    is_extremely_active: boolean | null;
    does_child_talk: boolean | null;
    speaks_other_language: boolean | null;
    other_language: string;
    word_water: string;
    word_mama: string;
    word_sleep: string;
    other_words: string;
    eats_regular_food: boolean | null;
    about_to_introduce_food: boolean | null;
    best_food: string;
    is_picky_eater: boolean | null;
    picky_eater_strategy: string;
    has_known_allergy: boolean | null;
    known_allergies: string;
    allergy_instructions: string;
    easy_to_fall_asleep: boolean | null;
    easily_startled_sleeping: boolean | null;
    sleep_helpers: string;
    disposition_waking: string;
    diaper_cream: string;
    what_upsets_child: string;
    what_makes_child_happy: string;
    has_health_problem: boolean | null;
    health_problem_description: string;
    needs_regular_medication: boolean | null;
    medication_details: string;
    child_scared_of: string;
    form_filled_on: string;
    filled_by: string;
  };
  setA: (k: string, v: any) => void;
}

export default function AboutMeTab({ about, setA }: AboutMeTabProps) {
  return (
    <div>
      <SectionTitle>All About Me (13M – 18M)</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="t-label">Child's Nickname</label>
          <input className="t-input" placeholder="Nickname" value={about.nickname}
            onChange={e => setA("nickname", e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <YesNo label="1. Has your child been in childcare before?"
          value={about.been_in_childcare}
          onChange={v => setA("been_in_childcare", v)} />
        {about.been_in_childcare && (
          <div>
            <label className="t-label">If yes, why was care terminated?</label>
            <input className="t-input" value={about.childcare_terminated_reason}
              onChange={e => setA("childcare_terminated_reason", e.target.value)} />
          </div>
        )}
        <YesNo label="2. Is your child extremely active?"
          value={about.is_extremely_active}
          onChange={v => setA("is_extremely_active", v)} />
        <YesNo label="3. Does your child talk?"
          value={about.does_child_talk}
          onChange={v => setA("does_child_talk", v)} />
        <YesNo label="4. Does your child speak another language (apart from English)?"
          value={about.speaks_other_language}
          onChange={v => setA("speaks_other_language", v)} />
        {about.speaks_other_language && (
          <div>
            <label className="t-label">Which language?</label>
            <input className="t-input" value={about.other_language}
              onChange={e => setA("other_language", e.target.value)} />
          </div>
        )}

        <div>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 8 }}>
            5. If he/she talks, how will he/she say:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="t-label">I am hungry</label>
              <input className="t-input" placeholder="How they say it" value={about.word_water}
                onChange={e => setA("word_water", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Mama</label>
              <input className="t-input" placeholder="How they say it" value={about.word_mama}
                onChange={e => setA("word_mama", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Sleep</label>
              <input className="t-input" placeholder="How they say it" value={about.word_sleep}
                onChange={e => setA("word_sleep", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="t-label">Other words</label>
            <input className="t-input" placeholder="Other words they use" value={about.other_words}
              onChange={e => setA("other_words", e.target.value)} />
          </div>
        </div>

        <YesNo label="6. Does your child eat regular food?"
          value={about.eats_regular_food}
          onChange={v => setA("eats_regular_food", v)} />
        <YesNo label="   About To Introduce?"
          value={about.about_to_introduce_food}
          onChange={v => setA("about_to_introduce_food", v)} />

        <div>
          <label className="t-label">7. What is your child's best food?</label>
          <input className="t-input" value={about.best_food}
            onChange={e => setA("best_food", e.target.value)} />
        </div>

        <YesNo label="8. Is your child a picky eater?"
          value={about.is_picky_eater}
          onChange={v => setA("is_picky_eater", v)} />
        {about.is_picky_eater && (
          <div>
            <label className="t-label">Is there any strategy that works for him/her?</label>
            <input className="t-input" value={about.picky_eater_strategy}
              onChange={e => setA("picky_eater_strategy", e.target.value)} />
          </div>
        )}

        <YesNo label="9. Does your child have any known allergy?"
          value={about.has_known_allergy}
          onChange={v => setA("has_known_allergy", v)} />
        {about.has_known_allergy && (
          <div>
            <label className="t-label">Please list allergies</label>
            <input className="t-input" value={about.known_allergies}
              onChange={e => setA("known_allergies", e.target.value)} />
          </div>
        )}
        <div>
          <label className="t-label">10. Special instructions in case of any allergic reaction</label>
          <textarea className="t-input" rows={2} value={about.allergy_instructions}
            onChange={e => setA("allergy_instructions", e.target.value)} style={{ resize: "vertical" }} />
        </div>

        <div>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 8 }}>11. Nap times:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12 }}>
            <YesNo label="a) Is it easy for your child to fall asleep?"
              value={about.easy_to_fall_asleep}
              onChange={v => setA("easy_to_fall_asleep", v)} />
            <YesNo label="b) Is your child easily startled while sleeping?"
              value={about.easily_startled_sleeping}
              onChange={v => setA("easily_startled_sleeping", v)} />
            <div>
              <label className="t-label">c) What helps your child to go to bed?</label>
              <input className="t-input" value={about.sleep_helpers}
                onChange={e => setA("sleep_helpers", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <label className="t-label">12. What is your child's disposition upon waking up?</label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
            {["happy", "grouchy", "clingy", "slow"].map(opt => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: "0.8125rem" }}>
                <input type="radio" name="disposition" checked={about.disposition_waking === opt}
                  onChange={() => setA("disposition_waking", opt)} />
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="t-label">13. Cream or powder used during diaper change</label>
          <input className="t-input" placeholder="Specify product and frequency" value={about.diaper_cream}
            onChange={e => setA("diaper_cream", e.target.value)} />
        </div>

        <div>
          <label className="t-label">14. What can make your child upset?</label>
          <input className="t-input" value={about.what_upsets_child}
            onChange={e => setA("what_upsets_child", e.target.value)} />
        </div>

        <div>
          <label className="t-label">15. If your child is upset, what can we do to make him/her happy?</label>
          <input className="t-input" value={about.what_makes_child_happy}
            onChange={e => setA("what_makes_child_happy", e.target.value)} />
        </div>

        <YesNo label="16. Does your child have any known health problem?"
          value={about.has_health_problem}
          onChange={v => setA("has_health_problem", v)} />
        {about.has_health_problem && (
          <div>
            <label className="t-label">If yes, please describe</label>
            <textarea className="t-input" rows={2} value={about.health_problem_description}
              onChange={e => setA("health_problem_description", e.target.value)} style={{ resize: "vertical" }} />
          </div>
        )}

        <YesNo label="17. Does your child need regular medication?"
          value={about.needs_regular_medication}
          onChange={v => setA("needs_regular_medication", v)} />
        {about.needs_regular_medication && (
          <div>
            <label className="t-label">If yes, what and when is it given?</label>
            <input className="t-input" value={about.medication_details}
              onChange={e => setA("medication_details", e.target.value)} />
          </div>
        )}

        <div>
          <label className="t-label">20. My child is scared of</label>
          <input className="t-input" value={about.child_scared_of}
            onChange={e => setA("child_scared_of", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="t-label">Form filled on</label>
            <input className="t-input" type="date" value={about.form_filled_on}
              onChange={e => setA("form_filled_on", e.target.value)} />
          </div>
          <div>
            <label className="t-label">Filled by</label>
            <input className="t-input" placeholder="Name of person filling the form" value={about.filled_by}
              onChange={e => setA("filled_by", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
