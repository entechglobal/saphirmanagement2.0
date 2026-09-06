import app from "./app.js";
import env from "./config/env.js";
import { getLanIPv4 } from "./utils/network.js";

const isProduction = process.env.NODE_ENV === "production";
const FRONT_PORT = process.env.FRONT_PORT || 5173;

app.listen(env.port, "0.0.0.0", () => {
  const lanIp = getLanIPv4();
  const port = env.port;
  console.log(
    `🚀 ${isProduction ? "Production" : "Development"} server on port ${port}`,
  );
  if (isProduction) {
    console.log(`   App:     http://localhost:${port}`);
    if (lanIp) console.log(`   Network: http://${lanIp}:${port}`);
  } else {
    console.log(`   API:     http://localhost:${port}`);
    if (lanIp) {
      console.log(`   Network: http://${lanIp}:${port}`);
      console.log(`   App:     http://${lanIp}:${FRONT_PORT}`);
    } else {
      console.log("   Network: no LAN address found");
    }
  }
});
