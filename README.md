# 🚢 Maritime Real-Time Message Server

High-performance WebSocket messaging service for maritime crew communication. Part of a modular maritime app ecosystem, handling real-time messaging between ship crew members with delivery receipts, online presence, and offline queuing.

## 🛠 Tech Stack

```typescript
// Core Technologies
- TypeScript        // Type-safe server implementation
- Socket.io         // Real-time bidirectional communication
- Redis             // Connection tracking & pub/sub for scaling
- MongoDB           // Persistent message storage
- Node.js/Express   // REST API endpoints

// Architecture Context
- 🔐 Auth Server    // JWT authentication (separate repo)
- 🌐 Express API    // Main REST API for ships/data (separate repo)
- 📱 React Native   // Mobile client application
