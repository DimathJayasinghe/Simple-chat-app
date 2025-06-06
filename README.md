# Simple WebSocket Chat Application

A real-time chat application built from scratch using raw WebSockets in Node.js, without any external libraries or frameworks. The app supports multiple simultaneous users chatting across different devices on a local network or over the internet.

---

## 🌐 Live Demo

Try the chat app live at:  
**[https://simple-chat-app-bkn7.onrender.com/](https://simple-chat-app-bkn7.onrender.com/)**

---

## Features

- **Real-time messaging:** Messages appear instantly for all connected users.
- **Unique user identification:** Each user is assigned a unique user ID by the server.
- **Username selection:** Users must enter a username before joining the chat (with a disclaimer modal and blurred background).
- **Unique color assignment:** Each user is assigned a unique, light background color for their messages. Colors are reused efficiently when users disconnect.
- **User distinction:** Messages are styled as "Me" for your own messages, based on user ID (not username), preventing confusion if multiple users choose the same name.
- **Multi-device support:** Works across all devices on the same network or internet.
- **Connection status:** Visual indicators and system messages when users connect/disconnect.
- **New message popup:** If you scroll up and new messages arrive, a popup appears to notify you and lets you jump to the latest messages.
- **Disclaimer banner:** A dismissible disclaimer banner is shown in the chat UI.
- **Robust error handling:** Handles socket errors, disconnects, and invalid messages gracefully.
- **Clean, responsive UI:** Works on desktop and mobile browsers.

---

## Technical Implementation

- **Raw WebSockets:** Implements the WebSocket protocol (RFC 6455) from scratch.
- **Node.js:** Server-side JavaScript runtime.
- **ES Modules:** Modern JavaScript module system.
- **Vanilla JavaScript:** No front-end frameworks or libraries.
- **HTML5 & CSS3:** Modern web standards for UI.

---

## Project Structure

```
simple_chat_using_websockets/
├── server.mjs         # Main server entry point
├── router.mjs         # HTTP request router for serving static files
├── websocket.mjs      # WebSocket protocol implementation and chat logic
├── views/             # Front-end files
│   ├── index.html     # Main HTML page
│   ├── style.css      # Styles for the chat interface
│   └── client.js      # Client-side WebSocket and UI logic
└── README.md          # Project documentation
```

---

## How It Works

1. **Connection:**  
   The server listens for HTTP and WebSocket upgrade requests. When a client connects, it is assigned a unique user ID.

2. **Username Modal:**  
   The client displays a modal requiring the user to enter a username before joining the chat. The background is blurred until a valid username is entered.

3. **Color Assignment:**  
   When the username is set, the server assigns a unique, light color to the user for message bubbles. Colors are reused efficiently as users disconnect.

4. **Messaging:**

   - Users send messages containing their user ID and message text.
   - The server looks up the username and color for that user ID and broadcasts `{ userId, username, color, message }` to all clients.
   - Clients use the user ID to determine if a message is their own (for "Me" styling), regardless of username.

5. **UI Features:**

   - Messages are styled with the user's assigned color.
   - "Me" messages are visually distinct.
   - A popup appears for new messages if the user is scrolled up.
   - A disclaimer banner can be dismissed, updating the chat layout.

6. **Cleanup:**  
   When a user disconnects, their color is released for reuse and all their data is cleaned up.

---

## Setup & Installation

### Prerequisites

- Node.js (v14.0.0 or higher)
- A modern web browser

### Installation Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/simple_chat_using_websockets.git
   cd simple_chat_using_websockets
   ```

2. No additional dependencies are required!

---

## Running the Application

1. Start the server:

   ```bash
   node server.mjs
   ```

2. The server will display available URLs, for example:

   ```
   🟢 Server listening on http://localhost:1337
   Available on your network at: http://192.168.1.100:1337
   ```

3. Open a browser and navigate to the displayed URL.

---

## Using the Chat

- Enter a username in the modal to join the chat.
- Type a message and press Enter or click Send.
- Your messages will appear with your assigned color and "Me" label.
- If you scroll up, a popup will notify you of new messages.
- You can dismiss the disclaimer banner at any time.

---

## WebSocket Protocol Implementation

This project implements the WebSocket protocol from scratch, handling:

- WebSocket handshake and connection upgrade
- WebSocket frame parsing and creation
- Message masking/unmasking
- Broadcasting messages to connected clients
- Connection management
- User ID and color assignment and tracking

---

## Future Enhancements

- Authentication and user accounts (e.g., with Supabase)
- Message persistence (database integration)
- Custom avatars or profile pictures
- Room-based chat functionality
- File/image sharing
- End-to-end encryption

---

## Acknowledgements

This project was created as a learning exercise to understand the WebSocket protocol at a deep level without relying on external libraries.

---
