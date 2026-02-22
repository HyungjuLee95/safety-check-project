import base64
import datetime
import io
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _pick_font_name() -> str:
    candidates = [
        ("NanumGothic", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
        ("NotoSansCJK", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
        ("NotoSansKR", "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf"),
    ]
    for name, path in candidates:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return name
            except Exception:
                continue
    return "Helvetica"


FONT_NAME = _pick_font_name()


def _decode_signature(signature_base64: Optional[str]) -> Optional[io.BytesIO]:
    if not signature_base64:
        return None
    s = str(signature_base64).strip()
    if not s:
        return None
    if "," in s and s.startswith("data:image"):
        s = s.split(",", 1)[1]
    try:
        return io.BytesIO(base64.b64decode(s))
    except Exception:
        return None


def _safe_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _status_mark(value: str) -> tuple[str, str, str]:
    v = _safe_text(value).upper()
    if v in {"YES", "양호", "OK"}:
        return "○", "", ""
    if v in {"보통", "NORMAL"}:
        return "", "○", ""
    if v in {"NO", "점검필요", "IMPROVE"}:
        return "", "", "○"
    return "", "", ""


def _styles() -> Dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=sample["Heading1"],
            fontName=FONT_NAME,
            fontSize=18,
            leading=22,
            alignment=1,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "section",
            parent=sample["Heading3"],
            fontName=FONT_NAME,
            fontSize=12,
            leading=16,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "normal": ParagraphStyle(
            "normal",
            parent=sample["Normal"],
            fontName=FONT_NAME,
            fontSize=9,
            leading=12,
        ),
        "small": ParagraphStyle(
            "small",
            parent=sample["Normal"],
            fontName=FONT_NAME,
            fontSize=8,
            leading=10,
        ),
    }


def _make_signature_cell(name: str, signature_base64: Optional[str], styles: Dict[str, ParagraphStyle]):
    sig = _decode_signature(signature_base64)
    cells: List[Any] = [Paragraph(f"이름: {_safe_text(name) or '-'}", styles["normal"]), Spacer(1, 2 * mm)]
    if sig:
        img = Image(sig, width=42 * mm, height=14 * mm)
        cells.append(img)
    else:
        cells.append(Paragraph("(서명 없음)", styles["small"]))
    return cells


def _build_record_story(record: Dict[str, Any], styles: Dict[str, ParagraphStyle]):
    story: List[Any] = []

    title_date = _safe_text(record.get("date") or datetime.date.today().isoformat())
    story.append(Paragraph("안전점검 관리", styles["title"]))

    meta_data = [
        ["작성일", title_date, "점검자", _safe_text(record.get("userName") or record.get("name"))],
        ["병원명", _safe_text(record.get("hospital")), "작업종류", _safe_text(record.get("workType"))],
        ["작업종류 및 기기", _safe_text(record.get("equipmentName") or "-"), "상태", _safe_text(record.get("status"))],
    ]
    meta = Table(meta_data, colWidths=[30 * mm, 65 * mm, 30 * mm, 55 * mm])
    meta.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#EEF2FF")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(meta)
    story.append(Spacer(1, 3 * mm))

    sig_table = Table(
        [
            [
                _make_signature_cell(record.get("subadminName") or record.get("approvedBy"), record.get("subadminSignatureBase64"), styles),
                _make_signature_cell(record.get("userName") or record.get("name"), record.get("signatureBase64"), styles),
            ]
        ],
        colWidths=[90 * mm, 90 * mm],
    )
    sig_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(sig_table)
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("일일 점검 Check list", styles["section"]))
    headers = ["No", "점검 항목", "양호", "보통", "점검필요", "개선점/사유"]
    rows = [headers]
    improvements = []

    for idx, result in enumerate(record.get("results") or [], start=1):
        ok, normal, need = _status_mark(result.get("value") or "")
        comment = _safe_text(result.get("comment"))
        question = _safe_text(result.get("question"))
        rows.append([str(idx), question, ok, normal, need, comment])
        if comment:
            improvements.append([str(idx), comment])

    if len(rows) == 1:
        rows.append(["1", "(점검 항목 없음)", "", "", "", ""])

    checklist = Table(rows, colWidths=[10 * mm, 85 * mm, 16 * mm, 16 * mm, 22 * mm, 35 * mm], repeatRows=1)
    checklist.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 1), (4, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )
    story.append(checklist)
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("개선점", styles["section"]))
    imp_rows = [["번호", "내용"]] + (improvements if improvements else [["-", "점검필요/개선점 없음"]])
    imp_table = Table(imp_rows, colWidths=[20 * mm, 160 * mm], repeatRows=1)
    imp_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(imp_table)
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(f"문서일자: {title_date}", styles["small"]))

    return story


def build_export_pdf_filename(start_date: str, end_date: str) -> str:
    return f"safety_reports_{start_date}_to_{end_date}.pdf"


def build_inspections_pdf_bytes(records: List[Dict[str, Any]]) -> bytes:
    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
        title="안전점검 결과표",
    )

    styles = _styles()
    story: List[Any] = []

    for idx, record in enumerate(records or []):
        story.extend(_build_record_story(record, styles))
        if idx < len(records) - 1:
            story.append(PageBreak())

    if not story:
        story.append(Paragraph("출력할 점검 데이터가 없습니다.", styles["normal"]))

    doc.build(story)
    return output.getvalue()
