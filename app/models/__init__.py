from app.models.user import User
from app.models.academic import AcademicSession, Term
from app.models.staff import Staff
from app.models.student import Student
from app.models.parent import Parent, ParentStudent
from app.models.class_ import Class
from app.models.subject import Subject, TeacherSubjectClass
from app.models.result import Result, GradeScale
from app.models.attendance import Attendance
from app.models.discipline import Discipline
from app.models.finance import FeeStructure, Invoice, Payment, Expenditure, Payroll
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.message import Message
from app.models.email_config import EmailConfig
from app.models.student_registration import StudentRegistration, StudentMedical, StudentAboutMe
from app.models.report_card_meta import ReportCardMeta
from app.models.student_document import StudentDocument
from app.models.announcement import Announcement
from app.models.finance import PaymentDeclaration, OptionalFee, PaystackTransaction
from app.models.calendar import SchoolEvent
from app.models.installment import FeeInstallmentPlan, FeeInstallmentMilestone
from app.models.timetable import TimetablePeriod, TimetableSlot
from app.models.school import SchoolConfig, SubscriptionTier
