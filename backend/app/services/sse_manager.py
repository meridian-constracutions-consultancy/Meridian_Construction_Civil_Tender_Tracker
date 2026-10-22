import asyncio
import json
import logging
from typing import Set, Dict, Any, AsyncGenerator

logger = logging.getLogger("sse_manager")

class SSEManager:
    """
    Thread-safe Server-Sent Events (SSE) broadcaster with heartbeat
    and connection lifecycle management.
    """

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        """Subscribes a new HTTP client connection."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        logger.info(f"SSE client subscribed. Total active listeners: {len(self._subscribers)}")
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribes a disconnected client."""
        self._subscribers.discard(queue)
        logger.info(f"SSE client disconnected. Total active listeners: {len(self._subscribers)}")

    def broadcast_sync(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event synchronously from background threads or workers.
        Pushes event into all active subscriber queues safely.
        """
        payload = {
            "event": event_type,
            "data": data
        }
        dead_queues = []
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead_queues.append(queue)
            except Exception as e:
                logger.warning(f"Error dispatching SSE event: {e}")
                dead_queues.append(queue)

        for q in dead_queues:
            self._subscribers.discard(q)

    async def event_generator(self, queue: asyncio.Queue) -> AsyncGenerator[str, None]:
        """
        Yields formatted SSE strings with automatic 15-second keepalive heartbeats.
        """
        try:
            # Yield initial connection confirmation
            init_msg = json.dumps({"status": "connected", "active_clients": len(self._subscribers)})
            yield f"event: connected\ndata: {init_msg}\n\n"

            while True:
                try:
                    # Wait for next event or timeout to send heartbeat
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    event_type = payload.get("event", "message")
                    data_json = json.dumps(payload.get("data", {}), default=str)
                    yield f"event: {event_type}\ndata: {data_json}\n\n"
                except asyncio.TimeoutError:
                    # Send periodic keepalive comment to prevent socket timeout
                    yield ": ping (heartbeat)\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self.unsubscribe(queue)

sse_manager = SSEManager()
