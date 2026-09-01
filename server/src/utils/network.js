import os from "os";

export function getLanIPv4() {
  const interfaces = os.networkInterfaces();
  for (const addrs of Object.values(interfaces)) {
    for (const net of addrs ?? []) {
      const ipv4 = net.family === "IPv4" || net.family === 4;
      if (ipv4 && !net.internal) return net.address;
    }
  }
  return null;
}

export function getPublicBaseUrl() {
  const configured = (process.env.BASE_URL || "").replace(/\/$/, "");
  const isLoopback =
    !configured ||
    configured.includes("localhost") ||
    configured.includes("127.0.0.1");

  if (!isLoopback) return configured;

  const port = process.env.PORT || 3000;
  const ip = getLanIPv4();
  return ip ? `http://${ip}:${port}` : configured || `http://localhost:${port}`;
}
