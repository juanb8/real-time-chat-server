// src/message-service/services/MessageService.ts
import type { IMessage } from '../../../models/Message';
import { MessageRepository } from '../../../repositories/MessageRepository';
import { type IConnectionService } from '../ConnectionService.interface';

export interface SendMessageData {
  senderId: string;
  recipientId: string;
  content: string;
  messageType?: 'text' | 'location' | 'alert' | 'system';
  tempId?: string;
  metadata?: any;
}

export interface MessageDeliveryResult {
  success: boolean;
  message: IMessage;
  delivered: boolean;
  error?: string;
}

export class MessageService {
  private messageRepository: MessageRepository;
  private connectionService: IConnectionService;

  constructor(
    messageRepository: MessageRepository,
    connectionService: IConnectionService
  ) {
    this.messageRepository = messageRepository;
    this.connectionService = connectionService;
  }

  async sendMessage(data: SendMessageData): Promise<MessageDeliveryResult> {
    try {
      // 1. Create message document
      const messageData: Partial<IMessage> = {
        senderId: data.senderId,
        recipientId: data.recipientId,
        content: data.content,
        messageType: data.messageType || 'text',
        timestamp: new Date(),
        read: false,
        delivered: false,
        status: 'sent',
        tempId: data.tempId,
        metadata: data.metadata
      };

      const message = await this.messageRepository.saveMessage(messageData);

      // 2. Update conversation
      await this.messageRepository.updateConversation(
        data.senderId,
        data.recipientId,
        message
      );

      // 3. Check if recipient is online
      const isRecipientOnline = await this.connectionService.isUserOnline(data.recipientId);

      if (isRecipientOnline) {
        // Message will be delivered in real-time via WebSocket
        return {
          success: true,
          message,
          delivered: false // Not yet delivered, but will be via WS
        };
      } else {
        // Recipient is offline
        return {
          success: true,
          message,
          delivered: false
        };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        message: null as any,
        delivered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deliverMessageToRecipient(
    message: IMessage,
    socketIds: string[]
  ): Promise<void> {
    // This method is called by the WebSocket server when delivering
    // Mark as delivered in database
    await this.messageRepository.markAsDelivered([message._id.toString()]);

    // Update message status
    message.delivered = true;
    message.deliveredAt = new Date();
    message.status = 'delivered';
  }

  async markMessagesAsRead(
    messageIds: string[],
    readerId: string
  ): Promise<{ marked: number; unreadCount: number }> {
    const marked = await this.messageRepository.markAsRead(messageIds, readerId);

    // For each unique conversation, reset unread count
    const messages = await Promise.all(
      messageIds.map(id => this.messageRepository.getConversation('', '')) // Simplified
    );

    // Get unique senders
    const uniqueSenders = [...new Set(messages.map(m => m.senderId))];

    // Reset unread counts
    for (const senderId of uniqueSenders) {
      await this.messageRepository.resetUnreadCount(readerId, senderId);
    }

    return {
      marked,
      unreadCount: await this.getUnreadCount(readerId)
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const unreadMessages = await this.messageRepository.getUnreadMessages(userId);
    return unreadMessages.length;
  }

  async syncMessages(userId: string, lastSyncTime: Date): Promise<IMessage[]> {
    return await this.messageRepository.getMessagesForSync(userId, lastSyncTime);
  }

  async getConversation(
    user1Id: string,
    user2Id: string,
    limit: number = 50,
    before?: Date
  ): Promise<IMessage[]> {
    return await this.messageRepository.getConversation(
      user1Id,
      user2Id,
      limit,
      before
    );
  }

  async getConversations(userId: string): Promise<any[]> {
    return await this.messageRepository.getConversations(userId);
  }
}
