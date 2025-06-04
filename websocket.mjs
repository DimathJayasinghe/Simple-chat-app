import crypto from "crypto";

const WEBSOCKET_MAGIC_STRING_KEY = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const SEVEN_BITS_INTEGER_MARKER = 125;
const SIXTEEN_BITS_INTEGER_MARKER = 126;
const SIXTYFOUR_BITS_INTEGER_MARKER = 127;
const FIRST_BIT = 128;
const MASK_KEY_BYTES_LENGTH = 4;
const OPCODE_TEXT = 0x01;
const MAXIMUM_SIXTEEN_BITS_INTEGER = 2 ** 16;

// Track all connected clients with their associated user IDs
const connectedClients = new Map(); // socket -> userId
const usedUserIds = new Set(); // Keep track of assigned user IDs

// Generate a unique user ID
function generateUniqueUserId() {
  let userId;
  do {
    userId = `User${Math.floor(Math.random() * 10000)}`;
  } while (usedUserIds.has(userId));

  usedUserIds.add(userId);
  return userId;
}

export function setupWebSocket(server) {
  server.on("upgrade", (req, socket, head) => {
    // Prevent connection timeouts and avoid socket closing prematurely
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true);

    try {
      const { "sec-websocket-key": webClientSocketKey } = req.headers;
      if (!webClientSocketKey) {
        socket.destroy();
        return;
      }

      const response = prepareHandshakeResponse(webClientSocketKey);
      socket.write(response);

      // Generate a unique user ID for this client
      const userId = generateUniqueUserId();
      connectedClients.set(socket, userId);

      // Send the client their unique userId right after connection
      const userIdMessage = JSON.stringify({
        type: "userId",
        userId: userId,
      });
      sendMessage(userIdMessage, socket);

      // Log connection with ID
      console.log(
        `New client connected with ID ${userId}, total clients: ${connectedClients.size}`
      );

      socket.on("error", (err) => {
        console.error("Socket error:", err);
        cleanupClient(socket);
      });

      socket.on("close", () => {
        cleanupClient(socket);
      });

      socket.on("readable", () => {
        try {
          onSocketReadable(socket);
        } catch (error) {
          console.error("Error in readable handler:", error);
        }
      });
    } catch (err) {
      console.error("Error during WebSocket upgrade:", err);
      socket.destroy();
    }
  });
}

// Cleanup function for when a client disconnects
function cleanupClient(socket) {
  const userId = connectedClients.get(socket);
  if (userId) {
    console.log(`Client ${userId} disconnected`);
    usedUserIds.delete(userId);  
  }

  connectedClients.delete(socket);
  console.log(`Client disconnected, total clients: ${connectedClients.size}`);
}

function createSocketAccept(id) {
  const hash = crypto.createHash("sha1");
  hash.update(id + WEBSOCKET_MAGIC_STRING_KEY);
  return hash.digest("base64");
}

function prepareHandshakeResponse(id) {
  const acceptKey = createSocketAccept(id);

  return [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    // This empty line MUST be present for the response to be valid
    "",
  ]
    .map((line) => line.concat("\r\n"))
    .join("");
}

function onSocketReadable(socket) {
  // First check if socket is still valid
  if (!socket.readable) return;

  try {
    // Get the first byte (FIN, RSV1-3, and Opcode)
    const firstByte = socket.read(1);
    if (firstByte === null) return; // No more data to read

    const opcode = firstByte[0] & 0x0f;

    // Handle ping/pong control frames (opcode 0x9 for ping, 0xA for pong)
    if (opcode === 0x9) {
      // Received a ping, respond with a pong
      const pong = Buffer.from([0x8a, 0x00]);
      socket.write(pong);
      return;
    } else if (opcode === 0x8) {
      // Connection close frame
      cleanupClient(socket);
      return;
    }

    // Read the second byte (masking and payload length)
    const secondByte = socket.read(1);
    if (secondByte === null) return;

    const [markeAndPayloadLength] = secondByte;

    // Check if we have a masked frame (clients must send masked frames)
    const isMasked = Boolean((markeAndPayloadLength & 0x80) !== 0);
    if (!isMasked) {
      console.error("Client sent an unmasked frame");
      socket.end();
      return;
    }

    // Extract the payload length
    const lengthIndicatorInBits = markeAndPayloadLength & 0x7f;

    let messageLength = 0;

    if (lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
      messageLength = lengthIndicatorInBits;
    } else if (lengthIndicatorInBits === SIXTEEN_BITS_INTEGER_MARKER) {
      // unsigned, Big-endian 16-bit integer [0 - 65k] - 2 ** 16
      const lengthBuffer = socket.read(2);
      if (lengthBuffer === null) return;
      messageLength = lengthBuffer.readUInt16BE(0);
    } else {
      throw new Error("Your message is too long!");
    }

    // Read the mask key
    const maskKey = socket.read(MASK_KEY_BYTES_LENGTH);
    if (maskKey === null) return;

    // Read the encoded message
    const encoded = socket.read(messageLength);
    if (encoded === null) return;

    const decoded = unmask(encoded, maskKey);
    const received = decoded.toString("utf-8");

    try {
      const data = JSON.parse(received);

      // If user is using a random ID from the client, replace it with the server-assigned ID
      if (data.username && data.username.startsWith("User")) {
        const serverAssignedId = connectedClients.get(socket);
        if (serverAssignedId) {
          data.username = serverAssignedId;
        }
      }

      console.log("Message Received!", data);

      // Broadcast the message to all clients
      broadcastMessage(data);
    } catch (jsonError) {
      console.error("Error parsing JSON message:", jsonError);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    // End the socket if there's a critical error
    if (error.message.includes("too long") && socket.writable) {
      socket.end();
    }
  }
}

function unmask(encodedBuffer, maskKey) {
  const decoded = Uint8Array.from(encodedBuffer, (element, index) => {
    const decodedElement = element ^ maskKey[index % 4];
    return decodedElement;
  });

  return Buffer.from(decoded);
}

function broadcastMessage(data) {
  try {
    const jsonData = JSON.stringify(data);

    // Use for...of loop which is more reliable with Maps/Sets
    for (const [client, userId] of connectedClients.entries()) {
      try {
        if (client.writable) {
          sendMessage(jsonData, client);
        } else {
          console.log(`Client socket for ${userId} not writable, cleaning up`);
          cleanupClient(client);
        }
      } catch (err) {
        console.error(`Error sending to client ${userId}:`, err);
        cleanupClient(client);
      }
    }
  } catch (err) {
    console.error("Error broadcasting message:", err);
  }
}

function sendMessage(msg, socket) {
  try {
    const dataFrameBuffer = prepareMessage(msg);
    socket.write(dataFrameBuffer);
  } catch (err) {
    console.error("Error sending message to client:", err);
  }
}

function prepareMessage(message) {
  const msg = Buffer.from(message);
  const messageSize = msg.length;

  let dataFrameBuffer;

  // Text frame, FIN bit set
  const firstByte = 0x81; // 129 in decimal (10000001 in binary)

  if (messageSize <= SEVEN_BITS_INTEGER_MARKER) {
    // For small messages (payload length 0-125 bytes)
    dataFrameBuffer = Buffer.alloc(2 + messageSize);
    dataFrameBuffer[0] = firstByte;
    dataFrameBuffer[1] = messageSize;
    msg.copy(dataFrameBuffer, 2);
  } else if (messageSize <= MAXIMUM_SIXTEEN_BITS_INTEGER) {
    // For medium messages (payload length 126-65535 bytes)
    dataFrameBuffer = Buffer.alloc(4 + messageSize);
    dataFrameBuffer[0] = firstByte;
    dataFrameBuffer[1] = SIXTEEN_BITS_INTEGER_MARKER;
    dataFrameBuffer.writeUInt16BE(messageSize, 2);
    msg.copy(dataFrameBuffer, 4);
  } else {
    throw new Error("message too long buddy :(");
  }

  return dataFrameBuffer;
}

// Global error handlers
["uncaughtException", "unhandledRejection"].forEach((event) =>
  process.on(event, (err) => {
    console.error(`something bad happened: ${event}, msg: ${err.stack || err}`);
  })
);
