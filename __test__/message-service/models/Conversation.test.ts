
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose"
import { Conversation } from "../../../src/message-service/models/Conversation";
import { faker } from '@faker-js/faker';

describe("Conversation model test suite", (): void => {
  let mongo: MongoMemoryServer;
  beforeAll(async (): Promise<void> => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {});
  });
  afterAll(async (): Promise<void> => {
    await mongoose.disconnect();
    await mongo.stop()
  });
  afterEach(async (): Promise<void> => {
    await Conversation.deleteMany({});
  });
  test("Empty conversation should fail", async (): Promise<void> => {
    expect((new Conversation()).save())
      .rejects
      .toThrow(mongoose.Error.ValidationError);
  });
  test("Bare conversation should save", async (): Promise<void> => {

    const convoData = {
      participants: [faker.string.uuid(), faker.string.uuid()],
      lastMessage: faker.lorem.sentence(),
      lastMessageId: faker.string.uuid(),
      lastSenderId: faker.string.uuid(),
      lastMessageTime: new Date(),
      unreadCount: 0,
      muted: false,
      archived: false,
      metadata: {},
    };
    console.log(convoData);

    const conversationToSave = new Conversation(convoData);


    const conversationSaved = await conversationToSave.save();
    const retrievedConvo = await Conversation.findOne({});
    expect(conversationToSave._id).toEqual(retrievedConvo?._id);
  });

})


