const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'support_db.json');

// Ensure database file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ rooms: [], messages: [], clinicalRooms: [] }, null, 2));
}

const readDb = () => {
  try {
    const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!db.rooms) db.rooms = [];
    if (!db.messages) db.messages = [];
    if (!db.clinicalRooms) db.clinicalRooms = [];
    return db;
  } catch (e) {
    return { rooms: [], messages: [], clinicalRooms: [] };
  }
};

const writeDb = (db) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to write database:', e);
  }
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/support/rooms' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.rooms));
  } else if (url.pathname === '/api/support/rooms' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const room = JSON.parse(body);
        const db = readDb();
        if (!db.rooms.some(r => r._id === room._id)) {
          db.rooms.unshift(room);
          writeDb(db);
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(room));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else if (url.pathname === '/api/support/messages' && req.method === 'GET') {
    const chatId = url.searchParams.get('chatId');
    const db = readDb();
    const msgs = chatId ? db.messages.filter(m => m.chatId === chatId) : db.messages;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(msgs));
  } else if (url.pathname === '/api/support/messages' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        const db = readDb();
        db.messages.push(msg);
        
        // Update room lastMessage
        db.rooms = db.rooms.map(r => {
          if (r._id === msg.chatId) {
            return { ...r, lastMessage: { message: msg.message, createdAt: msg.createdAt } };
          }
          return r;
        });
        
        writeDb(db);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(msg));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else if (url.pathname === '/api/clinical/rooms' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.clinicalRooms || []));
  } else if (url.pathname === '/api/clinical/rooms' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const room = JSON.parse(body);
        const db = readDb();
        if (!db.clinicalRooms) db.clinicalRooms = [];
        
        const existingIdx = db.clinicalRooms.findIndex(r => r._id === room._id);
        if (existingIdx === -1) {
          db.clinicalRooms.unshift(room);
        } else {
          db.clinicalRooms[existingIdx] = {
            ...db.clinicalRooms[existingIdx],
            ...room,
            lastMessage: room.lastMessage || db.clinicalRooms[existingIdx].lastMessage
          };
        }
        writeDb(db);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(room));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`SmartClinic Support Relay Server running on http://localhost:${PORT}`);
  console.log(`This server synchronizes Support Complaints chats across browsers.`);
  console.log(`================================================================`);
});
