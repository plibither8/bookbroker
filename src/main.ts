import bodyParser from "body-parser";
import "dotenv/config.js";
import polka from "polka";
import config from "../config.js";
import telegram from "./bot/index.js";
import { donateCallbackHandler } from "./bot/payment.js";

polka()
  .use(bodyParser.json())
  .post(`${config.bot.webhookPath}/${config.bot.token}`, telegram)
  .get("donate", donateCallbackHandler)
  .listen(process.env.PORT, () =>
    console.log("Server listening on port", process.env.PORT)
  );
