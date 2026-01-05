import {
  DeliveryService,
  type IDeliveryService
} from "../../../src/message-service/services/DeliveryService";
import { Server } from 'socket.io';
import { MessageService } from "../../../src/message-service/services/MessageService";

import { faker } from "@faker-js/faker";
import { sendDataFactory } from "../../factories/MessageService.factory";
import type { IMessage } from "../../../src/message-service/models/Message";
import type { promises } from "dns";


const fetchSocketsSpy = jest.fn();
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  in: jest.fn().mockReturnThis(),
  fetchSockets: fetchSocketsSpy

};
jest.mock
  ('socket.io', () => ({
    Server: jest.fn(() => mockIo)
  }));

const messageServiceMock = {
  deliverMessageToRecipient: jest.fn(() =>
    console.log("hello?")

  )
}
jest.mock('../../../src/message-service/services/MessageService',
  () => ({
    MessageService: jest.fn(() => messageServiceMock)
  })
);

describe("Delivery Service test suite", (): void => {
  let io: any;
  let service: IDeliveryService;
  let message_service: MessageService;
  let message: IMessage;
  let message_data: any;
  let socketId: string;

  beforeAll(async (): Promise<void> => {
    message_data = {
      ...sendDataFactory(),
      _id: faker.database.mongodbObjectId(),
    };
    message = {
      ...message_data,
      toObject: jest
        .fn()
        .mockReturnValue(message_data)
    } as IMessage;
    socketId = faker.string.uuid();
    message_service = new MessageService();
    io = new Server();
    service = new DeliveryService(io, message_service);
  });
  it("should correctly deliver to recipient when there are sockets availables",
    async (): Promise<void> => {
      fetchSocketsSpy.mockReturnValueOnce([socketId]);
      const resp = await service.deliverToRecipient(message, [socketId]);
      expect(io.to).toHaveBeenCalledWith(socketId);
      expect(message.toObject).toHaveBeenCalled();
      expect(io.emit)
        .toHaveBeenCalledWith(
          'private-message',
          { ...message_data, delivered: true }
        );
      expect(resp).toBeTruthy();
    }
  );
  it("deliverToRecipient should be false when there is no sockets",
    async (): Promise<void> => {
      const resp = await service.deliverToRecipient(message, []);
      expect(resp).not.toBeTruthy();
    }
  );
  it("should raise an error when ",
    async (): Promise<void> => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => { });
      const resp = await service.deliverToRecipient(message, [socketId]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error delivering message:'),
        expect.any(Error)
      );
      expect(resp).not.toBeTruthy();
    }
  );
  it("should notify sender of delivery",
    async (): Promise<void> => {
      fetchSocketsSpy
        .mockReturnValueOnce(
          [socketId]
        );
      await service.notifySenderOfDelivery(message);
      expect(io.to).toHaveBeenCalledWith(socketId);
      expect(io.emit).toHaveBeenCalledWith(
        'message-delivered',
        expect.any(Object)
      );
    }
  );
  it("should notify sender of read",
    async (): Promise<void> => {
      const messageId = faker
        .database
        .mongodbObjectId();
      const readerId = faker
        .string
        .uuid();
      await service
        .notifySenderOfRead(
          messageId,
          readerId
        );
      fetchSocketsSpy
        .mockReturnValueOnce(
          [socketId]
        );
      expect(io.to)
        .toHaveBeenCalledWith(`user-${readerId}`);
    }
  );

  it("should broadcastToRoom ",
    async (): Promise<void> => {
      const room = faker.string.uuid();
      const event = faker.lorem.words();
      const data = {
        _id: faker.string.uuid(),
      };
      await service.broadcastToRoom(room, event, data);
      expect(io.to).toHaveBeenCalledWith(room);

    }
  );
}); 
