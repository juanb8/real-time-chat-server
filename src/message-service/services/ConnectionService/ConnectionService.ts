import type { IConnectionService } from "./ConnectionService.interface";

/**
 * Internal interface to define the shape of the data 
 * stored within the local Map.
 */
interface UserConnection {
  userId: string;
  socketIds: Set<string>;
  lastSeen: Date;
  metadata?: any;
}

export class LocalConnectionService implements IConnectionService {
  private connections: Map<string, UserConnection>;

  constructor() {
    this.connections = new Map();
  }

  async addConnection(userId: string, socketId: string, metadata?: any): Promise<void> {
    let connection = this.connections.get(userId);

    if (!connection) {
      connection = {
        userId,
        socketIds: new Set(),
        lastSeen: new Date(),
        metadata
      };
      this.connections.set(userId, connection);
    }

    connection.socketIds.add(socketId);
    connection.lastSeen = new Date();

    if (metadata) {
      connection.metadata = { ...connection.metadata, ...metadata };
    }
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    const connection = this.connections.get(userId);

    if (connection) {
      connection.socketIds.delete(socketId);

      // If the user has no more active socket connections, remove them from the Map
      if (connection.socketIds.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  async getSocketIds(userId: string): Promise<string[]> {
    const connection = this.connections.get(userId);
    return connection ? Array.from(connection.socketIds) : [];
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const connection = this.connections.get(userId);
    return connection ? connection.socketIds.size > 0 : false;
  }

  async getOnlineUsers(): Promise<string[]> {
    // Returns an array of all keys (User IDs) in the Map
    return Array.from(this.connections.keys());
  }

  async getUserMetadata(userId: string): Promise<any> {
    const connection = this.connections.get(userId);
    return connection?.metadata || null;
  }

  async cleanup(): Promise<void> {
    this.connections.clear();
  }
}

