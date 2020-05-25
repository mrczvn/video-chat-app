import express, { Application } from 'express';
import socketIO, { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import path from 'path';

export class App {
  private httpServer!: HTTPServer;
  private app!: Application;
  private io!: SocketIOServer;

  private readonly APP_PORT = 5000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.middleware();
    this.handleRoutes();
    this.handleSocketConnection();
  }

  private middleware(): void {
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private handleRoutes(): void {
    this.app.get('/', (req, res) => {
      res.sendFile('index.html');
    });
  }

  private handleSocketConnection(): void {
    this.io.on('connection', (socket) => {
      console.log('Socket connected.');
    });
  }

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.APP_PORT, () => callback(this.APP_PORT));
  }
}
