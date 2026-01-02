// src/message-service/services/DeliveryService.ts
import { Server } from 'socket.io';
import type { IMessage } from '../../models/Message';
import { MessageService } from '../MessageService';
import type { IDeliveryService } from './DeliveryService.interface';



export class DeliveryService implements IDeliveryService {
  constructor(
    private io: Server,
    private messageService: MessageService
  ) { }

  async deliverToRecipient(
    message: IMessage,
    recipientSocketIds: string[]
  ): Promise<boolean> {
    if (recipientSocketIds.length === 0) {
      return false; // Recipient offline
    }

    try {
      // Deliver to all of recipient's connections (multiple devices)
      recipientSocketIds.forEach(socketId => {
        this.io.to(socketId).emit('private-message', {
          ...message.toObject?.(),
          delivered: true
        });
      });

      // Update delivery status in database
      await this.messageService.deliverMessageToRecipient(
        message,
        recipientSocketIds
      );

      // Notify sender that message was delivered
      await this.notifySenderOfDelivery(message);

      return true;
    } catch (error) {
      console.error('Error delivering message:', error);
      return false;
    }
  }

  async notifySenderOfDelivery(message: IMessage): Promise<void> {
    // Find sender's socket connections
    const senderSocketIds = await this.getSocketIds(message.senderId);

    senderSocketIds.forEach(socketId => {
      this.io.to(socketId).emit('message-delivered', {
        messageId: message._id,
        recipientId: message.recipientId,
        deliveredAt: new Date()
      });
    });
  }

  async notifySenderOfRead(
    messageId: string,
    readerId: string
  ): Promise<void> {
    // Get the message
    // In real implementation, fetch from database
    // For now, emit to sender's room

    this.io.to(`user-${readerId}`).emit('message-read', {
      messageId,
      readAt: new Date()
    });
  }

  async broadcastToRoom(
    room: string,
    event: string,
    data: any,
    excludeSocketId?: string
  ): Promise<void> {
    if (excludeSocketId) {
      this.io.to(room).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  async getSocketIds(userId: string): Promise<string[]> {
    // This would come from ConnectionService
    // Simplified for this example
    const sockets = await this.io.in(`user-${userId}`).fetchSockets();
    return sockets.map(socket => socket.id);
  }

  async notifyUserOnline(userId: string, contacts: string[]): Promise<void> {
    contacts.forEach(contactId => {
      this.io.to(`user-${contactId}`).emit('user-online', {
        userId,
        timestamp: new Date()
      });
    });
  }

  async notifyUserOffline(userId: string, contacts: string[]): Promise<void> {
    contacts.forEach(contactId => {
      this.io.to(`user-${contactId}`).emit('user-offline', {
        userId,
        timestamp: new Date(),
        lastSeen: new Date()
      });
    });
  }
}
