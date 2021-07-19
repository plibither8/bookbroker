import { PrismaClient, User } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "./api";
import messages from "./messages";
import { createSenderEmail } from "./utils";

dayjs.extend(relativeTime);

const prisma = new PrismaClient();

export async function getOrCreateUser(from: any): Promise<User> {
  let user = await prisma.user.findFirst({
    where: { chatId: from.id.toString() },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        chatId: from.id.toString(),
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        language: from.language_code,
        senderEmail: createSenderEmail(),
      },
    });
    await api.sendMessage(messages.newUser(user));
  }
  return user;
}

export async function getUsageInfo(user: User): Promise<{
  dailyDeliveryLimit: number;
  deliveriesToday: number;
  limitResetTime: string;
}> {
  const { dailyDeliveryLimit } = user;
  const endOfDay = dayjs().endOf("day").toDate();
  const deliveriesToday = await prisma.delivery.count({
    where: {
      userId: user.id,
      time: {
        lte: endOfDay,
        gte: dayjs().startOf("day").toDate(),
      },
    },
  });
  return {
    dailyDeliveryLimit,
    deliveriesToday,
    limitResetTime: dayjs().to(endOfDay),
  };
}
