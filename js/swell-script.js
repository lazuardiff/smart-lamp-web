// Common functions for both pages
function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;

    const starCount = 30;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');

        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.7 + 0.3;

        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.opacity = opacity;

        starsContainer.appendChild(star);
    }
}

// Device detail page specific functions
function initializeDeviceDetailPage() {
    // Get the device ID from the URL or fallback to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('deviceId') || localStorage.getItem('connectedDevice');

    // Try to get name from connected devices array first
    let deviceName = null;
    const connectedDevices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');
    const deviceInfo = connectedDevices.find(d => d.id === deviceId);
    if (deviceInfo) {
        deviceName = deviceInfo.name;
    } else {
        // Fall back to legacy storage
        deviceName = localStorage.getItem('connectedDeviceName');
    }

    // Get device info elements
    const deviceNameElement = document.querySelector('.device-card .device-name');
    const deviceStatusElement = document.querySelector('.device-card .device-status');

    console.log("Device detail page - Checking device:", deviceId, deviceName);

    // Update device name based on connected device
    if (deviceId && deviceNameElement) {
        // Use the name if available, otherwise use the ID
        deviceNameElement.textContent = deviceName || deviceId;
    }

    // Function to check device connection status
    function checkDeviceStatus() {
        if (!deviceId) {
            // No device saved, show as disconnected
            if (deviceNameElement) deviceNameElement.textContent = "No Device Connected";
            if (deviceStatusElement) deviceStatusElement.textContent = "Please add a device first";

            // Disable all toggles
            disableControls();
            return;
        }

        // Debug log the request
        console.log("Checking device status for:", deviceId);

        // Make API call to check device status
        fetch(`/api/device/${deviceId}`)
            .then(response => response.json())
            .then(data => {
                console.log("Received device status:", data);

                if (data && data.connected) {
                    // Device is connected
                    if (deviceNameElement) deviceNameElement.textContent = deviceName || deviceId;
                    if (deviceStatusElement) deviceStatusElement.textContent = "Connected via HTTP";

                    // Set active device image
                    const deviceImage = document.querySelector('.device-card .device-img');
                    if (deviceImage) {
                        deviceImage.src = "media/icons/ActiveDevice.png";
                    }

                    // Enable controls
                    enableControls();

                    // Update toggle states based on actual device state
                    if (data.state) {
                        updateToggleStates(data.state);
                    }
                } else {
                    // Device exists but not currently connected
                    if (deviceNameElement) deviceNameElement.textContent = `${deviceName || deviceId} (Offline)`;
                    if (deviceStatusElement) deviceStatusElement.textContent = "Device disconnected";

                    // Set inactive device image
                    const deviceImage = document.querySelector('.device-card .device-img');
                    if (deviceImage) {
                        deviceImage.src = "media/icons/NotActiveDevice.png";
                    }

                    // Disable all toggles when device is offline
                    disableControls();
                }
            })
            .catch(error => {
                console.error("Error checking device status:", error);
                // Show device as offline if we can't reach the server
                if (deviceNameElement) deviceNameElement.textContent = `${deviceName || deviceId} (Unreachable)`;
                if (deviceStatusElement) deviceStatusElement.textContent = "Connection error";

                // Set inactive device image on error
                const deviceImage = document.querySelector('.device-card .device-img');
                if (deviceImage) {
                    deviceImage.src = "media/icons/NotActiveDevice.png";
                }

                // Disable all toggles
                disableControls();
            });
    }

    // Function to disable all controls when device is offline
    function disableControls() {
        // Add visual indication that controls are disabled
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.classList.add('disabled');
        });

        if (document.getElementById('volume-slider')) {
            document.getElementById('volume-slider').disabled = true;
        }

        if (document.getElementById('song-select')) {
            document.getElementById('song-select').disabled = true;
        }

        // Add overlay with reconnect button
        if (!document.querySelector('.reconnect-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'reconnect-overlay';
            overlay.innerHTML = `
                <div class="reconnect-message">
                    <p>Device disconnected</p>
                    <button class="reconnect-btn">Try to reconnect</button>
                </div>
            `;
            document.querySelector('.feature-section').appendChild(overlay);

            // Add reconnect functionality
            overlay.querySelector('.reconnect-btn').addEventListener('click', () => {
                checkDeviceStatus(); // Immediately check status again
            });
        }
    }

    // Function to enable all controls when device is online
    function enableControls() {
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.classList.remove('disabled');
        });

        if (document.getElementById('volume-slider')) {
            document.getElementById('volume-slider').disabled = false;
        }

        if (document.getElementById('song-select')) {
            document.getElementById('song-select').disabled = false;
        }

        // Remove overlay if it exists
        const overlay = document.querySelector('.reconnect-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Update toggle states based on device state from server
    function updateToggleStates(state) {
        const lightToggle = document.getElementById('light-toggle');
        const aromaToggle = document.getElementById('aroma-toggle');
        const musicToggle = document.getElementById('music-toggle');
        const lightStatusText = document.getElementById('light-status');
        const aromaStatusText = document.getElementById('aroma-status');
        const musicStatusText = document.getElementById('music-status');
        const musicControls = document.getElementById('music-controls');
        const musicCard = document.getElementById('music-card');

        // Update light toggle
        if (lightToggle && lightStatusText && state.hasOwnProperty('light')) {
            if (state.light) {
                lightToggle.classList.add('active');
                lightStatusText.textContent = 'ON';
            } else {
                lightToggle.classList.remove('active');
                lightStatusText.textContent = 'OFF';
            }
        }

        // Update aroma toggle
        if (aromaToggle && aromaStatusText && state.hasOwnProperty('aroma')) {
            if (state.aroma) {
                aromaToggle.classList.add('active');
                aromaStatusText.textContent = 'ON';
            } else {
                aromaToggle.classList.remove('active');
                aromaStatusText.textContent = 'OFF';
            }
        }

        // Update music toggle and controls
        if (musicToggle && musicStatusText && state.hasOwnProperty('music')) {
            if (state.music.active) {
                musicToggle.classList.add('active');
                musicStatusText.textContent = 'ON';
                if (musicControls && musicCard) {
                    musicControls.classList.add('expanded');
                    musicCard.classList.add('expanded');
                }
            } else {
                musicToggle.classList.remove('active');
                musicStatusText.textContent = 'OFF';
                if (musicControls && musicCard) {
                    musicControls.classList.remove('expanded');
                    musicCard.classList.remove('expanded');
                }
            }
        }
    }

    // Check status immediately on page load
    checkDeviceStatus();

    // Set up periodic status check (every 5 seconds)
    const statusCheckInterval = setInterval(checkDeviceStatus, 5000);

    // Toggle switch functionality
    const toggles = document.querySelectorAll('.toggle');
    const lightStatusText = document.getElementById('light-status');
    const aromaStatusText = document.getElementById('aroma-status');
    const musicStatusText = document.getElementById('music-status');
    const musicControls = document.getElementById('music-controls');
    const musicCard = document.getElementById('music-card');
    const musicToggle = document.getElementById('music-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.querySelector('.volume-value');

    if (toggles.length) {
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when toggle is clicked
                toggle.classList.toggle('active');

                // Determine which feature was toggled and its new state
                let feature = '';
                let value = false;

                if (toggle.id === 'light-toggle') {
                    feature = 'light';
                    value = toggle.classList.contains('active');
                    if (value) {
                        lightStatusText.textContent = 'ON';
                    } else {
                        lightStatusText.textContent = 'OFF';
                    }
                } else if (toggle.id === 'aroma-toggle') {
                    feature = 'aroma';
                    value = toggle.classList.contains('active');
                    if (value) {
                        aromaStatusText.textContent = 'ON';
                    } else {
                        aromaStatusText.textContent = 'OFF';
                    }
                } else if (toggle.id === 'music-toggle') {
                    feature = 'music';
                    value = { active: toggle.classList.contains('active') };
                    if (value.active) {
                        musicStatusText.textContent = 'ON';
                        musicControls.classList.add('expanded');
                        musicCard.classList.add('expanded');
                    } else {
                        musicStatusText.textContent = 'OFF';
                        musicControls.classList.remove('expanded');
                        musicCard.classList.remove('expanded');
                    }
                }

                // Send update to server if we have a device connected
                if (deviceId && feature) {
                    fetch(`/api/device/${deviceId}/update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ feature, value })
                    })
                        .then(response => response.json())
                        .catch(error => console.error('Error updating device:', error));
                }
            });
        });
    }

    // Clean up interval when leaving the page
    window.addEventListener('beforeunload', () => {
        clearInterval(statusCheckInterval);
    });

    // Expand/collapse music controls only when the toggle is ON
    if (musicCard) {
        musicCard.addEventListener('click', () => {
            // Only toggle expanded state if music is ON
            if (musicToggle && musicToggle.classList.contains('active')) {
                musicControls.classList.toggle('expanded');
                musicCard.classList.toggle('expanded');
            }
        });
    }

    // Update volume value display when slider is moved
    if (volumeSlider && volumeValue) {
        // Create a wrapper div for the slider and value
        const wrapper = document.createElement('div');
        wrapper.className = 'volume-control-wrapper';

        // Move elements into the wrapper
        const parent = volumeSlider.parentNode;
        parent.insertBefore(wrapper, volumeSlider);
        wrapper.appendChild(volumeSlider);
        wrapper.appendChild(volumeValue);

        // Set initial value
        volumeValue.textContent = `${volumeSlider.value}%`;

        // Update value on slider change
        volumeSlider.addEventListener('input', () => {
            volumeValue.textContent = `${volumeSlider.value}%`;
        });
    }

    if (volumeSlider) {
        // Create volume popup element
        const volumePopup = document.createElement('div');
        volumePopup.className = 'volume-popup';
        volumeSlider.parentNode.appendChild(volumePopup);

        // Function to position the popup directly above the thumb
        const positionPopup = () => {
            const sliderRect = volumeSlider.getBoundingClientRect();
            const thumbPosition = (volumeSlider.value / volumeSlider.max) * sliderRect.width;

            // Position popup directly above the thumb
            volumePopup.style.left = `${thumbPosition}px`;
            volumePopup.textContent = `${volumeSlider.value}%`;
        };

        // Update popup when slider is moved
        volumeSlider.addEventListener('input', () => {
            positionPopup();
            volumePopup.style.opacity = '1';
        });

        // Hide popup when done sliding
        volumeSlider.addEventListener('mouseup', () => {
            setTimeout(() => {
                volumePopup.style.opacity = '0';
            }, 1000);
        });

        volumeSlider.addEventListener('mouseleave', () => {
            setTimeout(() => {
                volumePopup.style.opacity = '0';
            }, 1000);
        });

        // Show popup on hover
        volumeSlider.addEventListener('mouseenter', () => {
            positionPopup();
            volumePopup.style.opacity = '1';
        });
    }

    // Add back button event handler
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'swell-homepage.html';
        });
    }
}

// Homepage specific functions
function initializeHomePage() {
    const addDeviceBtn = document.getElementById('add-device-btn');
    const connectionModal = document.getElementById('connection-modal');
    const closeModal = document.querySelector('.close-modal');
    const discoveredDevices = document.getElementById('discovered-devices');
    const deviceList = document.getElementById('device-list');

    // Track connected devices in an array
    let connectedDevices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');

    // Function to save connected devices to localStorage
    function saveConnectedDevices() {
        localStorage.setItem('connectedDevices', JSON.stringify(connectedDevices));
    }

    // Show connection modal when Add Device is clicked
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => {
            connectionModal.classList.add('active');
            // Start scanning for devices
            scanForDevices();
        });
    }

    // Close the modal when X is clicked
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            connectionModal.classList.remove('active');
        });
    }

    // Function to scan for available ESP32 devices
    function scanForDevices() {
        // Clear previous results
        discoveredDevices.innerHTML = '';

        // Show scanning animation
        discoveredDevices.innerHTML = `
            <div class="scanning-message">
                <p>Looking for Swell devices on your network...</p>
            </div>
        `;

        // Fetch available devices from server
        fetch('/api/devices/available')
            .then(response => {
                // Check if response is ok before continuing
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(devices => {
                // Clear the scanning message
                discoveredDevices.innerHTML = '';

                console.log("Found devices:", devices); // Debug logging

                if (!devices || devices.length === 0) {
                    // No devices found
                    discoveredDevices.innerHTML = `
                        <div class="no-devices-found">
                            <p>No Swell devices found on your network.</p>
                            <p>Make sure your device is powered on and connected to WiFi.</p>
                        </div>
                    `;
                    return;
                }

                // Display found devices
                devices.forEach(device => {
                    const deviceElement = document.createElement('div');
                    deviceElement.className = 'discovered-device';
                    deviceElement.dataset.id = device.id;

                    deviceElement.innerHTML = `
                        <img src="media/icons/ActiveDevice.png" alt="Device" class="device-icon-small">
                        <div class="device-info">
                            <div class="device-name">${device.name}</div>
                            <div class="device-type">${device.model}</div>
                            <div class="device-status">${device.status}</div>
                        </div>
                    `;

                    // Add click event to connect to device
                    deviceElement.addEventListener('click', () => {
                        connectToDevice(device.id, device.name);
                    });

                    discoveredDevices.appendChild(deviceElement);
                });
            })
            .catch(error => {
                console.error('Error discovering devices:', error);
                discoveredDevices.innerHTML = `
                    <div class="error-message">
                        <p>Error searching for devices: ${error.message}</p>
                        <p>Please try again later.</p>
                    </div>
                `;
            });
    }

    // Function to connect to a selected device
    function connectToDevice(deviceId, deviceName) {
        // Show connecting status
        const selectedDevice = document.querySelector(`[data-id="${deviceId}"]`);
        if (selectedDevice) {
            const statusEl = selectedDevice.querySelector('.device-status');
            statusEl.textContent = 'Connecting...';
        }

        // Make actual API call to connect to the device
        fetch(`/api/devices/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add to connected devices array
                    const existingDeviceIndex = connectedDevices.findIndex(d => d.id === deviceId);

                    if (existingDeviceIndex >= 0) {
                        // Update existing device
                        connectedDevices[existingDeviceIndex] = {
                            id: deviceId,
                            name: deviceName || deviceId
                        };
                    } else {
                        // Add new device
                        connectedDevices.push({
                            id: deviceId,
                            name: deviceName || deviceId
                        });
                    }

                    // Save to localStorage
                    saveConnectedDevices();

                    // For backward compatibility
                    localStorage.setItem('connectedDevice', deviceId);
                    localStorage.setItem('connectedDeviceName', deviceName || deviceId);

                    console.log("Device connected and saved:", deviceId);

                    // Update UI with all connected devices
                    refreshDeviceList();

                    // Close the modal
                    connectionModal.classList.remove('active');
                } else {
                    alert("Failed to connect to device. Please try again.");
                }
            })
            .catch(error => {
                console.error('Error connecting to device:', error);
                alert("Connection error. Please check your network and try again.");
            });
    }

    // Function to remove a device
    function removeDevice(deviceId) {
        // Show confirmation dialog
        if (confirm(`Are you sure you want to disconnect ${deviceId}?`)) {
            // Remove from connected devices array
            connectedDevices = connectedDevices.filter(d => d.id !== deviceId);
            saveConnectedDevices();

            // For compatibility with pages expecting single device
            if (connectedDevices.length > 0) {
                localStorage.setItem('connectedDevice', connectedDevices[0].id);
                localStorage.setItem('connectedDeviceName', connectedDevices[0].name);
            } else {
                localStorage.removeItem('connectedDevice');
                localStorage.removeItem('connectedDeviceName');
            }

            // Update UI
            refreshDeviceList();

            // Notify server
            fetch(`/api/device/${deviceId}/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .catch(error => console.error('Error disconnecting device:', error));
        }
    }

    // Function to refresh the device list UI with current devices
    function refreshDeviceList() {
        if (connectedDevices.length === 0) {
            deviceList.innerHTML = `<div class="no-devices">No devices connected</div>`;

            // Remove any multi-device classes
            deviceList.classList.remove('multi-device');
            deviceList.classList.remove('multi-device-2-plus');
            deviceList.classList.remove('multi-device-3-plus');

            // Ensure add button has full width
            const addButton = document.getElementById('add-device-btn');
            if (addButton) {
                addButton.style.width = '100%';
                addButton.style.marginLeft = '0';
            }

            return;
        }

        // Clear existing list
        deviceList.innerHTML = '';

        // Add correct multi-device classes based on number of devices
        if (connectedDevices.length > 0) {
            deviceList.classList.add('multi-device');

            if (connectedDevices.length >= 2) {
                deviceList.classList.add('multi-device-2-plus');
            } else {
                deviceList.classList.remove('multi-device-2-plus');
            }

            if (connectedDevices.length >= 3) {
                deviceList.classList.add('multi-device-3-plus');
            } else {
                deviceList.classList.remove('multi-device-3-plus');
            }
        } else {
            deviceList.classList.remove('multi-device');
            deviceList.classList.remove('multi-device-2-plus');
            deviceList.classList.remove('multi-device-3-plus');
        }

        // Add each device
        connectedDevices.forEach((device) => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'device-container';
            deviceElement.innerHTML = `
                <a href="swell-device-detail.html?deviceId=${encodeURIComponent(device.id)}" class="device-link">
                    <div class="device-card" data-id="${device.id}">
                        <div class="device-icon">
                            <img src="media/icons/ActiveDevice.png" alt="Device" class="device-img">
                        </div>
                        <div class="device-info">
                            <div class="device-name">${device.name}</div>
                            <div class="device-status">Checking connection status...</div>
                        </div>
                    </div>
                </a>
                <button class="remove-device-btn" data-id="${device.id}">✕</button>
            `;

            deviceList.appendChild(deviceElement);

            // Add removal handler
            const removeBtn = deviceElement.querySelector('.remove-device-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeDevice(device.id);
                });
            }

            // Check status immediately
            checkDeviceStatus(device.id, device.name);
        });

        // Let CSS handle the styling through the multi-device classes
        const addButton = document.getElementById('add-device-btn');
        if (addButton) {
            addButton.style.width = '';
            addButton.style.marginLeft = '';
        }
    }

    // Function to check device connection status
    function checkDeviceStatus(deviceId, deviceName) {
        const deviceCard = document.querySelector(`.device-card[data-id="${deviceId}"]`);
        const deviceStatusText = deviceCard ? deviceCard.querySelector('.device-status') : null;
        const deviceImage = deviceCard ? deviceCard.querySelector('.device-img') : null;

        if (!deviceCard || !deviceStatusText) return;

        // Make API call to check device status
        fetch(`/api/device/${deviceId}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.connected) {
                    // Device is connected
                    deviceStatusText.textContent = "Connected via HTTP";
                    deviceCard.classList.add('connected');
                    deviceCard.classList.remove('disconnected');

                    // Update device image to active
                    if (deviceImage) {
                        deviceImage.src = "media/icons/ActiveDevice.png";
                    }
                } else {
                    // Device exists but not currently connected
                    deviceStatusText.textContent = "Device disconnected";
                    deviceCard.classList.remove('connected');
                    deviceCard.classList.add('disconnected');

                    // Update device image to inactive
                    if (deviceImage) {
                        deviceImage.src = "media/icons/NotActiveDevice.png";
                    }
                }
            })
            .catch(error => {
                console.error("Error checking device status:", error);
                deviceStatusText.textContent = "Connection error";
                deviceCard.classList.remove('connected');
                deviceCard.classList.add('disconnected');

                // Update device image to inactive on error
                if (deviceImage) {
                    deviceImage.src = "media/icons/NotActiveDevice.png";
                }
            });
    }

    // Initial refresh of device list
    refreshDeviceList();

    // Set up periodic status checking for all devices (every 10 seconds)
    const statusCheckInterval = setInterval(() => {
        connectedDevices.forEach(device => {
            checkDeviceStatus(device.id, device.name);
        });
    }, 10000);

    // Clean up interval when leaving the page
    window.addEventListener('beforeunload', () => {
        clearInterval(statusCheckInterval);
    });
}

// Run initialization based on current page
document.addEventListener('DOMContentLoaded', () => {
    // Create stars on both pages
    createStars();

    // Check which page we're on and initialize accordingly
    if (document.getElementById('detail-page')) {
        initializeDeviceDetailPage();
    } else if (document.getElementById('home-page')) {
        initializeHomePage();
    }
});
