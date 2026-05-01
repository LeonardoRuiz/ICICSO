from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import fitz


@dataclass(frozen=True)
class ExtractedEvidenceRecommendation:
    statement_text: str
    source_excerpt: str
    source_locator: str | None = None
    recommendation_class: str | None = None
    level_of_evidence: str | None = None


class EvidenceObjectExtractionEngine:
    """Extracts actionable recommendation candidates from PDF guidelines.

    The engine combines structured guideline tables, class/level rows, inline
    COR/LOE statements and narrative recommendation sentences. It is deliberately
    independent from persistence so it can be reused by CLI jobs, API services
    and future engine runners.
    """

    def __init__(
        self,
        *,
        finalize_statement: Callable[[str], str],
        is_recommendation_like: Callable[[str], bool],
        looks_like_nonclinical_sentence: Callable[[str], bool],
        normalize_cor_token: Callable[[str], str | None],
        normalize_loe_token: Callable[[str], str | None],
    ) -> None:
        self._finalize_statement = finalize_statement
        self._is_recommendation_like = is_recommendation_like
        self._looks_like_nonclinical_sentence = looks_like_nonclinical_sentence
        self._normalize_cor_token = normalize_cor_token
        self._normalize_loe_token = normalize_loe_token

    def extract_pdf_recommendations(
        self,
        path: Path,
        *,
        max_candidates: int,
    ) -> list[ExtractedEvidenceRecommendation]:
        page_lines = self._extract_pdf_page_lines(path)
        page_texts = [(page_number, " | ".join(lines)) for page_number, lines in page_lines]
        raw_page_texts = self._extract_raw_page_texts(path)
        candidates: list[ExtractedEvidenceRecommendation] = []
        seen: set[str] = set()

        def add_candidate(
            raw_text: str,
            *,
            page_number: int,
            source: str,
            recommendation_class: str | None = None,
            level_of_evidence: str | None = None,
        ) -> None:
            if len(candidates) >= max_candidates:
                return
            stripped_text, prefix_cor, prefix_loe = self._strip_class_level_prefix(raw_text)
            recommendation_class = recommendation_class or prefix_cor
            level_of_evidence = level_of_evidence or prefix_loe
            statement_text = self._finalize_statement(stripped_text)
            if not self._accept_statement(statement_text):
                return
            normalized = self._dedupe_key(statement_text)
            if normalized in seen:
                return
            seen.add(normalized)
            locator_bits = [f"p.{page_number}", source]
            if recommendation_class:
                locator_bits.append(f"COR {recommendation_class}")
            if level_of_evidence:
                locator_bits.append(f"LOE {level_of_evidence}")
            candidates.append(
                ExtractedEvidenceRecommendation(
                    statement_text=statement_text,
                    source_excerpt=statement_text[:280],
                    source_locator=" ".join(locator_bits),
                    recommendation_class=recommendation_class,
                    level_of_evidence=level_of_evidence,
                )
            )

        self._extract_compact_cor_loe_rows(page_lines, add_candidate)
        self._extract_line_structured(page_lines, add_candidate)
        self._extract_pipe_structured(page_texts, add_candidate)
        self._extract_class_level_rows(page_lines, add_candidate)
        self._extract_inline_cor_loe(raw_page_texts, add_candidate)
        self._extract_numbered_narrative(page_texts, add_candidate)
        self._extract_action_sentences(raw_page_texts, add_candidate)

        return candidates[:max_candidates]

    def _extract_raw_page_texts(self, path: Path) -> list[tuple[int, str]]:
        try:
            with fitz.open(path) as document:
                pages = []
                for page_index in range(len(document)):
                    text = document[page_index].get_text("text")
                    text = self._normalize_text_block(text)
                    if text:
                        pages.append((page_index + 1, text))
                return pages
        except Exception:
            return []

    def _extract_pdf_page_lines(self, path: Path) -> list[tuple[int, list[str]]]:
        try:
            with fitz.open(path) as document:
                pages_raw: list[tuple[int, list[str]]] = []
                line_counts: dict[str, int] = {}
                for page_index in range(len(document)):
                    page = document[page_index]
                    lines = [self._normalize_pdf_line(line) for line in page.get_text("text").splitlines()]
                    cleaned_lines = [line for line in lines if line]
                    pages_raw.append((page_index + 1, cleaned_lines))
                    for line in set(cleaned_lines):
                        line_counts[line] = line_counts.get(line, 0) + 1

                repeated_threshold = max(3, len(document) // 6) if len(document) >= 6 else 99
                pages: list[tuple[int, list[str]]] = []
                for page_number, lines in pages_raw:
                    kept_lines: list[str] = []
                    for line in lines:
                        if self._is_structural_guideline_line(line):
                            kept_lines.append(line)
                            continue
                        if line_counts.get(line, 0) >= repeated_threshold:
                            continue
                        if self._is_noise_line(line):
                            continue
                        kept_lines.append(line)
                    if kept_lines:
                        pages.append((page_number, kept_lines))
                return pages
        except Exception:
            return []

    def _extract_line_structured(self, pages, add_candidate) -> None:
        for page_number, lines in pages:
            in_recommendation_block = False
            index = 0
            while index < len(lines):
                line = lines[index]
                lower = line.lower()
                if lower.startswith("recommendation for ") or lower.startswith("recommendations for "):
                    in_recommendation_block = True
                    index += 1
                    continue
                if lower in {"cor", "loe", "recommendation", "recommendations"}:
                    in_recommendation_block = True
                    index += 1
                    continue
                if lower.startswith("synopsis") or lower.startswith("recommendation-specific"):
                    in_recommendation_block = False
                    index += 1
                    continue
                if not in_recommendation_block:
                    index += 1
                    continue

                cor = self._normalize_cor_token(line)
                consumed = 1
                if cor is None and index + 1 < len(lines):
                    cor = self._normalize_cor_token(f"{line} {lines[index + 1]}")
                    if cor is not None:
                        consumed = 2
                if cor is None:
                    index += 1
                    continue

                index += consumed
                if index >= len(lines):
                    break
                loe = self._normalize_loe_token(lines[index])
                if loe is None and index + 1 < len(lines):
                    loe = self._normalize_loe_token(f"{lines[index]} {lines[index + 1]}")
                    if loe is not None:
                        index += 1
                if loe is None:
                    continue
                index += 1
                if index >= len(lines):
                    break

                number_match = re.match(r"(?P<num>\d+)\.\s*(?P<body>.*)", lines[index])
                if number_match is None:
                    continue
                body_parts = [number_match.group("body").strip()]
                index += 1
                while index < len(lines):
                    next_line = lines[index]
                    next_lower = next_line.lower()
                    if next_lower.startswith("synopsis") or next_lower.startswith("recommendation-specific"):
                        break
                    next_cor = self._normalize_cor_token(next_line)
                    if next_cor is None and index + 1 < len(lines):
                        next_cor = self._normalize_cor_token(f"{next_line} {lines[index + 1]}")
                    if next_cor is not None:
                        break
                    if re.match(r"^\d+\.\d+", next_line):
                        break
                    body_parts.append(next_line.strip())
                    index += 1
                add_candidate(
                    " ".join(part for part in body_parts if part),
                    page_number=page_number,
                    source="line-table",
                    recommendation_class=cor,
                    level_of_evidence=loe,
                )

    def _extract_compact_cor_loe_rows(self, pages, add_candidate) -> None:
        row_pattern = re.compile(
            r"^\s*(?P<cor>3\s*:\s*(?:Harm|No\s+Benefit)|III\s*:\s*(?:Harm|No\s+Benefit)|1|2A|2B|I|IIA|IIB|III)"
            r"\s+(?P<loe>A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)\s+"
            r"(?P<num>\d+)\.\s+(?P<body>.+)$",
            re.IGNORECASE,
        )
        for page_number, lines in pages:
            index = 0
            while index < len(lines):
                match = row_pattern.match(lines[index])
                if match is None:
                    index += 1
                    continue
                body_parts = [match.group("body").strip()]
                cursor = index + 1
                while cursor < len(lines):
                    next_line = lines[cursor]
                    if row_pattern.match(next_line):
                        break
                    if re.match(r"^(Synopsis|Recommendation-Specific|Referenced studies|Table|Figure)\b", next_line, re.IGNORECASE):
                        break
                    if self._is_section_heading(next_line):
                        break
                    body_parts.append(next_line)
                    cursor += 1
                add_candidate(
                    " ".join(body_parts),
                    page_number=page_number,
                    source="compact-cor-loe-row",
                    recommendation_class=self._normalize_cor_token(match.group("cor")),
                    level_of_evidence=self._normalize_loe_token(match.group("loe")),
                )
                index = cursor

    def _extract_pipe_structured(self, paragraphs, add_candidate) -> None:
        cor_pattern = re.compile(r"^(1|2a|2b|3(?::\s*(?:harm|no\s+benefit))?)$", re.IGNORECASE)
        loe_pattern = re.compile(r"^(A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)$", re.IGNORECASE)
        recommendation_token_pattern = re.compile(r"^\d+\.\s+")
        for page_number, text in paragraphs:
            tokens = [token.strip() for token in re.sub(r"\s+", " ", text).split("|") if token.strip()]
            index = 0
            while index < len(tokens) - 2:
                cor = self._normalize_cor_token(tokens[index])
                loe = self._normalize_loe_token(tokens[index + 1])
                head = tokens[index + 2]
                if cor is None or loe is None or not recommendation_token_pattern.match(head):
                    index += 1
                    continue
                if not (cor_pattern.match(cor) and loe_pattern.match(loe)):
                    index += 1
                    continue
                body_parts = [re.sub(r"^\d+\.\s*", "", head).strip()]
                cursor = index + 3
                while cursor < len(tokens):
                    token = tokens[cursor]
                    if cursor < len(tokens) - 2 and self._normalize_cor_token(tokens[cursor]) and self._normalize_loe_token(tokens[cursor + 1]) and recommendation_token_pattern.match(tokens[cursor + 2]):
                        break
                    if re.search(r"Recommendation-Specific|Referenced studies|Synopsis", token, re.IGNORECASE):
                        break
                    body_parts.append(token)
                    cursor += 1
                add_candidate(
                    " ".join(body_parts),
                    page_number=page_number,
                    source="pipe-table",
                    recommendation_class=cor,
                    level_of_evidence=loe,
                )
                index = cursor

    def _extract_class_level_rows(self, pages, add_candidate) -> None:
        for page_number, lines in pages:
            index = 0
            while index < len(lines):
                line = lines[index]
                match = self._class_level_match(line)
                if match is None:
                    index += 1
                    continue
                body_parts = [match.group("body").strip()]
                cursor = index + 1
                while cursor < len(lines):
                    next_line = lines[cursor]
                    if self._class_level_match(next_line) is not None:
                        break
                    if re.match(r"^(Table|Figure|References|Recommendation-Specific|Synopsis)\b", next_line, re.IGNORECASE):
                        break
                    if self._is_section_heading(next_line):
                        break
                    body_parts.append(next_line)
                    cursor += 1
                add_candidate(
                    " ".join(body_parts),
                    page_number=page_number,
                    source="class-level-row",
                    recommendation_class=self._normalize_cor_token(match.group("cor")),
                    level_of_evidence=self._normalize_loe_token(match.group("loe")),
                )
                index = cursor

    def _extract_inline_cor_loe(self, pages, add_candidate) -> None:
        inline_pattern = re.compile(
            r"(?P<body>[^.!?;]{24,}?)\s*"
            r"\((?:class\s+of\s+recommendation\s*\[?COR\]?\s*|COR\s*)"
            r"(?P<cor>I{1,3}|IIA|IIB|III(?::\s*(?:Harm|No\s+Benefit))?|1|2A|2B|3(?::\s*(?:Harm|No\s+Benefit))?)"
            r"\s*,?\s*(?:level\s+of\s+evidence\s*\[?LOE\]?\s*|LOE\s*)"
            r"(?P<loe>A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)\)",
            re.IGNORECASE,
        )
        for page_number, text in pages:
            for match in inline_pattern.finditer(text):
                add_candidate(
                    match.group("body"),
                    page_number=page_number,
                    source="inline-cor-loe",
                    recommendation_class=self._normalize_cor_token(match.group("cor")),
                    level_of_evidence=self._normalize_loe_token(match.group("loe")),
                )

    def _extract_numbered_narrative(self, paragraphs, add_candidate) -> None:
        for page_number, text in paragraphs:
            if "recommend" not in text.lower() and "should" not in text.lower():
                continue
            for match in re.finditer(
                r"(?P<num>\d+)\.\s+(?P<text>.+?)(?=(?:\|\s*\d+\.\s+)|(?:\|\s*Recommendation-Specific)|(?:\|\s*Referenced studies)|(?:\|\s*Synopsis)|$)",
                text,
                re.IGNORECASE,
            ):
                add_candidate(match.group("text"), page_number=page_number, source="numbered")

    def _extract_action_sentences(self, pages, add_candidate) -> None:
        for page_number, text in pages:
            for sentence in self._split_sentences(text):
                add_candidate(sentence, page_number=page_number, source="narrative")

    def _accept_statement(self, statement_text: str) -> bool:
        if len(statement_text) < 24 or len(statement_text) > 900:
            return False
        if statement_text.endswith("?"):
            return False
        if re.match(r"^(?:do|does|did|what|when|where|how|why|should|could|would)\b", statement_text, re.IGNORECASE):
            return False
        if self._looks_like_policy_noise(statement_text):
            return False
        if self._looks_like_nonclinical_sentence(statement_text):
            return False
        return self._is_recommendation_like(statement_text)

    def _class_level_match(self, line: str) -> re.Match[str] | None:
        return re.match(
            r"^\s*(?:COR\s*)?(?:Class\s+)?(?P<cor>I{1,3}|IIA|IIB|III(?::\s*(?:Harm|No\s+Benefit))?|1|2A|2B|3(?::\s*(?:Harm|No\s+Benefit))?)"
            r"\s*[,;/:-]?\s*(?:LOE\s*|Level(?:\s+of\s+Evidence)?\s*)"
            r"(?P<loe>A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)\s*[,;:-]?\s*(?P<body>.+)$",
            line,
            re.IGNORECASE,
        )

    def _strip_class_level_prefix(self, text: str) -> tuple[str, str | None, str | None]:
        text = re.sub(r"\s+", " ", text).strip(" |,;")
        match = self._class_level_match(text)
        if match is None:
            return re.sub(r"^(?:NR|R|LD|EO|LM)\s+(?=[A-Z])", "", text).strip(), None, None
        return (
            match.group("body").strip(" ,;:-"),
            self._normalize_cor_token(match.group("cor")),
            self._normalize_loe_token(match.group("loe")),
        )

    def _normalize_pdf_line(self, line: str) -> str:
        line = line.replace("\u2020", " ").replace("\u2021", " ").replace("\uf0b7", " ")
        line = line.replace("\ufb01", "fi").replace("\ufb02", "fl")
        line = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", line)
        line = re.sub(r"(\w)-\s+(\w)", r"\1\2", line)
        line = re.sub(r"\s+", " ", line)
        line = re.sub(r"^[\-\*\u2022]+\s*", "", line)
        return line.strip()

    def _normalize_text_block(self, text: str) -> str:
        text = text.replace("\ufb01", "fi").replace("\ufb02", "fl")
        text = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", text)
        text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _split_sentences(self, text: str) -> list[str]:
        protected = re.sub(r"\b(e\.g|i\.e|vs)\.", lambda match: match.group(0).replace(".", "<DOT>"), text, flags=re.IGNORECASE)
        parts = re.split(r"(?<=[\.\!\?;])\s+", protected)
        return [part.replace("<DOT>", ".").strip(" |") for part in parts if part.strip()]

    def _is_structural_guideline_line(self, line: str) -> bool:
        normalized = re.sub(r"\s+", " ", line).strip().upper()
        if normalized in {"COR", "LOE", "RECOMMENDATION", "RECOMMENDATIONS"}:
            return True
        if self._normalize_cor_token(normalized) is not None:
            return True
        if self._normalize_loe_token(normalized) is not None:
            return True
        if re.fullmatch(r"\d+\.", normalized) or re.fullmatch(r"\d+", normalized):
            return True
        return False

    def _is_noise_line(self, line: str) -> bool:
        lower = line.lower()
        if len(lower) < 3:
            return True
        if re.fullmatch(r"\d+", lower):
            return True
        if "doi:" in lower or lower.startswith("http"):
            return True
        if lower.startswith("downloaded from"):
            return True
        if any(token in lower for token in ["copyright", "permissions", "supplement", "appendix", "disclosures", "author affiliations"]):
            return True
        if re.search(r"\b(representative|writing committee|task force|chair|vice chair)\b", lower) and "recommended" not in lower and "should" not in lower:
            return True
        return False

    def _is_section_heading(self, line: str) -> bool:
        if len(line) > 110:
            return False
        if re.match(r"^\d+(?:\.\d+){1,3}\.?\s+[A-Z]", line):
            return True
        if re.fullmatch(r"[A-Z][A-Za-z0-9/&,\-:\(\)\s]{8,}", line) and not self._is_recommendation_like(line):
            return True
        return False

    def _looks_like_policy_noise(self, text: str) -> bool:
        lower = text.lower()
        policy_tokens = [
            "affiliations",
            "public health authorities",
            "rules and regulations",
            "latest official recommendations",
            "copyright",
            "permissions",
            "downloaded from",
            "conflict of interest",
            "complete list of conflict",
            "committed to updating this manuscript",
            "this manuscript",
            "this article has been",
            "the online version",
            "class of recommendation",
            "level of evidence",
            "university of",
            "department of",
            "division of",
        ]
        if any(token in lower for token in policy_tokens):
            return True
        if lower.startswith(("and department", "general principles practice guidelines", "recommendation :", "table ", "figure ", "fig. ", "appendix ")):
            return True
        if re.match(r"^from\s+\d+%?\s+\d+%?", lower):
            return True
        return False

    def _dedupe_key(self, value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", value.lower())


ExtractedRecommendation = ExtractedEvidenceRecommendation
