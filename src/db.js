const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'licenses.json');

function ensureDb() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ licenses: [] }, null, 2));
}

function readDb() {
    ensureDb();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
    ensureDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
