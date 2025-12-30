import { faker } from "@faker-js/faker";

export interface IMockConnection {
  userId: string,
  socketId: string,
  metadata: Object
};

interface IMockMetadata {
  ipAddress: string,
  version: string,
  sessionId: string,
  latchedAt: string,// When they connected};
};

const connectionFactory = (overrides = {}): IMockConnection => {
  const base = {
    userId: faker.string.uuid(),
    socketId: faker.string.uuid(),
    metadata: {},
  };
  return { ...base, ...overrides };
};
export const metadataFactory = (): IMockMetadata => {
  return {
    ipAddress: faker.internet.ipv4(),
    version: faker.system.semver(),
    sessionId: faker.string.uuid(),
    latchedAt: faker.date.recent().toISOString(), // When they connected
  };
};
export default connectionFactory;

