from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.sse_manager import sse_manager

router = APIRouter(prefix="/events", tags=["events"])

@router.get("")
async def sse_endpoint():
    """
    Subscribes to live Server-Sent Events (SSE).
    Emits 'new_tender', 'tender_updated', and 'collector_status' events in real time.
    """
    queue = sse_manager.subscribe()
    return StreamingResponse(
        sse_manager.event_generator(queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
