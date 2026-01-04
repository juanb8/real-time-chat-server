// test/socket-server-test-helper.ts
import { MockServer } from "./socket.io";

export class SocketServerTestHelper {
  static createMockServer(): MockServer {
    return new MockServer();
  }

  static simulateConnection(server: MockServer, socketId?: string) {
    return server._createMockSocket(socketId);
  }

  static simulateDisconnection(server: MockServer, socketId: string) {
    server._disconnectSocket(socketId);
  }

  static getConnectedSockets(server: MockServer) {
    return server._getSockets();
  }

  static simulateClientEvent(socket: any, event: string, ...args: any[]) {
    socket.emit(event, ...args);
  }

  static simulateServerEvent(socket: any, event: string, ...args: any[]) {
    socket._triggerEvent(event, ...args);
  }

  static clearServer(server: MockServer) {
    server._clearAllSockets();
  }
}
