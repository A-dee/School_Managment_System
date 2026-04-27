import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch


def generate_report_card_pdf(student: dict, results: list, session: str, term: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("SCHOOL MANAGEMENT SYSTEM", styles["Title"]))
    elements.append(Paragraph("STUDENT REPORT CARD", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    info_data = [
        ["Student Name:", f"{student['first_name']} {student['last_name']}"],
        ["Admission No:", student["admission_number"]],
        ["Class:", student.get("class_name", "")],
        ["Session:", session],
        ["Term:", term],
        ["Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M")],
    ]
    info_table = Table(info_data, colWidths=[2 * inch, 4 * inch])
    info_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 10)]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))

    if results:
        result_data = [["Subject", "CA Score", "Exam Score", "Total", "Grade", "Remarks"]]
        total_scores = []
        for r in results:
            result_data.append([
                r.get("subject_name", ""),
                str(r.get("ca_score", 0)),
                str(r.get("exam_score", 0)),
                str(r.get("total_score", 0)),
                r.get("grade", ""),
                r.get("remarks", ""),
            ])
            total_scores.append(float(r.get("total_score", 0)))

        result_table = Table(result_data, colWidths=[2 * inch, 1 * inch, 1 * inch, 1 * inch, 0.7 * inch, 1.3 * inch])
        result_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.beige, colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ]))
        elements.append(result_table)

        if total_scores:
            avg = sum(total_scores) / len(total_scores)
            elements.append(Spacer(1, 0.2 * inch))
            elements.append(Paragraph(f"Average Score: {avg:.2f}", styles["Normal"]))
            position = student.get("class_position")
            if position:
                elements.append(Paragraph(f"Class Position: {position}", styles["Normal"]))

    doc.build(elements)
    return buffer.getvalue()


def generate_receipt_pdf(payment: dict, student: dict, invoice: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("SCHOOL MANAGEMENT SYSTEM", styles["Title"]))
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

    elements.append(Paragraph("SCHOOL MANAGEMENT SYSTEM", styles["Title"]))
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
