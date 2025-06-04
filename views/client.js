// Get the current hostname/IP from the browser URL
const host = window.location.hostname;
const port =
  window.location.port || (window.location.protocol === "https:" ? 443 : 1337);
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${wsProtocol}//${host}:${port}`);

let username = ""; // Will be set after modal
let myUserId = null; // Store your unique userId

// Message tracking variables
let unreadMessageCount = 0;
let popUpShouldAppear = false;

// Connection status indicator
let isConnected = false;

function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const messageText = messageInput.value.trim();

  if (messageText && isConnected && myUserId) {
    try {
      const data = JSON.stringify({
        userId: myUserId, // Send your userId
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
  // addSystemMessage(
  //   "Connected to chat server! Waiting for user ID assignment..."
  // );
};

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    // Handle userId assignment from server
    if (data.type === "userId") {
      myUserId = data.userId; // Store your userId!
      // addSystemMessage(`You are now known as: ${myUserId}`);
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

    if (!data || !data.userId || !data.message) {
      throw new Error("Invalid message format");
    }

    const messagesArea = document.getElementById("messages-area");
    const wasAtBottom =
      messagesArea.scrollHeight - messagesArea.clientHeight <=
      messagesArea.scrollTop + 5;

    const messageBubble = document.createElement("div");
    const messageAuthor = document.createElement("p");
    const messageText = document.createElement("p");

    // Use userId for "own message" check
    if (data.userId === myUserId) {
      messageBubble.classList.add("own-message");
      messageAuthor.textContent = "Me";
    } else {
      messageAuthor.textContent = data.username || "Anonymous";
    }

    // Set background color if provided
    if (data.color) {
      messageBubble.style.background = data.color;
    }

    messageText.textContent = data.message;

    messageAuthor.classList.add("message-author");
    messageText.classList.add("message-text");
    messageBubble.classList.add("message-bubble");

    messageBubble.appendChild(messageAuthor);
    messageBubble.appendChild(messageText);
    messagesArea.appendChild(messageBubble);

    // Handle scrolling and popup logic after appending message
    if (wasAtBottom || data.userId === myUserId) {
      setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }, 0);
    } else if (popUpShouldAppear) {
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

function showUsernameModal() {
  const modal = document.getElementById("username-modal");
  const input = document.getElementById("username-input");
  const submit = document.getElementById("username-submit");

  modal.classList.remove("hide");
  input.value = "";
  input.focus();

  function submitUsername() {
    const value = input.value.trim();
    if (value.length > 0) {
      username = value;
      modal.classList.add("hide");
      setTimeout(() => {
        modal.style.display = "none";
      }, 500);
      document.getElementById("chat-container").style.filter = "none";
      // Send username to server
      socket.send(JSON.stringify({ type: "setUsername", username }));
    } else {
      input.focus();
    }
  }

  submit.onclick = submitUsername;
  input.onkeydown = (e) => {
    if (e.key === "Enter") submitUsername();
  };
}

// Blur chat container until username is set
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chat-container").style.filter = "blur(8px)";
  showUsernameModal();

  // Disclaimer close button handler
  const disclaimerCloseBtn = document.getElementById("disclaimer-close-btn");
  if (disclaimerCloseBtn) {
    disclaimerCloseBtn.onclick = () => {
      const banner = document.getElementById("chat-disclaimer-banner");
      if (banner) {
        banner.style.display = "none";
        // Update chat-container grid rows after banner is hidden
        const chatContainer = document.getElementById("chat-container");
        if (chatContainer) {
          chatContainer.style.gridTemplateRows = "11fr 1fr";
        }
      }
    };
  }
});
