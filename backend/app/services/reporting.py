import csv
import io
from datetime import datetime, timezone
from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.entities import Alert, Device, Network


def generate_csv_inventory(devices: List[Device]) -> str:
    """Generates comprehensive CSV device inventory."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow([
        "IP Address",
        "MAC Address",
        "Hostname",
        "Custom Name",
        "Hardware Vendor",
        "Device Type",
        "OS Classification",
        "Trust Level",
        "Online Status",
        "Open Ports",
        "Response Time (ms)",
        "First Seen",
        "Last Seen",
    ])

    for dev in devices:
        ports_str = ";".join([f"{p.port}/{p.protocol}({p.service_name})" for p in dev.ports])
        writer.writerow([
            dev.ip_address,
            dev.mac_address or "N/A",
            dev.hostname or "N/A",
            dev.custom_name or "N/A",
            dev.vendor or "Unknown",
            dev.device_type,
            dev.os_guess or "N/A",
            dev.trust_level,
            "Online" if dev.is_online else "Offline",
            ports_str or "None",
            f"{dev.response_time_ms:.1f}",
            dev.first_seen_at.isoformat() if dev.first_seen_at else "",
            dev.last_seen_at.isoformat() if dev.last_seen_at else "",
        ])

    return output.getvalue()


def generate_pdf_report(network: Network, devices: List[Device], alerts: List[Alert]) -> bytes:
    """Generates a professional executive network security audit PDF report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e293b"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#334155"),
        spaceBefore=14,
        spaceAfter=6,
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph("NetScope — Network Security Audit Report", title_style))
    now_str = datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC")
    elements.append(
        Paragraph(
            f"Target Subnet: <b>{network.cidr_v4}</b> ({network.name}) | Generated: {now_str}",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 15))

    # Executive Scorecard Summary Table
    online_count = sum(1 for d in devices if d.is_online)
    score_color = "#10b981" if network.security_score >= 85 else "#f59e0b" if network.security_score >= 60 else "#ef4444"

    score_data = [
        [
            Paragraph("<b>Security Posture Score</b>", styles["Normal"]),
            Paragraph("<b>Total Devices</b>", styles["Normal"]),
            Paragraph("<b>Online Hosts</b>", styles["Normal"]),
            Paragraph("<b>Active Risks</b>", styles["Normal"]),
        ],
        [
            Paragraph(f"<font color='{score_color}' size='16'><b>{network.security_score} / 100</b></font>", styles["Normal"]),
            Paragraph(f"<font size='14'><b>{len(devices)}</b></font>", styles["Normal"]),
            Paragraph(f"<font size='14'><b>{online_count}</b></font>", styles["Normal"]),
            Paragraph(f"<font size='14'><b>{len(alerts)}</b></font>", styles["Normal"]),
        ],
    ]
    score_table = Table(score_data, colWidths=[135, 135, 135, 135])
    score_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(score_table)
    elements.append(Spacer(1, 15))

    # Discovered Inventory Table
    elements.append(Paragraph("Discovered Device Inventory", section_style))
    inv_data = [
        ["IP Address", "MAC Address", "Hardware Vendor", "Class", "Trust Tier", "Status"]
    ]
    for d in devices:
        inv_data.append([
            d.ip_address,
            d.mac_address or "N/A",
            (d.vendor or "Unknown")[:18],
            d.device_type,
            d.trust_level.capitalize(),
            "Online" if d.is_online else "Offline",
        ])

    inv_table = Table(inv_data, colWidths=[90, 110, 120, 75, 75, 70])
    inv_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ])
    )
    elements.append(inv_table)
    elements.append(Spacer(1, 15))

    # Security Advisories Section
    if alerts:
        elements.append(Paragraph("Security Advisories & Prioritized Remediation", section_style))
        for alt in alerts:
            bullet_color = "#ef4444" if alt.severity == "critical" else "#f59e0b"
            finding_text = f"<font color='{bullet_color}'><b>[{alt.severity.upper()}]</b></font> <b>{alt.title}</b>: {alt.description}"
            elements.append(Paragraph(finding_text, styles["Normal"]))
            elements.append(Spacer(1, 4))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

