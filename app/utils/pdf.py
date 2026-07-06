import io
import os
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


LOGO_PINK = colors.HexColor("#E84F7C")
LOGO_YELLOW = colors.HexColor("#F4B83A")
LOGO_BLUE = colors.HexColor("#2E74C9")
LOGO_GREEN = colors.HexColor("#2EA76E")
TEXT_DARK = colors.HexColor("#111827")
TEXT_MUTED = colors.HexColor("#4B5563")
BORDER_GREY = colors.HexColor("#D1D5DB")
SOFT_GREY = colors.HexColor("#F8FAFC")
HEADER_DARK = colors.HexColor("#18212F")


def _grade_from_score(score: float) -> str:
    if score >= 80:
        return "A"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C"
    if score >= 50:
        return "D"
    if score >= 40:
        return "E"
    return "F"


def _grade_remark(grade: str) -> str:
    return {
        "A": "Excellent",
        "B": "Very Good",
        "C": "Good",
        "D": "Fair",
        "E": "Pass",
        "F": "Fail",
    }.get(grade, "")


def _overall_status(score: float) -> str:
    return "Pass" if score >= 40 else "Needs Improvement"


def _safe_number(value, default: float = 0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fmt_score(value) -> str:
    if value in (None, ""):
        return "-"
    number = _safe_number(value, default=None)
    if number is None:
        return str(value)
    if float(number).is_integer():
        return str(int(number))
    return f"{number:.1f}"


def _fmt_text(value, fallback: str = "-") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _fmt_date(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    if isinstance(value, date):
        return value.strftime("%d %b %Y")
    if value:
        return str(value)
    return datetime.utcnow().strftime("%d %b %Y")


def _ordinal(value) -> str:
    if not value:
        return "-"
    number = int(value)
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


def _repo_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _resolve_local_asset(path_or_url: str | None) -> str | None:
    if not path_or_url:
        return None
    candidate = path_or_url.strip()
    if not candidate:
        return None
    if candidate.startswith(("http://", "https://")):
        return None
    if os.path.isabs(candidate) and os.path.exists(candidate):
        return candidate

    repo_root = _repo_root()
    normalized = candidate.lstrip("/\\")
    guesses = [
        os.path.join(repo_root, normalized),
        os.path.join(repo_root, "frontend", "public", normalized),
    ]
    for guess in guesses:
        if os.path.exists(guess):
            return guess
    return None


def _load_image(path_or_url: str | None):
    resolved = _resolve_local_asset(path_or_url)
    if not resolved:
        return None
    try:
        return ImageReader(resolved)
    except Exception:
        return None


def _image_flowable(path_or_url: str | None, width: float, height: float):
    resolved = _resolve_local_asset(path_or_url)
    if not resolved:
        return None
    try:
        image = Image(resolved, width=width, height=height)
        image.hAlign = "CENTER"
        return image
    except Exception:
        return None


def _build_section_title(title: str, styles) -> Table:
    table = Table([[Paragraph(title.upper(), styles["section_title"]), ""]], colWidths=[2.05 * inch, 4.9 * inch])
    table.setStyle(TableStyle([
        ("LINEBELOW", (1, 0), (1, 0), 0.6, BORDER_GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _build_header(report: dict, styles) -> list:
    logo = _image_flowable(report.get("school_logo_url"), width=0.82 * inch, height=0.82 * inch)
    logo_cell = logo if logo else Paragraph("LOGO", styles["mini_label"])
    header_title = [
        Paragraph("HOPE HILLS ACADEMY", styles["school_name"]),
        Paragraph("Student Academic Report", styles["report_title"]),
        Paragraph(
            f"{_fmt_text(report.get('session_name'))}  |  {_fmt_text(report.get('term_name'))}",
            styles["report_meta"],
        ),
    ]
    copy_type = report.get("copy_type", "official")
    copy_label = "Parent Copy" if copy_type == "parent" else "Official School Copy"
    badge = Table([[Paragraph(copy_label, styles["copy_badge"])]], colWidths=[1.55 * inch])
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    header = Table(
        [[logo_cell, header_title, badge]],
        colWidths=[0.95 * inch, 4.85 * inch, 1.25 * inch],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    accent = Table([["", "", "", ""]], colWidths=[1.75 * inch, 1.75 * inch, 1.75 * inch, 1.75 * inch], rowHeights=[0.08 * inch])
    accent.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), LOGO_YELLOW),
        ("BACKGROUND", (1, 0), (1, 0), LOGO_PINK),
        ("BACKGROUND", (2, 0), (2, 0), LOGO_BLUE),
        ("BACKGROUND", (3, 0), (3, 0), LOGO_GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [header, Spacer(1, 0.12 * inch), accent, Spacer(1, 0.14 * inch)]


def _build_info_table(info_rows: list[list[tuple[str, str]]], styles) -> Table:
    rows = []
    for row in info_rows:
        formatted = []
        for label, value in row:
            formatted.extend([
                Paragraph(label, styles["field_label"]),
                Paragraph(_fmt_text(value), styles["field_value"]),
            ])
        rows.append(formatted)

    table = Table(
        rows,
        colWidths=[0.95 * inch, 1.38 * inch, 0.95 * inch, 1.38 * inch, 0.95 * inch, 1.39 * inch],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table


def _build_attendance_table(attendance: dict, styles) -> Table:
    data = [
        [
            Paragraph("Total School Days", styles["table_header_dark"]),
            Paragraph("Days Present", styles["table_header_dark"]),
            Paragraph("Days Absent", styles["table_header_dark"]),
            Paragraph("Attendance %", styles["table_header_dark"]),
            Paragraph("Punctuality / Attendance Remark", styles["table_header_dark"]),
        ],
        [
            Paragraph(_fmt_text(attendance.get("total_school_days")), styles["table_value"]),
            Paragraph(_fmt_text(attendance.get("days_present")), styles["table_value"]),
            Paragraph(_fmt_text(attendance.get("days_absent")), styles["table_value"]),
            Paragraph(f"{_safe_number(attendance.get('attendance_percentage')):.1f}%", styles["table_value"]),
            Paragraph(_fmt_text(attendance.get("remark")), styles["table_value_left"]),
        ],
    ]
    table = Table(data, colWidths=[1.25 * inch, 1.05 * inch, 1.0 * inch, 1.0 * inch, 3.0 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER_GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _build_results_table(subjects: list[dict], styles) -> Table:
    rows = [[
        Paragraph("Subject", styles["table_header_dark"]),
        Paragraph("CA 1", styles["table_header_dark"]),
        Paragraph("CA 2", styles["table_header_dark"]),
        Paragraph("Exam", styles["table_header_dark"]),
        Paragraph("Total", styles["table_header_dark"]),
        Paragraph("Grade", styles["table_header_dark"]),
        Paragraph("Subject Position", styles["table_header_dark"]),
        Paragraph("Remark", styles["table_header_dark"]),
    ]]
    for subject in subjects:
        rows.append([
            Paragraph(_fmt_text(subject.get("subject_name")), styles["table_value_left"]),
            Paragraph(_fmt_score(subject.get("ca1_score")), styles["table_value"]),
            Paragraph(_fmt_score(subject.get("ca2_score")), styles["table_value"]),
            Paragraph(_fmt_score(subject.get("exam_score")), styles["table_value"]),
            Paragraph(_fmt_score(subject.get("total_score")), styles["table_value"]),
            Paragraph(_fmt_text(subject.get("grade")), styles["table_value"]),
            Paragraph(_fmt_text(subject.get("subject_position")), styles["table_value"]),
            Paragraph(_fmt_text(subject.get("remark")), styles["table_value_left"]),
        ])

    table = Table(
        rows,
        colWidths=[1.65 * inch, 0.58 * inch, 0.58 * inch, 0.7 * inch, 0.7 * inch, 0.52 * inch, 0.86 * inch, 1.38 * inch],
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER_GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_GREY]),
    ]))
    return table


def _build_summary_table(report: dict, styles) -> Table:
    data = [
        [
            Paragraph("Grand Total", styles["field_label"]),
            Paragraph(_fmt_score(report.get("total_score")), styles["summary_value"]),
            Paragraph("Average", styles["field_label"]),
            Paragraph(_fmt_score(report.get("average_score")), styles["summary_value"]),
            Paragraph("Overall Grade", styles["field_label"]),
            Paragraph(_fmt_text(report.get("overall_grade")), styles["summary_value"]),
        ],
        [
            Paragraph("Final Class Position", styles["field_label"]),
            Paragraph(_fmt_text(report.get("position_in_class")), styles["summary_value"]),
            Paragraph("Students in Class", styles["field_label"]),
            Paragraph(_fmt_text(report.get("total_students")), styles["summary_value"]),
            Paragraph("Result Status", styles["field_label"]),
            Paragraph(_fmt_text(report.get("result_status")), styles["summary_value"]),
        ],
    ]
    table = Table(data, colWidths=[1.15 * inch, 0.95 * inch, 0.95 * inch, 0.8 * inch, 1.0 * inch, 1.3 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _build_grading_scale(styles) -> Table:
    rows = [
        [Paragraph("Grading Scale", styles["section_subtitle"])],
        [Paragraph("A: 80 - 100  Excellent", styles["scale_row"])],
        [Paragraph("B: 70 - 79  Very Good", styles["scale_row"])],
        [Paragraph("C: 60 - 69  Good", styles["scale_row"])],
        [Paragraph("D: 50 - 59  Fair", styles["scale_row"])],
        [Paragraph("E: 40 - 49  Pass", styles["scale_row"])],
        [Paragraph("F: 0 - 39  Fail", styles["scale_row"])],
    ]
    table = Table(rows, colWidths=[2.2 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("INNERGRID", (0, 1), (-1, -1), 0.3, BORDER_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def _build_comment_block(comment: dict, title: str, styles, show_signature_images: bool) -> Table:
    signature = _image_flowable(comment.get("signature_url"), width=1.05 * inch, height=0.38 * inch) if show_signature_images else None
    signature_cell = signature or Paragraph("Digital signature pending", styles["mini_muted"])
    info_line = Paragraph(
        f"<b>Name:</b> {_fmt_text(comment.get('name'))}<br/><b>Date:</b> {_fmt_date(comment.get('date'))}",
        styles["comment_meta"],
    )
    body = [
        [Paragraph(title, styles["comment_title"])],
        [Paragraph(_fmt_text(comment.get("text"), fallback="No comment supplied."), styles["comment_body"])],
        [signature_cell],
        [info_line],
    ]
    table = Table(body, colWidths=[3.35 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def _build_stamp_cell(report: dict, styles, show_stamp: bool) -> Table:
    stamp = _image_flowable(report.get("school_stamp_url"), width=1.0 * inch, height=1.0 * inch) if show_stamp else None
    stamp_cell = stamp or Paragraph("School stamp", styles["mini_label"])
    body = [
        [Paragraph("School Stamp", styles["comment_title"])],
        [stamp_cell],
        [Paragraph(f"<b>Date Issued:</b> {_fmt_date(report.get('date_issued'))}", styles["comment_meta"])],
    ]
    table = Table(body, colWidths=[1.15 * inch])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER_GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _build_footer(styles) -> list:
    return [
        Spacer(1, 0.1 * inch),
        HRFlowable(width="100%", thickness=0.5, color=BORDER_GREY),
        Spacer(1, 0.05 * inch),
        Paragraph(
            "This result was generated from Hope Hills Academy School Management System.",
            styles["footer_note"],
        ),
    ]


def _draw_parent_watermark(canvas, logo_path: str | None) -> None:
    canvas.saveState()
    width, height = A4
    if logo_path:
        image = _load_image(logo_path)
        if image:
            try:
                canvas.setFillAlpha(0.08)
            except AttributeError:
                pass
            canvas.drawImage(
                image,
                (width - 3.0 * inch) / 2,
                (height - 3.0 * inch) / 2 + 0.35 * inch,
                width=3.0 * inch,
                height=3.0 * inch,
                preserveAspectRatio=True,
                mask="auto",
            )
    try:
        canvas.setFillAlpha(0.11)
    except AttributeError:
        pass
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica-Bold", 32)
    canvas.drawCentredString(width / 2, height / 2 - 0.28 * inch, "PARENT COPY")
    canvas.setFont("Helvetica", 11)
    canvas.drawCentredString(width / 2, height / 2 - 0.58 * inch, "Generated Copy")
    canvas.restoreState()


def generate_report_card_pdf(report: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.42 * inch,
        bottomMargin=0.42 * inch,
        leftMargin=0.42 * inch,
        rightMargin=0.42 * inch,
    )
    sample_styles = getSampleStyleSheet()
    styles = {
        "school_name": ParagraphStyle("school_name", parent=sample_styles["Title"], fontSize=18, leading=21, alignment=1, textColor=TEXT_DARK, spaceAfter=2),
        "report_title": ParagraphStyle("report_title", parent=sample_styles["Heading2"], fontSize=11.5, leading=13, alignment=1, textColor=TEXT_MUTED, spaceAfter=2),
        "report_meta": ParagraphStyle("report_meta", parent=sample_styles["Normal"], fontSize=8.5, leading=10.5, alignment=1, textColor=TEXT_MUTED),
        "copy_badge": ParagraphStyle("copy_badge", parent=sample_styles["Normal"], fontSize=8.2, alignment=1, textColor=TEXT_DARK),
        "section_title": ParagraphStyle("section_title", parent=sample_styles["Heading4"], fontSize=10.5, leading=12, textColor=colors.HexColor("#4F46E5"), spaceAfter=0),
        "section_subtitle": ParagraphStyle("section_subtitle", parent=sample_styles["Heading5"], fontSize=9.5, leading=11, textColor=TEXT_DARK),
        "field_label": ParagraphStyle("field_label", parent=sample_styles["Normal"], fontSize=8.1, leading=9.5, textColor=TEXT_MUTED),
        "field_value": ParagraphStyle("field_value", parent=sample_styles["Normal"], fontSize=8.8, leading=10.2, textColor=TEXT_DARK),
        "summary_value": ParagraphStyle("summary_value", parent=sample_styles["Normal"], fontSize=8.8, leading=10.2, textColor=TEXT_DARK, alignment=1),
        "table_header_dark": ParagraphStyle("table_header_dark", parent=sample_styles["Normal"], fontSize=8.1, leading=9.5, alignment=1, textColor=colors.white),
        "table_value": ParagraphStyle("table_value", parent=sample_styles["Normal"], fontSize=8.2, leading=9.8, alignment=1, textColor=TEXT_DARK),
        "table_value_left": ParagraphStyle("table_value_left", parent=sample_styles["Normal"], fontSize=8.2, leading=9.8, textColor=TEXT_DARK),
        "scale_row": ParagraphStyle("scale_row", parent=sample_styles["Normal"], fontSize=8.3, leading=9.7, textColor=TEXT_DARK),
        "comment_title": ParagraphStyle("comment_title", parent=sample_styles["Heading5"], fontSize=9.2, leading=11, textColor=TEXT_DARK),
        "comment_body": ParagraphStyle("comment_body", parent=sample_styles["Normal"], fontSize=8.3, leading=10.4, textColor=TEXT_DARK),
        "comment_meta": ParagraphStyle("comment_meta", parent=sample_styles["Normal"], fontSize=7.7, leading=9.2, textColor=TEXT_MUTED),
        "mini_label": ParagraphStyle("mini_label", parent=sample_styles["Normal"], fontSize=7.2, leading=8.2, alignment=1, textColor=TEXT_MUTED),
        "mini_muted": ParagraphStyle("mini_muted", parent=sample_styles["Normal"], fontSize=7.3, leading=8.6, alignment=1, textColor=TEXT_MUTED),
        "footer_note": ParagraphStyle("footer_note", parent=sample_styles["Normal"], fontSize=7.3, leading=9, alignment=1, textColor=TEXT_MUTED),
    }

    student_rows = [
        [
            ("Student Name", report.get("student_name")),
            ("Admission No.", report.get("admission_number")),
            ("Class", report.get("class_name")),
        ],
        [
            ("Term", report.get("term_name")),
            ("Academic Session", report.get("session_name")),
            ("Gender", report.get("gender")),
        ],
        [
            ("Class Teacher", report.get("class_teacher_name")),
            ("Students in Class", report.get("total_students")),
            ("Position in Class", report.get("position_in_class")),
        ],
        [
            ("Total Score", report.get("total_score")),
            ("Average Score", report.get("average_score")),
            ("Overall Grade", report.get("overall_grade")),
        ],
        [
            ("Result Status", report.get("result_status")),
            ("Date Issued", _fmt_date(report.get("date_issued"))),
            ("Portal Copy", "Parent" if report.get("copy_type") == "parent" else "Official"),
        ],
    ]

    elements = []
    elements.extend(_build_header(report, styles))
    elements.append(_build_section_title("Student Information", styles))
    elements.append(Spacer(1, 0.08 * inch))
    elements.append(_build_info_table(student_rows, styles))
    elements.append(Spacer(1, 0.15 * inch))
    elements.append(_build_section_title("Attendance Summary", styles))
    elements.append(Spacer(1, 0.08 * inch))
    elements.append(_build_attendance_table(report.get("attendance", {}), styles))
    elements.append(Spacer(1, 0.16 * inch))
    elements.append(_build_section_title("Subject Results", styles))
    elements.append(Spacer(1, 0.08 * inch))
    elements.append(_build_results_table(report.get("subjects", []), styles))
    elements.append(Spacer(1, 0.12 * inch))

    grading_and_summary = Table(
        [[_build_summary_table(report, styles), _build_grading_scale(styles)]],
        colWidths=[4.95 * inch, 2.0 * inch],
    )
    grading_and_summary.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(grading_and_summary)
    elements.append(Spacer(1, 0.16 * inch))

    show_signatures = report.get("copy_type") == "official"
    teacher_comment = _build_comment_block(report.get("teacher_comment", {}), "Class Teacher's Comment", styles, show_signatures)
    principal_comment = _build_comment_block(report.get("principal_comment", {}), "Principal's Comment", styles, show_signatures)
    comments_table = Table(
        [[teacher_comment, principal_comment]],
        colWidths=[3.47 * inch, 3.47 * inch],
    )
    comments_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(_build_section_title("Comments", styles))
    elements.append(Spacer(1, 0.08 * inch))
    elements.append(comments_table)
    elements.append(Spacer(1, 0.14 * inch))

    footer_grid = Table(
        [[
            Paragraph(
                "This result was generated from Hope Hills Academy School Management System.",
                styles["comment_meta"],
            ),
            _build_stamp_cell(report, styles, show_stamp=show_signatures),
        ]],
        colWidths=[5.85 * inch, 1.1 * inch],
    )
    footer_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(footer_grid)
    elements.extend(_build_footer(styles))

    def _draw_page(canvas, current_doc):
        if report.get("copy_type") == "parent":
            _draw_parent_watermark(canvas, report.get("school_logo_url"))

    doc.build(elements, onFirstPage=_draw_page, onLaterPages=_draw_page)
    return buffer.getvalue()


def generate_receipt_pdf(payment: dict, student: dict, invoice: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("HOPE HILLS ACADEMY", styles["Title"]))
    elements.append(Paragraph("PAYMENT RECEIPT", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    data = [
        ["Receipt No:", payment["receipt_number"]],
        ["Date:", str(payment["payment_date"])],
        ["Student:", f"{student['first_name']} {student['last_name']}"],
        ["Admission No:", student["admission_number"]],
        ["Amount Paid:", f"N{float(payment['amount_paid']):,.2f}"],
        ["Payment Method:", payment["payment_method"]],
        ["Invoice Balance:", f"N{float(invoice['balance']):,.2f}"],
        ["Status:", invoice["status"]],
    ]
    table = Table(data, colWidths=[2 * inch, 4 * inch])
    table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()


def generate_payslip_pdf(payroll: dict, staff: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("HOPE HILLS ACADEMY", styles["Title"]))
    elements.append(Paragraph("PAYSLIP", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    months = ["", "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"]

    data = [
        ["Staff Name:", staff["full_name"]],
        ["Staff Type:", staff["staff_type"]],
        ["Period:", f"{months[payroll['month']]} {payroll['year']}"],
        ["Gross Salary:", f"N{float(payroll['salary_amount']):,.2f}"],
        ["Bonuses:", f"N{float(payroll['bonuses']):,.2f}"],
        ["Deductions:", f"N{float(payroll['deductions']):,.2f}"],
        ["Net Salary:", f"N{float(payroll['net_salary']):,.2f}"],
        ["Status:", payroll["payment_status"]],
        ["Payment Date:", str(payroll.get("payment_date", ""))],
    ]
    table = Table(data, colWidths=[2 * inch, 4 * inch])
    table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
