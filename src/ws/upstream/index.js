import axios from 'axios';
import { WebSocket } from 'ws';
import { credential, upstreamSocketUrl } from '../../config/index.js';
import { checkVehicle } from '../../processor/vehicle.js';
import { delay } from '../../ultils/index.js';
import fs from 'fs';
import path from 'path';

export const connectUpstreamSocket = async () => {
    const upstream = new WebSocket(upstreamSocketUrl);
    const upstreamConfig = await getCredentialsFromFile();

    upstream.on('open', () => {
        console.log('Connected to upstream WS');
        upstreamLogin(upstream);
        upstreamSubscribe(upstream);
        upstreamKeepAlive(upstream, upstreamConfig.token);
    });

    upstream.on('message', async (msg) => {
        const data = JSON.parse(msg.toString());

        checkVehicle(data.payload);

        // Toekn re-authentication
        if (data.action === '80000' && data.payload.result === 'fail') {
            console.log(`[Re-authentication | ${new Date()}] Token expired, re-authenticating...`);
            const reAuthData = await reAuthenticate();

            if (reAuthData && reAuthData.token) {
                upstreamLogin(upstream, reAuthData);
                upstreamSubscribe(upstream);
                upstreamKeepAlive(upstream, reAuthData);
            } else {
                console.error('Re-authentication failed, please check your credentials');
            }
        }

        if (data.action === '80009') {
            console.log(`[Keep-alive | ${new Date()}] ${data.payload}`);
        }

        if (data.payload.result === 'fail') {
            console.error(`[${data.action} | ${new Date()}] ${data.payload.msg}`);
        }
    });

    upstream.on('error', (err) => {
        console.error('Upstream WS error:', err.message);
        clientSocket.emit('error', 'Upstream connection failed.');
    });
};

const upstreamLogin = async (upstream, newCredential) => {
    const upstreamConfig = await getCredentialsFromFile();

    // console.log('Using upstream credentials:', {
    //     username: upstreamConfig.username,
    //     token: newCredential?.token || upstreamConfig.token,
    //     pid: newCredential?.pid || upstreamConfig.pid,
    // });

    upstream.send(
        JSON.stringify({
            action: 80000,
            payload: {
                username: upstreamConfig.username,
                token: newCredential?.token || upstreamConfig.token,
                pid: newCredential?.pid || upstreamConfig.pid,
            },
        })
    );
    // console.log('Upstream login sent with credentials:', {
    //     username: upstreamConfig.username,
    //     token: newCredential?.token || upstreamConfig.token,
    //     pid: newCredential?.pid || upstreamConfig.pid,
    // });
    console.log('Upstream login sent');
};

const upstreamSubscribe = async (upstream) => {
    // Subscribe to messages
    upstream.send(
        JSON.stringify({
            action: '80001',
            payload: '',
        })
    );
    console.log('Upstream subscription sent');
};

let intervalId = '';
const upstreamKeepAlive = async (upstream, newCredential) => {
    clearInterval(intervalId);
    const upstreamConfig = await getCredentialsFromFile();
    intervalId = setInterval(() => {
        upstream.send(
            JSON.stringify({
                action: '80009',
                payload: {
                    username: upstreamConfig.username,
                    token: newCredential?.token || upstreamConfig.token,
                },
            })
        );
        // console.log('Keep-alive sent to upstream WS');
    }, 60000); // Keep-alive interval
};

const reAuthenticate = async () => {
    const axiosConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'http://ref.petrolimexaviation.vn:9966/vss/user/apiLogin.action',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: 'JSESSIONID=998E4F645FBDCB5A735790726AA0E904; fecbb6e8b4699053=d261f2fc7d6a4ad8bb72eed0569f0c6a',
        },
        data: credential,
    };

    try {
        let response = await axios.request(axiosConfig);
        if (response.data.status == '10082') {
            console.warn('Re-authenticate fail retrying in 5 minutes...');
            await delay(1000 * 60 * 5);
            response = await axios.request(axiosConfig);
        }
        // console.log('Re-authenticated', response.data);
        if (response.data.msg == 'Success') {
            const authData = {
                token: response.data.data.token,
                pid: response.data.data.pid,
            };

            // Save the new credentials to config file
            await saveCredentialsToFile(authData);

            return authData;
        }
    } catch (error) {
        console.error('Re-authentication failed', error);
        throw error;
    }
};

// Save credentials to config file
const saveCredentialsToFile = async (authData) => {
    try {
        const configPath = path.resolve('./src/config/upstream.json');
        const configData = {
            username: 'admin',
            token: authData.token,
            pid: authData.pid,
            lastUpdated: new Date().toISOString(),
        };

        await fs.promises.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf-8');
        console.log('✅ Re-authentication credentials saved to config file');
    } catch (error) {
        console.error('❌ Failed to save credentials to config file:', error);
        // Don't throw error - this is not critical for operation
    }
};

const getCredentialsFromFile = async () => {
    try {
        const configPath = path.resolve('./src/config/upstream.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('❌ Failed to get credentials from config file:', error);
        return null;
    }
};
