import { TenderListItem } from '../types/tender';

export type SSEConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface SSECallbacks {
  onNewTender?: (tender: TenderListItem) => void;
  onTenderUpdated?: (update: Partial<TenderListItem>) => void;
  onCollectorStatus?: (status: { source_id: string; status: string; [key: string]: any }) => void;
  onStatusChange?: (status: SSEConnectionStatus) => void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectTimeout: number | null = null;
  private retryDelay: number = 2000;
  private maxRetryDelay: number = 30000;
  private isDestroyed: boolean = false;
  private callbacks: SSECallbacks;

  constructor(callbacks: SSECallbacks) {
    this.callbacks = callbacks;
  }

  public connect(): void {
    if (this.isDestroyed) return;

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.callbacks.onStatusChange?.('connecting');

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.addEventListener('open', () => {
        this.retryDelay = 2000; // Reset delay on successful connection
        this.callbacks.onStatusChange?.('connected');
      });

      this.eventSource.addEventListener('connected', () => {
        this.callbacks.onStatusChange?.('connected');
      });

      this.eventSource.addEventListener('new_tender', (event: MessageEvent) => {
        try {
          const tender: TenderListItem = JSON.parse(event.data);
          this.callbacks.onNewTender?.(tender);
        } catch (e) {
          console.error('Failed to parse new_tender SSE event:', e);
        }
      });

      this.eventSource.addEventListener('tender_updated', (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          this.callbacks.onTenderUpdated?.(update);
        } catch (e) {
          console.error('Failed to parse tender_updated SSE event:', e);
        }
      });

      this.eventSource.addEventListener('collector_status', (event: MessageEvent) => {
        try {
          const status = JSON.parse(event.data);
          this.callbacks.onCollectorStatus?.(status);
        } catch (e) {
          console.error('Failed to parse collector_status SSE event:', e);
        }
      });

      this.eventSource.onerror = () => {
        this.callbacks.onStatusChange?.('disconnected');
        this.eventSource?.close();
        this.eventSource = null;
        this.scheduleReconnect();
      };

    } catch (err) {
      this.callbacks.onStatusChange?.('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimeout !== null) return;

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
      this.connect();
    }, this.retryDelay);
  }

  public disconnect(): void {
    this.isDestroyed = true;
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.callbacks.onStatusChange?.('disconnected');
  }
}
