from typing import Optional
from datetime import date
from pydantic import BaseModel


class StudentRegistrationData(BaseModel):
    father_full_name: Optional[str] = None
    father_occupation: Optional[str] = None
    father_genotype: Optional[str] = None
    father_state: Optional[str] = None
    father_local_government: Optional[str] = None
    father_age: Optional[int] = None
    father_work_address: Optional[str] = None
    father_house_address: Optional[str] = None
    father_phone: Optional[str] = None
    mother_full_name: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_genotype: Optional[str] = None
    mother_state: Optional[str] = None
    mother_local_government: Optional[str] = None
    mother_age: Optional[int] = None
    mother_work_address: Optional[str] = None
    mother_house_address: Optional[str] = None
    mother_phone: Optional[str] = None
    child_genotype: Optional[str] = None
    child_notes: Optional[str] = None

    class Config:
        from_attributes = True


class StudentMedicalData(BaseModel):
    height: Optional[str] = None
    weight: Optional[str] = None
    bmi: Optional[str] = None
    immunization_age_appropriate: Optional[bool] = None
    immunization_complete: Optional[bool] = None
    has_asthma: Optional[bool] = None
    has_allergies: Optional[bool] = None
    has_sight_issues: Optional[bool] = None
    has_hearing_issues: Optional[bool] = None
    has_epilepsy: Optional[bool] = None
    has_bleeding_disorder: Optional[bool] = None
    has_fear_phobia: Optional[bool] = None
    on_medications: Optional[bool] = None
    had_major_surgery: Optional[bool] = None
    medical_details: Optional[str] = None
    eye_left: Optional[str] = None
    eye_right: Optional[str] = None
    hearing_left: Optional[str] = None
    hearing_right: Optional[str] = None
    dental: Optional[str] = None
    chest_exam: Optional[str] = None
    abdomen_exam: Optional[str] = None
    blood_hbsag: Optional[str] = None
    blood_hiv: Optional[str] = None
    blood_group: Optional[str] = None
    blood_genotype: Optional[str] = None
    urinalysis: Optional[str] = None
    stool_microscopy: Optional[str] = None
    is_fit_for_activities: Optional[bool] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    exam_date: Optional[date] = None

    class Config:
        from_attributes = True


class StudentAboutMeData(BaseModel):
    nickname: Optional[str] = None
    been_in_childcare: Optional[bool] = None
    childcare_terminated_reason: Optional[str] = None
    is_extremely_active: Optional[bool] = None
    does_child_talk: Optional[bool] = None
    speaks_other_language: Optional[bool] = None
    other_language: Optional[str] = None
    word_water: Optional[str] = None
    word_mama: Optional[str] = None
    word_sleep: Optional[str] = None
    other_words: Optional[str] = None
    eats_regular_food: Optional[bool] = None
    about_to_introduce_food: Optional[bool] = None
    best_food: Optional[str] = None
    is_picky_eater: Optional[bool] = None
    picky_eater_strategy: Optional[str] = None
    has_known_allergy: Optional[bool] = None
    known_allergies: Optional[str] = None
    allergy_instructions: Optional[str] = None
    easy_to_fall_asleep: Optional[bool] = None
    easily_startled_sleeping: Optional[bool] = None
    sleep_helpers: Optional[str] = None
    disposition_waking: Optional[str] = None
    diaper_cream: Optional[str] = None
    what_upsets_child: Optional[str] = None
    what_makes_child_happy: Optional[str] = None
    has_health_problem: Optional[bool] = None
    health_problem_description: Optional[str] = None
    needs_regular_medication: Optional[bool] = None
    medication_details: Optional[str] = None
    child_scared_of: Optional[str] = None
    filled_by: Optional[str] = None
    form_filled_on: Optional[date] = None

    class Config:
        from_attributes = True
