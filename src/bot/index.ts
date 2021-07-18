import path from "path";
import { Worker } from "worker_threads";
import api from "./api";
import messages from "./messages";
import {
  createWebhookUrl,
  isBotInitialised,
  isAuthorized,
  isDocument,
} from "./utils";
import handler from "./handler";
import config from "../../config.json";

async function initialiseBot(forceReinit = false) {
  const initisationStatus = await isBotInitialised();
  if (initisationStatus && !forceReinit) return;

  console.log("Initialising bot...");
  await Promise.all([
    api.setWebhook({ url: createWebhookUrl() }),
    api.sendMessage(messages.reinitialisedBot(), undefined, {
      disable_web_page_preview: true,
    }),
  ]);
  console.log("Bot initialised!");
}

initialiseBot();

export default async function webhookHandler(req, res): Promise<void> {
  const { message } = req.body;
  if (message) {
    const { from, text, document } = message;
    if ((await isAuthorized(from, text)) && (await isDocument(document))) {
      if (config.useWorkerThreads) {
        const handlerFile = path.join(__dirname, "handler.js");
        const worker = new Worker(handlerFile, { workerData: { document } });
        worker.on("exit", () => {
          console.log(`Worker exited for message ${message.message_id}`);
        });
      } else handler(document);
    }
  }
  res.end();
}
