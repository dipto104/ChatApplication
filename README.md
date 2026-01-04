# Chat - Professional Real-time Chat Application

Chat is a high-end, real-time messaging platform inspired by the professional aesthetics of **Telegram** and **Facebook Messenger**. Built with the modern MERN-like stack where data is powered by **PostgreSQL** (via Prisma) and real-time interactions are handled by **Socket.io**.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your target device:
*   **Node.js**: Version 18.x or higher.
*   **PostgreSQL**: A running instance (local or hosted).
*   **Prisma CLI**: For database management.

## ✨ Key Features

*   **📱 Premium 3-Pane Layout**: A modern UI featuring a smart **Conversations Sidebar** (left), the active **Chat Window** (center), and a dedicated **Online Users Sidebar** (right) for quick discovery.
*   **💬 Conversation-First Architecture**: Smart message grouping into conversations for faster loading and a more intuitive, WhatsApp-like experience.
*   **✅ Three-Stage Delivery Status**:
    *   **Single Tick**: Message sent successfully.
    *   **Double Gray Ticks**: Message delivered to the recipient's device.
    *   **Double Blue Ticks**: Message seen/read by the recipient.
*   **🔔 Flashy Pulsing Notifications**: Animated, pulsing unread badges in the sidebar that alert you instantly to new messages.
*   **🕰️ Live Message Previews**: The conversation list shows snippets of the latest message and timestamps, sorted dynamically by recent activity.
*   **🎨 Soft Eye-Friendly Design**: A professional midnight-navy glassmorphic theme designed for readability and a premium "state-of-the-art" feel.
*   **🟢 Advanced Activity Status**:
    *   Real-time online/offline tracking.
    *   **Privacy Toggle**: Manually switch your status to "Offline" to browse privately while active.
*   **🔽 Unified User Menu**: A consolidated dropdown in the chat header for quick access to status controls and logout.
*   **😊 Emoji Support**: Integrated, premium-styled emoji picker for expressive messaging.
*   **❌ Close Chat**: Ability to quickly close a current conversation and return to the welcome dashboard.

---

## 🚀 Setup Guide

### 1. Database Setup
1.  Ensure **PostgreSQL** is installed.
2.  Create a target database (e.g., `mydb`).

### 2. Server Configuration
Navigate to `server/`:
1.  **Install dependencies**: `npm install`
2.  **Initialize Environment**: Create `.env` using `.env.example`:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mydb"
    ```
3.  **Sync Database**:
    ```bash
    npx prisma db push
    ```
4.  **Create Uploads Directory**:
    *   Create a folder named `uploads` inside the `server/` directory. This is required for storing shared files and images.

### 3. Client Configuration
Navigate to `client/`:
1.  **Install dependencies**: `npm install`
2.  **Start the app**: `npm run dev`

---

## 📂 File Structure

### Client Side (`/client/src`)
*   `Chat.jsx`: Main layout engine. Manages the 3-pane structure and global socket monitoring.
*   `ChatContainer.jsx`: The messaging window. Handles real-time status ticks and message history.
*   `Contacts.jsx`: The left sidebar. Displays active conversations with message previews items and unread badges.
*   `OnlineSidebar.jsx`: The right sidebar. Shows real-time online status of all users for quick chat initiation.

### Server Side (`/server`)
*   `index.js`: Main server entry. Manages Socket.io events for real-time delivery and seen statuses.
*   `prisma/schema.prisma`: The database source of truth using PostgreSQL.
*   `controllers/`:
    *   `messageController.js`: Handles 3-stage message lifecycle (Sent/Delivered/Read).
    *   `authController.js`: Manages user discovery and active conversation threading.

---

## 📝 Troubleshooting

*   **Missing Icons**: Ensure `react-icons` and `bs-icons` are installed in the client.
*   **Real-time Lag**: Verify the `host` in `APIRoutes.js` matches your server's local IP or localhost.
