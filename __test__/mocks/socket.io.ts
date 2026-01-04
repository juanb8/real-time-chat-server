// __mocks__/socket.io.ts

class MockServer {
  private sockets = new Map<string, MockSocket>();
  private eventHandlers = new Map<string, Function[]>();

  public engine = {
    clientsCount: 0
  };

  constructor() {
    console.log('Mock Socket.io Server created');
  }

  // Event handling
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: Function) {
    if (this.eventHandlers.has(event)) {
      if (handler) {
        const handlers = this.eventHandlers.get(event)!;
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      } else {
        this.eventHandlers.delete(event);
      }
    }
    return this;
  }

  once(event: string, handler: Function) {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
    return this;
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    console.log(`Server emitting: ${event}`, args);
    // Broadcast to all sockets
    this.sockets.forEach(socket => {
      socket._triggerEvent(event, ...args);
    });
    return this;
  }

  // Socket management
  to(room: string) {
    return {
      emit: (event: string, ...args: any[]) => {
        console.log(`Server emitting to room ${room}: ${event}`, args);
        // Find sockets in room and emit
        this.sockets.forEach(socket => {
          if (socket.rooms.has(room)) {
            socket._triggerEvent(event, ...args);
          }
        });
      }
    };
  }

  in(room: string) {
    return this.to(room);
  }

  // Create a mock socket and add it to the server
  _createMockSocket(id: string = `mock-socket-${Date.now()}`): MockSocket {
    const socket = new MockSocket(id, this);
    this.sockets.set(id, socket);
    this.engine.clientsCount = this.sockets.size;

    // Trigger connection event
    this._triggerEvent('connection', socket);

    return socket;
  }

  // Helper to trigger server events
  _triggerEvent(event: string, ...args: any[]) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach(handler => handler(...args));
    }
  }

  // Get all connected sockets
  _getSockets() {
    return Array.from(this.sockets.values());
  }

  // Disconnect a socket
  _disconnectSocket(id: string) {
    const socket = this.sockets.get(id);
    if (socket) {
      socket._triggerEvent('disconnect', 'manual disconnect');
      this.sockets.delete(id);
      this.engine.clientsCount = this.sockets.size;
    }
  }

  // Clear all sockets (for testing cleanup)
  _clearAllSockets() {
    this.sockets.clear();
    this.engine.clientsCount = 0;
  }

  // Socket.io Server methods
  //  sockets = {
  //    emit: (event: string, ...args: any[]) => this.emit(event, ...args)
  //  };
  //
  // Additional properties
  adapter = {
    rooms: new Map(),
    sids: new Map()
  };
}

class MockSocket {
  public id: string;
  public connected = true;
  public disconnected = false;
  public rooms = new Set<string>();
  private eventHandlers = new Map<string, Function[]>();
  private server: MockServer;

  constructor(id: string, server: MockServer) {
    this.id = id;
    this.server = server;
    this.join('default-room');
  }

  // Client event handling
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: Function) {
    if (this.eventHandlers.has(event)) {
      if (handler) {
        const handlers = this.eventHandlers.get(event)!;
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      } else {
        this.eventHandlers.delete(event);
      }
    }
    return this;
  }

  once(event: string, handler: Function) {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
    return this;
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
    return this;
  }

  // Emit to server
  emit(event: string, ...args: any[]) {
    console.log(`Socket ${this.id} emitting: ${event}`, args);
    // Simulate server receiving the event
    this.server._triggerEvent(event, this, ...args);
    return this;
  }

  // Room management
  join(room: string) {
    this.rooms.add(room);
    console.log(`Socket ${this.id} joined room: ${room}`);
    return this;
  }

  leave(room: string) {
    this.rooms.delete(room);
    console.log(`Socket ${this.id} left room: ${room}`);
    return this;
  }

  to(room: string) {
    return {
      emit: (event: string, ...args: any[]) => {
        console.log(`Socket ${this.id} emitting to room ${room}: ${event}`, args);
        // In real implementation, this would only go to sockets in that room
        // For mock, we just emit to server
        this.server.to(room).emit(event, ...args);
      }
    };
  }

  // Disconnect
  disconnect() {
    this.connected = false;
    this.disconnected = true;
    this.server._disconnectSocket(this.id);
    return this;
  }

  // Helper to trigger events on this socket (simulating server sending to client)
  _triggerEvent(event: string, ...args: any[]) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach(handler => handler(...args));
    }
  }

  // Helper to get event listeners
  _getEventListeners(event: string) {
    return this.eventHandlers.get(event) || [];
  }
}

// Mock Server factory
const mockServer = () => {
  return new MockServer();
};

// Mock Socket.io Server object
const mockIo = {
  Server: jest.fn().mockImplementation(() => new MockServer()),
  // For backward compatibility
  listen: jest.fn().mockImplementation(() => new MockServer()),
  // If you need socket.io-client mock as well
  // connect: jest.fn()
};

export default mockIo;
export { MockServer, MockSocket, mockServer };
