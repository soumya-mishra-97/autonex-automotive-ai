"""Report adapter: source-attributed PDF output, with all untrusted text escaped."""

from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from autonex.domain.models import AgentRun


def build_report(run: AgentRun) -> bytes:
    stream = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "AutonexTitle",
            fontName="Times-Bold",
            fontSize=23,
            leading=27,
            textColor=colors.HexColor("#800020"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            "AutonexHeading",
            fontName="Times-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#800020"),
            spaceBefore=15,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            "AutonexBody",
            fontName="Times-Roman",
            fontSize=10,
            leading=14,
            spaceAfter=8,
            wordWrap="CJK",
            alignment=TA_LEFT,
        )
    )

    def paragraph(text: str, style: str = "AutonexBody") -> Paragraph:
        return Paragraph(escape(text), styles[style])

    story = [
        paragraph("AUTONEX AI", "AutonexTitle"),
        paragraph("ENTERPRISE AUTOMOTIVE AI ORCHESTRATION"),
        paragraph("EXECUTION REPORT", "AutonexHeading"),
        paragraph(f"Run: {run.id} | Mode: {run.mode} | UTC: {run.created_at.isoformat()}"),
        paragraph("REQUEST", "AutonexHeading"),
        paragraph(run.prompt),
        paragraph("VALIDATED RESPONSE", "AutonexHeading"),
        paragraph(run.summary),
        paragraph(run.rationale),
        paragraph("DEMONSTRATION ESTIMATE", "AutonexHeading"),
    ]
    rows = (
        [[paragraph("ITEM"), paragraph("USD")]]
        + [[paragraph(line.label), paragraph(f"${line.amount:,.0f}")] for line in run.quote.lines]
        + [[paragraph("TOTAL"), paragraph(f"${run.quote.total:,.0f}")]]
    )
    table = Table(rows, colWidths=[135 * mm, 30 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5eaeb")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#800020")),
                ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#800020")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([table, paragraph("EXECUTION TRACE", "AutonexHeading")])
    for step in run.trace:
        story.append(
            KeepTogether(
                [
                    paragraph(
                        f"{step.label.upper()} - {step.duration_ms} ms - {step.retries} retries"
                    ),
                    paragraph(step.detail),
                ]
            )
        )
    story.append(paragraph("SOURCE REFERENCES", "AutonexHeading"))
    if not run.sources:
        story.append(
            paragraph("Insufficient retrieved evidence. Verify vehicle details independently.")
        )
    for source in run.sources:
        story.extend(
            [
                paragraph(source.title, "AutonexHeading"),
                paragraph(f"Source ID: {source.id} | Version: {source.version}"),
                paragraph(source.excerpt),
            ]
        )
        if source.url:
            story.append(paragraph(source.url))
    story.append(paragraph("DISCLOSURES", "AutonexHeading"))
    story.extend(paragraph(warning) for warning in run.warnings)
    story.extend(
        [
            Spacer(1, 4 * mm),
            paragraph(
                "AUTONEX AI is an independent third-party demonstration. "
                "No official manufacturer affiliation or live inventory. "
                "No bookings, purchases or account changes. "
                "The procedural 3D model is a concept illustration."
            ),
        ]
    )

    # ReportLab has no bundled type information; callback values are library-owned.
    def footer(canvas: Any, document: Any) -> None:
        canvas.saveState()
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, 210 * mm, 297 * mm, fill=1, stroke=0)
        canvas.restoreState()
        canvas.setFont("Times-Roman", 8)
        canvas.setFillColor(colors.HexColor("#795c64"))
        canvas.drawString(22 * mm, 13 * mm, "AUTONEX AI | INDEPENDENT DEMONSTRATION")
        canvas.drawRightString(188 * mm, 13 * mm, f"PAGE {document.page}")

    document = SimpleDocTemplate(
        stream,
        pagesize=(210 * mm, 297 * mm),
        rightMargin=22 * mm,
        leftMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=22 * mm,
        title="AUTONEX AI - Execution Report",
        author="AUTONEX AI",
    )
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return stream.getvalue()
