import {
  DeliveryService,
  type IDeliveryService
} from "../../../src/message-service/services/DeliveryService";
import { Server } from 'socket.io';
import { SocketServerTestHelper } from "../../mocks/socket-server-test-helpet";
import { MockServer } from "../../mocks/socket.io";
import { MessageService } from "../../../src/message-service/services/MessageService";

jest.mock('socket.io', () => {
  return {
    Server: jest
      .fn()
      .mockImplementation(
        () => new MockServer()
      )
  }
});

describe("Delivery Service test suite", (): void => {
  let io: any;
  let service: IDeliveryService;
  let message_service: MessageService;
  beforeAll((): void => {
    io = new Server();
    message_service = new MessageService();
    service = new DeliveryService(io, message_service);
  });
  afterEach((): void => {
    SocketServerTestHelper
      .clearServer(io);
  });

}); 
