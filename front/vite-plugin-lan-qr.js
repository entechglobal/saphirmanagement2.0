import os from "node:os";
import qrcode from "qrcode-terminal";

function getLanIPv4() {
  const interfaces = os.networkInterfaces();
  for (const addrs of Object.values(interfaces)) {
    for (const net of addrs ?? []) {
      const ipv4 = net.family === "IPv4" || net.family === 4;
      if (ipv4 && !net.internal) return net.address;
    }
  }
  return null;
}

export function lanQrPlugin() {
  return {
    name: "lan-qr",
    configureServer(server) {
      const originalPrintUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        originalPrintUrls();

        const networkUrl = server.resolvedUrls?.network?.[0];
        const lanIp = getLanIPv4();
        const port = server.config.server.port || 5173;
        const url = networkUrl || (lanIp ? `http://${lanIp}:${port}/` : null);

        if (!url) {
          console.log("\n  No LAN address found. Connect to Wi-Fi and restart.\n");
          return;
        }

        console.log("\n  ────────────────────────────────────────");
        console.log("  SaphirCaisse — open on your phone");
        console.log(`  ${url}`);
        console.log("  Same Wi-Fi required");
        console.log("  ────────────────────────────────────────\n");
        qrcode.generate(url, { small: true });
        console.log("");
      };
    },
  };
}
