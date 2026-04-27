from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey
from app.database import Base


class StudentRegistration(Base):
    __tablename__ = "student_registration"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)

    father_full_name = Column(String, nullable=True)
    father_occupation = Column(String, nullable=True)
    father_genotype = Column(String(10), nullable=True)
    father_state = Column(String, nullable=True)
    father_local_government = Column(String, nullable=True)
    father_age = Column(Integer, nullable=True)
    father_work_address = Column(Text, nullable=True)
    father_house_address = Column(Text, nullable=True)
    father_phone = Column(String(20), nullable=True)

    mother_full_name = Column(String, nullable=True)
    mother_occupation = Column(String, nullable=True)
    mother_genotype = Column(String(10), nullable=True)
    mother_state = Column(String, nullable=True)
    mother_local_government = Column(String, nullable=True)
    mother_age = Column(Integer, nullable=True)
    mother_work_address = Column(Text, nullable=True)
    mother_house_address = Column(Text, nullable=True)
    mother_phone = Column(String(20), nullable=True)

    child_genotype = Column(String(10), nullable=True)
    child_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StudentMedical(Base):
    __tablename__ = "student_medical"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)

    height = Column(String(20), nullable=True)
    weight = Column(String(20), nullable=True)
    bmi = Column(String(20), nullable=True)

    immunization_age_appropriate = Column(Boolean, nullable=True)
    immunization_complete = Column(Boolean, nullable=True)

    has_asthma = Column(Boolean, nullable=True)
    has_allergies = Column(Boolean, nullable=True)
    has_sight_issues = Column(Boolean, nullable=True)
    has_hearing_issues = Column(Boolean, nullable=True)
    has_epilepsy = Column(Boolean, nullable=True)
    has_bleeding_disorder = Column(Boolean, nullable=True)
    has_fear_phobia = Column(Boolean, nullable=True)
    on_medications = Column(Boolean, nullable=True)
    had_major_surgery = Column(Boolean, nullable=True)
    medical_details = Column(Text, nullable=True)

    eye_left = Column(String(50), nullable=True)
    eye_right = Column(String(50), nullable=True)
    hearing_left = Column(String(50), nullable=True)
    hearing_right = Column(String(50), nullable=True)
    dental = Column(String(100), nullable=True)
    chest_exam = Column(String(100), nullable=True)
    abdomen_exam = Column(String(100), nullable=True)
    blood_hbsag = Column(String(20), nullable=True)
    blood_hiv = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    blood_genotype = Column(String(10), nullable=True)
    urinalysis = Column(String(100), nullable=True)
    stool_microscopy = Column(String(100), nullable=True)
    is_fit_for_activities = Column(Boolean, nullable=True)
    doctor_name = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    exam_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StudentAboutMe(Base):
    __tablename__ = "student_about_me"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)

    nickname = Column(String(50), nullable=True)
    been_in_childcare = Column(Boolean, nullable=True)
    childcare_terminated_reason = Column(Text, nullable=True)
    is_extremely_active = Column(Boolean, nullable=True)
    does_child_talk = Column(Boolean, nullable=True)
    speaks_other_language = Column(Boolean, nullable=True)
    other_language = Column(String(50), nullable=True)
    word_water = Column(String(50), nullable=True)
    word_mama = Column(String(50), nullable=True)
    word_sleep = Column(String(50), nullable=True)
    other_words = Column(Text, nullable=True)
    eats_regular_food = Column(Boolean, nullable=True)
    about_to_introduce_food = Column(Boolean, nullable=True)
    best_food = Column(String, nullable=True)
    is_picky_eater = Column(Boolean, nullable=True)
    picky_eater_strategy = Column(Text, nullable=True)
    has_known_allergy = Column(Boolean, nullable=True)
    known_allergies = Column(Text, nullable=True)
    allergy_instructions = Column(Text, nullable=True)
    easy_to_fall_asleep = Column(Boolean, nullable=True)
    easily_startled_sleeping = Column(Boolean, nullable=True)
    sleep_helpers = Column(Text, nullable=True)
    disposition_waking = Column(String(20), nullable=True)
    diaper_cream = Column(Text, nullable=True)
    what_upsets_child = Column(Text, nullable=True)
    what_makes_child_happy = Column(Text, nullable=True)
    has_health_problem = Column(Boolean, nullable=True)
    health_problem_description = Column(Text, nullable=True)
    needs_regular_medication = Column(Boolean, nullable=True)
    medication_details = Column(Text, nullable=True)
    child_scared_of = Column(Text, nullable=True)
    filled_by = Column(String, nullable=True)
    form_filled_on = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
