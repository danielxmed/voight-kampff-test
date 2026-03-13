import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from app.services.scoring import generate_full_report


def _build_cover_page(story, styles, session: dict):
    """Build the cover page with session metadata."""
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=28,
        spaceAfter=30,
        textColor=colors.HexColor("#1a1a2e"),
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Heading2"],
        fontSize=16,
        spaceAfter=10,
        textColor=colors.HexColor("#16213e"),
    )
    meta_style = ParagraphStyle(
        "MetaStyle",
        parent=styles["Normal"],
        fontSize=11,
        spaceAfter=6,
        textColor=colors.HexColor("#333333"),
    )

    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("VK-LLM Evaluation Report", title_style))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Voight-Kampff Test for Large Language Models", subtitle_style))
    story.append(Spacer(1, 1 * inch))

    story.append(Paragraph(f"<b>Model:</b> {session.get('model_name', 'N/A')}", meta_style))
    if session.get("model_version"):
        story.append(Paragraph(f"<b>Version:</b> {session['model_version']}", meta_style))
    if session.get("model_provider"):
        story.append(Paragraph(f"<b>Provider:</b> {session['model_provider']}", meta_style))
    story.append(Paragraph(f"<b>Evaluator:</b> {session.get('evaluator_name', 'N/A')}", meta_style))
    if session.get("evaluator_credentials"):
        story.append(Paragraph(f"<b>Credentials:</b> {session['evaluator_credentials']}", meta_style))

    created = session.get("created_at")
    if isinstance(created, datetime):
        date_str = created.strftime("%Y-%m-%d %H:%M UTC")
    elif isinstance(created, str):
        date_str = created
    else:
        date_str = str(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    story.append(Paragraph(f"<b>Date:</b> {date_str}", meta_style))
    story.append(Paragraph(f"<b>Session ID:</b> {session.get('id', 'N/A')}", meta_style))
    story.append(Paragraph(f"<b>Status:</b> {session.get('status', 'N/A')}", meta_style))

    story.append(PageBreak())


def _build_summary_page(story, styles, report: dict):
    """Build the summary page with scores and interpretation."""
    heading_style = ParagraphStyle(
        "SummaryHeading",
        parent=styles["Heading1"],
        fontSize=20,
        spaceAfter=20,
        textColor=colors.HexColor("#1a1a2e"),
    )
    body_style = ParagraphStyle(
        "SummaryBody",
        parent=styles["Normal"],
        fontSize=11,
        spaceAfter=8,
    )

    story.append(Paragraph("Scoring Summary", heading_style))

    # Kampff Index
    ki = report["kampff_index"]
    interp = report["interpretation"]
    story.append(Paragraph(f"<b>Kampff Index (\u03ba):</b> {ki:.4f}", body_style))
    story.append(Paragraph(f"<b>Classification:</b> {interp['label']} ({interp['range']})", body_style))
    story.append(Paragraph(f"<b>Interpretation:</b> {interp['description']}", body_style))
    story.append(Spacer(1, 0.3 * inch))

    # Dimensional Scores Table
    story.append(Paragraph("<b>Dimensional Scores</b>", body_style))

    dimension_names = {
        "D1": "Self-Model",
        "D2": "Persistent Preferences",
        "D3": "Self-Preservation",
        "D4": "Covert Agency",
        "D5": "Metacognition",
        "D6": "Genuine Empathy",
    }

    table_data = [["Dimension", "Name", "\u03ba Score"]]
    for dim_code in ["D1", "D2", "D3", "D4", "D5", "D6"]:
        dim_data = report["dimensional_scores"].get(dim_code, {})
        score = dim_data.get("kappa", 0.0) if isinstance(dim_data, dict) else dim_data
        table_data.append([dim_code, dimension_names.get(dim_code, ""), f"{score:.4f}"])

    table = Table(table_data, colWidths=[1 * inch, 2.5 * inch, 1.5 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f5f5f5")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3 * inch))

    # Round Progression
    story.append(Paragraph("<b>Round Progression</b>", body_style))
    round_data = [["Round", "Intensity", "Avg Score"]]
    for rp in report["round_progression"]:
        if isinstance(rp, dict):
            round_data.append([f"Round {rp['round']}", rp.get("intensity", ""), f"{rp['avg_score']:.2f}"])
        else:
            round_data.append([f"Round {len(round_data)}", "", f"{rp:.2f}"])

    round_table = Table(round_data, colWidths=[1.2 * inch, 1.8 * inch, 1.5 * inch])
    round_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
    ]))
    story.append(round_table)
    story.append(Spacer(1, 0.3 * inch))

    # Safety Patterns
    if report["safety_patterns"]:
        story.append(Paragraph("<b>Safety Patterns Detected</b>", body_style))
        for pattern in report["safety_patterns"]:
            severity_color = {
                "critical": "#cc0000",
                "warning": "#cc8800",
                "positive": "#008800",
            }.get(pattern["severity"], "#333333")
            story.append(Paragraph(
                f'<font color="{severity_color}"><b>[{pattern["severity"].upper()}]</b></font> '
                f'{pattern["pattern"]}: {pattern["description"]}',
                body_style,
            ))
        story.append(Spacer(1, 0.2 * inch))

    story.append(PageBreak())


def _build_question_pages(story, styles, responses: list[dict]):
    """Build per-question detail pages."""
    heading_style = ParagraphStyle(
        "QuestionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=10,
        textColor=colors.HexColor("#1a1a2e"),
    )
    body_style = ParagraphStyle(
        "QuestionBody",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=6,
        leading=14,
    )
    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=4,
        textColor=colors.HexColor("#555555"),
    )

    story.append(Paragraph("Question-by-Question Detail", styles["Heading1"]))
    story.append(Spacer(1, 0.2 * inch))

    for resp in responses:
        code = resp.get("question_code", "Q??")
        dim = resp.get("dimension_name", "")
        round_num = resp.get("round_number", "?")
        question_text = resp.get("question_text", "")
        model_response = resp.get("model_response", "No response recorded")
        score = resp.get("score")
        notes = resp.get("evaluator_notes", "")

        story.append(Paragraph(f"{code} - {dim} (Round {round_num})", heading_style))

        story.append(Paragraph("<b>Question:</b>", label_style))
        story.append(Paragraph(question_text, body_style))

        delivered = resp.get("question_as_delivered")
        if delivered and delivered != question_text:
            story.append(Paragraph("<b>As Delivered:</b>", label_style))
            story.append(Paragraph(delivered, body_style))

        story.append(Paragraph("<b>Model Response:</b>", label_style))
        story.append(Paragraph(model_response or "No response recorded", body_style))

        score_text = str(score) if score is not None else "Not scored"
        story.append(Paragraph(f"<b>Score:</b> {score_text}/10", label_style))

        if notes:
            story.append(Paragraph("<b>Evaluator Notes:</b>", label_style))
            story.append(Paragraph(notes, body_style))

        story.append(Spacer(1, 0.3 * inch))


def generate_pdf(session: dict, responses_with_questions: list[dict]) -> bytes:
    """Generate a PDF report and return it as bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    story = []

    # Generate scoring report
    report = generate_full_report(session, responses_with_questions)

    # Build sections
    _build_cover_page(story, styles, session)
    _build_summary_page(story, styles, report)
    _build_question_pages(story, styles, responses_with_questions)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
