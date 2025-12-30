import { MongoMemoryServer } from "mongodb-memory-server";
import { Message } from "../../../src/message-service/models/Message"
import mongoose from "mongoose"

describe("Message model test suite", (): void => {
  const bare_message_content = {
    senderId: "user_123",
    recipientId: "user_456",
    content: "Hello, this is a test message"
  };
  let mongo: MongoMemoryServer;
  beforeAll(async (): Promise<void> => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {});
  });
  afterAll(async (): Promise<void> => {
    await mongoose.disconnect();
    await mongo.stop()
  })
  afterEach(async (): Promise<void> => {
    await Message.deleteMany({});
  })

  test("Saving a new empty message, should fail",
    async (): Promise<void> => {
      const message = new Message();
      await expect(message.save())
        .rejects
        .toThrow(mongoose.Error.ValidationError);
    })
  test("A valid message should saved correctly", async (): Promise<void> => {
    const message = new Message(bare_message_content);
    const saved_message = await message.save();

    const retrieved_message = await Message.findOne({});

    if (retrieved_message === null)
      throw new Error();
    else {
      expect(retrieved_message.senderId).toEqual(bare_message_content.senderId);
      expect(retrieved_message.recipientId).toEqual(bare_message_content.recipientId);
      expect(retrieved_message.content).toEqual(bare_message_content.content);
      expect(retrieved_message.timestamp).toBeDefined();
      expect(retrieved_message.timestamp).toEqual(saved_message.timestamp);
      expect(retrieved_message.delivered).toEqual(false);
      expect(retrieved_message.messageType).toEqual('text');
      expect(retrieved_message.readAt).not.toBeDefined();
      expect(retrieved_message.deliveredAt).not.toBeDefined();
      expect(retrieved_message.status).toEqual('sent');
    }
  })
  test("A valid full message should be saved correctly",
    async (): Promise<void> => {
      const completeMessageData = {
        senderId: "sender_789",
        recipientId: "recipient_123",
        content: "Hello! This is a complete test message with all fields populated.",
        messageType: "text",
        timestamp: new Date('2024-01-15T10:30:00Z'),
        read: true,
        readAt: new Date('2024-01-15T10:35:00Z'),
        delivered: true,
        deliveredAt: new Date('2024-01-15T10:32:00Z'),
        status: "read",
        tempId: "temp_abc123",
        metadata: {
          device: "iPhone 13",
          appVersion: "2.5.1",
          attachments: ["image1.jpg"]
        }
      };

      // 2. Save to database
      const messageToSave = new Message(completeMessageData);
      const savedMessage = await messageToSave.save();

      // 3. Retrieve from database
      const retrievedMessage = await Message.findOne({ _id: savedMessage._id });

      // 4. Test equality
      expect(retrievedMessage).toBeDefined();
      expect(retrievedMessage).not.toBeNull();

      if (!retrievedMessage) {
        fail();
      }
      else {
        // Test all fields match
        expect(retrievedMessage.senderId).toBe(completeMessageData.senderId);
        expect(retrievedMessage.recipientId).toBe(completeMessageData.recipientId);
        expect(retrievedMessage.content).toBe(completeMessageData.content);
        expect(retrievedMessage.messageType).toBe(completeMessageData.messageType);

        // For dates, compare timestamps or string representations
        expect(retrievedMessage.timestamp.toISOString())
          .toBe(completeMessageData.timestamp.toISOString());
        expect(retrievedMessage.readAt?.toISOString())
          .toBe(completeMessageData.readAt.toISOString());
        expect(retrievedMessage.deliveredAt?.toISOString())
          .toBe(completeMessageData.deliveredAt.toISOString());

        expect(retrievedMessage.read).toBe(completeMessageData.read);
        expect(retrievedMessage.delivered).toBe(completeMessageData.delivered);
        expect(retrievedMessage.status).toBe(completeMessageData.status);
        expect(retrievedMessage.tempId).toBe(completeMessageData.tempId);

        // Test metadata object
        expect(retrievedMessage.metadata).toEqual(completeMessageData.metadata);

        // 5. Verify MongoDB added fields
        expect(retrievedMessage._id).toBeDefined();
        expect(retrievedMessage.__v).toBeDefined(); // Version key

        // 6. Verify ID matching (optional)
        expect(savedMessage._id.toString()).toBe(retrievedMessage._id.toString());
      }
    });
})


