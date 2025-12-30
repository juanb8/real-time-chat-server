import { LocalConnectionService } from "../../../src/message-service/services/ConnectionService";
import connectionFactory, {
  type IMockConnection,
  metadataFactory
} from "../../factories/connection.factory";

describe("ConnectionService test suite", () => {
  let service: LocalConnectionService;
  let userId: string;
  let socketId: string;
  let mockData: IMockConnection;
  beforeEach(async (): Promise<void> => {
    service = new LocalConnectionService();
    mockData = connectionFactory();


    userId = mockData.userId;
    socketId = mockData.socketId;
    await service.addConnection(userId, socketId);
  });
  afterEach(async (): Promise<void> => {
    await service.cleanup();
  });
  it("should create new ConnectionService", () => {
    new LocalConnectionService();
  });
  it("addConnection should add socketId to list of socketIds",
    async (): Promise<void> => {
      const retrievedSocetsIds = await service.getSocketIds(userId);

      expect(retrievedSocetsIds).toEqual(expect.any(Array));
      expect(retrievedSocetsIds.length).toEqual(1);
      expect(retrievedSocetsIds[0]).toEqual(socketId);
    });
  it("addConnection should make user online",
    async (): Promise<void> => {
      const isOnline = await service.isUserOnline(userId);
      expect(isOnline).toBeTruthy();
    });
  it("addConnection should add metadata",
    async (): Promise<void> => {
      const mockData2 = connectionFactory(metadataFactory());
      await service.addConnection(mockData2.userId, mockData2.socketId, mockData2.metadata);
      const retrieveMetadata = await service.getUserMetadata(mockData2.userId);
      expect(retrieveMetadata).toEqual(mockData2.metadata);
    });
  it("addConnection should add online users",
    async (): Promise<void> => {
      // gettting onlineUsers when only a user
      let onlineUsers = await service.getOnlineUsers();
      expect(onlineUsers).toEqual(expect.any(Array));
      expect(onlineUsers.length).toEqual(1);
      expect(onlineUsers[0]).toEqual(userId);

      // adding a new connection
      const mockedConnectionData = connectionFactory();
      await service.addConnection(
        mockedConnectionData.userId,
        mockedConnectionData.socketId);

      onlineUsers = await service.getOnlineUsers();

      expect(onlineUsers.length).toEqual(2);
      expect(onlineUsers).toContain(userId);
      expect(onlineUsers).toContain(mockedConnectionData.userId);

      // removing a connection
      await service.removeConnection(userId, socketId);

      onlineUsers = await service.getOnlineUsers();

      expect(onlineUsers.length).toEqual(1);
      expect(onlineUsers).toContain(mockedConnectionData.userId);

    });
});
