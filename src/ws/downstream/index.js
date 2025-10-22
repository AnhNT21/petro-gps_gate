import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { getLastRecentEntries } from '../../database/supabase.js';

let downstream;
export const initDownstreamServer = (server) => {
    downstream = new SocketIOServer(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', ''],
            methods: ['GET', 'POST'],
        },
    });
    console.log('🟢 Downstream WebSocket server initialized');

    downstream.on('connection', async (socket) => {
        console.log('🟢 Client connected:', socket.id);

        // Emit the last recent entries to the newly connected client
        emitVehicleEntries((await getLastRecentEntries()) || []);

        socket.on('disconnect', () => {
            console.log('🔴 Client disconnected:', socket.id);
        });
    });
};

export const emitVehicleUpdate = (vehicleData) => {
    if (downstream) {
        downstream.emit('newLocation', vehicleData); // broadcast to all clients
    }
};

export const emitVehicleEntries = (entries) => {
    if (downstream) {
        downstream.emit('vehicleEntries', entries); // broadcast to all clients
    }
};

export const getDownstreamSocket = () => {
    if (!downstream) {
        throw new Error('Downstream WebSocket server is not initialized');
    }
    return downstream;
};
