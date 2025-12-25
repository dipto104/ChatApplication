const prisma = require("../db/prisma");
const fs = require("fs");
const path = require("path");

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
                message: msg.content,
                messageType: msg.messageType,
                fileUrl: msg.fileUrl, // Return raw relative path
                status: msg.status,
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
        const id = parseInt(messageId);

        // 1. Delete associated reactions first to avoid foreign key violations
        await prisma.reaction.deleteMany({
            where: { messageId: id },
        });

        // 2. Delete the message itself
        const msg = await prisma.message.delete({
            where: { id: id },
        });

        // 3. Delete the physical file if it exists
        if (msg.fileUrl && msg.fileUrl.startsWith("uploads/")) {
            const filePath = path.join(__dirname, "..", msg.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        return res.json({ msg: "Message deleted successfully", data: msg });
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

module.exports.deleteConversation = async (req, res, next) => {
    try {
        const { conversationId } = req.body;
        const convoId = parseInt(conversationId);

        // 1. Get all messages in this conversation to find files to delete
        const messages = await prisma.message.findMany({
            where: { conversationId: convoId },
            select: { id: true, fileUrl: true },
        });

        const messageIds = messages.map((m) => m.id);

        // 2. Delete physical files from disk
        messages.forEach((msg) => {
            if (msg.fileUrl && msg.fileUrl.startsWith("uploads/")) {
                const filePath = path.join(__dirname, "..", msg.fileUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });

        // 3. Delete all reactions, messages, and the conversation using a transaction
        await prisma.$transaction([
            prisma.reaction.deleteMany({
                where: { messageId: { in: messageIds } },
            }),
            prisma.message.deleteMany({
                where: { conversationId: convoId },
            }),
            prisma.conversation.delete({
                where: { id: convoId },
            }),
        ]);

        return res.json({ msg: "Conversation deleted for everyone successfully" });
    } catch (ex) {
        next(ex);
    }
};

module.exports.deleteConversationForMe = async (req, res, next) => {
    try {
        const { conversationId, userId } = req.body;
        const convoId = parseInt(conversationId);
        const uId = parseInt(userId);

        // 1. Get all messages in this conversation that aren't already deleted by this user
        const messages = await prisma.message.findMany({
            where: {
                conversationId: convoId,
                NOT: {
                    deletedBy: { has: uId }
                }
            },
            select: { id: true, deletedBy: true }
        });

        // 2. Update each message to include uId in deletedBy
        // Prisma updateMany doesn't support array push well, so we do it in a transaction or loop
        await prisma.$transaction(
            messages.map((msg) =>
                prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        deletedBy: { set: [...msg.deletedBy, uId] }
                    }
                })
            )
        );

        return res.json({ msg: "Conversation deleted for you" });
    } catch (ex) {
        next(ex);
    }
};
