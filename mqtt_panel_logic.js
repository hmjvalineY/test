// --- 元件資料管理 ---
/**
 * 根據指定的類型建立一個新的元件
 * @param {string} type - 要建立的元件類型 (例如 'switch', 'slider')
 */
function createComponent(type) {
    // 產生唯一的 ID 和設定預設尺寸
    const id = `comp_${Date.now()}`;
    let compWidth = 150;
    let compHeight = 60;

    // 根據不同元件類型調整預設尺寸
    if (type === 'gauge' || type === 'graph') {
        compWidth = 250;
        compHeight = 200;
    } else if (type === 'radio' || type === 'checkbox') {
        compHeight = 120;
    } else if (type === 'text_input') {
        compHeight = 100;
        compWidth = 200;
    } else if (['date', 'time', 'datetime'].includes(type)) {
        compHeight = 90;
        compWidth = 200;
    } else if (type === 'notification') {
        compWidth = 60;
        compHeight = 60;
    } else if (type === 'template') {
        compWidth = 200;
        compHeight = 100;
    } else if (type === 'buzzer') {
        compWidth = 80;
        compHeight = 80;
    } else if (type === 'qrcode' || type === 'image') {
        compWidth = 150;
        compHeight = 150;
    } else if (type === 'thermometer') {
        compWidth = 120;
        compHeight = 250;
    } else if (type === 'tasmota_relay') {
        compWidth = 220;
        compHeight = 120;
    } else if (type === 'tasmota_ws2812') {
        compWidth = 250; // Adjusted width
        compHeight = 210; // Adjusted height
    } else if (type === 'tasmota_status') {
        compWidth = 280;
        compHeight = 250;
    } else if (type === 'tasmota_console') {
        compWidth = 200;
        compHeight = 150;
    } else if (type === 'tasmota_timer_setter') {
        compWidth = 320;
        compHeight = 480; // 增加高度以容納所有內容
    } else if (type === 'tasmota_rules_editor') {
        compWidth = 380;
        compHeight = 420;
    } else if (type === 'tasmota_options_setter') {
        compWidth = 280;
        compHeight = 250;
    } else if (type === 'joystick') {
        compWidth = 320;
        compHeight = 180;
    } else if (type === 'tasmota_gpio_module') {
        compWidth = 350;
        compHeight = 700;
    }


    // --- 自動定位演算法 ---
    // 尋找一個不會與現有元件重疊的位置
    let newX = 20;
    let newY = 20;
    const margin = 20;

    let isOverlapping = true;
    while (isOverlapping) {
        isOverlapping = false;
        for (const comp of components) {
            // AABB 碰撞檢測
            if (newX < comp.x + comp.width + margin &&
                newX + compWidth + margin > comp.x &&
                newY < comp.y + comp.height + margin &&
                newY + compHeight + margin > comp.y) {
                isOverlapping = true;
                break;
            }
        }

        // 如果重疊，則向右移動；如果超出畫布，則換行
        if (isOverlapping) {
            newX += 150 + margin;
            if (newX + compWidth > canvas.clientWidth) {
                newX = 20;
                newY += 60 + margin;
            }
        }
    }

    // 建立新元件的基礎物件
    const newComponent = {
        id, type, x: newX, y: newY, width: compWidth, height: compHeight,
        label: `新 ${type}`, isJsonPayload: false
    };

    // --- 根據元件類型設定專屬的預設屬性 ---
    switch (type) {
        case 'switch':
            Object.assign(newComponent, { value: false, payloadOn: '1', payloadOff: '0', switchStyle: 'slide', topic: `/my/device/${id}` });
            break;
        case 'button':
            Object.assign(newComponent, { value: 'Click', payloadOn: '1', shape: 'square', topic: `/my/device/${id}` });
            break;
        case 'slider':
            Object.assign(newComponent, { value: 50, topic: `/my/device/${id}` });
            break;
        case 'text':
            Object.assign(newComponent, { value: '', topic: `/my/device/${id}` });
            break;
        case 'led':
            Object.assign(newComponent, {
                value: false, topicMode: 'single', topic: `/my/device/${id}`, colorTopic: `/my/device/${id}/color`,
                brightnessTopic: `/my/device/${id}/brightness`, color: '#22c55e', brightness: 100
            });
            break;
        case 'progress':
        case 'gauge':
            Object.assign(newComponent, { value: 25, min: 0, max: 100, topic: `/my/device/${id}` });
            break;
        case 'graph':
            Object.assign(newComponent, {
                data: [],
                maxDataPoints: 20,
                chartType: 'line',
                chartLabels: '標籤1,標籤2,標籤3',
                topic: `/my/device/${id}`
            });
            break;
        case 'radio':
            Object.assign(newComponent, {
                value: 'val1', topicMode: 'single', topic: `/my/device/${id}`, options: [
                    { label: '選項1', value: 'val1', topic: '' }, { label: '選項2', value: 'val2', topic: '' }
                ]
            });
            break;
        case 'checkbox':
            Object.assign(newComponent, {
                topicMode: 'single', payloadOn: '1', payloadOff: '0', topic: `/my/device/${id}`, value: [], options: [
                    { label: '選項A', value: 'A', topic: '', checked: false }, { label: '選項B', value: 'B', topic: '', checked: false }
                ]
            });
            break;
        case 'dropdown':
            Object.assign(newComponent, { value: '選項1', options: '選項1\n選項2\n選項3', topic: `/my/device/${id}` });
            break;
        case 'color':
            Object.assign(newComponent, { value: '#5e81ac', topic: `/my/device/${id}` });
            break;
        case 'text_input':
            Object.assign(newComponent, { value: '', topic: `/my/device/${id}` });
            break;
        case 'date': case 'time': case 'datetime':
            Object.assign(newComponent, { value: '', topic: `/my/device/${id}` });
            break;
        case 'notification':
            Object.assign(newComponent, { notificationType: 'info', duration: 3000, topic: `/my/device/${id}` });
            break;
        case 'template':
            Object.assign(newComponent, { value: 'N/A', htmlTemplate: '<h1 class="text-xl">數值: <span class="font-bold text-blue-600">{{value}}</span></h1>', topic: `/my/device/${id}` });
            break;
        case 'buzzer':
            Object.assign(newComponent, { colorNormal: '#3b82f6', colorActive: '#ef4444', duration: 1000, topic: `/my/device/${id}` });
            break;
        case 'qrcode':
            Object.assign(newComponent, { value: 'Hello MQTT', topic: `/my/device/${id}` });
            break;
        case 'thermometer':
            Object.assign(newComponent, { value: 25, min: -10, max: 50, unit: 'C', topic: `/my/device/${id}` });
            break;
        case 'image':
            const placeholderUrl = 'https://placehold.co/150x150?text=Image';
            Object.assign(newComponent, {
                sourceType: 'staticUrl', staticUrl: placeholderUrl, value: placeholderUrl, topic: `/my/device/${id}`
            });
            break;
        case 'joystick':
            Object.assign(newComponent, {
                label: `搖桿`,
                topicX: `/my/device/${id}/x`,
                topicY: `/my/device/${id}/y`,
                maxX: 100,
                maxY: 100,
                topicBtnA: `/my/device/${id}/btnA`,
                payloadBtnAOn: '1',
                payloadBtnAOff: '0',
                topicBtnB: `/my/device/${id}/btnB`,
                payloadBtnBOn: '1',
                payloadBtnBOff: '0',
                topicBtnX: `/my/device/${id}/btnX`,
                payloadBtnXOn: '1',
                payloadBtnXOff: '0',
                topicBtnY: `/my/device/${id}/btnY`,
                payloadBtnYOn: '1',
                payloadBtnYOff: '0'
            });
            break;
        case 'speech':
            Object.assign(newComponent, {
                label: '語音',
                encoding: 'utf-8',
                text: '這是利用google翻譯的語音服務',
                speed: 1,
                times: 1,
                encodingTopic: `/my/device/${id}/encoding`,
                textTopic: `/my/device/${id}/text`,
                speedTopic: `/my/device/${id}/speed`,
                timesTopic: `/my/device/${id}/times`,
                isPlaying: false
            });
            break;
        case 'tasmota_relay':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_${Date.now() % 1000}`,
                deviceName: 'New Relay',
                relayIndex: '',
                state: 'OFF',
                isOnline: false,
                icon: 'lightbulb'
            });
            break;
        case 'tasmota_ws2812':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_ws2812_${Date.now() % 1000}`,
                deviceName: '新 WS2812 燈控',
                isOnline: false,
                state: 'OFF',
                lightIndex: '',
                hue: 180, saturation: 100, brightness: 100,
                scheme: 0, pixels: 16, speed: 10,
                width1: 1, width2: 1, width3: 1, width4: 1 // New width properties
            });
            break;
        case 'tasmota_status':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_stat_${Date.now() % 1000}`,
                deviceName: '新 Tasmota 狀態',
                isOnline: false,
                statusData: {},
                defaultStatus: 1, // 新增：預設顯示項目
                selectedStatus: 1 // Default status to show
            });
            break;
        case 'tasmota_console':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_console_${Date.now() % 1000}`,
                deviceName: '新命令列控制台',
                isOnline: false,
            });
            break;
        case 'tasmota_timer_setter':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_timer_${Date.now() % 1000}`,
                deviceName: '新定時器設定',
                isOnline: false,
                timersEnabled: false,
                selectedTimerIndex: 1,
                timers: Array.from({ length: 16 }, () => ({})), // Array of 16 timer config objects
            });
            break;
        case 'tasmota_rules_editor':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_rules_${Date.now() % 1000}`,
                deviceName: '新規則編輯器',
                isOnline: false,
                selectedRuleIndex: 1,
                ruleEnabled: false,
                ruleText: '',
            });
            break;
        case 'tasmota_options_setter':
            const defaultOption = TASMOTA_SETOPTIONS_DATA[0];
            Object.assign(newComponent, {
                tasmotaName: `tasmota_opts_${Date.now() % 1000}`,
                deviceName: '新選項設定器',
                isOnline: false,
                selectedOption: defaultOption.command,
                description: defaultOption.description,
                value: null // Initially unknown
            });
            break;
        case 'tasmota_gpio_module':
            Object.assign(newComponent, {
                tasmotaName: `tasmota_gpio_${Date.now() % 1000}`,
                deviceName: '新 GPIO 模組',
                isOnline: false,
                currentModule: 'N/A',
                templateName: 'MyTemplate',
                availableGpios: null, // 用於儲存從裝置獲取的功能列表
                gpioSettings: [0, 1, 2, 3, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17].reduce((acc, pin) => {
                    acc[pin] = { value: 0 };
                    return acc;
                }, {}),
            });
            break;
    }

    // 將新元件加入到 `components` 陣列中，並重新渲染畫布和更新 MQTT 訂閱
    components.push(newComponent);
    renderAllComponents();
    subscribeToAllTopics();
}

/**
 * 處理來自 UI 的元件互動事件
 * @param {string} id - 互動的元件 ID
 * @param {*} value - 互動後的新值 (例如滑桿數值、開關狀態)
 * @param {number} [index] - 對於選項類型元件，表示被操作的選項索引
 */
function handleComponentInteraction(id, value, index) {
    const comp = findComponentById(id);
    if (!comp) return;

    // 1. 更新 `components` 陣列中對應元件的資料
    let needsUIUpdate = true;
    switch (comp.type) {
        case 'radio':
            comp.value = value;
            break;
        case 'checkbox':
            if (comp.topicMode === 'single') {
                if (!Array.isArray(comp.value)) comp.value = [];
                const optValue = comp.options[index].value;
                if (value) {
                    if (!comp.value.includes(optValue)) comp.value.push(optValue);
                } else {
                    comp.value = comp.value.filter(v => v !== optValue);
                }
            } else {
                comp.options[index].checked = value;
            }
            break;
        case 'switch': case 'slider': case 'dropdown': case 'color': case 'date': case 'time': case 'datetime':
            comp.value = value;
            break;
        default:
            needsUIUpdate = false;
            break;
    }

    // 2. 如果需要，呼叫 `updateComponent` 來更新 UI
    if (needsUIUpdate) {
        updateComponent(id, { value: comp.value, options: comp.options });
    }

    // 3. 如果處於檢視模式且 MQTT 已連接，則發布訊息
    if (canvas.classList.contains('view-mode') && mqttClient && mqttClient.connected) {
        let payload;
        let topic = comp.topic;
        let finalPayload;
        let isJson = comp.isJsonPayload;

        // 根據元件類型和模式組合要發送的 payload 和 topic
        if (comp.topicMode === 'multiple' && (comp.type === 'radio' || comp.type === 'checkbox')) {
            const option = comp.options[index];
            topic = option.topic;
            isJson = false;
            if (comp.type === 'radio') {
                payload = option.label;
            } else {
                payload = value ? comp.payloadOn : comp.payloadOff;
            }
        } else {
            if (['switch'].includes(comp.type)) {
                payload = value ? comp.payloadOn : comp.payloadOff;
            } else if (comp.type === 'checkbox' && comp.topicMode === 'single') {
                payload = comp.value;
            } else {
                payload = value;
            }
        }

        // 格式化最終的 payload (字串或 JSON)
        finalPayload = (isJson && !Array.isArray(payload)) ? JSON.stringify({ value: payload }) :
            (isJson && Array.isArray(payload)) ? JSON.stringify(payload) :
                String(payload);

        // 發布 MQTT 訊息
        if (topic) {
            mqttClient.publish(topic, finalPayload);
            console.log(`Published to ${topic}: ${finalPayload}`);
        }
    }
}

/**
 * 專門處理語音元件的互動事件
 * @param {string} id - 互動的元件 ID
 * @param {string} action - 執行的動作 (例如 'stop')
 */
function handleSpeechInteraction(id, action) {
    const comp = findComponentById(id);
    if (!comp) return;

    if (action === 'stop') {
        const audio = activeAudioObjects[id];
        if (audio) {
            audio.pause();
            audio.src = ''; // 強制停止載入和播放
        }
    }
}

/**
 * 專門處理 Tasmota 元件的互動事件
 * @param {string} id - 互動的元件 ID
 * @param {string} action - 執行的動作 (例如 'toggle', 'hsb_change')
 * @param {object} [options={}] - 額外選項，如指令類型
 */
function handleTasmotaInteraction(id, action, options = {}) {
    const comp = findComponentById(id);
    if (!comp) return;
    let topic, message;

    // 根據動作類型組合 Tasmota 的標準 cmnd topic 和 message
    switch (action) {
        case 'toggle':
            let powerIndex = '';
            if (comp.type === 'tasmota_relay') {
                powerIndex = comp.relayIndex;
            } else if (comp.type === 'tasmota_ws2812') {
                powerIndex = comp.lightIndex;
            }
            topic = `cmnd/${comp.tasmotaName}/POWER${powerIndex}`;
            message = 'TOGGLE';
            break;
        case 'hsb_change':
            topic = `cmnd/${comp.tasmotaName}/HSBColor`;
            message = `${comp.hue},${comp.saturation},${comp.brightness}`;
            break;
        case 'ws2812_scheme':
            topic = `cmnd/${comp.tasmotaName}/Scheme`;
            if (options.value === '+') {
                comp.scheme = Math.min(13, comp.scheme + 1);
                message = String(comp.scheme);
                updateComponent(id, { scheme: comp.scheme }); // Sync UI
            } else if (options.value === '-') {
                comp.scheme = Math.max(0, comp.scheme - 1);
                message = String(comp.scheme);
                updateComponent(id, { scheme: comp.scheme }); // Sync UI
            } else {
                message = options.value;
            }
            break;
        case 'ws2812_speed':
            topic = `cmnd/${comp.tasmotaName}/Speed`;
            if (options.value === '+') {
                comp.speed = Math.min(40, comp.speed + 1);
                message = String(comp.speed);
                updateComponent(id, { speed: comp.speed }); // Sync UI
            } else if (options.value === '-') {
                comp.speed = Math.max(1, comp.speed - 1);
                message = String(comp.speed);
                updateComponent(id, { speed: comp.speed }); // Sync UI
            } else {
                message = options.value;
            }
            break;
        case 'ws2812_pixels':
            topic = `cmnd/${comp.tasmotaName}/Pixels`;
            message = String(comp.pixels);
            break;
        case 'ws2812_width1': topic = `cmnd/${comp.tasmotaName}/Width1`; message = String(comp.width1); break;
        case 'ws2812_width2': topic = `cmnd/${comp.tasmotaName}/Width2`; message = String(comp.width2); break;
        case 'ws2812_width3': topic = `cmnd/${comp.tasmotaName}/Width3`; message = String(comp.width3); break;
        case 'ws2812_width4': topic = `cmnd/${comp.tasmotaName}/Width4`; message = String(comp.width4); break;
        case 'status_query':
            topic = `cmnd/${comp.tasmotaName}/Status`;
            message = String(options.statusNumber);
            break;
        case 'send_command':
            const commandText = options.commandText || '';
            if (!commandText.trim()) return; // 如果是空的就不發送

            const parts = commandText.trim().split(/\s+/);
            const commandName = parts.shift(); // 第一個部分是 command
            message = parts.join(' ');     // 剩下的部分是 payload
            topic = `cmnd/${comp.tasmotaName}/${commandName}`;
            break;
        case 'timers_global_toggle':
            topic = `cmnd/${comp.tasmotaName}/Timers`;
            message = options.value ? '1' : '0';
            break;
        case 'timer_query':
            topic = `cmnd/${comp.tasmotaName}/Timer${comp.selectedTimerIndex}`;
            message = ''; // Empty payload queries the current state
            break;
        case 'timer_send':
            topic = `cmnd/${comp.tasmotaName}/Timer${comp.selectedTimerIndex}`;
            const timerData = comp.timers[comp.selectedTimerIndex - 1];
            // Sanitize data before sending
            const payloadToSend = {
                Enable: timerData.Enable ? 1 : 0,
                Mode: parseInt(timerData.Mode, 10) || 0,
                Time: timerData.Time || "00:00",
                Window: parseInt(timerData.Window, 10) || 0,
                Days: timerData.Days || "0000000",
                Repeat: timerData.Repeat ? 1 : 0,
                Output: parseInt(timerData.Output, 10) || 1,
                Action: parseInt(timerData.Action, 10) || 0,
            };
            message = JSON.stringify(payloadToSend);
            break;
        case 'rule_query':
            topic = `cmnd/${comp.tasmotaName}/Rule${comp.selectedRuleIndex}`;
            message = ''; // Empty payload queries the rule
            break;
        case 'rule_set':
            topic = `cmnd/${comp.tasmotaName}/Rule${comp.selectedRuleIndex}`;
            message = comp.ruleText;
            break;
        case 'rule_enable_toggle':
            topic = `cmnd/${comp.tasmotaName}/Rule${comp.selectedRuleIndex}`;
            message = options.value ? '1' : '0';
            break;
        case 'option_action':
            topic = `cmnd/${comp.tasmotaName}/${comp.selectedOption}`;
            message = options.value; // A value for setting, or empty string for querying
            break;
        case 'gpio_module_query':
            topic = `cmnd/${comp.tasmotaName}/Module`;
            message = '';
            break;
        case 'gpio_options_query': // 新增查詢 GPIO 功能的動作
            topic = `cmnd/${comp.tasmotaName}/Gpios`;
            message = '';
            break;
        case 'gpio_template_apply':
            // Step 1: Send Template
            topic = `cmnd/${comp.tasmotaName}/Template`;
            const gpioMap = [0, 1, 2, 3, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17];
            const gpioArray = gpioMap.map(pin => comp.gpioSettings[pin]?.value || 0);
            const templatePayload = {
                "NAME": comp.templateName,
                "GPIO": gpioArray,
                "FLAG": 0,
                "BASE": 18
            };
            message = JSON.stringify(templatePayload);
            mqttClient.publish(topic, message);
            console.log(`%c[TASMOTA] Published to ${topic}: ${message}`, 'color: #c026d3; font-weight: bold;');

            // Step 2: Set Module to 0 (after a short delay)
            setTimeout(() => {
                const moduleTopic = `cmnd/${comp.tasmotaName}/Module`;
                const moduleMessage = '0';
                mqttClient.publish(moduleTopic, moduleMessage);
                console.log(`%c[TASMOTA] Published to ${moduleTopic}: ${moduleMessage}`, 'color: #c026d3; font-weight: bold;');
            }, 500);
            return; // Exit to prevent double publish
        case 'gpio_pin_set':
            topic = `cmnd/${comp.tasmotaName}/Backlog`;
            message = `GPIO${options.pin} ${options.value}`;
            break;
    }

    // 發布 MQTT 指令
    if (topic && message !== undefined && mqttClient && mqttClient.connected) {
        mqttClient.publish(topic, message);
        console.log(`%c[TASMOTA] Published to ${topic}: ${message}`, 'color: #c026d3; font-weight: bold;');
    }
}

// --- MQTT 管理 ---
let activeAudioObjects = {}; // 儲存活動的音訊元素以允許停止它們

/**
 * 播放語音
 * @param {object} comp - 語音元件的物件
 */
function playSpeech(comp) {
    // 如果有舊的音訊物件，先停止它
    if (activeAudioObjects[comp.id]) {
        activeAudioObjects[comp.id].pause();
        delete activeAudioObjects[comp.id];
    }

    const textToSpeak = comp.text || '';
    if (!textToSpeak.trim()) {
        updateComponent(comp.id, { isPlaying: false }); // 如果文字是空的，確保狀態是停止
        return;
    }

    const speed = comp.speed || 1;
    // 注意：此 URL 可能因 Google 服務政策變更而失效
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=zh-tw&client=tw-ob&ttsspeed=${speed}`;

    let playCount = 0;
    const timesToPlay = parseInt(comp.times, 10);
    const loop = timesToPlay === 0;

    updateComponent(comp.id, { isPlaying: true });

    // 播放函式
    const play = () => {
        const audio = new Audio(url);
        activeAudioObjects[comp.id] = audio;

        // 播放結束後，遞增計數並準備下一次播放
        audio.onended = () => {
            playCount++;
            // 在迴圈之前檢查此音訊物件是否仍然是活動的
            if (activeAudioObjects[comp.id] === audio) {
                if (loop || playCount < timesToPlay) {
                    play(); // 重新呼叫以建立新的音訊物件進行下一次播放
                } else {
                    delete activeAudioObjects[comp.id];
                    updateComponent(comp.id, { isPlaying: false });
                }
            }
        };

        // 錯誤處理
        audio.onerror = (e) => {
            console.error("播放語音時發生錯誤:", e);
            if (activeAudioObjects[comp.id] === audio) {
                delete activeAudioObjects[comp.id];
                updateComponent(comp.id, { isPlaying: false });
            }
        };

        audio.play();
    };
    play();
}
/**
 * 從 UI 輸入框組合出完整的 MQTT Broker URL
 * @returns {string | null} 組合好的 URL，或在伺服器位址為空時返回 null
 */
function getBrokerUrl() {
    const protocol = mqttProtocol.value;
    const server = mqttServer.value.trim();
    const port = mqttPort.value.trim();
    let path = mqttPath.value.trim();

    if (!server) return null;
    if (path && !path.startsWith('/')) path = '/' + path;
    const portString = port ? `:${port}` : '';
    return `${protocol}${server}${portString}${path}`;
}

/**
 * 根據連接狀態更新 MQTT 設定 UI 的啟用/禁用狀態
 * @param {boolean} connected - 是否已連接
 */
function setConnectionUIState(connected) {
    // 禁用或啟用所有設定輸入框
    [mqttProtocol, mqttServer, mqttPort, mqttPath, mqttUsernameInput, mqttPasswordInput].forEach(el => el.disabled = connected);

    // 更新連接按鈕的文字和顏色
    if (connected) {
        connectMqttBtn.textContent = '斷線';
        connectMqttBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        connectMqttBtn.classList.add('bg-red-500', 'hover:bg-red-600');
    } else {
        connectMqttBtn.textContent = '連接';
        connectMqttBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        connectMqttBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    }
}

/**
 * 連接到 MQTT Broker
 */
function connectMqtt() {
    const brokerUrl = getBrokerUrl();
    if (!brokerUrl) {
        alert('請至少輸入伺服器位址');
        return;
    }
    const options = {
        username: mqttUsernameInput.value,
        password: mqttPasswordInput.value
    };

    updateConnectionStatus('連接中...', 'bg-yellow-400');
    mqttClient = mqtt.connect(brokerUrl, options);

    // --- 設定 MQTT 事件監聽器 ---
    mqttClient.on('connect', () => {
        updateConnectionStatus('已連接', 'bg-green-500', 'text-white');
        setConnectionUIState(true);
        subscribeToAllTopics(); // 連接成功後，訂閱所有需要的 topic
    });
    mqttClient.on('error', (err) => {
        console.error('MQTT Connection Error:', err);
        updateConnectionStatus('連接錯誤', 'bg-red-500', 'text-white');
        mqttClient.end();
    });
    mqttClient.on('close', () => {
        if (!connectionStatus.classList.contains('bg-red-500')) {
            updateConnectionStatus('已斷線', 'bg-gray-400');
        }
        setConnectionUIState(false);
        mqttClient = null;

        // **REVISED LOGIC**: 當連線中斷時，重置所有追蹤狀態
        currentlySubscribedTopics = new Set();
        Object.keys(tasmotaDeviceStatus).forEach(key => delete tasmotaDeviceStatus[key]);

        // 將所有畫布上的 Tasmota 元件設定為離線
        components.forEach(comp => {
            if (comp.type.startsWith('tasmota_') && comp.isOnline) {
                updateComponent(comp.id, { isOnline: false });
            }
        });
    });

    /**
     * 核心函式：當收到 MQTT 訊息時觸發
     */
    mqttClient.on('message', (topic, message) => {
        console.log(`%cReceived message on ${topic}: ${message.toString()}`, 'color: #1d4ed8; font-weight: bold;');

        const topicParts = topic.split('/');
        const messageStr = message.toString();

        // --- 處理 Tasmota 上線/離線 (LWT) 訊息 ---
        if (topicParts[0] === 'tele' && topicParts[2] === 'LWT') {
            const deviceName = topicParts[1];
            const isOnline = messageStr === 'Online';

            // **REVISED LOGIC**: 1. 更新狀態中心
            tasmotaDeviceStatus[deviceName] = isOnline;

            // **REVISED LOGIC**: 2. 找到所有相關元件並更新它們
            components.forEach(comp => {
                if (comp.tasmotaName === deviceName) {
                    updateComponent(comp.id, { isOnline });
                    // 如果設備剛上線，根據元件類型主動查詢其當前狀態
                    if (isOnline) {
                        // 使用 setTimeout 稍微延遲，確保裝置已完全準備好回應
                        setTimeout(() => {
                            switch (comp.type) {
                                case 'tasmota_gpio_module':
                                    handleTasmotaInteraction(comp.id, 'gpio_options_query');
                                    break;
                                case 'tasmota_status':
                                    handleTasmotaInteraction(comp.id, 'status_query', { statusNumber: comp.selectedStatus });
                                    break;
                                case 'tasmota_relay':
                                case 'tasmota_ws2812':
                                    const powerIndex = comp.relayIndex || comp.lightIndex || '';
                                    const topic = `cmnd/${comp.tasmotaName}/POWER${powerIndex}`;
                                    if (mqttClient && mqttClient.connected) mqttClient.publish(topic, ''); // 發送空訊息以查詢狀態
                                    break;
                                case 'tasmota_timer_setter':
                                    handleTasmotaInteraction(comp.id, 'timer_query');
                                    break;
                                case 'tasmota_rules_editor':
                                    handleTasmotaInteraction(comp.id, 'rule_query');
                                    break;
                                case 'tasmota_options_setter':
                                    handleTasmotaInteraction(comp.id, 'option_action', { value: '' });
                                    break;
                            }
                        }, 500);
                    }

                }
            });
            return;
        }

        // --- 處理 Tasmota 狀態回報 (STAT) 訊息 ---
        if (topicParts[0] === 'stat') {
            const deviceName = topicParts[1];
            const tasmotaDevices = components.filter(c =>
                c.type.startsWith('tasmota_') && c.tasmotaName === deviceName
            );

            if (tasmotaDevices.length === 0) return;

            tasmotaDevices.forEach(targetComp => {
                if (activeSliderId === targetComp.id) {
                    return;
                }

                if (topic.endsWith('/RESULT')) {
                    try {
                        const resultJson = JSON.parse(messageStr);

                        if (targetComp.type === 'tasmota_options_setter') {
                            if (resultJson.hasOwnProperty(targetComp.selectedOption)) {
                                const receivedValue = resultJson[targetComp.selectedOption];
                                updateComponent(targetComp.id, { value: receivedValue });
                                return;
                            }
                        }

                        // 處理來自 Gpios 指令的回應
                        if ((resultJson.GPIOs1 || resultJson.GPIOs2) && targetComp.type === 'tasmota_gpio_module') {
                            // 將新收到的資料與現有資料合併，而不是直接覆蓋
                            const mergedGpios = {
                                ...(targetComp.availableGpios || {}),
                                ...resultJson
                            };
                            updateComponent(targetComp.id, { availableGpios: mergedGpios });
                            return;

                        }

                        // Handle Module response for GPIO Module
                        if (resultJson.Module && targetComp.type === 'tasmota_gpio_module') {
                            const moduleName = Object.values(resultJson.Module)[0] || 'Unknown';
                            updateComponent(targetComp.id, { currentModule: moduleName });
                            // Now query the template details
                            const templateQueryTopic = `cmnd/${targetComp.tasmotaName}/Template`;
                            mqttClient.publish(templateQueryTopic, '');
                            return; // Wait for template response
                        }

                        // Handle Template response for GPIO Module
                        if (resultJson.NAME && resultJson.GPIO && targetComp.type === 'tasmota_gpio_module') {
                            const gpioMap = [0, 1, 2, 3, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17];
                            const gpioValues = resultJson.GPIO;
                            const newSettings = { ...targetComp.gpioSettings };
                            gpioMap.forEach((pin, index) => {
                                if (gpioValues[index] !== undefined) {
                                    newSettings[pin] = { value: gpioValues[index] };
                                }
                            });
                            updateComponent(targetComp.id, { gpioSettings: newSettings });
                            return; // Stop further processing
                        }

                        // Handle global timers enable/disable state
                        if (resultJson.hasOwnProperty('Timers') && targetComp.type === 'tasmota_timer_setter') {
                            updateComponent(targetComp.id, { timersEnabled: resultJson.Timers === 'ON' });
                            return; // Stop further processing for this message
                        }

                        // Handle individual timer state query for Timer Setter
                        const timerKey = `Timer${targetComp.selectedTimerIndex}`;
                        if (resultJson.hasOwnProperty(timerKey) && targetComp.type === 'tasmota_timer_setter') {
                            const newTimers = [...targetComp.timers];
                            newTimers[targetComp.selectedTimerIndex - 1] = resultJson[timerKey];
                            updateComponent(targetComp.id, { timers: newTimers });
                            return;
                        }

                        // Handle rule query for Rules Editor
                        const ruleKey = `Rule${targetComp.selectedRuleIndex}`;
                        if (resultJson.hasOwnProperty(ruleKey) && targetComp.type === 'tasmota_rules_editor') {
                            const ruleData = resultJson[ruleKey];
                            const updates = {
                                ruleEnabled: ruleData.State === 'ON',
                                ruleText: ruleData.Rules || '' // 修正: 使用 'Rules' 而非 'Rule'
                            };
                            updateComponent(targetComp.id, updates);
                            return;
                        }

                        if (targetComp.type === 'tasmota_relay') {
                            const powerKey = `POWER${targetComp.relayIndex || ''}`;
                            if (resultJson.hasOwnProperty(powerKey)) {
                                updateComponent(targetComp.id, { state: resultJson[powerKey] });
                            }
                            return;
                        }

                        if (targetComp.type === 'tasmota_ws2812') {
                            const powerKey = `POWER${targetComp.lightIndex || ''}`;
                            if (resultJson.hasOwnProperty(powerKey)) {
                                const newState = resultJson[powerKey];
                                const updates = { state: newState };
                                if (newState === 'ON' && resultJson.HSBColor) {
                                    const [hue, saturation, brightness] = resultJson.HSBColor.split(',').map(Number);
                                    updates.hue = hue;
                                    updates.saturation = saturation;
                                    updates.brightness = brightness;
                                }
                                updateComponent(targetComp.id, updates);
                            }
                            else if (resultJson.HSBColor) {
                                const [hue, saturation, brightness] = resultJson.HSBColor.split(',').map(Number);
                                updateComponent(targetComp.id, { hue, saturation, brightness });
                            }
                            return;
                        }
                    } catch (e) {
                        console.error("Failed to parse Tasmota RESULT JSON:", e);
                    }
                }

                const statusMatch = topic.match(/\/STATUS(\d+)$/);
                if (statusMatch && targetComp.type === 'tasmota_status') {
                    const statusNumber = parseInt(statusMatch[1], 10);
                    if (statusNumber === targetComp.selectedStatus) {
                        try {
                            const statusJson = JSON.parse(messageStr);
                            updateComponent(targetComp.id, { statusData: statusJson });
                        } catch (e) {
                            console.error(`Failed to parse Tasmota STATUS${statusNumber} JSON:`, e);
                        }
                    }
                }
            });
        }

        // --- 處理標準元件的訊息 ---
        const targetComponents = components.filter(c => {
            if (c.topic && c.topicMode !== 'multiple' && c.topic === topic) return true;
            if (c.type === 'led' && c.topicMode === 'multiple' && (c.topic === topic || c.colorTopic === topic || c.brightnessTopic === topic)) return true;
            if ((c.type === 'radio' || c.type === 'checkbox') && c.topicMode === 'multiple') {
                return c.options.some(o => o.topic === topic);
            }
            // Speech component topic check
            if (c.type === 'speech') {
                return [c.encodingTopic, c.textTopic, c.speedTopic, c.timesTopic].includes(topic);
            }
            return false;
        });

        if (targetComponents.some(c => c.id === activeSliderId)) {
            return;
        }

        if (targetComponents.length === 0) return;

        targetComponents.forEach(targetComp => {
            let parsedValue = messageStr;

            try {
                const jsonObj = JSON.parse(messageStr);
                if (jsonObj && typeof jsonObj === 'object') {
                    parsedValue = jsonObj.hasOwnProperty('value') ? jsonObj.value : jsonObj;
                }
            } catch (e) { /* 不是 JSON 字串，保持為原始字串 */ }

            if (targetComp.type === 'notification') { showToast(targetComp, String(parsedValue)); return; }
            if (targetComp.type === 'buzzer') { activateBuzzer(targetComp); return; }

            if (targetComp.type === 'speech') {
                const updates = {};
                let textUpdated = false;

                if (topic === targetComp.encodingTopic) updates.encoding = messageStr;
                if (topic === targetComp.textTopic) {
                    updates.text = messageStr;
                    textUpdated = true;
                }
                if (topic === targetComp.speedTopic) updates.speed = parseFloat(messageStr) || 1;
                if (topic === targetComp.timesTopic) updates.times = parseInt(messageStr, 10);

                // 先更新元件狀態
                Object.assign(targetComp, updates);

                // 如果是文字更新，則觸發播放
                if (textUpdated) {
                    playSpeech(targetComp);
                }
                // 同時更新 UI 和屬性面板
                updateComponent(targetComp.id, updates);
                return;
            }

            if (targetComp.type === 'led') {
                const updates = {};
                if (targetComp.topicMode === 'single' && typeof parsedValue === 'object') {
                    if (parsedValue.hasOwnProperty('state')) {
                        updates.value = ['on', 1].includes(String(parsedValue.state).toLowerCase());
                    }
                    if (parsedValue.hasOwnProperty('color')) updates.color = parsedValue.color;
                    if (parsedValue.hasOwnProperty('brightness')) updates.brightness = parseInt(parsedValue.brightness, 10);
                } else if (targetComp.topicMode === 'multiple') {
                    if (topic === targetComp.topic) updates.value = ['1', 'on'].includes(String(parsedValue).toLowerCase());
                    if (topic === targetComp.colorTopic) updates.color = String(parsedValue);
                    if (topic === targetComp.brightnessTopic) updates.brightness = parseInt(parsedValue, 10);
                } else {
                    updates.value = ['1', 'on'].includes(String(parsedValue).toLowerCase());
                }
                if (Object.keys(updates).length > 0) updateComponent(targetComp.id, updates);
                return;
            }

            if (targetComp.topicMode === 'multiple' && targetComp.type === 'checkbox') {
                const optionIndex = targetComp.options.findIndex(o => o.topic === topic);
                if (optionIndex > -1) {
                    targetComp.options[optionIndex].checked = String(parsedValue) === targetComp.payloadOn;
                    updateComponent(targetComp.id, { options: targetComp.options });
                }
                return;
            }

            let newValue = parsedValue;
            if (targetComp.type === 'switch') {
                newValue = (String(newValue) === targetComp.payloadOn);
            } else if (['slider', 'progress', 'gauge', 'graph', 'thermometer'].includes(targetComp.type)) {
                newValue = parseFloat(newValue);
                if (isNaN(newValue)) return;
            }

            if (targetComp.type === 'graph') {
                if (['pie', 'doughnut'].includes(targetComp.chartType)) {
                    const dataArray = messageStr.split(',').map(Number).filter(n => !isNaN(n));
                    updateComponent(targetComp.id, { data: dataArray });

                } else {
                    const numericValue = parseFloat(messageStr);
                    if (!isNaN(numericValue)) {
                        let currentData = Array.isArray(targetComp.data) ? targetComp.data : [];

                        if (targetComp.chartType === 'line') {
                            if (currentData.length > 0 && typeof currentData[0] !== 'object') currentData = [];
                            const now = new Date();
                            const newLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                            currentData.push({ label: newLabel, value: numericValue });
                        } else { // 'bar'
                            if (currentData.length > 0 && typeof currentData[0] === 'object') currentData = [];
                            currentData.push(numericValue);
                        }

                        if (currentData.length > targetComp.maxDataPoints) {
                            currentData.shift();
                        }
                        updateComponent(targetComp.id, { data: [...currentData] });
                    }
                }
                return;
            } else {
                updateComponent(targetComp.id, { value: newValue });
            }
        });
    });
}

/**
 * 斷開 MQTT 連接
 */
function disconnectMqtt() {
    if (mqttClient) {
        mqttClient.end(true);
    }
}

/**
 * 收集所有元件需要訂閱的 topic，然後一次性訂閱
 */
function subscribeToAllTopics() {
    if (!mqttClient || !mqttClient.connected) return;

    const newTopics = new Set();
    // 遍歷所有元件，收集 topics
    components.forEach(c => {
        // 標準元件
        if (c.topic && c.topicMode !== 'multiple' && !(c.type === 'image' && c.sourceType === 'staticUrl')) {
            newTopics.add(c.topic);
        }
        // LED (多主題模式)
        if (c.type === 'led' && c.topicMode === 'multiple') {
            if (c.topic) newTopics.add(c.topic);
            if (c.colorTopic) newTopics.add(c.colorTopic);
            if (c.brightnessTopic) newTopics.add(c.brightnessTopic);
        }
        // 選項元件 (多主題模式)
        if ((c.type === 'radio' || c.type === 'checkbox') && c.topicMode === 'multiple') {
            c.options.forEach(o => { if (o.topic) newTopics.add(o.topic); });
        }
        // Speech component
        if (c.type === 'speech') {
            if (c.encodingTopic) newTopics.add(c.encodingTopic);
            if (c.textTopic) newTopics.add(c.textTopic);
            if (c.speedTopic) newTopics.add(c.speedTopic);
            if (c.timesTopic) newTopics.add(c.timesTopic);
        }
        // Tasmota 元件
        if (c.type.startsWith('tasmota_') && c.tasmotaName) {
            newTopics.add(`tele/${c.tasmotaName}/LWT`);
            if (['tasmota_relay', 'tasmota_ws2812', 'tasmota_timer_setter', 'tasmota_rules_editor', 'tasmota_options_setter', 'tasmota_gpio_module'].includes(c.type)) {
                newTopics.add(`stat/${c.tasmotaName}/RESULT`);
            }
            if (c.type === 'tasmota_status' && c.selectedStatus) {
                newTopics.add(`stat/${c.tasmotaName}/STATUS${c.selectedStatus}`);
            }
        }
    });

    const topicsToUnsubscribe = [...currentlySubscribedTopics].filter(t => !newTopics.has(t));
    const topicsToSubscribe = [...newTopics].filter(t => !currentlySubscribedTopics.has(t));

    if (topicsToUnsubscribe.length > 0) {
        mqttClient.unsubscribe(topicsToUnsubscribe, (err) => {
            if (err) {
                console.error('取消訂閱失敗:', topicsToUnsubscribe, err);
            } else {
                console.log('%c已取消訂閱:', 'color: #ef4444; font-weight: bold;', topicsToUnsubscribe);
            }
        });
    }

    if (topicsToSubscribe.length > 0) {
        mqttClient.subscribe(topicsToSubscribe, (err) => {
            if (err) {
                console.error('訂閱失敗:', topicsToSubscribe, err);
            } else {
                console.log('%c已訂閱:', 'color: #22c55e; font-weight: bold;', topicsToSubscribe);
            }
        });
    }

    currentlySubscribedTopics = newTopics;
    console.log('%c目前訂閱列表:', 'color: #3b82f6; font-weight: bold;', Array.from(currentlySubscribedTopics));
}

/**
 * 更新連接狀態的 UI 顯示
 * @param {string} text - 要顯示的文字
 * @param {string} bgColor - 背景顏色 class
 * @param {string} [textColor='text-gray-700'] - 文字顏色 class
 */
function updateConnectionStatus(text, bgColor, textColor = 'text-gray-700') {
    connectionStatus.textContent = text;
    connectionStatus.className = `text-xs text-center p-1 rounded-full ${bgColor} ${textColor} transition-all`;
}

// --- 儀表板儲存與讀取 ---
/**
 * 產生一個包含完整執行環境的獨立 HTML 檔案內容
 * @param {string} brokerUrl - MQTT Broker URL
 * @param {Array} componentsData - 元件資料陣列
 * @param {string} username - 使用者名稱
 * @param {string} password - 密碼
 * @returns {string} 完整的 HTML 檔案字串
 */
function generateDashboardHTML(brokerUrl, componentsData, username, password) {
    const componentsJSON = JSON.stringify(componentsData, null, 2);
    const hasGraph = componentsData.some(c => c.type === 'graph');
    const hasQrCode = componentsData.some(c => c.type === 'qrcode');

    // 建立最終的啟動腳本
    const runtimeScript = `
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('canvas');
            const connectionStatus = document.getElementById('connectionStatus');
            
            // --- 執行階段的 Broker 和元件資料 ---
            const brokerUrl = \`${brokerUrl}\`;
            const username = \`${username}\`;
            const password = \`${password}\`;
            let components = ${componentsJSON};

            // 儀表板載入時，將 selectedStatus 與 defaultStatus 同步
            components.forEach(c => {
                if (c.type === 'tasmota_status' && c.defaultStatus) {
                    c.selectedStatus = c.defaultStatus;
                }
            });

            // --- 全域變數和狀態宣告 ---
            let mqttClient = null;
            const chartInstances = {};
            const qrCodeInstances = {};
            const tasmotaDeviceStatus = {};
            let currentlySubscribedTopics = new Set();
            let activeSliderId = null;
            let audioCtx;
            let activeAudioObjects = {};
            let cachedGpios = {};
            
            // --- 資料常數 ---
            const TASMOTA_SETOPTIONS_DATA = ${JSON.stringify(TASMOTA_SETOPTIONS_DATA, null, 2)};
            const TASMOTA_STATUS_TRANSLATIONS = ${JSON.stringify(TASMOTA_STATUS_TRANSLATIONS, null, 2)};
            const TASMOTA_STATUS_OPTIONS = ${JSON.stringify(TASMOTA_STATUS_OPTIONS, null, 2)};

            // --- 注入所有必要的函式 ---
            // 來自 component_renderer.js
        ${getThermometerColor.toString()}
        ${applyBrightnessToHex.toString()}
        ${parseAndGroupTasmotaGpios.toString()}
        ${calculateHistogram.toString()}
        ${renderComponentHTML.toString()}

        // 來自 ui_renderer.js
        ${updateGauge.toString()}
        ${renderStatusData.toString()}
        ${renderAllComponents.toString()}
        ${updateComponent.toString()}

        // 來自 ui_manager.js
        ${findComponentById.toString()}
        ${showToast.toString()}
        ${playSound.toString()}
        ${activateBuzzer.toString()}

        // 來自 mqtt_panel_logic.js
        ${playSpeech.toString()}
        ${handleSpeechInteraction.toString()}
        ${handleTasmotaInteraction.toString()}
        ${getBrokerUrl.toString().replace('mqttProtocol.value', `new URL(brokerUrl).protocol + '//'`).replace('mqttServer.value.trim()', 'new URL(brokerUrl).hostname').replace('mqttPort.value.trim()', 'new URL(brokerUrl).port').replace('mqttPath.value.trim()', 'new URL(brokerUrl).pathname')}
        
        // 獨立模式下的 updateConnectionStatus
        function updateConnectionStatus(text, bgColor, textColor = 'text-gray-700') {
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.textContent = text;
                statusEl.className = \`text-xs text-center p-1 px-3 rounded-full \${bgColor} \${textColor} transition-all\`;
            }
        }

        ${subscribeToAllTopics.toString()}
        ${connectMqtt.toString()}
        ${disconnectMqtt.toString().replace('setConnectionUIState(false);', '')}

        
            // 替換掉編輯器專用的函式
            function setConnectionUIState(connected) { /* 在獨立模式下不執行任何操作 */ }
            const mqttUsernameInput = { value: username };
            const mqttPasswordInput = { value: password };

            // 啟動儀表板
            canvas.classList.remove('edit-mode');
            canvas.classList.add('view-mode');
            renderAllComponents();
            connectMqtt();
        });
    `;

    // 替換 </script> 以避免 HTML 解析錯誤
    const escapedScriptContent = runtimeScript.replace(/<\/script>/g, '<\\/script>');

    return `
<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>MQTT 儀表板</title><script src="https://cdn.tailwindcss.com"><\/script><script src="https://unpkg.com/mqtt/dist/mqtt.min.js"><\/script>${hasGraph ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' : ''}${hasQrCode ? '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>' : ''}<style>body { font-family: "Inter", sans-serif; padding-top: 68px; } .component > * { pointer-events: auto; } input:checked ~ .dot { transform: translateX(100%); } input:checked ~ .block { background-color: #48bb78; } .led-indicator { width: 24px; height: 24px; border-radius: 50%; transition: background-color 0.3s, box-shadow 0.3s; box-shadow: 0 0 5px rgba(0,0,0,0.2); } .color-picker-input { -webkit-appearance: none; appearance: none; width: 40px; height: 40px; padding: 0; border: none; border-radius: 8px; cursor: pointer; } .color-picker-input::-webkit-color-swatch-wrapper { padding: 0; } .color-picker-input::-webkit-color-swatch { border: 1px solid #ccc; border-radius: 8px; } .toast { animation: slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards; } @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateX(100%);} } .shaking { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; } @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-3px, 0, 0); } 40%, 60% { transform: translate3d(3px, 0, 0); } } .image-component-img { width: 100%; height: 100%; object-fit: cover; } input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; background: #3b82f6; cursor: pointer; border-radius: 50%; margin-top: -8px; } input[type="range"]::-moz-range-thumb { width: 20px; height: 20px; background: #3b82f6; cursor: pointer; border-radius: 50%; } .hsb-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 12px; border-radius: 6px; outline: none; } .hue-slider { background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); } .saturation-slider { background: linear-gradient(to right, #808080, #f00); } .brightness-slider { background: linear-gradient(to right, #000, #fff); } .timer-day-label { display: inline-block; width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #4b5563; text-align: center; } .timer-day-input:checked + .timer-day-label { background-color: #3b82f6; color: white; } .joystick-btn { transition: transform 0.1s ease-out, box-shadow 0.1s ease-out; box-shadow: 0 2px 4px rgba(0,0,0,0.3); } .joystick-btn.pressed { transform: scale(0.9); box-shadow: inset 0 2px 4px rgba(0,0,0,0.4); }</style></head><body class="bg-gray-100"><header class="bg-white shadow p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-10"><h1 class="text-xl font-bold text-gray-800">MQTT 儀表板</h1><div class="flex items-center space-x-2 text-sm"><span class="hidden md:inline">Broker: ${brokerUrl}</span><div id="connectionStatus" class="text-xs text-center p-1 px-3 rounded-full bg-gray-300 text-gray-700">未連接</div></div></header><main id="canvas" class="w-full h-full relative view-mode"></main><div id="toast-container" class="fixed top-20 right-5 z-50 space-y-2"></div><script>${escapedScriptContent}<\/script></body></html>`;
}


/**
 * 觸發瀏覽器下載包含儀表板的 HTML 檔案
 */
function saveDashboard() {
    const brokerUrl = getBrokerUrl();
    if (!brokerUrl) {
        alert('無法儲存，請先設定完整的 Broker 位址。');
        return;
    }
    const htmlContent = generateDashboardHTML(brokerUrl, components, mqttUsernameInput.value, mqttPasswordInput.value);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mqtt-dashboard.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

/**
 * 讀取並解析上傳的 HTML 儀表板檔案
 * @param {Event} - 檔案輸入框的 change 事件
 */
function loadDashboard(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        try {
            // 從 HTML 內容中用正則表達式提取元件資料和 Broker 設定
            const componentsMatch = content.match(/let components = (\[[\s\S]*?\]);/); // 保持不變
            const brokerUrlMatch = content.match(/const brokerUrl = `(.*?)`;/);
            const usernameMatch = content.match(/const username = `(.*?)`;/);
            const passwordMatch = content.match(/const password = `(.*?)`;/);

            if (componentsMatch && componentsMatch[1] && brokerUrlMatch && brokerUrlMatch[1]) {
                components = JSON.parse(componentsMatch[1]);
                const brokerUrlData = brokerUrlMatch[1];
                try {
                    const url = new URL(brokerUrlData);
                    mqttProtocol.value = url.protocol + (url.protocol.includes('ws') ? '//' : '');
                    mqttServer.value = url.hostname;
                    mqttPort.value = url.port || '';
                    mqttPath.value = url.pathname === '/' ? '' : url.pathname;
                } catch (urlError) {
                    console.error("Error parsing saved URL:", urlError);
                }
                mqttUsernameInput.value = usernameMatch ? usernameMatch[1] : '';
                mqttPasswordInput.value = passwordMatch ? passwordMatch[1] : '';
                renderAllComponents();
                if (mqttClient && mqttClient.connected) subscribeToAllTopics();
                alert('佈局讀取成功！');
            } else {
                alert('讀取失敗：找不到有效的儀表板資料。');
            }
        } catch (error) {
            alert('讀取檔案時發生錯誤。');
            console.error("Error loading dashboard:", error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // 清空檔案輸入，以便可以再次上傳同一個檔案
}

// --- 程式進入點 ---
document.addEventListener('DOMContentLoaded', () => {
    // --- 設定預設 MQTT Broker ---
    mqttServer.value = 'mqtt.ymhs.tyc.edu.tw';
    mqttPort.value = '8084';
    mqttPath.value = '/mqtt';
    mqttUsernameInput.value = 'ymhsmqtt';
    mqttPasswordInput.value = 'mqttiot';
    // -------------------------

    // --- 綁定新增元件按鈕事件 ---
    addComponentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            createComponent(type);
        });
    });

    // --- 綁定主要控制按鈕事件 ---
    connectMqttBtn.addEventListener('click', () => {
        if (mqttClient && mqttClient.connected) {
            disconnectMqtt();
        } else {
            connectMqtt();
        }
    });
    saveDashboardBtn.addEventListener('click', saveDashboard);
    loadDashboardBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', loadDashboard);
});
