// src/message-service/repositories/MessageRepository.ts
import { Message, type IMessage } from '../models/Message';
import { Conversation } from '../models/Conversation';

export interface MessageFilter {
  senderId?: string;
  recipientId?: string;
  read?: boolean;
  delivered?: boolean;
  before?: Date;
  after?: Date;
  limit?: number;
  offset?: number;
}

export class MessageRepository {
  async saveMessage(messageData: Partial<IMessage>): Promise<IMessage> {
    const message = new Message(messageData);
    return await message.save();
  }

  async getConversation(
    user1Id: string,
    user2Id: string,
    limit: number = 50,
    before?: Date
  ): Promise<IMessage[]> {
    const query: any = {
      $or: [
        { senderId: user1Id, recipientId: user2Id },
        { senderId: user2Id, recipientId: user1Id }
      ]
    };

    if (before) {
      query.timestamp = { $lt: before };
    }

    return await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  async getUnreadMessages(userId: string): Promise<IMessage[]> {
    return await Message.find({
      recipientId: userId,
      read: false
    })
      .sort({ timestamp: 1 })
      .lean();
  }

  async markAsRead(messageIds: string[], readerId: string): Promise<number> {
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        recipientId: readerId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
          status: 'read'
        }
      }
    );

    return result.modifiedCount;
  }

  async markAsDelivered(messageIds: string[]): Promise<number> {
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        delivered: false
      },
      {
        $set: {
          delivered: true,
          deliveredAt: new Date(),
          status: 'delivered'
        }
      }
    );

    return result.modifiedCount;
  }

  async getMessagesForSync(
    userId: string,
    lastSyncTime: Date
  ): Promise<IMessage[]> {
    return await Message.find({
      recipientId: userId,
      timestamp: { $gt: lastSyncTime },
      $or: [
        { status: 'sent' },
        { status: 'delivered' }
      ]
    })
      .sort({ timestamp: 1 })
      .lean();
  }

  async updateConversation(
    senderId: string,
    recipientId: string,
    message: IMessage,
    incrementUnread: boolean = true
  ): Promise<void> {
    const participants = [senderId, recipientId].sort();

    await Conversation.findOneAndUpdate(
      { participants },
      {
        $set: {
          lastMessage: message.content,
          lastMessageId: message._id.toString(),
          lastSenderId: senderId,
          lastMessageTime: message.timestamp,
          metadata: {
            lastMessagePreview: message.content.substring(0, 100)
          }
        },
        $inc: incrementUnread ? { unreadCount: 1 } : {},
        $setOnInsert: {
          participants,
          muted: false,
          archived: false
        }
      },
      { upsert: true, new: true }
    );
  }

  async getConversations(userId: string, limit: number = 20): Promise<any[]> {
    return await Conversation.find({
      participants: userId
    })
      .sort({ lastMessageTime: -1 })
      .limit(limit)
      .lean();
  }

  async resetUnreadCount(userId: string, otherUserId: string): Promise<void> {
    const participants = [userId, otherUserId].sort();

    await Conversation.updateOne(
      { participants },
      { $set: { unreadCount: 0 } }
    );
  }

  //  async deleteMessageForUser(messageId: string, userId: string): Promise<boolean> {
  //    // In real implementation, you might want to soft delete
  //    // For now, we'll just remove from user's view (not implemented)
  //    return false;
  //  }
}
