# Sprint 1

## Sprint Goal

> A fully functional message service server

## Sprint Back-Log

1.1. Test delivery service

## To Do

- [x] Put in the Sprint Back-Log all the deepseek files: 10min
- [] 1.1. Test delivery service
  - [x] Mock socket.io
  - [x] make decision between refactor or mock message-service
  - ~~[] refactor redis and in-memory-mongo-for testing~~
  - [x] mock message-service
  - [x] Decided to not use the socket.io implementation
  - [x] DeliveryService.deliverToRecipient testing
  - [x] notifySenderOfDelivery: 10 min
  - [x] notifySenderOfRead: 25 min
  - [] broadCastToRoom
  - [] getSocketIds
  - [] notifyUserOnline
  - []  notifyUserOffline
- [] 1.2 MessageHandler
- [] 1.3 PresenceHandler
- [] 1.4 Main Message Service setup (index.ts)
- [] 1.5 Integrating with main server
- [] 1.6 Rest API routes

## working

- Test delivery service: 4 pomodoro
- broadCastToRoom

> t = 50 min
>
## Review

I did 1 50' and get stuck with mocking socket.io
didn't advanced nothing.

I will try to resolve this in this pomodoro

What are the unique goals:
mock socket.io correctly

### spend 2hs mocking and understanding socket.io

later i realize it was useless
don't mock libraries!

### For  notifySenderOfRead the grandma

started to talk

### jest.fn() mocking

learning how to mock, this imporant and
i keep forgeting.

### notifySenderOfDelivery testing

let's think a little about what to test and how.
what to test: io.to(socketId).emit('message-delivered', expect(any(Object)))
will have to mock sockets id again
and test about the sender

steps:

1. mock message
2. mock fetchSockets
3. test fetchSocket?
4. io for socket id
5. test emit for message-delivered

### notifySenderOfRead

This function says in real implementation,
fetch from database, but why?
If i already have the messageId
maybe to confirm it exists or the date

### broadCastToRoom
gets: 
  - room:string   -> faker
  - event:string -> faker 
  - data: any?
  - excludeSocketId?

This is used for dynamic implementation
so that the client render's it's own message

the only thing i must to test is io.to and .emit events

