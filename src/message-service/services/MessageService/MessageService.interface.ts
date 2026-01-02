import { type IMessage } from '../../models/Message';
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

export interface IMessageService {
  sendMessage(data: SendMessageData): Promise<MessageDeliveryResult>,
};
