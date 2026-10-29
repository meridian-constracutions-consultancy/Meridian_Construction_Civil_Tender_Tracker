import pytest
from app.services.classification.engine import classification_engine

def test_civil_construction_positive_match():
    title = "Design and Detailed Project Report Consultancy for Permanent Restoration work in various Road in Jaisalmer District"
    result = classification_engine.classify(
        title=title,
        work_description=title,
        product_category="Consultancy",
        tender_category="Services"
    )
    assert result.is_civil_construction is True
    assert result.score >= 0.5
    assert result.category_id in ("roads_highways", "consultancy_pmc_dpr", "dpr_feasibility")

def test_bridge_construction_match():
    title = "Detailed Design and Engineering Consultancy for high level RCC bridge across Chambal river"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id == "bridges_flyovers"
    assert result.score >= 0.45

def test_water_supply_pipeline_match():
    title = "Architectural and Engineering Consultancy for distribution pipeline and overhead tank"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id in ("water_supply_drainage", "architecture_design", "consultancy_pmc_dpr")

def test_pmc_dpr_consultancy_match():
    title = "Preparation of Detailed Project Report (DPR) and PMC for 4-lane elevated corridor"
    result = classification_engine.classify(title=title)
    assert result.is_civil_construction is True
    assert result.category_id in ("consultancy_pmc_dpr", "pmc_consultancy", "dpr_feasibility")

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
