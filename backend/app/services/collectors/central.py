from app.services.collectors.gepnic_base import GePNICBaseCollector

class CentralPortalConnector(GePNICBaseCollector):
    """
    Official connector for Central Public Procurement Portal (eprocure.gov.in).
    Collects live central government civil works (CPWD, MES, NHAI, Railways, AIIMS, PSUs).
    """

    def __init__(self):
        super().__init__(
            source_id="central_cppp",
            name="Central Public Procurement Portal",
            base_url="https://eprocure.gov.in/eprocure/app",
            default_state="Central / All India",
            min_request_interval_seconds=1.5
        )
