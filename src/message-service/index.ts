// src/message-service/index.ts
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { MessageRepository } from "./repositories/MessageRepository";
import {
  type IConnectionService,
  RedisConnectionService,
} from "./services/ConnectionService";
import { MessageService } from "./services/MessageService";
import { DeliveryService } from "./services/DeliveryService";
import { MessageHandlers } from "./handlers/MessageHandlers";
import { PresenceHandlers } from "./handlers/PresenceHandlers";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userData?: any;
}

export class MessageWebSocketService {
  private io: Server;
  private connectionService: IConnectionService;
  private messageService: MessageService;
  private deliveryService: DeliveryService;
  private messageRepository: MessageRepository;

  constructor(io: Server) {
    this.io = io;
    this.setupDatabase();
    this.initializeServices();
    this.setupSocketServer();
  }

  private setupDatabase(): void {
    // MongoDB connection should already be established by main server
    // Just verify we can access models
    this.messageRepository = new MessageRepository();
  }

  private initializeServices(): void {
    this.connectionService = new RedisConnectionService(
      process.env.REDIS_URI as string, // TODO: redis setup
    );

    this.messageService = new MessageService(
      this.messageRepository,
      this.connectionService,
    );

    this.deliveryService = new DeliveryService(this.io, this.messageService);
  }

  private setupSocketServer(): void {
    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handler
    this.io.on("connection", this.handleConnection.bind(this));
  }

  private async authenticateSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void,
  ): Promise<void> {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // JWT verification should be done by main server
      // For this implementation, assume token is already verified
      // and userId is passed in auth
      const userId = socket.handshake.auth.userId;

      if (!userId) {
        return next(new Error("Invalid authentication token"));
      }

      socket.userId = userId;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  }

  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    console.log(`User ${socket.userId} connected: ${socket.id}`);

    // Add to connection service
    await this.connectionService.addConnection(socket.userId, socket.id, {
      connectedAt: new Date(),
      userAgent: socket.handshake.headers["user-agent"],
    });

    // Join user's personal room
    socket.join(`user-${socket.userId}`);

    // Send connection confirmation
    socket.emit("connected", {
      userId: socket.userId,
      timestamp: new Date(),
      socketId: socket.id,
    });

    // Initialize handlers
    this.initializeHandlers(socket);

    // Deliver any queued messages
    await this.deliverQueuedMessages(socket.userId, socket.id);

    // Setup disconnect handler
    socket.on("disconnect", async (reason) => {
      await this.handleDisconnect(socket, reason);
    });

    // Setup error handler
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  }

  private initializeHandlers(socket: AuthenticatedSocket): void {
    // Message handlers
    const messageHandlers = new MessageHandlers(
      this.io,
      socket,
      this.messageService,
      this.deliveryService,
      this.connectionService,
    );
    messageHandlers.registerHandlers();

    // Presence handlers
    const presenceHandlers = new PresenceHandlers(
      this.io,
      socket,
      this.connectionService,
      this.deliveryService,
    );
    presenceHandlers.registerHandlers();
  }

  private async deliverQueuedMessages(
    userId: string,
    socketId: string,
  ): Promise<void> {
    try {
      const unreadMessages =
        await this.messageRepository.getUnreadMessages(userId);

      if (unreadMessages.length > 0) {
        // Deliver each message
        for (const message of unreadMessages) {
          this.io.to(socketId).emit("private-message", {
            ...message,
            queued: true,
          });

          // Mark as delivered
          await this.messageRepository.markAsDelivered([
            message._id.toString(),
          ]);
        }

        console.log(
          `Delivered ${unreadMessages.length} queued messages to user ${userId}`,
        );
      }
    } catch (error) {
      console.error("Error delivering queued messages:", error);
    }
  }

  private async handleDisconnect(
    socket: AuthenticatedSocket,
    reason: string,
  ): Promise<void> {
    console.log(`User ${socket.userId} disconnected: ${reason}`);

    // Remove from connection service
    await this.connectionService.removeConnection(socket.userId, socket.id);

    // Check if user is still online from other devices
    const isStillOnline = await this.connectionService.isUserOnline(
      socket.userId,
    );

    if (!isStillOnline) {
      // User is completely offline, notify contacts
      // In real implementation, get user's contacts
      // For now, we'll just log
      console.log(`User ${socket.userId} is now offline`);
    }
  }

  async cleanup(): Promise<void> {
    await this.connectionService.cleanup();
  }
}

// Export factory function for easy integration
export function setupMessageWebSocket(io: Server): MessageWebSocketService {
  return new MessageWebSocketService(io);
}
