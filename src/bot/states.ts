import { Worker } from "worker_threads";
import path from "path";
import { User, PrismaClient } from "@prisma/client";
import api from "./api";
import messages from "./messages";
import { isDocument, validateEmail } from "./utils";
import config from "../../config.json";
import documentHandler from "./document-handler";

const prisma = new PrismaClient();

export const enum State {
  FIRST_INTERACTION = "FIRST_INTERACTION",
  YET_TO_APPROVE_SENDER_EMAIL = "YET_TO_APPROVE_SENDER_EMAIL",
  YET_TO_RECEIVE_KINDLE_EMAIL = "YET_TO_RECEIVE_KINDLE_EMAIL",
  INITIALIZED = "INITIALIZED",
}

type Handler = (user: User, from: any, text?: any, document?: any) => {};

export const stateHandlers: Record<State, Handler> = {
  [State.FIRST_INTERACTION]: async (user, from) => {
    const [message, options] = messages.initialization(user.senderEmail);
    await api.sendMessage(message, from.id, options);
    await prisma.user.update({
      where: { chatId: from.id.toString() },
      data: { state: State.YET_TO_APPROVE_SENDER_EMAIL },
    });
  },
  [State.YET_TO_APPROVE_SENDER_EMAIL]: async (user, from) => {
    const [message, options] = messages.senderEmailYetToApprove(
      user.senderEmail
    );
    await api.sendMessage(message, from.id, options);
  },
  [State.YET_TO_RECEIVE_KINDLE_EMAIL]: async (user, from, text) => {
    if (text) {
      const email = validateEmail(text);
      if (!email) {
        await api.sendMessage(messages.invalidSenderEmail, from.id);
        return;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { kindleEmail: email, state: State.INITIALIZED },
      });
      await api.sendMessage(messages.botReady, from.id);
    }
  },
  [State.INITIALIZED]: async (user, from, text, document) => {
    if (await isDocument(document, from)) {
      if (config.useWorkerThreads) {
        const handlerFile = path.join(__dirname, "document-handler.js");
        const worker = new Worker(handlerFile, {
          workerData: { user, document },
        });
        worker.on("exit", () => {});
      } else documentHandler(user, document);
    }
  },
};
