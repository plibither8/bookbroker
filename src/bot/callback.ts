import { PrismaClient } from "@prisma/client";
import api from "./api";
import messages from "./messages";
import { State } from "./states";

const prisma = new PrismaClient();

export async function callbackAction(callbackQuery: any) {
  const { data, from } = callbackQuery;
  switch (data) {
    case "email_approved": {
      const user = await prisma.user.findUnique({
        where: { chatId: from.id.toString() },
      });
      if (user && user.state === State.YET_TO_APPROVE_SENDER_EMAIL.toString()) {
        await prisma.user.update({
          where: { chatId: from.id.toString() },
          data: { state: State.YET_TO_RECEIVE_KINDLE_EMAIL },
        });
        await api.sendMessage(messages.requestKindleEmail, from.id);
      }
    }
  }
}
