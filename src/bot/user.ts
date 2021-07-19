import { PrismaClient, User } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { createSenderEmail } from "./utils";

dayjs.extend(relativeTime);

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
