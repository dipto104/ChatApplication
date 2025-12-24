const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "postgresql://admin:admin123@localhost:5432/mydb",
        },
    },
});

module.exports = prisma;
