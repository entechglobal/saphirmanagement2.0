const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../node_modules/zkteco-js/src/ztcp.js");
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, "utf8");
const broken = `} catch (err) {
                reject(err)
                console.log(reply)

            }`;
const fixed = `} catch (err) {
                reject(err);
                return;
            }`;

if (source.includes(broken)) {
  fs.writeFileSync(file, source.replace(broken, fixed));
  console.log("patched zkteco-js readWithBuffer timeout crash");
}
