// Get the current hostname/IP from the browser URL
const host = window.location.hostname;
const port = 1337;
const socket = new WebSocket(`ws://${host}:${port}`);

let username = `User${Math.round(Math.random() * 100)}`; // Temporary name until server assigns one

// Connection status indicator
let isConnected = false;

function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const messageText = messageInput.value.trim();

  if (messageText && isConnected) {
    try {
      const data = JSON.stringify({
        username: username,
        message: messageText,
      });

      socket.send(data);
      messageInput.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
      addSystemMessage("Failed to send message. Please try again.");
    }
  }
}

function addSystemMessage(text) {
  const messagesArea = document.getElementById("messages-area");
  const systemMessage = document.createElement("div");
  systemMessage.classList.add("system-message");
  systemMessage.textContent = text;
  messagesArea.appendChild(systemMessage);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

socket.onopen = (event) => {
  console.log("WebSocket is Connected!");
  isConnected = true;
  addSystemMessage(
    "Connected to chat server! Waiting for user ID assignment..."
  );
};

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    // Handle userId assignment from server
    if (data.type === "userId") {
      username = data.userId;
      addSystemMessage(`You are now known as: ${username}`);

      // Set up event listeners after we have our user ID
      document
        .getElementById("send-button")
        .addEventListener("click", sendMessage);
      document
        .getElementById("message-input")
        .addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        });

      return;
    }

    if (!data || !data.username || !data.message) {
      throw new Error("Invalid message format");
    }

    const messagesArea = document.getElementById("messages-area");

    const messageBubble = document.createElement("div");
    const messageAuthor = document.createElement("p");
    const messageText = document.createElement("p");

    if (data.username === username) {
      messageBubble.classList.add("own-message");
      messageAuthor.textContent = "Me";
    } else {
      messageAuthor.textContent = data.username || "Anonymous";
    }
    messageText.textContent = data.message;

    messageAuthor.classList.add("message-author");
    messageText.classList.add("message-text");
    messageBubble.classList.add("message-bubble");

    messageBubble.appendChild(messageAuthor);
    messageBubble.appendChild(messageText);
    messagesArea.appendChild(messageBubble);

    messagesArea.scrollTop = messagesArea.scrollHeight;
  } catch (error) {
    console.error("Error processing message:", error);
  }
};

socket.onerror = (error) => {
  console.log("WebSocket error", error);
  isConnected = false;
  addSystemMessage("Error connecting to chat server");
};

socket.onclose = (event) => {
  console.log("Disconnected from the WebSocket server");
  isConnected = false;
  addSystemMessage("Disconnected from chat server");
};
