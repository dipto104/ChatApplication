const prisma = require("../db/prisma");

module.exports.addMessage = async (req, res, next) => {
    try {
        const { from, to, message } = req.body;
        const data = await prisma.message.create({
            data: {
                content: message,
                sender: { connect: { id: from } },
                receiver: { connect: { id: to } },
            },
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

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: from, receiverId: to },
                    { senderId: to, receiverId: from },
                ],
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        const projectedMessages = messages.map((msg) => {
            return {
                fromSelf: msg.senderId === from,
                message: msg.content,
            };
        });
        res.json(projectedMessages);
    } catch (ex) {
        next(ex);
    }
};
