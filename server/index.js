const express = require("express");
const cors = require("cors");
const path = require("path");
const socketIo = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messagesRoutes");

app.use(
  cors({
    origin: true, // Allow any origin that connects (dynamic)
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

const io = socketIo(server, {
  cors: {
    origin: true, // Allow any origin
    credentials: true,
  },
});

const prisma = require("./db/prisma");

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", async (userId) => {
    if (!userId) return;
    onlineUsers.set(userId.toString(), socket.id);
    await broadcastOnlineUsers();
  });

  socket.on("send-msg", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to.toString());
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        msg: data.msg,
        from: data.from,
        messageType: data.messageType,
        fileUrl: data.fileUrl,
      });
      // Acknowledgment for Delivery
      socket.emit("msg-delivered", {
        to: data.from.toString(), // send back to original sender
        from: data.to,
      });

      // Update database status
      await prisma.message.updateMany({
        where: {
          senderId: data.from,
          conversation: {
            participants: { some: { id: parseInt(data.to) } }
          },
          status: "SENT",
        },
        data: { status: "DELIVERED" }
      });
    }
  });

  socket.on("unsend-msg", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("msg-unsend", {
        messageId: data.messageId,
        from: data.from,
      });
    }
  });

  socket.on("read-msg", (data) => {
    const readerUserSocket = onlineUsers.get(data.to.toString()); // Send to the person who sent the original message
    if (readerUserSocket) {
      socket.to(readerUserSocket).emit("msg-read", {
        from: data.from, // who read the message
      });
    }
  });

  socket.on("delete-conversation", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("conversation-deleted", {
        from: data.from,
      });
    }
  });

  socket.on("add-reaction", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("reaction-added", {
        messageId: data.messageId,
        reaction: data.reaction,
        from: data.from,
      });
    }
  });

  socket.on("remove-reaction", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("reaction-removed", {
        messageId: data.messageId,
        userId: data.userId,
        from: data.from,
      });
    }
  });

  socket.on("toggle-status", async (data) => {
    const { userId, status } = data;
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { status },
    });
    await broadcastOnlineUsers();
  });

  socket.on("disconnect", async () => {
    let userId;
    for (let [id, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        userId = id;
        break;
      }
    }
    if (userId) {
      onlineUsers.delete(userId);
      await broadcastOnlineUsers();
    }
  });

  async function broadcastOnlineUsers() {
    const connectedUserIds = Array.from(onlineUsers.keys()).map(id => parseInt(id));
    // Fetch statuses for currently connected users
    const users = await prisma.user.findMany({
      where: {
        id: { in: connectedUserIds },
        status: "online",
      },
      select: { id: true },
    });
    const broadcastList = users.map(u => u.id);
    io.emit("get-online-users", broadcastList);
  }
});
