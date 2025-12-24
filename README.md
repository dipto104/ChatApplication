# Chat - Professional Real-time Chat Application

Chat is a high-end, real-time messaging platform inspired by the professional aesthetics of **Telegram** and **Facebook Messenger**. Built with the modern MERN-like stack where data is powered by **PostgreSQL** and real-time interactions are handled by **Socket.io**.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your target device:
*   **Node.js**: Version 18.x or higher.
*   **PostgreSQL**: A running instance (local or hosted).
*   **Git**: To clone and manage your repository.

## ✨ Key Features

*   **Soft Eye-Friendly Design**: A professional midnight-navy and charcoal palette (`#17212b`) designed for long-term readability and comfort.
*   **👤 Fallback Initial Avatars**: Automatically generates beautiful, styled circles with the user's first initial if they haven't uploaded an avatar.
*   **📱 Full Responsiveness**: Optimized for desktop, tablet, and mobile. Features a "Facebook Messenger-style" mobile UI with sliding layers and a persistent header.
*   **🟢 Advanced Activity Status**:
    *   Real-time online/offline tracking.
    *   **Privacy Toggle**: Manually switch your status to "Offline" to browse privately while active.
    *   Sticky database persistence for your status preference.
*   **🔽 Unified User Menu**: A consolidated dropdown in the chat header for quick access to status controls and logout.
*   **⚡ Real-time Messaging**: Instant message delivery and receipt notifications powered by Socket.io.
*   **😊 Emoji Support**: Integrated, premium-styled emoji picker for expressive messaging.

---

## 📂 Repository & Portability Guide

To run this project on another device or share it via GitHub, you must include the following files and folders:

### ✅ Include (Push to Repository)
*   `client/`: All source files, `src/`, `public/`, `index.html`, `package.json`, `vite.config.js`.
*   `server/`: All source files, `prisma/` (schema and migrations), `controllers/`, `routes/`, `db/`, `index.js`, `package.json`.
*   `.gitignore`: **CRITICAL**. Ensure this file exists to prevent bloat and security leaks.
*   `.env.example`: Included to help other users set up their environment variables.

### ❌ Exclude (DO NOT PUSH)
*   `node_modules/`: These are large and should be installed locally via `npm install`.
*   `.env`: **SECURITY RISK**. Contains your private database credentials.

---

## 🚀 Setup Guide (For New Devices)

### 1. Database Setup
1.  Ensure **PostgreSQL** is installed and running.
2.  Create a new database (e.g., `mydb`).

### 2. Server Configuration
Navigate to the `server/` directory:
1.  **Install dependencies**: `npm install`
2.  **Initialize Environment**: Rename `.env.example` to `.env` and fill in your details:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mydb"
    ```
3.  **Sync Database**: Run the Prisma migrations to create the tables:
    ```bash
    npx prisma migrate dev --name init
    ```

### 3. Client Configuration
Navigate to the `client/` directory:
1.  **Install dependencies**: `npm install`
2.  **Start the app**: `npm run dev`

### 4. Running the App
*   **Server**: `npm start` (in `server/` directory)
*   **Frontend**: Open the local URL provided by Vite (usually `http://localhost:5173`)

---

## 🛠 Tech Stack

*   **Frontend**: React, Vite, Styled Components, React Icons, Socket.io Client.
*   **Backend**: Node.js, Express, Socket.io.
*   **Database**: PostgreSQL, Prisma ORM.
*   **Authentication**: Custom logic with local storage persistence.

---

## 📂 File Structure & Functionality

### Client Side (`/client/src`)

#### **Pages**
*   `Chat.jsx`: The layout engine. Handles desktop/mobile switching and initializes Socket.io connections.
*   `Login.jsx` & `Register.jsx`: High-end auth screens with validation and secure state management.

#### **Components**
*   `ChatContainer.jsx`: The main messaging window. Manages message history display, auto-scrolling, and the chat header.
*   `ChatInput.jsx`: The bottom toolbar. Contains the message input, emoji picker activation, and message submission logic.
*   `Contacts.jsx`: The sidebar navigator. Renders the searchable list of contacts and your own profile at the bottom.
*   `UserMenu.jsx`: The settings hub. A persistent dropdown in the header for activity status and account logout.
*   `Welcome.jsx`: The landing view shown before you select a conversation.

### Server Side (`/server`)

*   `index.js`: The central "brain". Runs the Express API and manages real-time socket events (online tracking, message broadcasting).
*   `prisma/schema.prisma`: The source of truth for your PostgreSQL database structure.
*   `controllers/`:
    *   `userController.js`: Logic for registration, login, and fetching the contact list.
    *   `messageController.js`: Logic for saving messages to the DB and fetching chat history.
*   `routes/`: API endpoint definitions that connect the frontend requests to the controllers.

---

## 📝 Troubleshooting

*   **Socket Connection**: If the client won't connect, ensure the `host` in `client/src/utils/APIRoutes.js` exactly matches your server's URL (usually `http://localhost:5000`).
*   **Database Sync**: If you add new fields, run `npx prisma migrate dev` again to update your local DB.
