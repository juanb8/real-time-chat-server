// src/message-service/models/Message.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  messageType: 'text' | 'location' | 'alert' | 'system';
  timestamp: Date;
  read: boolean;
  readAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  tempId?: string; // Client-side temporary ID for optimistic UI
  metadata?: {
    senderName?: string;
    senderAvatar?: string;
    shipId?: string;
    latitude?: number;
    longitude?: number;
  };
}

const MessageSchema = new Schema({
  senderId: {
    type: String,
    required: true,
    index: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  messageType: {
    type: String,
    enum: ['text', 'location', 'alert', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  tempId: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for efficient conversation queries
MessageSchema.index({ senderId: 1, recipientId: 1, timestamp: -1 });
MessageSchema.index({ recipientId: 1, read: 1, timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
