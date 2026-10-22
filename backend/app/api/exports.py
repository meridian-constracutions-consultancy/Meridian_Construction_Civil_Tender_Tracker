import io
import csv
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.db.session import get_db
from app.models.tender import Tender
from app.core.security import sanitize_for_spreadsheet

router = APIRouter(prefix="/export", tags=["export"])

def build_export_query(
    search: Optional[str],
    is_civil_only: bool,
    category_id: Optional[str],
    state: Optional[str],
    source_id: Optional[str],
    min_value: Optional[float],
    max_value: Optional[float],
    closing_soon: bool
):
    conditions = []
    if is_civil_only:
        conditions.append(Tender.is_civil_construction == True)
    if category_id:
        conditions.append(Tender.category_id == category_id)
    if state:
        conditions.append(Tender.state.ilike(f"%{state}%"))
    if source_id:
        conditions.append(Tender.source_id == source_id)
    if min_value is not None:
        conditions.append(Tender.estimated_value >= min_value)
    if max_value is not None:
        conditions.append(Tender.estimated_value <= max_value)
    if closing_soon:
        now = datetime.utcnow()
        conditions.append(Tender.bid_submission_deadline >= now)
        conditions.append(Tender.bid_submission_deadline <= now + timedelta(days=7))
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Tender.title.ilike(term),
                Tender.reference_number.ilike(term),
                Tender.organization_name.ilike(term),
                Tender.work_description.ilike(term),
                Tender.tender_id.ilike(term)
            )
        )
    query = select(Tender)
    if conditions:
        query = query.where(*conditions)
    return query.order_by(Tender.published_date.desc().nullslast()).limit(500)

@router.get("/csv")
def export_csv(
    search: Optional[str] = None,
    is_civil_only: bool = True,
    category_id: Optional[str] = None,
    state: Optional[str] = None,
    source_id: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    closing_soon: bool = False,
    db: Session = Depends(get_db)
):
    """Exports filtered tenders as CSV with formula-injection protection."""
    query = build_export_query(search, is_civil_only, category_id, state, source_id, min_value, max_value, closing_soon)
    tenders = db.scalars(query).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Tender ID", "Reference Number", "Title", "Organization", "Location", "State",
        "Category", "Estimated Value (INR)", "EMD Amount (INR)", "Published Date",
        "Closing Date", "Status", "Source Portal", "Original URL", "Last Verified"
    ])

    for t in tenders:
        writer.writerow([
            sanitize_for_spreadsheet(t.tender_id),
            sanitize_for_spreadsheet(t.reference_number),
            sanitize_for_spreadsheet(t.title),
            sanitize_for_spreadsheet(t.organization_name),
            sanitize_for_spreadsheet(t.location),
            sanitize_for_spreadsheet(t.state),
            sanitize_for_spreadsheet(t.category_id or t.product_category),
            t.estimated_value if t.estimated_value is not None else "",
            t.emd_amount if t.emd_amount is not None else "",
            t.published_date.strftime("%Y-%m-%d %H:%M") if t.published_date else "",
            t.bid_submission_deadline.strftime("%Y-%m-%d %H:%M") if t.bid_submission_deadline else "",
            t.status,
            t.portal_name,
            t.original_url,
            t.last_verified_at.strftime("%Y-%m-%d %H:%M") if t.last_verified_at else ""
        ])

    csv_data = output.getvalue()
    filename = f"tenders_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/excel")
def export_excel(
    search: Optional[str] = None,
    is_civil_only: bool = True,
    category_id: Optional[str] = None,
    state: Optional[str] = None,
    source_id: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    closing_soon: bool = False,
    db: Session = Depends(get_db)
):
    """Exports filtered tenders as a styled Excel (.xlsx) workbook using OpenPyXL."""
    query = build_export_query(search, is_civil_only, category_id, state, source_id, min_value, max_value, closing_soon)
    tenders = db.scalars(query).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Civil Tenders"

    # Header styling
    headers = [
        "Tender ID", "Reference Number", "Title", "Organization", "Location", "State",
        "Category", "Estimated Value (₹)", "EMD Amount (₹)", "Published Date",
        "Closing Date", "Status", "Source Portal", "Original URL", "Last Verified"
    ]
    ws.append(headers)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Deep navy
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    # Data rows
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for row_idx, t in enumerate(tenders, start=2):
        row_data = [
            sanitize_for_spreadsheet(t.tender_id),
            sanitize_for_spreadsheet(t.reference_number),
            sanitize_for_spreadsheet(t.title),
            sanitize_for_spreadsheet(t.organization_name),
            sanitize_for_spreadsheet(t.location),
            sanitize_for_spreadsheet(t.state),
            sanitize_for_spreadsheet(t.category_id or t.product_category),
            t.estimated_value if t.estimated_value is not None else "",
            t.emd_amount if t.emd_amount is not None else "",
            t.published_date.strftime("%Y-%m-%d %H:%M") if t.published_date else "",
            t.bid_submission_deadline.strftime("%Y-%m-%d %H:%M") if t.bid_submission_deadline else "",
            t.status,
            t.portal_name,
            t.original_url,
            t.last_verified_at.strftime("%Y-%m-%d %H:%M") if t.last_verified_at else ""
        ]
        ws.append(row_data)

        # Style data cells
        for col_idx in range(1, len(row_data) + 1):
            c = ws.cell(row=row_idx, column=col_idx)
            c.border = thin_border
            if col_idx in (8, 9):  # Currency columns
                c.number_format = '#,##0.00'
                c.alignment = Alignment(horizontal="right")
            elif col_idx in (10, 11, 15):
                c.alignment = Alignment(horizontal="center")

    # Freeze header row
    ws.freeze_panes = "A2"

    # Set smart column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val = str(cell.value or "")
            if len(val) > max_len:
                max_len = len(val)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"civil_tenders_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
