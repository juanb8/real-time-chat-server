// src/message-service/models/Conversation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: string[]; // Sorted user IDs
  lastMessage: string;
  lastMessageId: string;
  lastSenderId: string;
  lastMessageTime: Date;
  unreadCount: number;
  muted: boolean;
  archived: boolean;
  metadata?: {
    participantNames?: string[];
    lastMessagePreview?: string;
  };
}

const ConversationSchema = new Schema({
  participants: {
    type: [String],
    required: true,
    index: true
  },
  lastMessage: {
    type: String,
    required: true
  },
  lastMessageId: {
    type: String,
    required: true
  },
  lastSenderId: {
    type: String,
    required: true
  },
  lastMessageTime: {
    type: Date,
    required: true,
    index: true
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  muted: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure unique conversations between users
ConversationSchema.index({ participants: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

