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
