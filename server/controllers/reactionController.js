const prisma = require("../db/prisma");

module.exports.addReaction = async (req, res, next) => {
    try {
        const { messageId, userId, emoji } = req.body;

        // Upsert: Update if exists, create if not
        const reaction = await prisma.reaction.upsert({
            where: {
                userId_messageId: {
                    userId: parseInt(userId),
                    messageId: parseInt(messageId),
                },
            },
            update: {
                emoji: emoji,
            },
            create: {
                emoji: emoji,
                userId: parseInt(userId),
                messageId: parseInt(messageId),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        res.json({ success: true, reaction });
    } catch (ex) {
        next(ex);
    }
};

module.exports.removeReaction = async (req, res, next) => {
    try {
        const { messageId, userId } = req.body;

        await prisma.reaction.delete({
            where: {
                userId_messageId: {
                    userId: parseInt(userId),
                    messageId: parseInt(messageId),
                },
            },
        });

        res.json({ success: true });
    } catch (ex) {
        next(ex);
    }
};
