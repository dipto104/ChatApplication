# Project Documentation: Chat Application

This document provides a comprehensive overview of the Chat Application codebase, detailing the purpose of each file and the functions within them.

## Project Structure

The project is divided into two main parts:
- **Server (`/server`)**: A Node.js/Express backend handling API requests, database interactions (Prisma/PostgreSQL), and real-time communication (Socket.io).
- **Client (`/client`)**: A React frontend for the user interface.

---

## 1. Backend (`/server`)

### Core Files

#### `index.js`
The entry point of the server application.
- **`app.use(cors(...))`**: Configures Cross-Origin Resource Sharing to allow requests from the frontend.
- **`app.use("/api/auth", ...)`**: Mounts authentication routes.
- **`app.use("/api/messages", ...)`**: Mounts message handling routes.
- **`io.on("connection", ...)`**: distinct Socket.IO event handlers:
    - **`add-user`**: Registers a user's socket ID when they connect.
    - **`send-msg`**: Handles real-time message delivery to the recipient.
    - **`unsend-msg`**: Broadcasts an "unsend" event to remove a message from the recipient's view.
    - **`read-msg`**: Notifies the sender that their message has been read.
    - **`add-reaction` / `remove-reaction`**: Handles real-time reaction updates.
    - **`disconnect`**: Cleans up user session when they disconnect.

### Controllers (`/server/controllers`)

#### `authController.js`
Handles user authentication and user data retrieval.
- **`register(req, res, next)`**: Creates a new user in the database after checking if the username/email is unique and hashing the password.
- **`login(req, res, next)`**: Authenticates a user by verifying their username and password hash.
- **`getAllUsers(req, res, next)`**: Returns a list of all users except the requester (used for the "All Users" sidebar).
- **`getActiveConversations(req, res, next)`**: Fetches users with whom the current user has exchanged messages, sorted by recent activity. It also calculates unread message counts.

#### `messageController.js`
Manages message operations.
- **`addMessage(req, res, next)`**:
    1. Finds or creates a `Conversation` between sender and receiver.
    2. Creates a `Message` entry in the database.
    3. Updates the conversation's `updatedAt` timestamp.
- **`getAllMessages(req, res, next)`**: Retrieves the message history for a specific chat. It handles pagination, filters out deleted messages, and includes reactions. **Crucially, it replaces legacy Cloudflare image URLs with the local server URL.**
- **`markAsRead(req, res, next)`**: Updates the status of unread messages to "READ" for a specific conversation.
- **`unsendMessage(req, res, next)`**: Marks a message as `isUnsent = true` in the database (Soft Delete).
- **`removeMessageForMe(req, res, next)`**: Adds the user's ID to the `deletedBy` array of a message, hiding it only for them.

#### `reactionController.js`
Handles message reactions.
- **`addReaction(req, res, next)`**: Uses `prisma.reaction.upsert` to add or update a reaction. Ensures a user has only one reaction per message.
- **`removeReaction(req, res, next)`**: Deletes a reaction entry for a specific user and message.

### Routes (`/server/routes`)

#### `authRoutes.js`
- `POST /register`: Calls `authController.register`.
- `POST /login`: Calls `authController.login`.
- `GET /allusers/:id`: Calls `authController.getAllUsers`.
- `GET /active-conversations/:id`: Calls `authController.getActiveConversations`.

#### `messagesRoutes.js`
- `POST /addmsg/`: Calls `messageController.addMessage`.
- `POST /getmsg/`: Calls `messageController.getAllMessages`.
- `POST /uploadimg/`: Uses `multer` middleware to save uploaded images to `uploads/` and returns the filename.
- `POST /react/`: Calls `reactionController.addReaction`.
- `DELETE /react/`: Calls `reactionController.removeReaction`.

### Database
- **`prisma/schema.prisma`**: Defines the data models:
    - **`User`**: ID, username, email, password, avatar, status.
    - **`Message`**: Content, type (TEXT/IMAGE), fileUrl, reactions, status (SENT/DELIVERED/READ).
    - **`Conversation`**: Links participants and messages.
    - **`Reaction`**: Links a user, a message, and an emoji.

---

## 2. Frontend (`/client`)

### Core Files

#### `App.jsx`
Sets up React Router and defines the main routes:
- `/register`: Registration page.
- `/login`: Login page.
- `/`: Main Chat interface.

#### `utils/APIRoutes.js`
Centralized file for all API endpoint URLs.
- **`host`**: The base server URL (default: `http://localhost:5000`).

#### `utils/imageUtils.js`
- **`compressImage(file, options)`**: Uses HTML5 Canvas to resize and compress images before uploading, optimizing performance.

### Components (`/client/src/components`)

#### `ChatContainer.jsx`
The core component for the chat interface.
- **State**: `messages`, `currentChat`, `reactionPickerVisible`, `pinnedReactionMsgId`.
- **`useEffect` (Socket)**: Listens for incoming messages (`msg-recieve`), delivery receipts, and reaction updates.
- **`handleAddReaction`**: Sends a reaction API request and emits a socket event.
- **`handleRemoveReaction`**: Sends a delete request and updates the UI.
- **`handleUnsend` / `handleRemoveForMe`**: Handles message deletion actions.
- **Render**: Displays the message list. Implements the custom logic for **hover-based reaction pickers** and **persistent (pinned) reaction menus**.

#### `ChatInput.jsx`
Handles user input (text and images).
- **`handleEmojiPickerhideShow`**: Toggles the emoji picker.
- **`handleImageSelect`**: Compresses selected images and shows a preview.
- **`sendChat`**: Uploads image (if present) then sends the message content to the server.

#### `Contacts.jsx`
Displays the list of users/conversations in the sidebar.
- **Tabs**: clear separation between "Recent" (active conversations) and "Online" (all online users).
- **`changeCurrentChat`**: Selects a chat partner.

#### `Welcome.jsx`
Displayed when no chat is selected. Shows a welcome message and a prompt to select a contact.

#### `OnlineSidebar.jsx`
A secondary sidebar (desktop only) showing currently online users for quick access.

### Pages (`/client/src/pages`)

#### `Chat.jsx`
The main layout controller.
- Checks if user is logged in (redirects to Login if not).
- Establishes the socket connection.
- Manages the responsive layout (toggling between Contacts and ChatContainer on mobile).
- Fetches initial data (CurrentUser, Contacts).

#### `Login.jsx` / `Register.jsx`
Standard authentication forms with validation and API calls to the auth routes.
