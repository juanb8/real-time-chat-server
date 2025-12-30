export interface IConnectionService {
  /**
   * Adds a new socket connection for a specific user.
   */
  addConnection(
    userId: string,
    socketId: string,
    metadata?: any
  ): Promise<void>;

  /**
   * Removes a specific socket connection for a user.
   */
  removeConnection(userId: string, socketId: string): Promise<void>;

  /**
   * Retrieves all active socket IDs for a given user.
   */
  getSocketIds(userId: string): Promise<string[]>;

  /**
   * Checks if a user has any active connections.
   */
  isUserOnline(userId: string): Promise<boolean>;

  /**
   * Returns a list of all User IDs currently connected.
   */
  getOnlineUsers(): Promise<string[]>;

  /**
   * Retrieves the metadata associated with a user's connection.
   */
  getUserMetadata(userId: string): Promise<any>;

  /**
   * Clears all connection data.
   */
  cleanup(): Promise<void>;
}

