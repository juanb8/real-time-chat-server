// src/message-service/handlers/PresenceHandlers.ts
import { Server, Socket } from "socket.io";
import { type IConnectionService } from "../services/ConnectionService";
import { DeliveryService } from "../services/DeliveryService";

export class PresenceHandlers {
  constructor(
    private _io: Server,
    private socket: Socket,
    private connectionService: IConnectionService,
    private _deliveryService: DeliveryService,
  ) {}

  registerHandlers(): void {
    // Presence ping
    this.socket.on("presence-ping", this.handlePresencePing.bind(this));

    // Get online status
    this.socket.on("get-online-status", this.handleGetOnlineStatus.bind(this));
  }

  private async handlePresencePing(): Promise<void> {
    const userId = (this.socket as any).userId;

    if (!userId) return;

    // Update last seen timestamp
    await this.connectionService.addConnection(userId, this.socket.id, {
      lastPing: new Date(),
    });

    this.socket.emit("presence-pong", {
      timestamp: new Date(),
    });
  }

  private async handleGetOnlineStatus(data: {
    userIds: string[];
  }): Promise<void> {
    const statuses: { [userId: string]: boolean } = {};

    for (const userId of data.userIds) {
      statuses[userId] = await this.connectionService.isUserOnline(userId);
    }

    this.socket.emit("online-status", {
      statuses,
      timestamp: new Date(),
    });
  }
}
