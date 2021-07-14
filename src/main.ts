import "dotenv/config";
import polka from "polka";
import { verifyDocument } from "./verify-document";
import telegram from "./bot";
import config from "../config.json";
import { json } from "body-parser";
import { mailQueue } from "./bot/handler";

const telegramWebhookEndpoint = `${config.bot.webhookPath}/${config.bot.token}`;

polka()
  .post(telegramWebhookEndpoint, (req, res) => {
    json()(req, res, () => telegram(req, res));
  })
  .post("/incoming-mail", async (req, res) => {
    console.log("Email received!");
    const verificationResult = await verifyDocument(req);
    if (!verificationResult) {
      console.log("Verification failed :(");
    }
    res.end("Done!");
  })
  .listen(process.env.PORT, () =>
    console.log("Server listening on port", process.env.PORT)
  );

mailQueue();
