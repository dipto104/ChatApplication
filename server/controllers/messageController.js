const prisma = require("../db/prisma");

module.exports.addMessage = async (req, res, next) => {
    try {
        const { from, to, message, messageType, fileUrl } = req.body;
        const senderId = parseInt(from);
        const receiverId = parseInt(to);

        // 1. Find or create the conversation between the two users
        let conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: senderId } } },
                    { participants: { some: { id: receiverId } } },
                ],
            },
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participants: {
                        connect: [{ id: senderId }, { id: receiverId }],
                    },
                },
            });
        }

        // 2. Create the message linked to the conversation
        const receiverSocketId = global.onlineUsers?.get(to);
        const initialStatus = receiverSocketId ? "DELIVERED" : "SENT";

        const data = await prisma.message.create({
            data: {
                content: message || "",
                messageType: messageType || "TEXT",
                fileUrl: fileUrl || null,
                sender: { connect: { id: senderId } },
                conversation: { connect: { id: conversation.id } },
                status: initialStatus,
            },
        });

        // 3. Update the conversation's updatedAt timestamp to bring it to the top
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        if (data) return res.json({ msg: "Message added successfully." });
        else return res.json({ msg: "Failed to add message to the database" });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getAllMessages = async (req, res, next) => {
    try {
        const { from, to, before, limit = 20 } = req.body;
        const senderId = parseInt(from);
        const receiverId = parseInt(to);

        // 1. Find the conversation between the two users
        const conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: senderId } } },
                    { participants: { some: { id: receiverId } } },
                ],
            },
        });

        if (!conversation) {
            return res.json([]);
        }

        // 2. Fetch paginated messages with reactions
        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversation.id,
                NOT: {
                    deletedBy: {
                        has: senderId,
                    },
                },
                ...(before && {
                    createdAt: {
                        lt: new Date(before),
                    },
                }),
            },
            include: {
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
            },
            take: parseInt(limit),
            orderBy: {
                createdAt: "desc",
            },
        });

        const projectedMessages = messages.reverse().map((msg) => {
            return {
                id: msg.id,
                fromSelf: msg.senderId === senderId,
                message: msg.isUnsent ? "This message was unsent" : msg.content,
                messageType: msg.isUnsent ? "TEXT" : msg.messageType,
                fileUrl: msg.isUnsent ? null : (msg.fileUrl ? msg.fileUrl.replace("https://files-boc-wider-computer.trycloudflare.com", "http://localhost:5000") : null),
                status: msg.status,
                isUnsent: msg.isUnsent,
                reactions: msg.reactions || [],
                time: msg.createdAt,
            };
        });

        res.json(projectedMessages);
    } catch (ex) {
        next(ex);
    }
};

module.exports.markAsRead = async (req, res, next) => {
    try {
        const { conversationId, researcherId, senderId } = req.body;

        let targetConversationId = conversationId;

        if (!targetConversationId && senderId) {
            const convo = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { participants: { some: { id: researcherId } } },
                        { participants: { some: { id: senderId } } },
                    ],
                },
            });
            targetConversationId = convo?.id;
        }

        if (targetConversationId) {
            await prisma.message.updateMany({
                where: {
                    conversationId: targetConversationId,
                    senderId: { not: researcherId },
                    status: { not: "READ" },
                },
                data: {
                    status: "READ",
                },
            });
        }
        return res.json({ msg: "Messages marked as read" });
    } catch (ex) {
        next(ex);
    }
};
module.exports.unsendMessage = async (req, res, next) => {
    try {
        const { messageId } = req.body;
        const msg = await prisma.message.update({
            where: { id: parseInt(messageId) },
            data: {
                isUnsent: true,
            },
        });
        return res.json({ msg: "Message unsent successfully", data: msg });
    } catch (ex) {
        next(ex);
    }
};

module.exports.removeMessageForMe = async (req, res, next) => {
    try {
        const { messageId, userId } = req.body;
        const msg = await prisma.message.findUnique({
            where: { id: parseInt(messageId) },
        });

        if (!msg) return res.status(404).json({ msg: "Message not found" });

        const updatedDeletedBy = [...msg.deletedBy, parseInt(userId)];

        await prisma.message.update({
            where: { id: parseInt(messageId) },
            data: {
                deletedBy: { set: updatedDeletedBy },
            },
        });

        return res.json({ msg: "Message removed for you" });
    } catch (ex) {
        next(ex);
    }
};
