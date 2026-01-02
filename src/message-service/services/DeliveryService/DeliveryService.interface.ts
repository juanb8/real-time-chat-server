import { type IMessage } from "../../models/Message";

export interface IDeliveryService {
  /**
   * Delivers a message to a recipient's active socket connections and updates DB status.
   */
  deliverToRecipient(
    message: IMessage,
    recipientSocketIds: string[]
  ): Promise<boolean>;

  /**
   * Informs the sender that their message has reached the recipient's device.
   */
  notifySenderOfDelivery(message: IMessage): Promise<void>;

  /**
   * Notifies the sender that the message has been read.
   */
  notifySenderOfRead(messageId: string, readerId: string): Promise<void>;

  /**
   * Broadcasts an event to a specific room with an optional exclusion.
   */
  broadcastToRoom(
    room: string,
    event: string,
    data: any,
    excludeSocketId?: string
  ): Promise<void>;

  /**
   * Retrieves active socket IDs for a specific user.
   */
  getSocketIds(userId: string): Promise<string[]>;

  /**
   * Alerts contacts that a user has come online.
   */
  notifyUserOnline(userId: string, contacts: string[]): Promise<void>;

  /**
   * Alerts contacts that a user has gone offline.
   */
  notifyUserOffline(userId: string, contacts: string[]): Promise<void>;
}

