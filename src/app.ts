import express, { Application } from 'express';
import socketIO, { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import path from 'path';

export class App {
  private httpServer!: HTTPServer;
  private app!: Application;
  private io!: SocketIOServer;

  private readonly APP_PORT = 5000;
  private activeSockets: string[] = []; //armazena soquetes conectados na memória

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
      console.log('connected...');
      // find retorna um booleano(true/false)
      const existingSocket = this.activeSockets.find(
        (existingSocket) => existingSocket === socket.id
      );

      // se não existir, envie o id do soquete conectado para a memória
      if (!existingSocket) {
        this.activeSockets.push(socket.id);
        // verifica se o soquete conectado seja diferente de um já existente
        socket.emit('update-user-list', {
          users: this.activeSockets.filter(
            (existingSocket) => existingSocket !== socket.id
          ),
        });
        // e emita aos os dados para os usuários conectados
        socket.broadcast.emit('update-user-list', {
          users: [socket.id],
        });
      }
      // interceptando chamadas de usuários, e ecaminhando ao usuário selecionado
      socket.on('call-user', (data: any) => {
        socket.to(data.to).emit('call-made', {
          offer: data.offer,
          socket: socket.id,
        });
      });
      // interceptando evento de resposta da call
      socket.on('make-answer', (data) => {
        // e aqui emiti a resposta ao usuário que propõe a chamada
        socket.to(data.to).emit('answer-made', {
          socket: socket.id,
          answer: data.answer,
        });
      });
      // interceptando evento chamada rejeitada
      socket.on('reject-call', (data) => {
        socket.to(data.from).emit('call-rejected', {
          socket: socket.id, // então emiti a mensagem de que o usuário rejeitou a chamada
        });
      });

      socket.on('disconnect', () => {
        // verifica se o soquete desconectado não existe no array
        this.activeSockets = this.activeSockets.filter(
          (existingSocket) => existingSocket !== socket.id
        );
        // então emiti a mensagem 'remove-user' com o id do soquete desconectado
        socket.broadcast.emit('remove-user', {
          socketId: socket.id,
        });
      });
    });
  }

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.APP_PORT, () => callback(this.APP_PORT));
  }
}
