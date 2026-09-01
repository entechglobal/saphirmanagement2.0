import app from "./app.js";
import env from "./config/env.js";
import { getLanIPv4 } from "./utils/network.js";

const FRONT_PORT = process.env.FRONT_PORT || 5173;

app.listen(env.port, "0.0.0.0", () => {
  const lanIp = getLanIPv4();
  console.log(`🚀 Server listening on port ${env.port}`);
  console.log(`   Local:   http://localhost:${env.port}`);
  if (lanIp) {
    console.log(`   Network: http://${lanIp}:${env.port}`);
    console.log(`   App:     http://${lanIp}:${FRONT_PORT}`);
  } else {
    console.log("   Network: no LAN address found");
  }
});
