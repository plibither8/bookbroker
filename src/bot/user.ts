import type { User } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import db from "../libs/database.js";
import api from "./api.js";
import messages from "./messages.js";
import { createSenderEmail } from "./utils.js";

dayjs.extend(relativeTime);

export async function getOrCreateUser(from: any): Promise<User> {
  let user = await db.user.findFirst({
    where: { chatId: from.id.toString() },
  });
  if (!user) {
    user = await db.user.create({
      data: {
        chatId: from.id.toString(),
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        language: from.language_code || "en",
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
  const deliveriesToday = await db.delivery.count({
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
