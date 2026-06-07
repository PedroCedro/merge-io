import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, MinimapMode, ServerMessage } from '../shared/types';
import { SERVER_PORT, TICK_RATE } from './config';
import { GameWorld } from './world';

const app = express();
const distPath = resolve(process.cwd(), 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(resolve(distPath, 'index.html')));
}

const server = app.listen(SERVER_PORT, () => {
  console.log(`Merge.IO server listening on http://localhost:${SERVER_PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });
const world = new GameWorld();
const clients = new Map<WebSocket, string>();
const clientMinimapModes = new Map<WebSocket, MinimapMode>();

const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let message: ClientMessage;

    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    if (message.type === 'join') {
      const existingId = clients.get(socket);
      if (existingId) {
        world.setGodMode(existingId, false);
        world.removeSnake(existingId);
      }

      world.setAiMode(message.gameMode === 'ai');
      const snake = world.addSnake(message.name, message.skin);
      clients.set(socket, snake.id);
      clientMinimapModes.set(socket, message.minimapMode);
      send(socket, {
        type: 'welcome',
        id: snake.id,
        snapshot: world.snapshotFor(snake.id, message.minimapMode),
      });
      return;
    }

    if (message.type === 'settings') {
      clientMinimapModes.set(socket, message.minimapMode);
      return;
    }

    if (message.type === 'dev') {
      if (message.paused !== undefined) {
        world.setPaused(message.paused);
      }

      if (message.godMode !== undefined) {
        const id = clients.get(socket);
        if (id) {
          world.setGodMode(id, message.godMode);
        }
      }
      return;
    }

    if (message.type === 'input') {
      const id = clients.get(socket);
      const snake = id ? world.snakes.get(id) : null;
      if (snake) {
        snake.input = message;
      }
    }
  });

  socket.on('close', () => {
    const id = clients.get(socket);
    if (id) {
      world.removeSnake(id);
      world.setGodMode(id, false);
    }
    clients.delete(socket);
    clientMinimapModes.delete(socket);
  });
});

setInterval(() => {
  const dead = world.update();

  for (const [socket, id] of clients.entries()) {
    const deadScore = dead.get(id);
    if (deadScore !== undefined) {
      send(socket, { type: 'dead', score: deadScore, reason: 'Colisao detectada' });
      clients.delete(socket);
      continue;
    }

    send(socket, {
      type: 'state',
      snapshot: world.snapshotFor(id, clientMinimapModes.get(socket) ?? 'basic'),
    });
  }
}, 1000 / TICK_RATE);
