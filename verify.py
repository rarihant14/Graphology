"""Verify an Inksight-style report PDF and render every page for inspection.

Usage:
    python verify.py path/to/report.pdf --name "Alex" --scores 72 61 80 55 68 74 63
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def check(label: str, condition: bool, details: str = "") -> bool:
    suffix = f" — {details}" if details else ""
    print(f"{'PASS' if condition else 'FAIL'}: {label}{suffix}")
    return condition


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--name", default="")
    parser.add_argument("--scores", nargs="*", type=int, default=[])
    args = parser.parse_args()

    try:
        from pypdf import PdfReader
    except ImportError as exc:
        print(f"FAIL: PDF reader dependency missing — {exc}")
        return 1

    reader = PdfReader(str(args.pdf))
    pages = reader.pages
    texts = [(page.extract_text() or "").strip() for page in pages]
    full_text = "\n".join(texts)
    results = []

    results.append(check("PDF page count", 24 <= len(pages) <= 32, str(len(pages))))
    results.append(check("No blank pages", all(texts), f"{sum(not text for text in texts)} blank"))

    score_values = args.scores
    overall_match = re.search(r"OVERALL\s+QUOTIENT\s+(\d+)\s*/\s*100", full_text)
    if score_values and overall_match:
        expected = round(sum(score_values) / len(score_values))
        results.append(check("Overall quotient", int(overall_match.group(1)) == expected, f"expected {expected}"))
    else:
        results.append(check("Overall quotient appears", bool(overall_match)))

    if score_values:
        results.append(check("Every supplied score appears", all(f"{score}/100" in full_text for score in score_values)))
    results.append(check("Name appears", not args.name or args.name in full_text))
    results.append(check("Banned recommendation phrase absent", "What We Recommend Adding" not in full_text))

    paragraphs = [line.strip() for line in full_text.splitlines() if line.strip()]
    consecutive_duplicates = any(a == b for a, b in zip(paragraphs, paragraphs[1:]))
    results.append(check("No duplicate consecutive paragraphs", not consecutive_duplicates))
    results.append(check("Seven personal statements", full_text.count("You may be someone who") == 7))
    results.append(check("Headers/footers after cover", all("Graphology" in text or "INKSIGHT" in text for text in texts[1:])))

    preview_dir = args.pdf.parent / "output" / "preview"
    preview_dir.mkdir(parents=True, exist_ok=True)
    try:
        import fitz

        document = fitz.open(str(args.pdf))
        for index, page in enumerate(document):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False)
            pixmap.save(str(preview_dir / f"page-{index + 1:02d}.png"))
        results.append(check("Rendered every page to PNG", len(list(preview_dir.glob("page-*.png"))) == len(pages)))
    except ImportError as exc:
        results.append(check("Rendered every page to PNG", False, f"PyMuPDF missing: {exc}"))

    print(f"Summary: {len(pages)} pages")
    if score_values:
        print(f"Overall score: {round(sum(score_values) / len(score_values))}")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
