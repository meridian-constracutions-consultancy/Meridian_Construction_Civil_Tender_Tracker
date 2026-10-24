import json
import os
import re
from typing import Dict, Any, List, Optional, Tuple

class ClassificationResult:
    def __init__(
        self,
        is_civil_construction: bool,
        category_id: Optional[str],
        category_name: Optional[str],
        score: float,
        matched_keywords: List[str],
        reason: str,
        method: str = "RULE_BASED"
    ):
        self.is_civil_construction = is_civil_construction
        self.category_id = category_id
        self.category_name = category_name
        self.score = round(score, 3)
        self.matched_keywords = matched_keywords
        self.reason = reason
        self.method = method

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_civil_construction": self.is_civil_construction,
            "category_id": self.category_id,
            "category_name": self.category_name,
            "classification_score": self.score,
            "matched_keywords": self.matched_keywords,
            "classification_reason": self.reason,
            "classification_method": self.method,
        }

class ClassificationEngine:
    def __init__(self, rules_path: Optional[str] = None):
        if not rules_path:
            rules_path = os.path.join(os.path.dirname(__file__), "rules.json")
        self.rules_path = rules_path
        self._load_rules()

    def _load_rules(self):
        with open(self.rules_path, "r", encoding="utf-8") as f:
            self.rules = json.load(f)
            
        default_search = [
            "design", "consultancy", "consultant", "dpr", "pmc",
            "architectural", "structural", "proof checking", "vetting",
            "feasibility", "survey", "inspection", "audit", "master plan"
        ]
        loaded_search = self.rules.get("search_keywords", [])
        if not loaded_search:
            self.rules["search_keywords"] = default_search
            loaded_search = default_search

        self.raw_search_keywords = [k.strip() for k in loaded_search if k.strip()]
        self.search_keywords = [k.lower() for k in self.raw_search_keywords]
        self.categories = self.rules.get("categories", [])
        self.disqualifying_negatives = [k.lower() for k in self.rules.get("disqualifying_negative_keywords", [])]
        self.contextual_negatives = [k.lower() for k in self.rules.get("contextual_negative_keywords", [])]

    def reload_rules(self):
        """Reloads the classification rules and keywords from rules.json."""
        self._load_rules()

    def get_search_keywords(self) -> List[str]:
        """Returns the active search keywords for portal scrapers."""
        return list(self.raw_search_keywords)

    def get_keywords_config(self) -> Dict[str, Any]:
        """Returns the full keywords configuration."""
        return dict(self.rules)

    def update_rules(self, updated_rules: Dict[str, Any]):
        """Persists updated rules to rules.json and reloads in-memory rules."""
        with open(self.rules_path, "w", encoding="utf-8") as f:
            json.dump(updated_rules, f, indent=2)
        self._load_rules()

    def classify(
        self,
        title: str,
        work_description: Optional[str] = None,
        product_category: Optional[str] = None,
        tender_category: Optional[str] = None
    ) -> ClassificationResult:
        """
        Classifies a tender strictly based on user-entered keywords.
        Only tenders matching one or more entered search keywords are displayed.
        """
        title_lower = (title or "").lower()
        desc_lower = (work_description or "").lower()
        combined_text = f"{title_lower} {desc_lower}"

        # Common portal spelling variations and abbreviations for the user's keywords
        KEYWORD_SYNONYMS: Dict[str, List[str]] = {
            "beutification": [r"\bbeutification\b", r"\bbeautification\b", r"\bbeautif\w*"],
            "beautification": [r"\bbeutification\b", r"\bbeautification\b", r"\bbeautif\w*"],
            "landscapping": [r"\blandscapping\b", r"\blandscaping\b", r"\blandscape\w*"],
            "landscaping": [r"\blandscapping\b", r"\blandscaping\b", r"\blandscape\w*"],
            "physibility": [r"\bphysibility\b", r"\bfeasibility\b"],
            "feasibility": [r"\bphysibility\b", r"\bfeasibility\b"],
            "landaqusition (la)": [r"\bland\s*ac?qui?sition\b", r"\bla\b", r"\blandaqusition\b"],
            "land acquisition": [r"\bland\s*ac?qui?sition\b", r"\bla\b", r"\blandaqusition\b"],
            "geotech": [r"\bgeotech\w*"],
            "architecture": [r"\barchitect\w*"],
            "structure": [r"\bstructur\w*"],
            "consultancy": [r"\bconsult\w*"],
            "survey": [r"\bsurvey\w*"],
            "design": [r"\bdesign\w*"],
            "study": [r"\bstud(y|ies)\b"],
            "pmc": [r"\bpmc\b", r"\bproject\s+management\s+consult\w*"],
            "dpr": [r"\bdpr\b", r"\bdetailed\s+project\s+report\b"],
            "bus stop": [r"\bbus\s+stop\b", r"\bbus\s+shelter\b", r"\bbus\s+stand\b"],
            "railway": [r"\brailway\w*", r"\brail\b"],
            "bridge": [r"\bbridge\w*", r"\bflyover\w*", r"\brob\b", r"\brub\b"],
            "dam": [r"\bdam\b", r"\bdams\b", r"\bcheck\s+dam\w*"],
            "highway": [r"\bhighway\w*", r"\bexpressway\w*"],
            "station": [r"\bstation\w*"],
            "terminal": [r"\bterminal\w*"],
            "ndt": [r"\bndt\b", r"\bnon\s*destructive\s*testing\b", r"\bnon-destructive\s*testing\b"],
            "soil": [r"\bsoil\b"],
            "audit": [r"\baudit\w*"],
            "testing": [r"\btest(ing)?\b"],
            "plan": [r"\bplan\w*", r"\bmaster\s*plan\w*"],
        }

        # Step 1: Disqualify completely irrelevant non-civil goods procurements (medical, vehicle, IT supply)
        for disq in self.disqualifying_negatives:
            if re.search(r'\b' + re.escape(disq) + r'\b', title_lower):
                has_design_context = any(
                    re.search(r'\b' + kw.lower() + r'\b', title_lower)
                    for kw in ["design", "dpr", "consultancy", "consultant", "architecture", "structural", "survey", "feasibility"]
                )
                if not has_design_context:
                    return ClassificationResult(
                        is_civil_construction=False,
                        category_id=None,
                        category_name=None,
                        score=0.0,
                        matched_keywords=[disq],
                        reason=f"Disqualified: '{disq}' without design/consultancy context"
                    )

        # Step 2: Match strictly against the active entered keywords
        matched_keywords: List[str] = []

        for kw in self.raw_search_keywords:
            kw_clean = kw.strip()
            if not kw_clean:
                continue
            kw_lower = kw_clean.lower()
            patterns = KEYWORD_SYNONYMS.get(kw_lower)
            is_matched = False

            if patterns:
                for pat in patterns:
                    if re.search(pat, combined_text, re.IGNORECASE):
                        is_matched = True
                        break
            else:
                safe_kw = re.escape(kw_lower)
                if re.search(r'\b' + safe_kw + r'\b', combined_text, re.IGNORECASE) or kw_lower in combined_text:
                    is_matched = True

            if is_matched:
                matched_keywords.append(kw_clean)

        # Step 3: If no user keyword matched, DO NOT SHOW
        if not matched_keywords:
            return ClassificationResult(
                is_civil_construction=False,
                category_id=None,
                category_name=None,
                score=0.0,
                matched_keywords=[],
                reason="No matching keywords from active user search list"
            )

        # Step 4: Map to appropriate category for DB FK integrity & clean UI tag
        matched_lower = {k.lower() for k in matched_keywords}
        if any(k in matched_lower for k in ["railway", "metro", "station"]):
            cat_id = "metro_railways"
            cat_name = "Metro & Railway Design / Consultancy"
        elif "bridge" in matched_lower:
            cat_id = "bridges_flyovers"
            cat_name = "Bridges, ROBs & Flyovers Design"
        elif "highway" in matched_lower:
            cat_id = "roads_highways"
            cat_name = "Highways & Roads Design / DPR Consultancy"
        elif any(k in matched_lower for k in ["structure", "soil", "geotech", "testing", "ndt", "dam"]):
            cat_id = "structural_engineering"
            cat_name = "Structural Engineering & Design"
        else:
            cat_id = "consultancy_pmc_dpr"
            cat_name = "Architecture, PMC & DPR Consultancy"

        return ClassificationResult(
            is_civil_construction=True,
            category_id=cat_id,
            category_name=cat_name,
            score=1.0,
            matched_keywords=matched_keywords,
            reason=f"Matched user keywords: {', '.join(matched_keywords)}"
        )

# Global singleton engine
classification_engine = ClassificationEngine()
