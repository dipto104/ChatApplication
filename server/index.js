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

    // Join user to their group rooms
    const userGroups = await prisma.conversation.findMany({
      where: {
        isGroup: true,
        participants: { some: { id: parseInt(userId) } }
      },
      select: { id: true }
    });

    userGroups.forEach(group => {
      socket.join("conversation_" + group.id);
    });

    await broadcastOnlineUsers();
  });

  socket.on("send-msg", async (data) => {
    if (data.isGroup) {
      // Emit to the room (excludes sender by default if using socket.to)
      socket.to("conversation_" + data.to).emit("msg-recieve", {
        msg: data.msg,
        from: data.from,
        conversationId: data.to, // Group ID
        isGroup: true,
        messageType: data.messageType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        senderName: data.senderName, // Useful for frontend
      });

      // No delivery status for groups (too complex for now) or set to SENT
    } else {
      const sendUserSocket = onlineUsers.get(data.to.toString());
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", {
          msg: data.msg,
          from: data.from,
          messageType: data.messageType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
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
    }
  });

  socket.on("create-group", (newGroup) => {
    // Expecting newGroup to be the full group object with participants
    const participants = newGroup.participants;

    participants.forEach((participant) => {
      const participantId = participant.id.toString();
      const participantSocketId = onlineUsers.get(participantId);

      if (participantSocketId) {
        // Emit to user to update their list
        io.to(participantSocketId).emit("new-group-added", newGroup);

        // Make the user's socket join the new group room immediately
        const userSocket = io.sockets.sockets.get(participantSocketId);
        if (userSocket) {
          userSocket.join("conversation_" + newGroup.id);
        }
      }
    });
  });

  socket.on("unsend-msg", (data) => {
    if (data.isGroup) {
      socket.to("conversation_" + data.to).emit("msg-unsend", data);
    } else {
      const receiverSocket = onlineUsers.get(data.to.toString());
      if (receiverSocket) {
        socket.to(receiverSocket).emit("msg-unsend", data);
      }
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

  // --- Video/Audio Calling Signaling ---

  // Group Call Signaling
  socket.on("join-call", (data) => {
    // Broadcast to everyone else in the group that a user joined the call
    socket.to("conversation_" + data.groupId).emit("user-connected-to-call", {
      signal: data.signal, // Optional: if using immediate offer
      from: data.from,
      name: data.name,
      socketId: socket.id
    });
  });

  socket.on("offer-group-signal", (data) => {
    // Send offer to specific user in group
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("receive-group-signal", {
        signal: data.signal,
        from: data.from,
        name: data.name
      });
    }
  });

  socket.on("return-group-signal", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("receive-returned-signal", {
        signal: data.signal,
        from: data.from
      });
    }
  });

  // 1-on-1 Legacy Signaling (Keep for now or refactor to use above if unified)
  socket.on("call-user", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("incoming-call", {
        from: data.from,
        name: data.name,
        offer: data.offer,
        callType: data.callType, // "video" or "audio"
      });
    }
  });

  socket.on("answer-call", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("call-accepted", data.answer);
    }
  });

  socket.on("reject-call", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("call-rejected");
    }
  });

  socket.on("end-call", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("call-ended");
    }
  });

  socket.on("ice-candidate", (data) => {
    const receiverSocket = onlineUsers.get(data.to.toString());
    if (receiverSocket) {
      socket.to(receiverSocket).emit("ice-candidate", data.candidate);
    }
  });
  // ----------------------------------------

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
