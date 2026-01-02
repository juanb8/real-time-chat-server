import mongoose from "mongoose";
import { Message, type IMessage } from "../../../src/message-service/models/Message";
import { MongoMemoryServer } from "mongodb-memory-server";

import { MessageService } from "../../../src/message-service/services/MessageService";
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
    const resp = await service.sendMessage(data);
    const retrievedMsgs = await repository
      .getConversation(
        data.senderId,
        data.recipientId,
        1
      );
    return {
      resp,
      message: retrievedMsgs[0]
    };
  }

  async function getFirstMessage(
    senderId: string,
    recipientId: string): Promise<IMessage> {
    const retrievedMsgs = await repository
      .getConversation(
        senderId,
        recipientId,
        1
      );
    return retrievedMsgs[0] as IMessage;
  };

  it("should save the message when send mesagge",
    async (): Promise<void> => {
      const { message: retrievedMsg } = await sendMessageAndRetrieve(sendData);
      expect(retrievedMsg?.senderId).toEqual(sendData.senderId);
      expect(retrievedMsg?.recipientId).toEqual(sendData.recipientId);
      expect(retrievedMsg?.content).toEqual(sendData.content);
      expect(retrievedMsg?.status).toEqual('sent');

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
      expect(resp.error).not.toBeDefined();
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
      expect(resp.delivered).not.toBeTruthy();
      expect(resp.message._id).toEqual(message._id);
      expect(resp.error).not.toBeDefined();
    }
  );
  it("should fail when  sending bad data",
    async (): Promise<void> => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => { });

      const resp = await service.sendMessage({} as SendMessageData);
      expect(resp.success).not.toBeTruthy();
      expect(resp.delivered).not.toBeTruthy();
      expect(resp.message).toBeNull();
      expect(resp.error).toBeDefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error sending message:",
        expect.any(Error)
      );
      errorSpy.mockRestore();
    }
  );

  it("should mark the message as delivered when deliverMessageToRecipient",
    async (): Promise<void> => {
      const { resp: _resp, message } = await sendMessageAndRetrieve(sendData);
      expect(message.delivered).not.toBeTruthy();
      expect(message.deliveredAt).not.toBeDefined();

      await service.deliverMessageToRecipient(
        message,
        [sendData.recipientId]
      );
      let sentMsg = await getFirstMessage(
        sendData.senderId,
        sendData.recipientId
      );
      expect(message.delivered).toBeTruthy();
      expect(sentMsg._id.toString()).toEqual(message._id.toString());
      expect(sentMsg.delivered).toBeTruthy();
      expect(sentMsg.status).toEqual('delivered');
      expect(sentMsg.deliveredAt).toBeDefined();

    }
  );
  async function expectMarkMessageAsReadToMarkAndHaveUnreadCount(
    messagesIds: string[],
    readerId: string,
    expectedMarkCount: number,
    expectedUnreadCount: number
  ): Promise<void> {
    const { marked, unreadCount } = await service
      .markMessagesAsRead(
        messagesIds,
        readerId
      );

    expect(marked).toEqual(expectedMarkCount);
    expect(unreadCount).toEqual(expectedUnreadCount);
  }

  it("should not  mark the message as read when the message doesn't exist",
    async (): Promise<void> => {
      await expectMarkMessageAsReadToMarkAndHaveUnreadCount(
        [faker.database.mongodbObjectId()],
        faker.string.uuid(),
        0,
        0
      );
    }
  );
  it("should mark as read a sent message",
    async (): Promise<void> => {
      const { resp: _resp, message } = await sendMessageAndRetrieve(sendData);
      expect(message.status).toEqual("sent");

      await expectMarkMessageAsReadToMarkAndHaveUnreadCount(
        [message._id],
        message.recipientId,
        1,
        0
      );

      const markedMessage = await repository.getMessageById(message._id);
      expect(markedMessage?.status).toEqual('read');

      const convos = await repository.getConversations(message.recipientId);
      expect(convos.length).toEqual(1);
      expect(convos[0]?.unreadCount).toEqual(0);
    }
  );

  it("should mark as read a sent message and as unread an unread message",
    async (): Promise<void> => {
      const { resp: _resp, message: sent_msg_1 } = await sendMessageAndRetrieve(sendData);
      const { resp: _resp1, message: sent_msg_2 } = await sendMessageAndRetrieve(
        sendDataFactory({ recipientId: sent_msg_1.recipientId })
      );
      expect(sent_msg_1.status).toEqual("sent");
      expect(sent_msg_2.status).toEqual("sent");

      expect(sent_msg_1.senderId).not.toEqual(sent_msg_2.senderId);

      await expectMarkMessageAsReadToMarkAndHaveUnreadCount(
        [sent_msg_1._id],
        sent_msg_1.recipientId,
        1,
        1
      );

      const notMarkedMessage = await repository.getMessageById(sent_msg_2._id);
      expect(notMarkedMessage?.status).not.toEqual('read');

      const convos = await repository.getConversations(sent_msg_1.recipientId);
      expect(convos.length).toEqual(2);
      expect(convos[0]?.unreadCount).toEqual(1);
      expect(convos[1]?.unreadCount).toEqual(0);
    }
  );
  it("should getMessagesForSync",
    async (): Promise<void> => {

    }
  );

});
