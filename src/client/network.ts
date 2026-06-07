import type { ClientMessage, ServerMessage } from '../shared/types';

type Handler = (message: ServerMessage) => void;

export class GameSocket {
  private socket: WebSocket | null = null;
  private handlers = new Set<Handler>();
  connected = false;

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const devPort = window.location.port === '5173' ? '8080' : window.location.port;
    const url = `${protocol}//${window.location.hostname}:${devPort}/ws`;

    this.socket = new WebSocket(url);
    this.socket.addEventListener('open', () => {
      this.connected = true;
    });
    this.socket.addEventListener('close', () => {
      this.connected = false;
      window.setTimeout(() => this.connect(), 1000);
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      this.handlers.forEach((handler) => handler(message));
    });
  }

  onMessage(handler: Handler): void {
    this.handlers.add(handler);
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
