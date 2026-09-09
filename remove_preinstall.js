const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
delete pkg.scripts.preinstall;
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
