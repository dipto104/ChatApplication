# Fixes Summary

Here is a list of the fixes applied to the `ChatApplication` to resolve the reported issues.

## 1. Fixed Connection Refused & Login Issue
**Issue:** The application could not log in or fetch chat history because it was trying to connect to a Cloudflare tunnel URL (`https://files-boc-wider-computer.trycloudflare.com`) that is no longer active.
**Fix:**
- Updated **`client/.env`**:
  - Changed `VITE_SERVER_URL` from the Cloudflare link to `http://localhost:5000`.
  - This ensures the client connects to your local running server.

## 2. Fixed Server Crash on Login
**Issue:** The server would crash with a `TypeError: Cannot read properties of null (reading 'toString')` when a user tried to connect without a valid `userId` (or null).
**Fix:**
- Modified **`server/index.js`**:
  - Added a safety check in the `add-user` socket event.
  ```javascript
  socket.on("add-user", async (userId) => {
    if (!userId) return; // Added this line
    onlineUsers.set(userId.toString(), socket.id);
    await broadcastOnlineUsers();
  });
  ```

## 3. Fixed Broken Image Links (Legacy Data)
**Issue:** Older images sent while the Cloudflare tunnel was active were stored with the Cloudflare URL in the database. Since that URL is dead, the images failed to load.
**Fix:**
- Modified **`server/controllers/messageController.js`**:
  - Updated the `getAllMessages` function to dynamically replace the old Cloudflare domain with the current server URL (dynamic).
  ```javascript
  // Replaces legacy domain with current request domain on-the-fly
  fileUrl: msg.fileUrl.replace("https://files-boc-wider-computer.trycloudflare.com", `${req.protocol}://${req.get("host")}`)
  ```

## 4. UI Improvements: Message Actions
**Issue:**
- Reaction buttons overlapped message text.
- Icons disappeared when trying to hover them (dead zone).
- Reaction picker was not intuitive (click vs hover).

**Fix:**
- **Placement:** Moved reaction trigger alongside the options menu, outside the bubble.
- **Interaction:**
  - Reaction menu opens on **hover**.
  - **Scoped Hover:** Changed CSS so icons only appear when hovering the **message bubble** itself, not the empty row space. This prevents accidental triggering and ensures a cleaner UI.
- **Structure:** Moved reaction DOM inside `.content` to ensure correct positioning and eliminate layout shifts.

## 5. Feature: Reaction Toggling
**Issue:** Users could add multiple reactions or not remove them easily via the picker.
**Fix:**
- **One Reaction Per User:** Enforced by backend (Prisma schema) and frontend logic.
- **Toggle Support:** Updated the reaction picker so clicking an already selected emoji will **remove** (lift) the reaction.
- **Visual Feedback:** Added a `.selected` style (blue highlight) in the picker to show which reaction you currently have active.

## 6. Feature: Persistent Reaction Picker (Facebook-style)
**Issue:** Menu would close if mouse accidentally moved off the icon, frustrating selection. The user requested "click to keep open" functionality.
**Fix:**
- **Persistent State:** Added a `pinnedReactionMsgId` state.
- **Click Behavior:** Clicking the smiley face "pins" the menu open. It stays open even if you move your mouse away.
- **Closing Mechanism:** The menu closes if you:
  - Select a reaction.
  - Click the smiley icon again (toggle).
  - Click anywhere else on the screen (outside the menu).

## 7. Fixed New User Visibility (Online Sync)
**Issue:** When a new user registered and came online, existing logged-in users couldn't see them because their local "All Users" list was outdated.
**Fix:**
- **Auto-Sync Logic:** Added a smart check in **`Chat.jsx`**.
- When the socket broadcasts the "Online Users" list, the client checks if it knows everyone on that list.
- If an **unknown ID** appears (meaning a new stranger), the client automatically re-fetches the full user directory from the server.
- This ensures new users appear instantly without requiring a page refresh.

## 8. Fixed New Conversation Visibility (Receiver & Sender)
**Issue (Receiver):** When receiving a message from a new person, the conversation didn't appear until refresh.
**Fix:**
1.  **Auto-Detection:** Updated `Chat.jsx` to fetch new conversations automatically when a message arrives from an unknown contact.
2.  **Cache Busting:** Added a timestamp query param (`?t=...`) to `fetchConversations`.
3.  **Race Condition Fix:** In `ChatContainer.jsx`, swapped order: Save to DB *then* emit Socket event. This ensures data is ready when receiver fetches it.

**Issue (Sender):** When **sending** a message to a new contact, the sender's own "Recent Chats" list didn't update to show the new conversation.
**Fix:**
- **Sender Update:** Modified `handleSendMsg` in `ChatContainer.jsx` to explicitly call `refreshContacts()` immediately after sending a message.
- **Result:** The new chat appears in the sidebar instantly for the sender too.

## 9. Universal Access & Dynamic Image Storage
**Issue:** Application required hardcoded localhost/tunnel URLs, breaking images when switching environments. Storing full URLs in the DB caused lock-in.
**Fix:**
- **Dynamic Server:** Server now detects the incoming request URL (host) and adjusts image links automatically.
- **Relative Storage:** New images are stored in the database as relative paths (e.g., `uploads/image.png`) instead of full URLs.
- **Universal CORS:** Server now accepts connections from any origin.
- **Result:** You can access the app from Localhost or Cloudflare Tunnel without changing database records.

## 10. Client-Side Auto-Switch Logic
**Issue:** Manually switching `.env` files when moving between local development and mobile testing was tedious.
**Fix:**
- Updated **`client/src/utils/APIRoutes.js`**:
  - Added a `getHost()` function that checks `window.location.hostname`.
  - **Logic:** If the browser URL is `localhost`, it automatically talks to `http://localhost:5000`. If the URL is anything else (like your tunnel), it uses the URL from your `.env`.
- **Final Result:** Set your `.env` to the tunnel URL once, and the app will just "work" everywhere.

## 11. Full Conversation Deletion for Everyone
**Issue:** Users wanted to delete an entire chat history for both participants (Telegram-style).
**Fix:**
- **Backend:** Added `deleteConversation` controller.
  - It finds all messages in the chat.
  - Deletes all **physical image files** from the server disk.
  - Deletes all **reactions** and **messages** from the database.
  - Deletes the **conversation record** itself.
- **Frontend:** Added a red "Delete Chat" button in the chat header.
- **Real-time:** Integrated with WebSockets. When one person deletes the chat:
  - The other person's screen clears instantly.
  - The chat disappears from both sidebars automatically.
- **Result:** Complete one-click wipe of all data associated with a contact.

## 12. "Delete for me" vs "Delete for everyone"
**Issue:** Users needed a way to clear their own chat list without deleting the history for the other person.
**Fix:**
- **Two Menu Options:** Added to the three-dot menu in the sidebar.
- **Delete for me:**
  - Hides the conversation from your "Recent" list.
  - Keeps the data in the database (the other person can still see it).
  - The chat will reappear if a new message is received.
- **Delete for everyone:**
  - (Existing) Completely wipes all messages, reactions, and physical files from the server.
  - Removes the chat from both people's screens in real-time.
- **Result:** Full privacy control, matching Telegram's flexibility.

## 13. Sidebar Profile & Activity Menu
**Issue:** Profile settings (logout, status) were in a separate header menu, taking up space.
**Fix:**
- **Unified Profile Area:** Moved logout and status toggle to the bottom-left sidebar.
- **Interactive Avatar:** The user's avatar area is now a clickable menu.
- **Chevron Toggle:** Added a chevron icon next to the username to indicate the menu.
- **Clean Header:** Removed the redundant "User Menu" from the chat window header.
- **Result:** A more standard and convenient "Settings" feel, similar to modern chat apps.
