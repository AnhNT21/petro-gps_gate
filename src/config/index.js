import qs from 'qs';

export const credential = qs.stringify({
    username: process.env.UPSTREAM_USERNAME,
    password: process.env.UPSTREAM_PASSWORD,
});

export const upstreamSocketUrl = process.env.UPSTREAM_SOCKET_URL;

export const sgn_vehicles = ['SGN-32001', 'SGN-32002', 'SGN-32003', 'SGN-32006', 'SGN-32008', 'SGN-32009', 'SGN-32015'];

export const sgn_stations = [
    {
        SGN: {
            name: 'SGN',
            latitude: '10.820397678344829',
            longitude: '106.67308348033158',
        },
    },
];

export const entries = [
    {
        station: 'SGN',
        deviceID: 'SGN-32001',
        checkedIn: '2025-06-13T03:45:22.196Z',
        isInside: false,
        checkedOut: '2025-06-13T05:45:22.196Z',
    },
    {
        station: 'SGN',
        deviceID: 'SGN-32002',
        checkedIn: '2025-06-13T05:45:19.021Z',
        isInside: false,
        checkedOut: '2025-06-13T05:45:22.196Z',
    },
    {
        station: 'SGN',
        deviceID: 'SGN-32015',
        checkedIn: '2025-06-13T05:45:22.196Z',
        isInside: false,
        checkedOut: '2025-06-13T06:45:22.196Z',
    },
];

export const rtsp_cam_in = process.env.RTSP_CAM_IN;
export const rtsp_cam_out = process.env.RTSP_CAM_OUT;
