import type { User } from "@prisma/client";
import path from "path";
import { Worker } from "worker_threads";
import config from "../../config.js";
import db from "../libs/database.js";
import api from "./api.js";
import documentHandler from "./document-handler.js";
import messages from "./messages.js";
import { getUsageInfo } from "./user.js";
import { getCommandFromText, isDocument, validateEmail } from "./utils.js";

export const enum State {
  FIRST_INTERACTION = "FIRST_INTERACTION",
  YET_TO_APPROVE_SENDER_EMAIL = "YET_TO_APPROVE_SENDER_EMAIL",
  YET_TO_RECEIVE_KINDLE_EMAIL = "YET_TO_RECEIVE_KINDLE_EMAIL",
  YET_TO_RECEIVE_KINDLE_EMAIL_UPDATE = "YET_TO_RECEIVE_KINDLE_EMAIL_UPDATE",
  INITIALIZED = "INITIALIZED",
}

type Handler = (
  user: User,
  message: {
    from: any;
    text?: any;
    document?: any;
    entities?: any;
  }
) => {};

export const stateHandlers: Record<State, Handler> = {
  [State.FIRST_INTERACTION]: async (user, { from }) => {
    const [message, options] = messages.initialization(user.senderEmail);
    await api.sendMessage(message, from.id, options);
    await db.user.update({
      where: { chatId: from.id.toString() },
      data: { state: State.YET_TO_APPROVE_SENDER_EMAIL },
    });
  },
  [State.YET_TO_APPROVE_SENDER_EMAIL]: async (user, { from }) => {
    const [message, options] = messages.senderEmailYetToApprove(
      user.senderEmail
    );
    await api.sendMessage(message, from.id, options);
  },
  [State.YET_TO_RECEIVE_KINDLE_EMAIL]: async (user, { from, text }) => {
    if (text) {
      const email = validateEmail(text);
      if (!email) {
        await api.sendMessage(messages.invalidKindleEmail, from.id);
        return;
      }
      await db.user.update({
        where: { id: user.id },
        data: { kindleEmail: email, state: State.INITIALIZED },
      });
      await api.sendMessage(messages.botReady, from.id);
    }
  },
  [State.YET_TO_RECEIVE_KINDLE_EMAIL_UPDATE]: async (
    user,
    { from, text, entities }
  ) => {
    if (text) {
      const commandFromText = getCommandFromText(text, entities);
      if (commandFromText === "cancel") {
        await db.user.update({
          where: { id: user.id },
          data: { state: State.INITIALIZED },
        });
        await api.sendMessage(messages.commands.cancel()[0], from.id);
        return;
      }
      const email = validateEmail(text);
      if (!email) {
        await api.sendMessage(messages.invalidKindleEmail, from.id);
        return;
      }
      await db.user.update({
        where: { id: user.id },
        data: { kindleEmail: email, state: State.INITIALIZED },
      });
      await api.sendMessage(messages.botReady, from.id);
    }
  },
  [State.INITIALIZED]: async (user, { from, text, document, entities }) => {
    if (text) {
      const commandFromText = getCommandFromText(text, entities);
      const getMessage = messages.commands[commandFromText];
      const [message, options] = getMessage
        ? await getMessage(user)
        : messages.invalidDefaultCommand(!!commandFromText);
      await api.sendMessage(message, from.id, options);
      switch (commandFromText) {
        case "edit_email":
          await db.user.update({
            where: { id: user.id },
            data: { state: State.YET_TO_RECEIVE_KINDLE_EMAIL_UPDATE },
          });
          break;
      }
      return;
    }
    if (await isDocument(document, from)) {
      const { deliveriesToday, dailyDeliveryLimit } = await getUsageInfo(user);
      if (deliveriesToday >= dailyDeliveryLimit) {
        await api.sendMessage(
          await messages.deliveryLimitReached(user),
          from.id
        );
        return;
      }
      if (config.useWorkerThreads) {
        const handlerFile = path.resolve("./document-handler.js");
        const worker = new Worker(handlerFile, {
          workerData: { user, document },
        });
        worker.on("exit", () => {});
      } else documentHandler(user, document);
    }
  },
};
