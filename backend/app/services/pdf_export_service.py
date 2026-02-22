import base64
import datetime
import io
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# -----------------------------
# Font
# -----------------------------
def _pick_font_name() -> str:
    candidates = [
        ("NanumGothic", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
        ("NanumGothicBold", "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"),
        ("NotoSansKR", "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf"),
        ("NotoSansCJK", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    ]
    for name, path in candidates:
        p = Path(path)
        if p.exists():
            try:
                pdfmetrics.registerFont(TTFont(name, str(p)))
                return name
            except Exception:
                continue
    return "Helvetica"


FONT_NAME = _pick_font_name()


# -----------------------------
# Helpers
# -----------------------------
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


def _is_approved_record(record: Dict[str, Any]) -> bool:
    """
    요구사항:
    - rejected는 출력하지 않음
    - submitted는 승인 완료로 간주하여 출력
    """
    status = _safe_text(record.get("status")).upper()
    # 필요하면 여기서 더 확장 가능(예: APPROVED)
    return status == "SUBMITTED"


def _display_status(status: Any) -> str:
    s = _safe_text(status).upper()
    if s == "SUBMITTED":
        return "승인 완료"
    return _safe_text(status)


def _status_mark_3(value: str) -> Tuple[str, str, str]:
    """
    체크리스트 표기: 양호/보통/점검필요만 사용
    """
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
            alignment=1,  # center
            spaceAfter=6,
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
        "tiny": ParagraphStyle(
            "tiny",
            parent=sample["Normal"],
            fontName=FONT_NAME,
            fontSize=7,
            leading=9,
        ),
    }


def _sig_img(signature_base64: Optional[str], w_mm: float, h_mm: float) -> Optional[Image]:
    sig = _decode_signature(signature_base64)
    if not sig:
        return None
    img = Image(sig, width=w_mm * mm, height=h_mm * mm)
    return img


# -----------------------------
# Footer (page-index based)
# -----------------------------
def _make_on_page(footer_texts: List[str]):
    """
    SimpleDocTemplate의 onFirstPage/onLaterPages는 "페이지 시작 시점"에 호출된다.
    기존처럼 Flowable로 footer_text를 세팅하면 첫 페이지에서 안 찍히는 문제가 생김.
    그래서 '페이지 번호' 기반으로 footer 텍스트를 미리 매핑한다.

    가정: 레코드 1개 = 1페이지(현재 레이아웃 기준).
    """
    def _on_page(canvas, doc):
        idx = max(0, int(getattr(doc, "page", 1)) - 1)
        footer = footer_texts[idx] if idx < len(footer_texts) else ""
        if footer:
            canvas.saveState()
            canvas.setFont(FONT_NAME if FONT_NAME != "Helvetica" else "Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#111827"))
            canvas.drawCentredString(A4[0] / 2.0, 8 * mm, footer)
            canvas.restoreState()
    return _on_page


# -----------------------------
# Approval box (결재란)
# -----------------------------
def _approval_box(record: Dict[str, Any], styles: Dict[str, ParagraphStyle]) -> Table:
    """
    결재란을 6번째 이미지 느낌으로:
    - 좌측 좁은 칸: "결\n재"
    - 우측: 2칸(승인/점검자) 고정 정렬
      각 칸은 상단에 역할/이름, 하단에 서명 이미지
    """

    approver_name = _safe_text(record.get("subadminName") or record.get("approvedBy") or "-")
    inspector_name = _safe_text(record.get("userName") or record.get("name") or "-")

    approver_sig = _sig_img(record.get("subadminSignatureBase64"), w_mm=26, h_mm=10)
    inspector_sig = _sig_img(record.get("signatureBase64"), w_mm=26, h_mm=10)

    def _role_header(role: str) -> Paragraph:
        return Paragraph(f"<b>{role}</b>", styles["tiny"])

    def _name_text(name: str) -> Paragraph:
        return Paragraph(name, styles["tiny"])

    # 오른쪽 2칸: (역할/이름/서명) 형태로 내부 테이블을 고정 높이로 구성
    def _person_cell(role: str, name: str, sig: Optional[Image]) -> Table:
        # 3행: 역할 / 이름 / 서명
        data = [
            [_role_header(role)],
            [_name_text(name)],
            [sig if sig else Paragraph("(서명 없음)", styles["tiny"])],
        ]
        t = Table(data, colWidths=[34 * mm], rowHeights=[5 * mm, 5 * mm, 12 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("LEFTPADDING", (0, 0), (-1, -1), 1),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 1),
                ]
            )
        )
        return t

    right = Table(
        [[
            _person_cell("승인", approver_name, approver_sig),
            _person_cell("점검자", inspector_name, inspector_sig),
        ]],
        colWidths=[34 * mm, 34 * mm],
        rowHeights=[22 * mm],
    )
    right.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    # 전체 결재란: [결재 세로칸] + [오른쪽 2칸]
    outer = Table(
        [[Paragraph("<b>결<br/>재</b>", styles["tiny"]), right]],
        colWidths=[10 * mm, 68 * mm],
        rowHeights=[22 * mm],
        hAlign="RIGHT",
    )
    outer.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#E2E8F0")),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.grey),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.grey),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return outer


# -----------------------------
# Story builder
# -----------------------------
def _build_record_story(record: Dict[str, Any], styles: Dict[str, ParagraphStyle]) -> List[Any]:
    story: List[Any] = []

    title_date = _safe_text(record.get("date") or datetime.date.today().isoformat())

    # 1) 제목: 상단 가운데 단독
    story.append(Paragraph("안전점검 결과", styles["title"]))
    story.append(Spacer(1, 2 * mm))

    # 2) 결재란: 제목 아래 우측
    story.append(_approval_box(record, styles))
    story.append(Spacer(1, 3 * mm))

    # 3) 메타 테이블
    meta_data = [
        ["작성일", title_date, "점검자", _safe_text(record.get("userName") or record.get("name"))],
        ["병원명", _safe_text(record.get("hospital")), "작업종류", _safe_text(record.get("workType"))],
        ["기기명", _safe_text(record.get("equipmentName") or "-"), "상태", _display_status(record.get("status"))],
    ]
    meta = Table(meta_data, colWidths=[30 * mm, 70 * mm, 30 * mm, 54 * mm])
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
    story.append(Spacer(1, 5 * mm))

    # 4) 체크리스트 (개선점/사유 컬럼 제거)
    story.append(Paragraph("일일 점검 Check list", styles["section"]))

    headers = ["No", "점검 항목", "양호", "보통", "점검필요"]
    rows = [headers]

    improvements: List[List[str]] = []

    results = record.get("results") or []
    for idx, result in enumerate(results, start=1):
        ok, normal, need = _status_mark_3(result.get("value") or "")
        question = _safe_text(result.get("question"))
        comment = _safe_text(result.get("comment"))

        rows.append([str(idx), question, ok, normal, need])

        # 개선점 규칙:
        # - 사유(comment)가 있을 경우에만 아래 개선점에 기록
        # - (권장) 점검필요인 경우만 적는 게 자연스럽지만,
        #   사용자가 "사유가 있을 경우"라고 했으니 comment가 있으면 적는다.
        if comment:
            improvements.append([str(idx), comment])

    if len(rows) == 1:
        rows.append(["1", "(점검 항목 없음)", "", "", ""])

    checklist = Table(
        rows,
        colWidths=[10 * mm, 110 * mm, 20 * mm, 20 * mm, 24 * mm],
        repeatRows=1,
    )
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
    story.append(Spacer(1, 6 * mm))

    # 5) 개선점 표 (사유가 있는 항목만)
    story.append(Paragraph("개선점", styles["section"]))
    imp_rows = [["번호", "내용"]] + (improvements if improvements else [["-", "점검필요/개선점 없음"]])

    imp_table = Table(imp_rows, colWidths=[20 * mm, 164 * mm], repeatRows=1)
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

    return story


# -----------------------------
# Export functions
# -----------------------------
def build_export_pdf_filename(start_date: str, end_date: str) -> str:
    return f"safety_reports_{start_date}_to_{end_date}.pdf"


def build_inspections_pdf_bytes(records: List[Dict[str, Any]]) -> bytes:
    """
    - 승인된 건(SUBMITTED)만 출력
    - footer 날짜는 페이지별로 매핑해서 항상 하단 가운데 보이게 처리
    """
    approved_records = [r for r in (records or []) if _is_approved_record(r)]

    # footer texts: 승인 레코드 각 1페이지 가정
    footer_texts: List[str] = []
    for r in approved_records:
        d = _safe_text(r.get("date") or datetime.date.today().isoformat())
        footer_texts.append(f"문서일자: {d}")

    on_page = _make_on_page(footer_texts)

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=10 * mm,
        bottomMargin=16 * mm,  # footer 공간
        title="안전점검 결과표",
    )

    styles = _styles()
    story: List[Any] = []

    if not approved_records:
        story.append(Paragraph("출력할 승인 완료(SUBMITTED) 점검 데이터가 없습니다.", styles["normal"]))
        doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
        return output.getvalue()

    for idx, record in enumerate(approved_records):
        story.extend(_build_record_story(record, styles))
        if idx < len(approved_records) - 1:
            story.append(PageBreak())

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return output.getvalue()