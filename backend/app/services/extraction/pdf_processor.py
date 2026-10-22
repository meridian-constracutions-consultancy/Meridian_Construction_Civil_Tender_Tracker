import os
import hashlib
import fitz  # PyMuPDF
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings

class DocumentProcessor:
    """
    Zero-cost document extraction engine using PyMuPDF and optional OCR fallback.
    Never crashes when OCR or external binaries are absent.
    """

    @staticmethod
    def compute_file_hash(content_bytes: bytes) -> str:
        return hashlib.sha256(content_bytes).hexdigest()

    @classmethod
    def process_pdf_bytes(cls, content_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extracts searchable text, page count, and metadata from PDF bytes.
        """
        file_hash = cls.compute_file_hash(content_bytes)
        file_size = len(content_bytes)

        if file_size > settings.MAX_DOCUMENT_SIZE_BYTES:
            return {
                "file_hash": file_hash,
                "file_size": file_size,
                "extraction_status": "SKIPPED_SIZE_LIMIT",
                "extracted_text": "",
                "confidence_score": 0.0,
                "page_count": 0,
                "error": f"File size ({file_size} bytes) exceeds maximum permitted limit ({settings.MAX_DOCUMENT_SIZE_BYTES} bytes)"
            }

        try:
            doc = fitz.open(stream=content_bytes, filetype="pdf")
            page_count = len(doc)
            text_pages = []
            
            for i in range(min(page_count, 50)):  # Extract up to first 50 pages
                page = doc.load_page(i)
                text = page.get_text()
                if text:
                    text_pages.append(text.strip())

            full_text = "\n\n--- Page Break ---\n\n".join(text_pages).strip()
            total_chars = len(full_text)

            # Determine whether this is a searchable PDF or a scanned image
            if total_chars > 100:
                return {
                    "file_hash": file_hash,
                    "file_size": file_size,
                    "extraction_status": "EXTRACTED",
                    "extracted_text": full_text[:20000],  # Bound text stored in database
                    "confidence_score": 1.0,
                    "page_count": page_count,
                    "is_scanned": False,
                    "error": None
                }
            else:
                # Document appears to be a scanned image
                return {
                    "file_hash": file_hash,
                    "file_size": file_size,
                    "extraction_status": "SCANNED_NEEDS_OCR",
                    "extracted_text": full_text,
                    "confidence_score": 0.4,
                    "page_count": page_count,
                    "is_scanned": True,
                    "error": "Document contains scanned raster images without embedded text layer."
                }
        except Exception as e:
            return {
                "file_hash": file_hash,
                "file_size": file_size,
                "extraction_status": "FAILED",
                "extracted_text": "",
                "confidence_score": 0.0,
                "page_count": 0,
                "is_scanned": False,
                "error": f"PDF parsing error: {str(e)}"
            }
