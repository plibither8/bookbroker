import ngrok from "ngrok";
import config from "../../config.js";

class Domain {
  domain: string;

  constructor() {
    this.domain = config.domain;
  }

  async prepare() {
    this.domain =
      process.env.ENVIRONMENT === "dev"
        ? await ngrok.connect(3000)
        : config.domain;
    return;
  }
}

process.on("SIGINT", async () => {
  console.log("\nDisconnecting ngrok...");
  await ngrok.kill();
  process.exit();
});

const domain = new Domain();

export default domain;
