# Supabase Realtime Specification

## Overview

This document describes the validated pattern for using Supabase Realtime channels for chat/messaging features in Mobile Core.

## Core Concepts

**Channel**: A named realtime connection for broadcasting and receiving events  
**Broadcast**: Server-relayed messages (no database persistence)  
**Event**: Named message type (e.g., "message", "typing", "user-joined")  
**Payload**: Data attached to each event

## Usage Pattern

### 1. Channel Creation

```typescript
import { supabase } from "src/lib/supabase";

const roomId = "chat-room-123";
const channel = supabase.channel(roomId);
```

**Rules:**

- Channel names must be unique per room/conversation
- Use descriptive names: `chat-${roomId}`, `dm-${userId1}-${userId2}`
- Channels are ephemeral (exist while subscribed)

### 2. Event Subscription

```typescript
channel
  .on("broadcast", { event: "message" }, (payload) => {
    const { message, userId, timestamp } = payload.payload;
    // Handle incoming message
  })
  .on("broadcast", { event: "typing" }, (payload) => {
    const { userId, isTyping } = payload.payload;
    // Handle typing indicator
  })
  .subscribe();
```

**Rules:**

- Call `.on()` before `.subscribe()`
- Chain multiple `.on()` calls for different events
- Always call `.subscribe()` last
- Handlers receive `{ payload: YourData }` structure

### 3. Broadcasting Events

```typescript
await channel.send({
  type: "broadcast",
  event: "message",
  payload: {
    text: "Hello World",
    userId: currentUser.id,
    timestamp: Date.now(),
  },
});
```

**Rules:**

- Call `channel.send()` after subscription
- Always include `type: 'broadcast'`
- Match `event` name to subscribed events
- Keep payloads small (< 10KB recommended)
- Broadcasts are fire-and-forget (no delivery guarantee)

### 4. Cleanup

```typescript
useEffect(() => {
  const channel = supabase.channel("chat-123");

  channel.on("broadcast", { event: "message" }, handleMessage).subscribe();

  // Cleanup on unmount
  return () => {
    channel.unsubscribe();
  };
}, []);
```

**Rules:**

- Always unsubscribe on component unmount
- Use React cleanup functions (`return () => { ... }`)
- Call `channel.unsubscribe()` to release resources
- Unsubscribe before creating new channel with same name

## Common Event Types

### Message Events

```typescript
{
  type: 'broadcast',
  event: 'message',
  payload: {
    id: string;          // Message ID
    text: string;        // Message content
    userId: string;      // Sender ID
    timestamp: number;   // Unix timestamp
    roomId: string;      // Room/conversation ID
  }
}
```

### Typing Indicators

```typescript
{
  type: 'broadcast',
  event: 'typing',
  payload: {
    userId: string;      // User who is typing
    isTyping: boolean;   // true = typing, false = stopped
    roomId: string;
  }
}
```

### Presence Events

```typescript
{
  type: 'broadcast',
  event: 'user-joined',
  payload: {
    userId: string;
    username: string;
    timestamp: number;
  }
}

{
  type: 'broadcast',
  event: 'user-left',
  payload: {
    userId: string;
    timestamp: number;
  }
}
```

## React Hook Pattern

```typescript
import { useEffect, useState } from "react";
import { supabase } from "src/lib/supabase";

interface Message {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
}

export function useChatRoom(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`chat-${roomId}`);

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const sendMessage = async (text: string, userId: string) => {
    const channel = supabase.channel(`chat-${roomId}`);
    await channel.send({
      type: "broadcast",
      event: "message",
      payload: {
        id: crypto.randomUUID(),
        text,
        userId,
        timestamp: Date.now(),
      },
    });
  };

  return { messages, sendMessage };
}
```

## Error Handling

```typescript
const channel = supabase.channel("chat-123");

try {
  const result = await channel.subscribe();

  if (result.status === "error") {
    console.error("Subscription failed");
  }
} catch (error) {
  console.error("Channel error:", error);
}
```

**Best Practices:**

- Check subscription status
- Wrap send calls in try/catch
- Log errors for debugging
- Provide user feedback on connection issues

## Performance Guidelines

**Channel Limits:**

- Supabase: 100 channels per client (default)
- Keep 1 channel per room/conversation
- Reuse channels when possible

**Message Size:**

- Keep payloads < 10KB
- Use database for large data (files, images)
- Broadcast only IDs/references for large content

**Rate Limiting:**

- ~100 messages per second per channel
- Throttle typing indicators (e.g., max 1/second)
- Batch presence updates when possible

## Security

**Row Level Security (RLS):**

- Broadcasts bypass RLS (no database interaction)
- Use application-level permission checks
- Validate userId on client before displaying

**Authentication:**

```typescript
const channel = supabase.channel("chat-123", {
  config: {
    broadcast: {
      // Optional: require authentication
      self: true, // Receive own broadcasts
      ack: false, // No acknowledgments needed
    },
  },
});
```

## Testing

See [realtime.test.ts](./realtime.test.ts) for:

- Channel creation tests
- Broadcast event tests
- Subscription/unsubscription tests
- Error handling tests
- Real-world usage patterns

## Validation Checklist

✅ Channel created with unique room ID  
✅ Events subscribed before calling `.subscribe()`  
✅ Broadcast events match subscribed event names  
✅ Cleanup function unsubscribes on unmount  
✅ Error handling for subscription failures  
✅ Message payloads < 10KB  
✅ Typing indicators throttled (max 1/sec)  
✅ No sensitive data in broadcast payloads

## References

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Broadcast Guide](https://supabase.com/docs/guides/realtime/broadcast)
- [React Patterns](https://supabase.com/docs/guides/realtime/quickstart)
