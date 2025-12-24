const prisma = require("../db/prisma");

module.exports.addMessage = async (req, res, next) => {
    try {
        const { from, to, message } = req.body;

        // 1. Find or create the conversation between the two users
        let conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: from } } },
                    { participants: { some: { id: to } } },
                ],
            },
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participants: {
                        connect: [{ id: from }, { id: to }],
                    },
                },
            });
        }

        // 2. Create the message linked to the conversation
        const receiverSocketId = global.onlineUsers?.get(to);
        const initialStatus = receiverSocketId ? "DELIVERED" : "SENT";

        const data = await prisma.message.create({
            data: {
                content: message,
                sender: { connect: { id: from } },
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
        const { from, to } = req.body;

        // 1. Find the conversation between the two users
        const conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: from } } },
                    { participants: { some: { id: to } } },
                ],
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!conversation) {
            return res.json([]);
        }

        const projectedMessages = conversation.messages.map((msg) => {
            return {
                id: msg.id,
                fromSelf: msg.senderId === from,
                message: msg.content,
                status: msg.status,
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
