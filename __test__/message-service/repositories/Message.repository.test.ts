// class  MessageRepository 
// ~~ saveMessage ~~
// ~~ getConversation ~~
// getUnreadMessages
// markAsRead
import mongoose from "mongoose";
import { MessageRepository } from "../../../src/message-service/repositories/MessageRepository";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Message, type IMessage } from "../../../src/message-service/models/Message";
import { faker } from "@faker-js/faker";

describe("MessageRepository test suite", (): void => {
  const repository = new MessageRepository();
  const bare_message_content = {
    senderId: "user_123",
    recipientId: "user_456",
    content: "Hello, this is a test message"
  };

  const bare_message_content_2 = {
    senderId: "user_456",
    recipientId: "user_123",
    content: "Hello, this is, also, a test message"
  };
  let mongo: MongoMemoryServer;
  beforeAll(async (): Promise<void> => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {});
  });
  afterAll(async (): Promise<void> => {
    await mongoose.disconnect();
    await mongo.stop();
  });
  afterEach(async (): Promise<void> => {
    await Message.deleteMany({});
  })

  test("Save message should persist the message in the database",
    async (): Promise<void> => {
      const saved_message = await repository.saveMessage(bare_message_content);
      const retrieved_message = await Message.findOne({});
      expect(retrieved_message?._id).toEqual(saved_message._id);
    });

  test(
    "getConversation should return empty list when there is non conversation",
    async (): Promise<void> => {
      const empty_conversation = await repository.getConversation("1", "2");
      expect(empty_conversation).toEqual([]);
    });

  test(
    "getConversation should return one message when only one message has been sent",
    async (): Promise<void> => {
      const sent_message = await repository.saveMessage(bare_message_content);
      const retrieved_messages = await repository.getConversation(bare_message_content.senderId, bare_message_content.recipientId);

      expect(retrieved_messages.length).toEqual(1);
      expect(retrieved_messages[0]?._id).toEqual(sent_message._id);
    });

  test(
    "getConversation should return multipple messages in a multiple message conversation",
    async (): Promise<void> => {
      const sent_message = await repository.saveMessage(bare_message_content);
      const sent_message_2 = await repository.saveMessage(bare_message_content_2);
      const retrieved_messages = await repository.getConversation(bare_message_content.senderId, bare_message_content.recipientId);

      expect(retrieved_messages.length).toEqual(2);
      expect(retrieved_messages[0]?._id).toEqual(sent_message_2._id);
      expect(retrieved_messages[1]?._id).toEqual(sent_message._id);
    });

  test(
    "getConversation should return a limited quantity of messages when limit has been set",
    async (): Promise<void> => {
      await repository.saveMessage(bare_message_content);
      const sent_message = await repository.saveMessage(bare_message_content_2);
      const retrieved_messages = await repository.getConversation(
        bare_message_content.senderId,
        bare_message_content.recipientId,
        1
      );

      expect(retrieved_messages.length).toEqual(1);
      expect(retrieved_messages[0]?._id).toEqual(sent_message._id);
    });
  test("getConversation should return a currated list when set a date filter",
    async (): Promise<void> => {
      const modernMessage = {
        senderId: "user_123",
        recipientId: "user_456",
        content: "Hey, are we still meeting today?",
        messageType: "text",
        timestamp: new Date('2024-01-15T14:30:00Z'),
      };
      const ancientMessage = {
        senderId: "user_123",
        recipientId: "user_456",
        content: "The stars look different tonight. Meet at Stonehenge?",
        timestamp: new Date('1200-01-01T12:00:00Z'),
      };

      const saved_message = await repository.saveMessage(modernMessage as IMessage);
      await repository.saveMessage(ancientMessage as IMessage);

      const retrievedMessages = await repository.getConversation(
        "user_123",
        "user_456",
        50,
        new Date('2020')
      );

      expect(retrievedMessages.length).toEqual(1);
      expect(retrievedMessages[0]?.timestamp.getFullYear()).toEqual(1200);
    });

  test("getConversation of an empty id should return the empy list",
    async (): Promise<void> => {
      await repository.saveMessage(bare_message_content);
      const retrieved_messages = await repository.getConversation(
        '', ''
      );
      expect(retrieved_messages.length).toEqual(0);
    }
  );


  test("getUnreadMessages should returns all the unread messages", async (): Promise<void> => {
    const saved_message = await repository.saveMessage(bare_message_content);
    let retrieved_messages = await repository.getUnreadMessages(bare_message_content.recipientId);
    expect(retrieved_messages.length).toEqual(1);
    expect(retrieved_messages[0]?._id).toEqual(saved_message._id);
    expect(retrieved_messages[0]?.read).toBe(false);

    await repository.saveMessage({
      senderId: 'user_789',
      recipientId: 'user_456',
      content: 'heyyy call me please'
    });

    expect((await repository.getUnreadMessages('user_456')).length).toEqual(2);

  });
  test("markAsRead should mark as read all the read messages", async (): Promise<void> => {
    await repository.saveMessage({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'content1'
    });

    await repository.saveMessage({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'content2'
    });

    await repository.saveMessage({
      senderId: 'user_789',
      recipientId: 'user_456',
      content: 'content3'
    });

    const unread_messages = await repository.getUnreadMessages('user_456');
    expect(unread_messages.length).toEqual(3);

    const modified_count = await repository.markAsRead(
      unread_messages.map(message => message._id),
      'user_456');

    expect(modified_count).toEqual(3);
    expect((await repository.getUnreadMessages('user_456')).length).toEqual(0);
  });

  async function save_three_messages(): Promise<IMessage[]> {
    const messages: IMessage[] = [];
    messages.push(
      await repository.saveMessage({
        senderId: 'user_123',
        recipientId: 'user_456',
        content: 'content1'
      }));

    messages.push(
      await repository.saveMessage({
        senderId: 'user_123',
        recipientId: 'user_456',
        content: 'content2'
      }));
    messages.push(
      await repository.saveMessage({
        senderId: 'user_789',
        recipientId: 'user_456',
        content: 'content3'
      }));
    return messages;
  }
  test("markAsDeliver should mark as deliver all undelivered messages",
    async (): Promise<void> => {
      const saved_messages = await save_three_messages();
      let delivered_count = await repository.markAsDelivered(
        saved_messages.map(message => message.id));
      expect(delivered_count).toEqual(3);

      const retrievedMessages = await Message.find({
        _id: { $in: saved_messages.map(msg => msg.id) }
      }).lean();
      retrievedMessages.forEach(
        message =>
          expect(message.status).toEqual('delivered')
      );
    });
  test("getMessagesForSync should ", async (): Promise<void> => {
    const saved_message = await repository.saveMessage({
      senderId: 'user_123',
      recipientId: 'user_456',
      content: 'content4'
    });
    let syncedMessages = await repository
      .getMessagesForSync(
        'user_456',
        new Date('2020'));
    expect(syncedMessages.length).toEqual(1);
  });
  test("getMessageById should get message(by id)",
    async (): Promise<void> => {
      const savedMessage = await repository.saveMessage(bare_message_content);
      const retrievedMessage = await repository.getMessageById(savedMessage._id);
      expect(retrievedMessage._id).toEqual(savedMessage._id);
    }
  );
  test("getMessageById should return null when message doesn't exist",
    async (): Promise<void> => {
      await repository.saveMessage(bare_message_content);
      const retrievedMessage = await repository.getMessageById(faker.database.mongodbObjectId());
      expect(retrievedMessage).toEqual(null);
    }
  );

});
