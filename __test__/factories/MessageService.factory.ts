import { type SendMessageData } from "../../src/message-service/services/MessageService/MessageService.interface"
import { faker } from "@faker-js/faker";

const sendDataFactory = (overrides: Partial<SendMessageData> = {}): SendMessageData => {
  const base = {
    senderId: faker.string.uuid(),
    recipientId: faker.string.uuid(),
    content: faker.lorem.text(),
    messageType: 'text',
  } as SendMessageData;
  return { ...base, ...overrides };
};

export { sendDataFactory };

