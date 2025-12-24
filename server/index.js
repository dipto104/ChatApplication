const express = require("express");
const cors = require("cors");
const socketIo = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messagesRoutes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

const prisma = require("./db/prisma");

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    await broadcastOnlineUsers();
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        msg: data.msg,
        from: data.from
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
