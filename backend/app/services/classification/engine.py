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
            
        self.categories = self.rules.get("categories", [])
        self.disqualifying_negatives = [k.lower() for k in self.rules.get("disqualifying_negative_keywords", [])]
        self.contextual_negatives = [k.lower() for k in self.rules.get("contextual_negative_keywords", [])]

    def classify(
        self,
        title: str,
        work_description: Optional[str] = None,
        product_category: Optional[str] = None,
        tender_category: Optional[str] = None
    ) -> ClassificationResult:
        """
        Deterministically classifies a tender based on title, description, and portal categories.
        Prevents false positives on IT, vehicle, stationery, and healthcare procurements.
        """
        title_lower = (title or "").lower()
        desc_lower = (work_description or "").lower()
        combined_text = f"{title_lower} {desc_lower}"
        prod_cat_lower = (product_category or "").lower()
        tender_cat_lower = (tender_category or "").lower()

        # Step 1: Check for explicit disqualifying negatives in the title
        for disq in self.disqualifying_negatives:
            # Word boundary check for the disqualifier
            if re.search(r'\b' + re.escape(disq) + r'\b', title_lower):
                # Verify if it's genuinely civil before rejecting (e.g. "construction of medical hospital building" is valid civil)
                has_strong_civil = any(
                    strong in title_lower for strong in [
                        "construction of", "civil works", "building construction",
                        "repair of road", "construction of hospital"
                    ]
                )
                if not has_strong_civil:
                    return ClassificationResult(
                        is_civil_construction=False,
                        category_id=None,
                        category_name=None,
                        score=0.0,
                        matched_keywords=[disq],
                        reason=f"Disqualified: Contains non-civil keyword '{disq}' without strong civil context"
                    )

        # Step 2: Product category bonus from GePNIC portal
        base_score = 0.0
        portal_matches: List[str] = []
        if "civil" in prod_cat_lower:
            base_score += 0.4
            portal_matches.append(f"portal_product_category:{product_category}")
        elif prod_cat_lower in ["works", "construction works", "roads/bridge", "buildings"]:
            base_score += 0.3
            portal_matches.append(f"portal_product_category:{product_category}")

        # Step 3: Match against configured civil categories
        best_category_id = None
        best_category_name = None
        best_category_score = 0.0
        all_matched_keywords: List[str] = list(portal_matches)

        for cat in self.categories:
            cat_id = cat["id"]
            cat_name = cat["name"]
            cat_score = 0.0
            cat_keywords_matched = []

            # Check phrases (weight: 0.35 each)
            for phrase in cat.get("phrases", []):
                if phrase in combined_text:
                    cat_score += 0.35
                    cat_keywords_matched.append(phrase)

            # Check keywords (weight: 0.20 each)
            for kw in cat.get("positive_keywords", []):
                if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                    if kw not in cat_keywords_matched:
                        cat_score += 0.20
                        cat_keywords_matched.append(kw)

            # Domain specific categories get priority over generic civil works
            priority_bonus = 0.05 if cat_id not in ("civil_construction",) else 0.0
            adjusted_score = cat_score + (priority_bonus if cat_score > 0 else 0.0)

            if adjusted_score > best_category_score:
                best_category_score = cat_score
                best_category_id = cat_id
                best_category_name = cat_name
                all_matched_keywords.extend(cat_keywords_matched)

        # Deduplicate matched keywords
        unique_matches = list(dict.fromkeys(all_matched_keywords))

        total_score = min(1.0, base_score + best_category_score)
        
        # Determine civil classification threshold
        is_civil = False
        reason_parts = []

        if total_score >= 0.35:
            is_civil = True
            reason_parts.append(f"High-confidence rule match (score {round(total_score, 2)}) in '{best_category_name}'")
        elif "civil" in prod_cat_lower:
            is_civil = True
            if not best_category_id:
                best_category_id = "civil_construction"
                best_category_name = "Civil Construction & Works"
            reason_parts.append("Official portal designated Product Category as Civil Works")
        else:
            is_civil = False
            reason_parts.append("Insufficient civil construction indicators")

        if unique_matches:
            reason_parts.append(f"Matched signals: {', '.join(unique_matches[:5])}")

        return ClassificationResult(
            is_civil_construction=is_civil,
            category_id=best_category_id if is_civil else None,
            category_name=best_category_name if is_civil else None,
            score=total_score,
            matched_keywords=unique_matches,
            reason="; ".join(reason_parts)
        )

# Global singleton engine
classification_engine = ClassificationEngine()
