import { faker } from "@faker-js/faker";
import { type IConversation } from "../../src/message-service/models/Conversation"
const conversationFactory = (overrides = {}): IConversation => {
  const base = {
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

  return { ...base, ...overrides } as IConversation;
};
export default conversationFactory;
