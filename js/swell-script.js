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
    // Override all device connectivity check functions for frontend demo
    const FRONTEND_DEMO_MODE = true;

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

    // Update device name based on connected device
    if (deviceId && deviceNameElement) {
        // Use the name if available, otherwise use the ID
        deviceNameElement.textContent = deviceName || deviceId;
    }

    // FRONTEND DEMO MODE: Modified checkDeviceStatus to skip API calls
    function checkDeviceStatus() {
        if (FRONTEND_DEMO_MODE) {
            console.log("Frontend Demo Mode: Simulating connected device");

            // Show device as connected
            if (deviceNameElement) deviceNameElement.textContent = deviceName || deviceId || "Demo Smart Lamp";
            if (deviceStatusElement) deviceStatusElement.textContent = "Connected (Demo Mode)";

            // Set active device image
            const deviceImage = document.querySelector('.device-card .device-img');
            if (deviceImage) {
                deviceImage.src = "media/icons/ActiveDevice.png";
            }

            // Add connected class
            const deviceCard = document.querySelector('.device-card');
            if (deviceCard) {
                deviceCard.classList.add('connected');
                deviceCard.classList.remove('disconnected');
            }

            // Enable all controls
            enableControls();

            return;
        }

        // Original API call code (will not run in demo mode)
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

                    // Add connected class and remove disconnected class
                    const deviceCard = document.querySelector('.device-card');
                    if (deviceCard) {
                        deviceCard.classList.add('connected');
                        deviceCard.classList.remove('disconnected');
                    }

                    // Enable controls
                    enableControls();

                    // Update toggle states based on actual device state
                    if (data.state) {
                        updateToggleStates(data.state);
                    }
                } else {
                    // Device exists but not currently connected
                    if (deviceNameElement) deviceNameElement.textContent = `${deviceName || deviceId}`;
                    if (deviceStatusElement) deviceStatusElement.textContent = "Device disconnected";

                    // Set inactive device image
                    const deviceImage = document.querySelector('.device-card .device-img');
                    if (deviceImage) {
                        deviceImage.src = "media/icons/NotActiveDevice.png";
                    }

                    // Add disconnected class and remove connected class
                    const deviceCard = document.querySelector('.device-card');
                    if (deviceCard) {
                        deviceCard.classList.add('disconnected');
                        deviceCard.classList.remove('connected');
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

                // Add disconnected class for error state
                const deviceCard = document.querySelector('.device-card');
                if (deviceCard) {
                    deviceCard.classList.add('disconnected');
                    deviceCard.classList.remove('connected');
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

    // FRONTEND DEMO MODE: Override API call for toggle updates
    const originalFetch = window.fetch;
    if (FRONTEND_DEMO_MODE) {
        window.fetch = function (url, options) {
            // Simulate successful API call
            console.log("Frontend Demo Mode: Simulating API call to", url);
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    connected: true,
                    state: {
                        light: document.getElementById('light-toggle')?.classList.contains('active') || false,
                        aroma: document.getElementById('aroma-toggle')?.classList.contains('active') || false,
                        music: {
                            active: document.getElementById('music-toggle')?.classList.contains('active') || false,
                            song: document.getElementById('song-select')?.value || "rainforest",
                            volume: parseInt(document.getElementById('volume-slider')?.value || "50")
                        }
                    }
                })
            });
        };
    }

    // Check status immediately on page load
    checkDeviceStatus();

    // Set up toggle switch functionality for all feature toggles
    const toggles = document.querySelectorAll('.toggle');
    if (toggles.length) {
        toggles.forEach(toggle => {
            toggle.classList.remove('disabled'); // Enable all toggles in demo mode

            toggle.addEventListener('click', (e) => {
                // If this is a dependent toggle and timer is not confirmed, don't allow toggle
                if (toggle.classList.contains('dependent-disabled') &&
                    !isTimerConfirmed()) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Show temporary notification
                    showTemporaryMessage('Please enable and confirm timer first');
                    return;
                }

                e.stopPropagation(); // Prevent card click when toggle is clicked
                toggle.classList.toggle('active');

                // Determine which feature was toggled and update UI
                if (toggle.id === 'timer-toggle') {
                    handleTimerToggle(toggle);
                } else if (toggle.id === 'light-toggle') {
                    handleLightToggle(toggle);
                } else if (toggle.id === 'aroma-toggle') {
                    handleAromaToggle(toggle);
                } else if (toggle.id === 'alarm-toggle') {
                    handleAlarmToggle(toggle);
                } else if (toggle.id === 'music-toggle' || toggle.id === 'sound-toggle') {
                    handleMusicToggle(toggle);
                }
            });
        });
    }

    // Function to handle timer toggle
    function handleTimerToggle(toggle) {
        const timerStatusText = document.getElementById('timer-status');
        const timerControls = document.getElementById('timer-controls');
        const timerCard = document.getElementById('timer-card');
        const isActive = toggle.classList.contains('active');
        const timerConfirmButton = document.getElementById('timer-confirm-button');

        // Update UI
        if (timerStatusText) {
            timerStatusText.textContent = isActive ? 'ON' : 'OFF';
        }

        if (timerControls && timerCard) {
            if (isActive) {
                timerControls.classList.add('expanded');
                timerCard.classList.add('expanded');
                if (timerConfirmButton) timerConfirmButton.disabled = false;
            } else {
                timerControls.classList.remove('expanded');
                timerCard.classList.remove('expanded');
                if (timerConfirmButton) {
                    timerConfirmButton.disabled = true;
                    timerConfirmButton.classList.remove('confirmed');
                    timerConfirmButton.textContent = 'Konfirmasi Timer';
                }

                // When timer is turned off, remove the confirmed class from the timer card
                if (timerCard) {
                    timerCard.classList.remove('timer-confirmed');
                }

                // When timer is turned off, disable dependent features
                disableFeatureToggles();
            }
        }

        // Save timer state
        if (FRONTEND_DEMO_MODE) {
            localStorage.setItem('timerActive', isActive);
            localStorage.setItem('timerConfirmed', false);
        }
    }

    // Function to check if timer is confirmed
    function isTimerConfirmed() {
        // In frontend demo mode, check localStorage
        if (FRONTEND_DEMO_MODE) {
            return localStorage.getItem('timerConfirmed') === 'true';
        }

        // Check confirm button state
        const timerConfirmButton = document.getElementById('timer-confirm-button');
        return timerConfirmButton && timerConfirmButton.classList.contains('confirmed');
    }

    // Function to enable all feature toggles when timer is confirmed
    function enableFeatureToggles() {
        const featureCards = document.querySelectorAll('.feature-card:not(#timer-card)');
        featureCards.forEach(card => {
            // Remove the feature-dependent class which controls the shadow overlay
            card.classList.remove('feature-dependent');

            const toggle = card.querySelector('.toggle');
            if (toggle) {
                toggle.classList.remove('dependent-disabled');
                toggle.style.pointerEvents = 'auto';

                // The dependency notice will be automatically hidden via CSS
                // when the feature-dependent class is removed
            }
        });

        // Save to localStorage in demo mode
        if (FRONTEND_DEMO_MODE) {
            localStorage.setItem('timerConfirmed', 'true');
        }
    }

    // Function to disable all feature toggles when timer is not confirmed
    function disableFeatureToggles() {
        const featureCards = document.querySelectorAll('.feature-card:not(#timer-card)');
        featureCards.forEach(card => {
            // Add feature-dependent class to activate the shadow overlay
            card.classList.add('feature-dependent');

            // Turn off any active toggles
            const toggle = card.querySelector('.toggle');
            if (toggle) {
                toggle.classList.remove('active');
                toggle.classList.add('dependent-disabled');

                // Update status text
                const featureId = toggle.id.split('-')[0];
                const statusElement = document.getElementById(`${featureId}-status`);
                if (statusElement) {
                    statusElement.textContent = 'OFF';
                }

                // Make sure the dependency notice exists
                let notice = card.querySelector('.dependency-notice');
                if (!notice) {
                    notice = document.createElement('div');
                    notice.className = 'dependency-notice';
                    notice.textContent = 'Enable timer first';
                    card.appendChild(notice);
                }

                // Collapse any expanded controls
                const controlsId = `${featureId}-controls`;
                const controls = document.getElementById(controlsId);
                if (controls) {
                    controls.classList.remove('expanded');
                    card.classList.remove('expanded');
                }
            }
        });

        // Save state in demo mode
        if (FRONTEND_DEMO_MODE) {
            localStorage.setItem('timerConfirmed', 'false');
        }
    }

    // Show temporary message
    function showTemporaryMessage(message) {
        const existingMessage = document.querySelector('.temp-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'temp-message';
        messageDiv.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); ' +
            'background-color: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 5px; ' +
            'z-index: 9999; transition: opacity 0.5s ease;';
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageDiv.remove(), 500);
        }, 3000);
    }

    // Function to handle light toggle
    function handleLightToggle(toggle) {
        const isActive = toggle.classList.contains('active');
        const statusText = document.getElementById('light-status');
        if (statusText) {
            statusText.textContent = isActive ? 'ON' : 'OFF';
        }

        // Show/hide controls if collapsible
        const controls = document.getElementById('light-controls');
        const card = document.getElementById('light-card');
        if (controls && card) {
            if (isActive) {
                controls.classList.add('expanded');
                card.classList.add('expanded');
            } else {
                controls.classList.remove('expanded');
                card.classList.remove('expanded');
            }
        }
    }

    // Function to handle aroma toggle
    function handleAromaToggle(toggle) {
        const isActive = toggle.classList.contains('active');
        const statusText = document.getElementById('aroma-status');
        if (statusText) {
            statusText.textContent = isActive ? 'ON' : 'OFF';
        }
    }

    // Function to handle alarm toggle
    function handleAlarmToggle(toggle) {
        const isActive = toggle.classList.contains('active');
        const statusText = document.getElementById('alarm-status');
        if (statusText) {
            statusText.textContent = isActive ? 'ON' : 'OFF';
        }
    }

    // Function to handle music/sound toggle
    function handleMusicToggle(toggle) {
        const isActive = toggle.classList.contains('active');
        const statusText = toggle.id === 'music-toggle' ?
            document.getElementById('music-status') : document.getElementById('sound-status');

        if (statusText) {
            statusText.textContent = isActive ? 'ON' : 'OFF';
        }

        // Show/hide controls
        const controls = toggle.id === 'music-toggle' ?
            document.getElementById('music-controls') : document.getElementById('sound-controls');
        const card = toggle.id === 'music-toggle' ?
            document.getElementById('music-card') : document.getElementById('sound-card');

        if (controls && card) {
            if (isActive) {
                controls.classList.add('expanded');
                card.classList.add('expanded');
            } else {
                controls.classList.remove('expanded');
                card.classList.remove('expanded');
            }
        }
    }

    // Initialize timer confirmation button
    const timerConfirmButton = document.getElementById('timer-confirm-button');
    if (timerConfirmButton) {
        timerConfirmButton.addEventListener('click', function () {
            const timerToggle = document.getElementById('timer-toggle');
            const timerCard = document.getElementById('timer-card');

            if (timerToggle && timerToggle.classList.contains('active')) {
                // Update visual state
                this.classList.add('confirmed');
                this.textContent = 'Timer Terkonfirmasi';
                this.disabled = true;
                this.style.backgroundColor = "#4cd964";

                // Change timer card left border to green
                if (timerCard) {
                    timerCard.classList.add('timer-confirmed');
                }

                // Enable other features
                enableFeatureToggles();

                // Show confirmation message
                const timerConfirmation = document.getElementById('timer-confirmation');
                if (timerConfirmation) {
                    const message = timerConfirmation.querySelector('.confirmation-message');
                    if (message) {
                        const startTime = document.getElementById('start-time').value;
                        const endTime = document.getElementById('end-time').value;
                        message.textContent = `Timer confirmed: ${startTime} to ${endTime}`;
                    }
                    timerConfirmation.classList.add('visible');

                    setTimeout(() => {
                        if (timerConfirmation.classList.contains('visible')) {
                            timerConfirmation.classList.remove('visible');
                        }
                    }, 5000);
                }

                // Save state
                if (FRONTEND_DEMO_MODE) {
                    localStorage.setItem('timerConfirmed', true);
                    localStorage.setItem('timerStartTime', document.getElementById('start-time').value);
                    localStorage.setItem('timerEndTime', document.getElementById('end-time').value);
                }
            }
        });
    }

    // On page load, check if timer was previously confirmed
    if (FRONTEND_DEMO_MODE) {
        const timerActive = localStorage.getItem('timerActive') === 'true';
        const timerConfirmed = localStorage.getItem('timerConfirmed') === 'true';
        const timerStartTime = localStorage.getItem('timerStartTime') || '22:00';
        const timerEndTime = localStorage.getItem('timerEndTime') || '06:00';

        // Set up timer toggle
        const timerToggle = document.getElementById('timer-toggle');
        const timerStatusText = document.getElementById('timer-status');
        const timerConfirmButton = document.getElementById('timer-confirm-button');
        const timerControls = document.getElementById('timer-controls');
        const timerCard = document.getElementById('timer-card');
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');

        if (timerToggle && timerActive) {
            timerToggle.classList.add('active');
            if (timerStatusText) timerStatusText.textContent = 'ON';

            if (timerControls && timerCard) {
                timerControls.classList.add('expanded');
                timerCard.classList.add('expanded');
            }

            if (timerConfirmButton && timerConfirmed) {
                timerConfirmButton.classList.add('confirmed');
                timerConfirmButton.textContent = 'Timer Terkonfirmasi';
                timerConfirmButton.disabled = true;
                timerConfirmButton.style.backgroundColor = "#4cd964";

                // Add the green border class if timer was confirmed
                if (timerCard) {
                    timerCard.classList.add('timer-confirmed');
                }

                // Enable other features
                enableFeatureToggles();
            }
        }

        // Set time inputs
        if (startTimeInput) startTimeInput.value = timerStartTime;
        if (endTimeInput) endTimeInput.value = timerEndTime;
    }

    // Comment out or modify statusCheckInterval in demo mode
    if (FRONTEND_DEMO_MODE) {
        // Don't set up periodic status checks in demo mode
    } else {
        // Set up periodic status check (every 5 seconds)
        const statusCheckInterval = setInterval(checkDeviceStatus, 5000);

        // Clean up interval when leaving the page
        window.addEventListener('beforeunload', () => {
            clearInterval(statusCheckInterval);
        });
    }

    // Expand/collapse music controls functionality
    const musicCard = document.getElementById('music-card');
    const musicControls = document.getElementById('music-controls');
    const musicToggle = document.getElementById('music-toggle');

    if (musicCard && musicControls && musicToggle) {
        musicCard.addEventListener('click', () => {
            // Only toggle expanded state if music is ON
            if (musicToggle.classList.contains('active')) {
                musicControls.classList.toggle('expanded');
                musicCard.classList.toggle('expanded');
            }
        });
    }

    // Same for sound card if it exists
    const soundCard = document.getElementById('sound-card');
    const soundControls = document.getElementById('sound-controls');
    const soundToggle = document.getElementById('sound-toggle');

    if (soundCard && soundControls && soundToggle) {
        soundCard.addEventListener('click', () => {
            // Only toggle expanded state if sound is ON
            if (soundToggle.classList.contains('active')) {
                soundControls.classList.toggle('expanded');
                soundCard.classList.toggle('expanded');
            }
        });
    }

    // Set up volume sliders
    setupVolumeSliders();

    // Helper function to set up volume sliders
    function setupVolumeSliders() {
        // Set up music volume slider
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.querySelector('.volume-value');

        if (volumeSlider && volumeValue) {
            // Set initial value
            volumeValue.textContent = `${volumeSlider.value}%`;

            // Update value on slider change
            volumeSlider.addEventListener('input', () => {
                volumeValue.textContent = `${volumeSlider.value}%`;
            });
        }

        // Set up light intensity slider
        const intensitySlider = document.getElementById('intensity-slider');
        const intensityValue = document.querySelector('.intensity-value');

        if (intensitySlider && intensityValue) {
            // Set initial value
            intensityValue.textContent = `${intensitySlider.value}%`;

            // Update value on slider change
            intensitySlider.addEventListener('input', () => {
                intensityValue.textContent = `${intensitySlider.value}%`;
            });
        }
    }

    // Add back button event handler
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'swell-homepage.html';
        });
    }

    // Initialize the UI based on timer status
    setTimeout(function () {
        // If timer is not confirmed, make sure features are disabled with shadow effect
        if (!isTimerConfirmed()) {
            disableFeatureToggles();
        } else {
            enableFeatureToggles();
        }
    }, 200);
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

    // TEMPORARY: Add mock device if none exist for UI demonstration
    if (connectedDevices.length === 0) {
        connectedDevices = [
            {
                id: "demo-device-1",
                name: "Swell Smart Lamp 1"
            },
            {
                id: "demo-device-2",
                name: "Swell Smart Lamp 2"
            }
        ];
        localStorage.setItem('connectedDevices', JSON.stringify(connectedDevices));
        localStorage.setItem('connectedDevice', connectedDevices[0].id);
        localStorage.setItem('connectedDeviceName', connectedDevices[0].name);
    }

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

    // Function to scan for available ESP32 devices - TEMPORARILY MOCKED
    function scanForDevices() {
        // Clear previous results
        discoveredDevices.innerHTML = '';

        // Show scanning animation briefly
        discoveredDevices.innerHTML = `
            <div class="scanning-message">
                <p>Looking for Swell devices on your network...</p>
            </div>
        `;

        // TEMPORARY: Use mock devices instead of real API call
        setTimeout(() => {
            // Clear the scanning message
            discoveredDevices.innerHTML = '';

            // Mock devices for UI demo
            const mockDevices = [
                { id: "demo-device-3", name: "Swell Smart Lamp 3", model: "SWELL-001", status: "Available" },
                { id: "demo-device-4", name: "Swell Smart Lamp 4", model: "SWELL-002", status: "Available" }
            ];

            if (mockDevices.length === 0) {
                discoveredDevices.innerHTML = `
                    <div class="no-devices-found">
                        <p>No Swell devices found on your network.</p>
                        <p>Make sure your device is powered on and connected to WiFi.</p>
                    </div>
                `;
                return;
            }

            // Display mock devices
            mockDevices.forEach(device => {
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
        }, 2000); // Simulate network delay

        /* COMMENTED OUT: Real API call
        fetch('/api/devices/available')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(devices => {
                // Original code...
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
        */
    }

    // Function to connect to a selected device - TEMPORARILY MOCKED
    function connectToDevice(deviceId, deviceName) {
        // Show connecting status
        const selectedDevice = document.querySelector(`[data-id="${deviceId}"]`);
        if (selectedDevice) {
            const statusEl = selectedDevice.querySelector('.device-status');
            statusEl.textContent = 'Connecting...';
        }

        // TEMPORARY: Mock successful connection without API call
        setTimeout(() => {
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
        }, 1500);

        /* COMMENTED OUT: Real API call
        fetch(`/api/devices/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId })
        })
            .then(response => response.json())
            .then(data => {
                // Original code...
            })
            .catch(error => {
                console.error('Error connecting to device:', error);
                alert("Connection error. Please check your network and try again.");
            });
        */
    }

    // Function to remove a device - TEMPORARILY MOCKED
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

            // COMMENTED OUT: Real API call
            /* 
            fetch(`/api/device/${deviceId}/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .catch(error => console.error('Error disconnecting device:', error));
            */
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

    // Function to check device connection status - TEMPORARILY MOCKED
    function checkDeviceStatus(deviceId, deviceName) {
        const deviceCard = document.querySelector(`.device-card[data-id="${deviceId}"]`);
        const deviceStatusText = deviceCard ? deviceCard.querySelector('.device-status') : null;
        const deviceImage = deviceCard ? deviceCard.querySelector('.device-img') : null;

        if (!deviceCard || !deviceStatusText) return;

        // TEMPORARY: Mock device status as connected
        deviceStatusText.textContent = "Connected via HTTP";
        deviceCard.classList.add('connected');
        deviceCard.classList.remove('disconnected');

        // Update device image to active
        if (deviceImage) {
            deviceImage.src = "media/icons/ActiveDevice.png";
        }

        /* COMMENTED OUT: Real API call
        fetch(`/api/device/${deviceId}`)
            .then(response => response.json())
            .then(data => {
                // Original code...
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
        */
    }

    // Initial refresh of device list
    refreshDeviceList();

    // Comment out periodic status checking to avoid console errors
    /*
    const statusCheckInterval = setInterval(() => {
        connectedDevices.forEach(device => {
            checkDeviceStatus(device.id, device.name);
        });
    }, 10000);

    // Clean up interval when leaving the page
    window.addEventListener('beforeunload', () => {
        clearInterval(statusCheckInterval);
    });
    */
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
