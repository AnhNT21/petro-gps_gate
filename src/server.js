import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { connectUpstreamSocket } from './ws/upstream/index.js';
import { initDownstreamServer } from './ws/downstream/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});

connectUpstreamSocket();
initDownstreamServer(server);
