/* Playwright для проверок в браузере: из tools/node_modules (cd tools && npm install && npx playwright install chromium)
   или из общей установки /opt/npm-tools, если она есть. */
try { module.exports = require('playwright'); } catch (e) { module.exports = require('/opt/npm-tools/node_modules/playwright'); }
