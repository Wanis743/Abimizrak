const fs = require("fs");
let c = fs.readFileSync("drizzle.config.ts", "utf8");
c = c.replace(/path\.join\(__dirname, "\.\/src\/schema\/index\.ts"\)/, "\"./src/schema/index.ts\"");
c = c.replace(/if \(!process\.env\.DATABASE_URL\) \{[\s\S]*?\}/, "");
fs.writeFileSync("drizzle.config.ts", c);
