const prisma = require("../db/prisma");

module.exports.createGroup = async (req, res, next) => {
    try {
        const { name, participants, adminId } = req.body;
        // participants is an array of user IDs. 
        // We need to add the admin to the participants list if not already there, 
        // to ensure they are part of the conversation.
        const adminIdInt = parseInt(adminId);

        let participantIds = participants.map(id => parseInt(id));
        if (!participantIds.includes(adminIdInt)) {
            participantIds.push(adminIdInt);
        }

        const group = await prisma.conversation.create({
            data: {
                isGroup: true,
                name: name,
                groupAdminId: adminIdInt,
                participants: {
                    connect: participantIds.map((id) => ({ id })),
                },
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    }
                }
            }
        });

        // Fetch Admin details for the message
        const adminUser = await prisma.user.findUnique({
            where: { id: adminIdInt },
            select: { username: true }
        });

        // Create initial system message
        if (adminUser) {
            await prisma.message.create({
                data: {
                    content: `Group created by ${adminUser.username}`,
                    sender: { connect: { id: adminIdInt } },
                    conversation: { connect: { id: group.id } },
                    status: "SENT", // Effectively a system message
                }
            });
        }

        return res.json({ status: true, group });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getUserGroups = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId);
        const groups = await prisma.conversation.findMany({
            where: {
                isGroup: true,
                participants: {
                    some: {
                        id: userId
                    }
                }
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });
        return res.json(groups);
    } catch (ex) {
        next(ex);
    }
};
