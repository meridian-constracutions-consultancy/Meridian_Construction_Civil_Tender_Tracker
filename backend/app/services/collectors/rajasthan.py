from app.services.collectors.gepnic_base import GePNICBaseCollector

class RajasthanConnector(GePNICBaseCollector):
    """
    Official connector for Rajasthan eProcurement Portal (eproc.rajasthan.gov.in).
    Collects live civil tenders from Rajasthan state departments, PWD, PHED, WRD, etc.
    """

    def __init__(self):
        super().__init__(
            source_id="rajasthan_eproc",
            name="Rajasthan eProcurement Portal",
            base_url="https://eproc.rajasthan.gov.in/nicgep/app",
            default_state="Rajasthan",
            min_request_interval_seconds=1.5
        )
