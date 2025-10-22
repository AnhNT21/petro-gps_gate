import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import * as XLSX from 'xlsx';

const TruckIcon = (direction) =>
    L.divIcon({
        html: `<img src="/portal/truck_icon.png" style="transform: rotate(${direction}deg); width: 12px; height: 25px;" />`,
        iconSize: [12, 25],
        className: 'truck-icon-wrapper', // optional, for styling
    });

const th = {
    textAlign: 'left',
    padding: 10,
    borderBottom: '2px solid #ccc',
    background: '#f0f0f0',
};

const td = {
    padding: 10,
    borderBottom: '1px solid #eee',
};

function AutoZoom({ vehicles }) {
    const map = useMap();
    const timeoutRef = useRef(null);
    const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);

    // Handle user interaction
    useEffect(() => {
        const handleInteraction = () => {
            setAutoZoomEnabled(false);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setAutoZoomEnabled(true);
            }, 10000); // 10 seconds
        };

        map.on('mousedown', handleInteraction);
        map.on('zoomstart', handleInteraction);
        map.on('dragstart', handleInteraction);

        return () => {
            map.off('mousedown', handleInteraction);
            map.off('zoomstart', handleInteraction);
            map.off('dragstart', handleInteraction);
        };
    }, [map]);

    // Fit bounds when autoZoomEnabled and vehicles change
    useEffect(() => {
        if (!autoZoomEnabled || Object.keys(vehicles).length === 0) return;

        const positions = Object.values(vehicles).map((v) => [parseFloat(v.latitude), parseFloat(v.longitude)]);

        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [150, 150] });
        }
    }, [vehicles, map, autoZoomEnabled]);

    return null;
}

export default function App() {
    const [vehicles, setVehicles] = useState({});
    const [entries, setEntries] = useState([]);
    const [imgUrl, setImgUrl] = useState('');

    useEffect(() => {
        const socket = io('http://localhost:3000');

        socket.on('newLocation', (msg) => {
            try {
                const vehicle = msg;
                if (!vehicle.latitude.startsWith('0.') && !vehicle.longitude.startsWith('0.')) {
                    setVehicles((prev) => ({
                        ...prev,
                        [vehicle.deviceID]: vehicle,
                    }));
                }
            } catch (e) {
                console.error('Invalid JSON', msg);
            }
        });

        socket.on('vehicleEntries', (entries) => {
            entries.sort((a, b) => new Date(a.in_time) - new Date(b.in_time));
            setEntries(entries);
        });

        socket.on('video', (jpeg) => {
            const blob = new Blob([jpeg], { type: 'image/jpeg' });
            setImgUrl(URL.createObjectURL(blob));
        });

        socket.on('video-end', ({ file }) => {
            URL.revokeObjectURL(imgUrl);
            setImgUrl('');
        });

        return () => {
            socket.disconnect();
        };
    }, [imgUrl]);

    const getDuration = (inTime, outTime) => {
        const start = new Date(inTime);
        const end = outTime ? new Date(outTime) : new Date();
        const ms = end - start;

        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    const exportToXlsx = () => {
        const headers = ['Plate', 'In Time', 'Out Time', 'Duration'];
        const rows = entries.map((e) => [e.plate_number, fmt(e.in_time), e.out_time ? fmt(e.out_time) : '-', getDuration(e.in_time, e.out_time)]);

        const aoa = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Entries');

        const fname = 'vehicle_entries_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.xlsx';

        XLSX.writeFile(wb, fname); // Browser: download; Electron: saves via fs
    };

    return (
        <div style={{ display: 'flex', height: '100vh', flexDirection: 'row' }}>
            <img
                src={imgUrl}
                alt='Live'
                style={{
                    borderRadius: '8px',
                    position: 'absolute',
                    top: '50px',
                    left: '200px',
                    width: '320px',
                    height: '180px',
                    zIndex: 1000,
                    display: imgUrl ? 'block' : 'none',
                }}
            />
            <MapContainer
                center={[10.7769, 106.7009]}
                zoom={13}
                style={{ height: '100%', width: '50%' }}
            >
                <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                <AutoZoom vehicles={vehicles} />
                {Object.values(vehicles).map((v) => (
                    <Marker
                        key={v.deviceID}
                        position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                        // icon={vehicleIcon}
                        icon={TruckIcon(v.direct)}
                    >
                        <Tooltip
                            direction='top'
                            offset={[0, -10]}
                            permanent
                        >
                            {v.deviceID}
                        </Tooltip>
                        <Popup>
                            <strong>{v.deviceID}</strong>
                            <br />
                            Speed: {v.speed}
                            <br />
                            Direction: {v.direct}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            <div style={{ width: '50%', padding: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <h2>Vehicle List</h2>
                    <button
                        onClick={exportToXlsx}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #ddd',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Export
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={th}>Plate</th>
                            <th style={th}>In Time</th>
                            <th style={th}>Out Time</th>
                            <th style={th}>Duration</th>
                            {/* <th style={th}>Status</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id}>
                                <td style={td}>{entry.plate_number}</td>
                                <td style={td}>{new Date(entry.in_time).toLocaleString()}</td>
                                <td style={td}>{entry.out_time ? new Date(entry.out_time).toLocaleString() : '-'}</td>
                                <td style={td}>{getDuration(entry.in_time, entry.out_time)}</td>
                                {/* <td style={td}>
                                    <span
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            backgroundColor: entry.isInside ? '#2196F3' : '#F44336',
                                            color: 'white',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {entry.isInside ? 'Inside' : 'Outside'}
                                    </span>
                                </td> */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const fmt = (d) => new Date(d).toLocaleString();
