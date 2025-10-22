import { rtsp_cam_in, rtsp_cam_out, sgn_stations, sgn_vehicles } from '../config/index.js';
import { emitVehicleEntries, emitVehicleUpdate, getDownstreamSocket } from '../ws/downstream/index.js';
import { getDistanceMeters } from '../ultils/index.js';
import { getLastRecentEntries, insertEntry, updateEntry } from '../database/supabase.js';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { entriesCleanup } from './entriesCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration constants
const CONFIG = {
    STATION_RADIUS_METERS: 90,
    RECORDING_DURATION_SECONDS: 60,
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
};

let isFirstStart = false;
let LAST_CLEANUP_TIME = '';

export const checkVehicle = async (vehicle) => {
    if (!isValidVehicle(vehicle)) return;

    // Emit real-time location update
    emitVehicleUpdate(createVehicleUpdate(vehicle));

    const entries = await getLastRecentEntries();

    // Process each station
    for (const stationObj of sgn_stations) {
        await processVehicleAtStation(vehicle, stationObj, entries);
    }
};

// Validation and utility functions
const isValidVehicle = (vehicle) => {
    return (
        vehicle && // Check if vehicle object exists
        vehicle.deviceID && // Ensure deviceID is present
        vehicle.location && //  Ensure location object exists
        vehicle.location.latitude && // Ensure latitude is present
        vehicle.location.longitude && // Ensure longitude is present
        vehicle.location.latitude !== '' && // Ensure latitude is not an empty string
        vehicle.location.longitude !== '' && // Ensure longitude is not an empty string
        vehicle.location.latitude !== '0' && // Ensure latitude is not '0'
        vehicle.location.longitude !== '0' && // Ensure longitude is not '0'
        !vehicle.location.latitude.startsWith('0') && // Ensure latitude does not start with '0'
        !vehicle.location.longitude.startsWith('0') && // Ensure longitude does not start with '0'
        sgn_vehicles.includes(vehicle.deviceID)
    ); // Ensure deviceID is in the list of known vehicles
};

const createVehicleUpdate = (vehicle) => ({
    deviceID: vehicle.deviceID,
    latitude: vehicle.location?.latitude,
    longitude: vehicle.location?.longitude,
    speed: vehicle.location?.speed,
    direct: vehicle.location?.direct,
});

const processVehicleAtStation = async (vehicle, stationObj, entries) => {
    const stationCode = Object.keys(stationObj)[0];
    const station = stationObj[stationCode];

    const { isInside, distance } = calculateVehiclePosition(vehicle, station);
    const currentEntry = findVehicleEntry(entries, vehicle.deviceID, stationCode);

    if (isInside && (!currentEntry || !currentEntry.isInside)) {
        await checkIn(stationCode, vehicle);
    } else if (distance > 60 && currentEntry && currentEntry.isInside) {
        await checkOut(stationCode, vehicle);
    }

    const now = new Date();
    if (!LAST_CLEANUP_TIME || now - LAST_CLEANUP_TIME > CONFIG.CLEANUP_INTERVAL_MS) {
        LAST_CLEANUP_TIME = new Date();
        await entriesCleanup(); // Clean up entries periodically
    }
};

// Position calculation
const calculateVehiclePosition = (vehicle, station) => {
    const stationLat = parseFloat(station.latitude);
    const stationLong = parseFloat(station.longitude);
    const distance = getDistanceMeters(vehicle.location?.latitude, vehicle.location?.longitude, stationLat, stationLong);

    return {
        isInside: distance <= CONFIG.STATION_RADIUS_METERS,
        distance,
    };
};

const findVehicleEntry = (entries, deviceID, stationCode) => {
    return entries.find((entry) => entry.plate_number === deviceID && entry.station === stationCode);
};

const checkIn = async (stationCode, vehicle) => {
    try {
        const entries = await getLastRecentEntries();
        const existingEntry = entries.find((e) => e.plate_number === vehicle.deviceID && e.station === stationCode && e.isInside);

        if (!existingEntry) {
            const newEntry = {
                plate_number: vehicle.deviceID,
                station: stationCode,
                in_time: new Date(),
                out_time: null,
                isInside: true,
            };

            await insertEntry(newEntry);
            emitVehicleEntries([...entries, newEntry]);

            console.log(`✅ Vehicle ${vehicle.deviceID} checked in at station ${stationCode}`);
            captureVehicle(vehicle.deviceID, rtsp_cam_in, true);
        }
    } catch (error) {
        console.error('Error in checkIn:', error);
        throw error;
    }
};

const checkOut = async (stationCode, vehicle) => {
    try {
        const entries = await getLastRecentEntries();
        const entry = entries.find((e) => {
            if (e.plate_number !== vehicle.deviceID || e.station !== stationCode) {
                return false;
            }
            return true;
        });

        if (entry) {
            entry.out_time = new Date();
            entry.isInside = false;

            await updateEntry(entry);
            emitVehicleEntries(entries);

            console.log(`✅ Vehicle ${vehicle.deviceID} checked out from station ${stationCode}`);
            captureVehicle(vehicle.deviceID, rtsp_cam_out, false);
        }
    } catch (error) {
        console.error('Error in checkOut:', error);
        throw error;
    }
};

// Video capture functionality
const activeRecordings = new Map();

const captureVehicle = (plateNumber, rtspUrl, checkIn) => {
    if (isFirstStart) return;
    if (activeRecordings.has(plateNumber)) {
        console.log(`Already recording ${plateNumber}`);
        return;
    }

    const socket = getDownstreamSocket();
    if (!socket) {
        console.warn(`No downstream socket available`);
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${plateNumber}_${checkIn ? 'in' : 'out'}_${timestamp}`;
    const dir = path.join(__dirname, '../../videos');
    const filepath = path.join(dir, `${baseFilename}.mp4`); // real file will be .mp4
    const sockets = new Set([socket]);

    ensureVideoDirectoryExists(dir);

    console.log(`🎥 Started recording for ${plateNumber}`);

    const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport',
        'tcp',
        '-i',
        rtspUrl,
        '-t',
        CONFIG.RECORDING_DURATION_SECONDS.toString(),
        '-an',
        '-map',
        '0:v:0', // map only video stream
        '-c:v',
        'mjpeg',
        '-f',
        'tee',
        `[f=mjpeg]pipe\\:1|[f=mp4]${filepath}`,
    ]);

    let buffer = Buffer.alloc(0);

    ffmpeg.stdout.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        let start = buffer.indexOf(Buffer.from([0xff, 0xd8])); // SOI
        let end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2); // EOI

        while (start !== -1 && end !== -1) {
            const jpeg = buffer.subarray(start, end + 2);
            for (const s of sockets) {
                s.emit('video', jpeg); // ✅ Full JPEG frame
            }

            buffer = buffer.subarray(end + 2);
            start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
            end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // Uncomment to debug FFmpeg logs
        // console.error(`[FFmpeg ${plateNumber}] ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`✅ Recording complete for ${plateNumber} (code ${code})`);
        for (const s of sockets) {
            s.emit('video-end', { plateNumber, file: `${baseFilename}.mp4` });
        }
        activeRecordings.delete(plateNumber);
    });

    activeRecordings.set(plateNumber, { ffmpeg, sockets });
};

const ensureVideoDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
