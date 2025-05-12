const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from web directory

// Store device states (key is deviceId)
const deviceStates = {};

// Store registered ESP32 devices
const registeredDevices = {};

// Root route handler - redirect to homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'swell-homepage.html'));
});

// API Endpoints

// Get device status
app.get('/api/device/:id', (req, res) => {
    const deviceId = req.params.id;
    const device = registeredDevices[deviceId];

    console.log(`Checking status for device ${deviceId}:`, device ? "Found" : "Not found");

    // Special handling for MAC addresses (case insensitive)
    let matchingDevice = null;
    if (!device) {
        // Try to find device with case-insensitive matching
        const normalizedId = deviceId.toLowerCase().replace(/:/g, '');
        for (const [id, dev] of Object.entries(registeredDevices)) {
            if (id.toLowerCase().replace(/:/g, '') === normalizedId) {
                matchingDevice = dev;
                break;
            }
        }
    }

    const activeDevice = device || matchingDevice;

    // Consider the device connected if:
    // 1. It exists in our registry
    // 2. It has been seen recently (within 60 seconds)
    // 3. It is marked as online
    const isConnected = activeDevice &&
        (Date.now() - activeDevice.lastSeen < 60000) &&
        activeDevice.isOnline;

    if (activeDevice) {
        console.log(`Last seen: ${new Date(activeDevice.lastSeen).toISOString()}, Connected: ${isConnected}`);
    }

    // Get device-specific state, or create default if none exists
    if (!deviceStates[deviceId]) {
        deviceStates[deviceId] = {
            light: false,
            aroma: false,
            music: {
                active: false,
                song: 'rainforest',
                volume: 50
            }
        };
    }

    res.json({
        id: deviceId,
        name: activeDevice ? activeDevice.deviceName : deviceId,
        connected: isConnected,
        state: deviceStates[deviceId],
        lastSeen: activeDevice ? activeDevice.lastSeen : null
    });
});

// Update device state
app.post('/api/device/:id/update', (req, res) => {
    const deviceId = req.params.id;
    const { feature, value } = req.body;

    // Ensure this device has a state object
    if (!deviceStates[deviceId]) {
        deviceStates[deviceId] = {
            light: false,
            aroma: false,
            music: {
                active: false,
                song: 'rainforest',
                volume: 50
            }
        };
    }

    const state = deviceStates[deviceId];

    switch (feature) {
        case 'light':
            state.light = value;
            break;
        case 'aroma':
            state.aroma = value;
            break;
        case 'music':
            if (value.hasOwnProperty('active')) state.music.active = value.active;
            if (value.hasOwnProperty('song')) state.music.song = value.song;
            if (value.hasOwnProperty('volume')) state.music.volume = value.volume;
            break;
    }

    res.json({ success: true, state });
});

// Disconnect a device
app.post('/api/device/:id/disconnect', (req, res) => {
    console.log(`Device ${req.params.id} disconnected`);
    res.json({ success: true, message: `Device ${req.params.id} disconnected successfully` });
});

// Register an ESP32 device
app.post('/api/esp32/register', (req, res) => {
    const { deviceId, deviceName, deviceType, deviceModel, ipAddress } = req.body;

    const cleanDeviceId = deviceId.toUpperCase();

    registeredDevices[cleanDeviceId] = {
        deviceId: cleanDeviceId,
        deviceName,
        deviceType,
        deviceModel,
        ipAddress,
        lastSeen: Date.now(),
        isOnline: true
    };

    if (!deviceStates[cleanDeviceId]) {
        deviceStates[cleanDeviceId] = {
            light: false,
            aroma: false,
            music: {
                active: false,
                song: 'rainforest',
                volume: 50
            }
        };
    }

    console.log(`Device registered: ${deviceName} (${cleanDeviceId})`);
    console.log("Current registered devices:", Object.keys(registeredDevices));

    res.json({ success: true });
});

// Get available devices
app.get('/api/devices/available', (req, res) => {
    try {
        const now = Date.now();
        const availableDevices = [];

        if (Object.keys(registeredDevices).length === 0) {
            availableDevices.push({
                id: "demo_device",
                name: "Demo SWELL Device",
                type: "smart_lamp",
                model: "ESP32",
                status: 'available'
            });

            console.log("No registered devices found. Returning demo device.");
            return res.json(availableDevices);
        }

        Object.values(registeredDevices).forEach(device => {
            if (now - device.lastSeen < 60000) {
                availableDevices.push({
                    id: device.deviceId,
                    name: device.deviceName,
                    type: device.deviceType,
                    model: device.deviceModel,
                    status: 'available'
                });
            } else {
                device.isOnline = false;
            }
        });

        console.log(`Found ${availableDevices.length} available devices`);
        res.json(availableDevices);
    } catch (error) {
        console.error("Error in /api/devices/available:", error);
        res.status(500).json({ error: "Failed to search for devices" });
    }
});

// Get all connected devices
app.get('/api/devices/connected', (req, res) => {
    const connectedDevices = [];
    const now = Date.now();

    Object.values(registeredDevices).forEach(device => {
        const isConnected = (now - device.lastSeen < 60000) && device.isOnline;
        if (isConnected) {
            connectedDevices.push({
                id: device.deviceId,
                name: device.deviceName,
                type: device.deviceType,
                model: device.deviceModel,
                status: 'connected'
            });
        }
    });

    res.json(connectedDevices);
});

// Update last seen timestamp when device pings server
app.get('/api/esp32/status/:id', (req, res) => {
    const deviceId = req.params.id;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log(`ESP32 status request from IP ${clientIp} for device ${deviceId}`);

    let device = registeredDevices[deviceId];

    if (device) {
        device.lastSeen = Date.now();
        device.isOnline = true;
        device.ipAddress = clientIp;

        console.log(`Updated last seen time for device ${deviceId}`);

        if (!deviceStates[deviceId]) {
            deviceStates[deviceId] = {
                light: false,
                aroma: false,
                music: {
                    active: false,
                    song: 'rainforest',
                    volume: 50
                }
            };
        }

        res.json(deviceStates[deviceId]);
    } else {
        console.log(`Device ${deviceId} not registered but trying to connect`);
        res.status(404).json({ error: "Device not registered" });
    }
});

// Connect to a device
app.post('/api/devices/connect', (req, res) => {
    try {
        const { deviceId } = req.body;

        if (deviceId === "demo_device") {
            registeredDevices[deviceId] = {
                deviceId: "demo_device",
                deviceName: "Demo SWELL Device",
                deviceType: "smart_lamp",
                deviceModel: "ESP32",
                ipAddress: "127.0.0.1",
                lastSeen: Date.now(),
                isOnline: true
            };

            if (!deviceStates[deviceId]) {
                deviceStates[deviceId] = {
                    light: false,
                    aroma: false,
                    music: {
                        active: false,
                        song: 'rainforest',
                        volume: 50
                    }
                };
            }

            console.log("Connected to demo device");
            return res.json({
                success: true,
                device: registeredDevices[deviceId]
            });
        }

        const device = registeredDevices[deviceId];

        if (!device) {
            return res.json({ success: false, message: "Device not found" });
        }

        if (Date.now() - device.lastSeen > 60000) {
            return res.json({ success: false, message: "Device appears to be offline" });
        }

        console.log(`Client connected to device: ${deviceId}`);
        res.json({ success: true, device });
    } catch (error) {
        console.error("Error in /api/devices/connect:", error);
        res.status(500).json({
            success: false,
            message: "Error connecting to device"
        });
    }
});

// Start server
app.listen(PORT, () => {
    ["demo_device_1", "demo_device_2"].forEach((id, index) => {
        registeredDevices[id] = {
            deviceId: id,
            deviceName: `Demo SWELL Device ${index + 1}`,
            deviceType: "smart_lamp",
            deviceModel: "ESP32",
            ipAddress: "127.0.0.1",
            lastSeen: Date.now(),
            isOnline: true
        };

        deviceStates[id] = {
            light: false,
            aroma: false,
            music: {
                active: false,
                song: 'rainforest',
                volume: 50
            }
        };
    });

    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the app.`);
});

console.log('SWELL device server started. Open http://localhost:3000 in your browser.');
