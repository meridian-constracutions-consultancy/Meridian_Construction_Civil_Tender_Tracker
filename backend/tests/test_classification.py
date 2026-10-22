import pytest
from app.services.classification.engine import classification_engine

def test_civil_construction_positive_match():
    title = "Permanent Restoration work in various Road in Package No. RJ-17-01 in Jaisalmer District"
    result = classification_engine.classify(
        title=title,
        work_description=title,
        product_category="Civil Works",
        tender_category="Works"
    )
    assert result.is_civil_construction is True
    assert result.score >= 0.5
    assert result.category_id in ("roads_highways", "civil_construction")
    assert any(any(w in k.lower() for w in ["road", "civil", "restoration"]) for k in result.matched_keywords)

def test_bridge_construction_match():
    title = "Construction of high level RCC bridge across Chambal river on State Highway 22"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id == "bridges_flyovers"
    assert result.score >= 0.45

def test_water_supply_pipeline_match():
    title = "Laying of distribution pipeline and construction of overhead tank under urban water supply scheme"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id == "water_supply_drainage"

def test_pmc_dpr_consultancy_match():
    title = "Preparation of Detailed Project Report (DPR) and PMC for 4-lane elevated corridor"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id == "consultancy_pmc_dpr"

def test_disqualify_it_equipment():
    title = "Supply and installation of 500 laptops and laser printers for government colleges"
    result = classification_engine.classify(
        title=title,
        work_description=title,
        product_category="Computer Hardware",
        tender_category="Goods"
    )
    assert result.is_civil_construction is False
    assert result.score == 0.0
    assert "Disqualified" in result.reason

def test_disqualify_vehicle_hire():
    title = "Hiring of 5 operational inspection vehicles (Bolero/Innova) on monthly rental basis"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is False
    assert result.score == 0.0

def test_disqualify_stationery_supplies():
    title = "Annual rate contract for supply of stationery items, paper rims, and executive chairs"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is False
    assert result.score == 0.0
