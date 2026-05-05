import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.units import inch


def _grade_from_score(score: float) -> str:
    if score >= 75: return "A"
    if score >= 60: return "B"
    if score >= 50: return "C"
    if score >= 45: return "D"
    if score >= 40: return "E"
    return "F"


def generate_report_card_pdf(
    student: dict,
    results: list,
    session: str,
    term: str,
    attendance: dict = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elements = []

    # ── Header ──────────────────────────────────────────────────────
    school_style = ParagraphStyle(
        "School", parent=styles["Title"], fontSize=17, spaceAfter=2,
        textColor=colors.HexColor("#1d4ed8"),
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"], fontSize=10, spaceAfter=1,
        textColor=colors.HexColor("#374151"), alignment=1,
    )
    card_style = ParagraphStyle(
        "Card", parent=styles["Heading2"], fontSize=12, spaceBefore=6, spaceAfter=6,
        textColor=colors.HexColor("#0f172a"), alignment=1,
    )

    elements.append(Paragraph("HOPE HILLS ACADEMY", school_style))
    elements.append(Paragraph("Crèche · Nursery · Primary", sub_style))
    elements.append(Paragraph("Excellence in Early Childhood Education", sub_style))
    elements.append(Spacer(1, 0.05 * inch))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1d4ed8")))
    elements.append(Paragraph("STUDENT REPORT CARD", card_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
    elements.append(Spacer(1, 0.12 * inch))

    # ── Student info grid ───────────────────────────────────────────
    position = student.get("class_position")
    class_size = student.get("class_size")
    position_str = (
        f"{position} of {class_size}" if (position and class_size)
        else str(position) if position else "—"
    )

    info_data = [
        ["Student Name:", f"{student.get('first_name','')} {student.get('last_name','')}",
         "Session:", session],
        ["Admission No:", student.get("admission_number", ""), "Term:", term],
        ["Class:", student.get("class_name", ""), "Class Position:", position_str],
        ["Date Issued:", datetime.utcnow().strftime("%d %b %Y"), "", ""],
    ]
    info_table = Table(info_data, colWidths=[1.35 * inch, 2.15 * inch, 1.35 * inch, 2.15 * inch])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.15 * inch))

    # ── Attendance ──────────────────────────────────────────────────
    if attendance:
        days_present = attendance.get("days_present", 0)
        days_absent = attendance.get("days_absent", 0)
        days_late = attendance.get("days_late", 0)
        total_days = days_present + days_absent + days_late
        pct = round((days_present + days_late) / total_days * 100, 1) if total_days > 0 else 0

        att_data = [
            ["ATTENDANCE SUMMARY", "", "", "", ""],
            ["Days Present", "Days Absent", "Days Late", "Total School Days", "Attendance %"],
            [str(days_present), str(days_absent), str(days_late), str(total_days), f"{pct}%"],
        ]
        att_table = Table(att_data, colWidths=[1.4 * inch, 1.4 * inch, 1.4 * inch, 1.6 * inch, 1.2 * inch])
        att_table.setStyle(TableStyle([
            ("SPAN", (0, 0), (-1, 0)),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#dbeafe")),
            ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#1e40af")),
            ("BACKGROUND", (0, 2), (-1, 2), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(att_table)
        elements.append(Spacer(1, 0.15 * inch))

    # ── Results table ───────────────────────────────────────────────
    if results:
        header = [["SUBJECT", "CA (/40)", "EXAM (/60)", "TOTAL (/100)", "GRADE", "REMARKS"]]
        total_scores = []
        rows = []
        for r in results:
            rows.append([
                r.get("subject_name", ""),
                str(r.get("ca_score", "")),
                str(r.get("exam_score", "")),
                str(r.get("total_score", "")),
                r.get("grade", ""),
                r.get("remarks", "") or "",
            ])
            total_scores.append(float(r.get("total_score", 0)))

        res_table = Table(
            header + rows,
            colWidths=[2.1 * inch, 0.8 * inch, 0.9 * inch, 1.0 * inch, 0.65 * inch, 1.55 * inch],
        )
        res_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (0, 1), (0, -1), "LEFT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f0f7ff"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(res_table)

        if total_scores:
            avg = sum(total_scores) / len(total_scores)
            elements.append(Spacer(1, 0.12 * inch))

            summary_data = [
                ["Average Score:", f"{avg:.1f} / 100",
                 "Overall Grade:", _grade_from_score(avg),
                 "No. of Subjects:", str(len(results))],
            ]
            if position:
                summary_data.append([
                    "Class Position:", position_str, "", "", "", "",
                ])
            s_table = Table(
                summary_data,
                colWidths=[1.35 * inch, 1.15 * inch, 1.15 * inch, 0.75 * inch, 1.2 * inch, 1.4 * inch],
            )
            s_table.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTNAME", (4, 0), (4, -1), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#86efac")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(s_table)

    # ── Footer ──────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
    elements.append(Spacer(1, 0.06 * inch))
    footer_style = ParagraphStyle(
        "Footer", parent=styles["Normal"], fontSize=7,
        textColor=colors.HexColor("#94a3b8"), alignment=1,
    )
    elements.append(Paragraph(
        "Hope Hills Academy — Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape 901101, FCT",
        footer_style,
    ))
    elements.append(Paragraph("Tel: 08065598994 · 07052677702 | hopehillsacademy@gmail.com", footer_style))

    doc.build(elements)
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
        ["Amount Paid:", f"₦{float(payment['amount_paid']):,.2f}"],
        ["Payment Method:", payment["payment_method"]],
        ["Invoice Balance:", f"₦{float(invoice['balance']):,.2f}"],
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
        ["Gross Salary:", f"₦{float(payroll['salary_amount']):,.2f}"],
        ["Bonuses:", f"₦{float(payroll['bonuses']):,.2f}"],
        ["Deductions:", f"₦{float(payroll['deductions']):,.2f}"],
        ["Net Salary:", f"₦{float(payroll['net_salary']):,.2f}"],
        ["Status:", payroll["payment_status"]],
        ["Payment Date:", str(payroll.get("payment_date", ""))],
    ]
    table = Table(data, colWidths=[2 * inch, 4 * inch])
    table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
