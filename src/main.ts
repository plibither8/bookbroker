import "dotenv/config";
import polka from "polka";
import telegram from "./bot";
import config from "../config.json";
import { json } from "body-parser";

polka()
  .use(json())
  .post(`${config.bot.webhookPath}/${config.bot.token}`, telegram)
  .listen(process.env.PORT, () =>
    console.log("Server listening on port", process.env.PORT)
  );
