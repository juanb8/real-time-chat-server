// src/message-service/handlers/MessageHandlers.ts
import { Server, Socket } from "socket.io";
import { MessageService } from "../services/MessageService";
import { DeliveryService } from "../services/DeliveryService";
import { type IConnectionService } from "../services/ConnectionService";
import type { SendMessageData } from "../services/MessageService/MessageService.interface";
export class MessageHandlers {
  constructor(
    private io: Server,
    private socket: Socket,
    private messageService: MessageService,
    private deliveryService: DeliveryService,
    private connectionService: IConnectionService,
  ) {}

  registerHandlers(): void {
    // Private messaging
    this.socket.on("private-message", this.handlePrivateMessage.bind(this));

    // Read receipts
    this.socket.on("message-read", this.handleMessageRead.bind(this));

    // Typing indicators
    this.socket.on("typing-start", this.handleTypingStart.bind(this));
    this.socket.on("typing-stop", this.handleTypingStop.bind(this));

    // Message status
    this.socket.on("message-ack", this.handleMessageAck.bind(this));

    // Request conversation history
    this.socket.on("get-conversation", this.handleGetConversation.bind(this));
  }

  private async handlePrivateMessage(data: {
    recipientId: string;
    content: string;
    tempId?: string;
    messageType?: string;
    metadata?: any;
  }): Promise<void> {
    const senderId = (this.socket as any).userId;

    if (!senderId) {
      this.socket.emit("error", {
        tempId: data.tempId,
        error: "Authentication required",
      });
      return;
    }

    // Send message through MessageService
    const result = await this.messageService.sendMessage({
      senderId,
      recipientId: data.recipientId,
      content: data.content,
      messageType: data.messageType as any,
      tempId: data.tempId,
      metadata: data.metadata,
    } as SendMessageData);

    if (!result.success) {
      this.socket.emit("message-error", {
        tempId: data.tempId,
        error: result.error,
      });
      return;
    }

    // Send ACK to sender
    this.socket.emit("message-ack", {
      tempId: data.tempId,
      messageId: result.message._id,
      timestamp: result.message.timestamp,
    });

    // Try to deliver in real-time
    const recipientSocketIds = await this.connectionService.getSocketIds(
      data.recipientId,
    );

    if (recipientSocketIds.length > 0) {
      await this.deliveryService.deliverToRecipient(
        result.message,
        recipientSocketIds,
      );
    }
  }

  private async handleMessageRead(data: { messageId: string }): Promise<void> {
    const readerId = (this.socket as any).userId;

    if (!readerId) return;

    const result = await this.messageService.markMessagesAsRead(
      [data.messageId],
      readerId,
    );

    // Notify sender that message was read
    await this.deliveryService.notifySenderOfRead(data.messageId, readerId);

    this.socket.emit("messages-marked-read", {
      messageId: data.messageId,
      readAt: new Date(),
    });
  }

  private async handleTypingStart(data: {
    recipientId: string;
  }): Promise<void> {
    const senderId = (this.socket as any).userId;

    if (!senderId) return;

    // Notify recipient that sender is typing
    const recipientSocketIds = await this.connectionService.getSocketIds(
      data.recipientId,
    );

    recipientSocketIds.forEach((socketId) => {
      this.io.to(socketId).emit("user-typing", {
        userId: senderId,
        isTyping: true,
      });
    });
  }

  private async handleTypingStop(data: { recipientId: string }): Promise<void> {
    const senderId = (this.socket as any).userId;

    if (!senderId) return;

    // Notify recipient that sender stopped typing
    const recipientSocketIds = await this.connectionService.getSocketIds(
      data.recipientId,
    );

    recipientSocketIds.forEach((socketId) => {
      this.io.to(socketId).emit("user-typing", {
        userId: senderId,
        isTyping: false,
      });
    });
  }

  private handleMessageAck(data: { messageId: string }): void {
    // Client acknowledges receipt of message
    // Could update message status if needed
    console.log(`Message ${data.messageId} acknowledged by client`);
  }

  private async handleGetConversation(data: {
    otherUserId: string;
    limit?: number;
    before?: string;
  }): Promise<void> {
    const userId = (this.socket as any).userId;

    if (!userId) return;

    const messages = await this.messageService.getConversation(
      userId,
      data.otherUserId,
      data.limit || 50,
      data.before ? new Date(data.before) : undefined,
    );

    this.socket.emit("conversation-history", {
      otherUserId: data.otherUserId,
      messages: messages.reverse(), // Oldest first for UI
      hasMore: messages.length === (data.limit || 50),
    });
  }
}
