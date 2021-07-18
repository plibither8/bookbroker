import { PrismaClient, User } from "@prisma/client";
import { createSenderEmail } from "./utils";

const prisma = new PrismaClient();

export async function getOrCreateUser(from: any): Promise<User> {
  const user =
    (await prisma.user.findFirst({
      where: { chatId: from.id.toString() },
    })) ||
    (await prisma.user.create({
      data: {
        chatId: from.id.toString(),
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        language: from.language_code,
        senderEmail: createSenderEmail(),
      },
    }));
  return user;
}
