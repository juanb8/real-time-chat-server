import mongoose from "mongoose";
import { Message } from "../../../src/message-service/models/Message";
import { MongoMemoryServer } from "mongodb-memory-server";

import { MessageService } from "../../../src/message-service/services/MessageService/MessageService";
import {
  RedisConnectionService,
  type IConnectionService
} from "../../../src/message-service/services/ConnectionService";
import { MessageRepository } from "../../../src/message-service/repositories/MessageRepository";
import { sendDataFactory } from "../../factories/MessageService.factory"
import { type SendMessageData } from "../../../src/message-service/services/MessageService/MessageService.interface"

import { faker } from "@faker-js/faker";

jest.mock('ioredis', () => require('ioredis-mock'));

describe("MessageService testSuite", (): void => {
  let mongo: MongoMemoryServer;
  let repository: MessageRepository;
  let connectionService: IConnectionService;
  let service: MessageService;
  let sendData: SendMessageData;

  beforeAll(async (): Promise<void> => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    connectionService = new RedisConnectionService('redis://localhost:6379');
    repository = new MessageRepository();

    service = new MessageService(repository, connectionService);
  });

  beforeEach(async (): Promise<void> => {
    sendData = sendDataFactory();
  });

  afterAll(async (): Promise<void> => {
    await mongoose.disconnect();
    await mongo.stop();
  });
  afterEach(async (): Promise<void> => {
    await Message.deleteMany({});
    await connectionService.cleanup();
  });
  async function sendMessageAndRetrieve(data: SendMessageData)
    : Promise<any> {
    const resp = await service.sendMessage(sendData);
    const retrievedMsgs = await repository
      .getConversation(
        sendData.senderId,
        sendData.recipientId,
        1
      );
    return {
      resp,
      message: retrievedMsgs[0]
    };
  }

  it("should save the message when send mesagge",
    async (): Promise<void> => {
      const { message: retrievedMsg } = await sendMessageAndRetrieve(sendData);
      expect(retrievedMsg?.senderId).toEqual(sendData.senderId);
      expect(retrievedMsg?.recipientId).toEqual(sendData.recipientId);
      expect(retrievedMsg?.content).toEqual(sendData.content);

      const retrievedConvos = await repository
        .getConversations(
          sendData.senderId,
          1
        );
      expect(retrievedConvos.length).toEqual(1);
      const retConv = retrievedConvos[0];
      expect(retConv.participants).toContain(sendData.recipientId);
      expect(retConv.lastMessage).toEqual(sendData.content);
      expect(retConv.lastMessageId).toEqual(retrievedMsg?._id.toString());

    });
  it("should return delivered false when user not online",
    async () => {
      const { resp, message } = await sendMessageAndRetrieve(sendData);
      expect(resp.success).toBeTruthy();
      expect(resp.delivered).not.toBeTruthy();
      expect(resp.message._id).toEqual(message._id);
    }
  );
  it("should return delivered true when user online",
    async () => {
      const socketId = faker.string.uuid.toString();
      connectionService.addConnection(
        sendData.recipientId,
        socketId
      );
      const { resp, message } = await sendMessageAndRetrieve(sendData);

      expect(resp.success).toBeTruthy();
      expect(resp.delivered).toBeTruthy();
      expect(resp.message._id).toEqual(message._id);
      connectionService.removeConnection(
        sendData.recipientId,
        socketId
      );
    }
  );
});
