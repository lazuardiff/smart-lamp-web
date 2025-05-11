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

// Store device state
const deviceState = {
    light: false,
    aroma: false,
    music: {
        active: false,
        song: 'rainforest',
        volume: 50
    }
};

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

    res.json({
        id: deviceId,
        name: activeDevice ? activeDevice.deviceName : deviceId,
        connected: isConnected,
        state: deviceState,
        lastSeen: activeDevice ? activeDevice.lastSeen : null
    });
});

// Update device state
app.post('/api/device/:id/update', (req, res) => {
    const { feature, value } = req.body;

    switch (feature) {
        case 'light':
            deviceState.light = value;
            break;
        case 'aroma':
            deviceState.aroma = value;
            break;
        case 'music':
            if (value.hasOwnProperty('active')) deviceState.music.active = value.active;
            if (value.hasOwnProperty('song')) deviceState.music.song = value.song;
            if (value.hasOwnProperty('volume')) deviceState.music.volume = value.volume;
            break;
    }

    res.json({ success: true, state: deviceState });
});

// Disconnect a device
app.post('/api/device/:id/disconnect', (req, res) => {
    // In a real implementation, this would handle any cleanup needed
    // For now, we'll just acknowledge the disconnect
    console.log(`Device ${req.params.id} disconnected`);
    res.json({ success: true, message: `Device ${req.params.id} disconnected successfully` });
});

// Register an ESP32 device
app.post('/api/esp32/register', (req, res) => {
    const { deviceId, deviceName, deviceType, deviceModel, ipAddress } = req.body;

    // Clean up deviceId to handle MAC addresses consistently
    const cleanDeviceId = deviceId.toUpperCase();

    // Store device information
    registeredDevices[cleanDeviceId] = {
        deviceId: cleanDeviceId,
        deviceName,
        deviceType,
        deviceModel,
        ipAddress,
        lastSeen: Date.now(),
        isOnline: true
    };

    console.log(`Device registered: ${deviceName} (${cleanDeviceId})`);
    console.log("Current registered devices:", Object.keys(registeredDevices));

    res.json({ success: true });
});

// Get available devices
app.get('/api/devices/available', (req, res) => {
    try {
        const now = Date.now();
        const availableDevices = [];

        // Add a demo device if no real devices are registered
        if (Object.keys(registeredDevices).length === 0) {
            // Return a demo device for testing when no real devices are available
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

        // Filter for online devices (seen in the last 60 seconds)
        Object.values(registeredDevices).forEach(device => {
            // If device was seen in the last minute, consider it online
            if (now - device.lastSeen < 60000) {
                availableDevices.push({
                    id: device.deviceId,
                    name: device.deviceName,
                    type: device.deviceType,
                    model: device.deviceModel,
                    status: 'available'
                });
            } else {
                // Mark device as offline
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

// Update last seen timestamp when device pings server
app.get('/api/esp32/status', (req, res) => {
    // Get client IP address
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log("ESP32 status request from IP:", clientIp);

    // Find device with this IP
    let device = Object.values(registeredDevices).find(d => d.ipAddress === clientIp);

    if (device) {
        device.lastSeen = Date.now();
        device.isOnline = true;
        console.log(`Updated last seen time for device ${device.deviceId}`);
    } else {
        console.log("No registered device found with IP:", clientIp);
    }

    // Return device state as usual
    res.json(deviceState);
});

app.post('/api/esp32/update', (req, res) => {
    const { status } = req.body;

    // ESP32 can update its current status here
    res.json({ success: true });
});

// Connect to a device
app.post('/api/devices/connect', (req, res) => {
    try {
        const { deviceId } = req.body;

        // Special handling for demo device
        if (deviceId === "demo_device") {
            // Save device information for the demo device
            registeredDevices[deviceId] = {
                deviceId: "demo_device",
                deviceName: "Demo SWELL Device",
                deviceType: "smart_lamp",
                deviceModel: "ESP32",
                ipAddress: "127.0.0.1",
                lastSeen: Date.now(),
                isOnline: true
            };

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
    // Store the demo device in localStorage when server starts
    registeredDevices["demo_device"] = {
        deviceId: "demo_device",
        deviceName: "Demo SWELL Device",
        deviceType: "smart_lamp",
        deviceModel: "ESP32",
        ipAddress: "127.0.0.1",
        lastSeen: Date.now(),
        isOnline: true
    };

    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the app.`);
});

console.log('SWELL device server started. Open http://localhost:3000 in your browser.');
