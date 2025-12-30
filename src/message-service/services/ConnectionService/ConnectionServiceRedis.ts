import Redis from 'ioredis';
import { type IConnectionService } from './ConnectionService.interface';

export class RedisConnectionService implements IConnectionService {
  private redis: Redis;

  constructor(redisUrl: string) {
    // Standard initialization for a Redis client
    this.redis = new Redis(redisUrl);
  }

  async addConnection(
    userId: string,
    socketId: string,
    metadata?: any
  ): Promise<void> {
    // SADD adds a unique socket ID to the user's set of connections
    await this.redis.sadd(`user:${userId}:sockets`, socketId);

    // HSET stores individual socket-to-user mappings for quick lookups
    await this.redis.hset(`socket:${socketId}`, 'userId', userId);

    if (metadata) {
      await this.redis.hset(`socket:${socketId}`, 'metadata', JSON.stringify(metadata));
    }

    // Track the last activity time for the user
    await this.redis.set(`user:${userId}:lastSeen`, new Date().toISOString());
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    await this.redis.srem(`user:${userId}:sockets`, socketId);
    await this.redis.del(`socket:${socketId}`);

    // If no sockets remain, the user is considered offline
    const remaining = await this.redis.scard(`user:${userId}:sockets`);
    if (remaining === 0) {
      await this.redis.del(`user:${userId}:lastSeen`);
    }
  }

  async getSocketIds(userId: string): Promise<string[]> {
    // SMEMBERS returns all items in the user's connection set
    return await this.redis.smembers(`user:${userId}:sockets`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const count = await this.redis.scard(`user:${userId}:sockets`);
    return count > 0;
  }

  async getOnlineUsers(): Promise<string[]> {
    // Uses pattern matching to find all active user sets
    const pattern = 'user:*:sockets';
    const keys = await this.redis.keys(pattern);
    return keys.map(key => key.split(':')[1]);
  }

  async getUserMetadata(userId: string): Promise<any> {
    const socketIds = await this.redis.smembers(`user:${userId}:sockets`);
    if (socketIds.length > 0) {
      // Retrieves metadata from the first active socket hash
      const metadata = await this.redis.hget(`socket:${socketIds[0]}`, 'metadata');
      return metadata ? JSON.parse(metadata) : null;
    }
    return null;
  }

  async cleanup(): Promise<void> {
    // Here i clean-up all the active connections
    await this.redis.flushall();
    await this.redis.quit();
  }
}

