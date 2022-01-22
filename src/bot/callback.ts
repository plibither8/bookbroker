import db from "../libs/database.js";
import api from "./api.js";
import messages from "./messages.js";
import { createPaymentLink } from "./payment.js";
import { State } from "./states.js";

export async function callbackAction(callbackQuery: any) {
  const { data, from } = callbackQuery;
  if (data === "email_approved") {
    const user = await db.user.findUnique({
      where: { chatId: from.id.toString() },
    });
    if (user && user.state === State.YET_TO_APPROVE_SENDER_EMAIL.toString()) {
      await db.user.update({
        where: { chatId: from.id.toString() },
        data: { state: State.YET_TO_RECEIVE_KINDLE_EMAIL },
      });
      await api.sendMessage(messages.requestKindleEmail, from.id);
    }
    return;
  }

  if (data.startsWith("donate_")) {
    const [_, amountString, currency] = data.split("_");
    const amount = Number(amountString);
    const user = await db.user.findUnique({
      where: { chatId: from.id.toString() },
    });
    if (user) {
      const payment = await createPaymentLink(user, amount, currency);
      await api.sendMessage(
        messages.donateLink(amount, currency, payment.link),
        from.id
      );
    }
    return;
  }
}
