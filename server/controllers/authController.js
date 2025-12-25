const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prisma");

module.exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const usernameCheck = await prisma.user.findUnique({ where: { username } });
        if (usernameCheck)
            return res.json({ msg: "Username already used", status: false });
        const emailCheck = await prisma.user.findUnique({ where: { email } });
        if (emailCheck)
            return res.json({ msg: "Email already used", status: false });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        });
        delete user.password;
        return res.json({ status: true, user });
    } catch (ex) {
        next(ex);
    }
};

module.exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user)
            return res.json({ msg: "Incorrect Username or Password", status: false });
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
            return res.json({ msg: "Incorrect Username or Password", status: false });
        delete user.password;

        return res.json({ status: true, user });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                id: {
                    not: parseInt(req.params.id),
                },
            },
            select: {
                email: true,
                username: true,
                avatar: true,
                id: true,
            },
        });
        return res.json(users);
    } catch (ex) {
        next(ex);
    }
};

module.exports.getActiveConversations = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { id: userId },
                },
            },
            include: {
                participants: {
                    where: {
                        id: { not: userId },
                    },
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    },
                },
                messages: {
                    where: {
                        NOT: {
                            deletedBy: { has: userId }
                        }
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        const activeUsersData = await Promise.all(conversations.map(async (convo) => {
            const visibleMessage = convo.messages[0];
            if (!visibleMessage) return null; // No visible messages, this convo should be hidden

            const otherUser = convo.participants[0];

            // Count unread messages from the other user in this conversation that are NOT deleted by me
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: convo.id,
                    senderId: otherUser.id,
                    status: { not: "READ" },
                    NOT: {
                        deletedBy: { has: userId }
                    }
                },
            });

            return {
                ...otherUser,
                conversationId: convo.id,
                lastMessage: visibleMessage.content || "",
                lastMessageTime: visibleMessage.createdAt || convo.updatedAt,
                unreadCount: unreadCount,
            };
        }));

        // Filter out nulls (hidden conversations)
        const activeUsers = activeUsersData.filter(u => u !== null);

        return res.json(activeUsers);
    } catch (ex) {
        next(ex);
    }
};
