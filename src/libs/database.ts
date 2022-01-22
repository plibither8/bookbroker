import prisma from "@prisma/client";

const { PrismaClient } = prisma;
const db = new PrismaClient();

export default db;
