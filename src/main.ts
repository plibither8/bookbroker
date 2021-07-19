import "dotenv/config";
import polka from "polka";
import telegram from "./bot";
import config from "../config.json";
import { json } from "body-parser";
import { donateCallbackHandler } from "./bot/payment";

polka()
  .use(json())
  .post(`${config.bot.webhookPath}/${config.bot.token}`, telegram)
  .get("donate", donateCallbackHandler)
  .listen(process.env.PORT, () =>
    console.log("Server listening on port", process.env.PORT)
  );
