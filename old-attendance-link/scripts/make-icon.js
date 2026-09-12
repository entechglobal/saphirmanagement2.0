const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const buildDir = path.join(__dirname, "../build");
const sizes = [16, 32, 48, 64, 256];

function pngToDib(png) {
  const w = png.width;
  const h = png.height;
  const xorSize = w * h * 4;
  const andRow = Math.ceil(w / 32) * 4;
  const andSize = andRow * h;
  const buf = Buffer.alloc(40 + xorSize + andSize);
  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(w, 4);
  buf.writeInt32LE(h * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  let offset = 40;
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (png.width * y + x) << 2;
      buf[offset++] = png.data[i + 2];
      buf[offset++] = png.data[i + 1];
      buf[offset++] = png.data[i];
      buf[offset++] = png.data[i + 3];
    }
  }
  return buf;
}

const frames = sizes
  .map((size) => path.join(buildDir, `icon-${size}.png`))
  .filter((file) => fs.existsSync(file))
  .map((file) => {
    const png = PNG.sync.read(fs.readFileSync(file));
    const data = pngToDib(png);
    return { width: png.width, height: png.height, data };
  });

if (!frames.length) {
  console.error("No resized PNGs found. Generate icon-16.png … icon-256.png first.");
  process.exit(1);
}

const headerSize = 6 + 16 * frames.length;
const ico = Buffer.alloc(headerSize + frames.reduce((sum, f) => sum + f.data.length, 0));
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(frames.length, 4);

let dataOffset = headerSize;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  ico[entry] = frame.width >= 256 ? 0 : frame.width;
  ico[entry + 1] = frame.height >= 256 ? 0 : frame.height;
  ico[entry + 2] = 0;
  ico[entry + 3] = 0;
  ico.writeUInt16LE(1, entry + 4);
  ico.writeUInt16LE(32, entry + 6);
  ico.writeUInt32LE(frame.data.length, entry + 8);
  ico.writeUInt32LE(dataOffset, entry + 12);
  frame.data.copy(ico, dataOffset);
  dataOffset += frame.data.length;
});

const dest = path.join(buildDir, "icon.ico");
fs.writeFileSync(dest, ico);
console.log("Wrote", dest, ico.length, "bytes");
