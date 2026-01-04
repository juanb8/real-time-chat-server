// socket-server.test.ts
import { Server } from 'socket.io';
import { SocketServerTestHelper } from "./socket-server-test-helpet";
// This automatically uses the mock
jest.mock('socket.io');

describe('Socket.io Server', () => {
  let io: any;
  let server: any;

  beforeEach(() => {
    io = new Server();
    server = io;
  });

  afterEach(() => {
    SocketServerTestHelper.clearServer(server);
  });

  test('should create server instance', () => {
    expect(server).toBeDefined();
    expect(server.on).toBeDefined();
    expect(server.emit).toBeDefined();
  });

  test('should handle client connections', () => {
    const connectionHandler = jest.fn();
    server.on('connection', connectionHandler);

    const socket = SocketServerTestHelper.simulateConnection(server, 'client-123');

    expect(connectionHandler).toHaveBeenCalledWith(socket);
    expect(socket.id).toBe('client-123');
    expect(server.engine.clientsCount).toBe(1);
  });

  test('should handle client events', () => {
    const messageHandler = jest.fn();
    server.on('message', messageHandler);

    const socket = SocketServerTestHelper.simulateConnection(server);
    SocketServerTestHelper.simulateClientEvent(socket, 'message', 'Hello Server!');

    expect(messageHandler).toHaveBeenCalledWith(socket, 'Hello Server!');
  });

  test('should broadcast to all clients', () => {
    const socket1 = SocketServerTestHelper.simulateConnection(server, 'client-1');
    const socket2 = SocketServerTestHelper.simulateConnection(server, 'client-2');

    const handler1 = jest.fn();
    const handler2 = jest.fn();

    socket1.on('broadcast', handler1);
    socket2.on('broadcast', handler2);

    server.emit('broadcast', 'Message for everyone');

    expect(handler1).toHaveBeenCalledWith('Message for everyone');
    expect(handler2).toHaveBeenCalledWith('Message for everyone');
  });

  test('should broadcast to specific room', () => {
    const socket1 = SocketServerTestHelper.simulateConnection(server, 'client-1');
    const socket2 = SocketServerTestHelper.simulateConnection(server, 'client-2');

    socket1.join('room-a');
    socket2.join('room-b');

    const handler1 = jest.fn();
    const handler2 = jest.fn();

    socket1.on('room-message', handler1);
    socket2.on('room-message', handler2);

    server.to('room-a').emit('room-message', 'Hello Room A!');

    expect(handler1).toHaveBeenCalledWith('Hello Room A!');
    expect(handler2).not.toHaveBeenCalled();
  });

  test('should handle client disconnection', () => {
    const socket = SocketServerTestHelper.simulateConnection(server, 'client-123');
    const disconnectHandler = jest.fn();

    socket.on('disconnect', disconnectHandler);

    socket.disconnect();

    expect(disconnectHandler).toHaveBeenCalledWith('manual disconnect');
    expect(server.engine.clientsCount).toBe(0);
  });
});
