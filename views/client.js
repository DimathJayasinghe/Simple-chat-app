// Get the current hostname/IP from the browser URL
const host = window.location.hostname;
const port = window.location.port || (window.location.protocol === 'https:' ? 443 : 1337);
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${wsProtocol}//${host}:${port}`);


let username = `User${Math.round(Math.random() * 100)}`; // Temporary name until server assigns one

// Message tracking variables
let unreadMessageCount = 0;
let popUpShouldAppear = false;

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

    const wasAtBottom =
      messagesArea.scrollHeight - messagesArea.clientHeight <=
      messagesArea.scrollTop + 5;

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

    // Handle scrolling and popup logic after appending message
    if (wasAtBottom || data.username === username) {
      // Auto-scroll to bottom if we were already at the bottom or it's our own message
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }, 0);
    } else if (popUpShouldAppear) {
      // Only show popup if user has scrolled up AND popUpShouldAppear flag is true
      unreadMessageCount++;
      const popup = document.getElementById("new-message-popup");
      popup.textContent = `⬇️ ${unreadMessageCount} new message${
        unreadMessageCount > 1 ? "s" : ""
      }`;
      popup.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
};

// popup click handler
document.getElementById("new-message-popup").addEventListener("click", () => {
  const messagesArea = document.getElementById("messages-area");
  messagesArea.scrollTop = messagesArea.scrollHeight; // Scroll to bottom
  document.getElementById("new-message-popup").classList.add("hidden"); // Hide popup
  unreadMessageCount = 0; // Reset counter
});

// Scroll direction detection
const messagesArea = document.getElementById("messages-area");
let lastScrollTop = 0;

messagesArea.addEventListener("scroll", () => {
  const currentScroll = messagesArea.scrollTop; // Fixed: was using scrollBox instead of messagesArea

  if (currentScroll < lastScrollTop) {
    // Scrolled up - enable popup for future messages
    popUpShouldAppear = true;
  } else if (currentScroll > lastScrollTop) {
    // Scrolled down
    const isAtBottom =
      messagesArea.scrollHeight - messagesArea.clientHeight <=
      messagesArea.scrollTop + 30;

    if (isAtBottom) {
      // If scrolled to bottom, hide popup and disable it for future messages
      document.getElementById("new-message-popup").classList.add("hidden");
      popUpShouldAppear = false;
      unreadMessageCount = 0; // Reset counter when scrolled to bottom
    }
  }

  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});

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
