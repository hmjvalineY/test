// --- 全域變數 & DOM 元素 ---
// 獲取頁面上的主要 DOM 元素，以便在程式碼中操作它們
const canvas = document.getElementById('canvas'); // 主要畫布區域
const propertiesPanel = document.getElementById('propertiesPanel'); // 右側屬性面板
const propertiesContent = document.getElementById('propertiesContent'); // 屬性面板的內容區域
const editModeBtn = document.getElementById('editModeBtn'); // 編輯模式按鈕
const viewModeBtn = document.getElementById('viewModeBtn'); // 檢視模式按鈕
const addComponentBtns = document.querySelectorAll('.add-component-btn'); // 所有「新增元件」的按鈕
const connectMqttBtn = document.getElementById('connectMqttBtn'); // MQTT 連接按鈕
const connectionStatus = document.getElementById('connectionStatus'); // MQTT 連線狀態顯示
const mqttProtocol = document.getElementById('mqttProtocol'); // MQTT 協議選擇 (ws/wss)
const mqttServer = document.getElementById('mqttServer'); // MQTT 伺服器地址輸入框
const mqttPort = document.getElementById('mqttPort'); // MQTT 連接埠輸入框
const mqttPath = document.getElementById('mqttPath'); // MQTT 路徑輸入框
const mqttUsernameInput = document.getElementById('mqttUsername'); // MQTT 使用者名稱輸入框
const mqttPasswordInput = document.getElementById('mqttPassword'); // MQTT 密碼輸入框
const closePropertiesBtn = document.getElementById('closePropertiesBtn'); // 關閉屬性面板按鈕
const deleteComponentBtn = document.getElementById('deleteComponentBtn'); // 刪除元件按鈕
const addComponentPanel = document.getElementById('add-component-panel'); // 左側新增元件的區塊
const mqttSettingsPanel = document.getElementById('mqtt-settings'); // 左側 MQTT 設定區塊
const saveDashboardBtn = document.getElementById('saveDashboardBtn'); // 儲存儀表板按鈕
const loadDashboardBtn = document.getElementById('loadDashboardBtn'); // 讀取儀表板按鈕
const fileInput = document.getElementById('fileInput'); // 用於讀取檔案的隱藏 input 元素

// --- 狀態管理變數 ---
let components = []; // 儲存畫布上所有元件資料的陣列
let selectedComponentId = null; // 當前被選中元件的 ID
let mqttClient = null; // MQTT 客戶端實例
const chartInstances = {}; // 儲存 Chart.js 圖表實例的物件
const qrCodeInstances = {}; // 儲存 QRCode.js 實例的物件
const tasmotaDeviceStatus = {}; // **NEW**: 集中管理 Tasmota 設備的線上狀態
let currentlySubscribedTopics = new Set(); // 追蹤目前所有已訂閱的主題

// --- Tasmota 狀態翻譯表 ---
const TASMOTA_STATUS_TRANSLATIONS = {
    // General
    "Time": "時間", "Uptime": "運行時間", "UptimeSec": "運行時間 (秒)", "Heap": "堆疊",
    "LoadAvg": "平均負載", "POWER": "電源", "POWER1": "電源1", "Dimmer": "亮度",
    "Color": "顏色 (RGB)", "HSBColor": "顏色 (HSB)", "Channel": "通道", "Wifi": "Wi-Fi",
    "AP": "AP", "SSId": "SSID", "BSSID": "BSSID", "RSSI": "RSSI", "Signal": "訊號強度 (dBm)",
    "LinkCount": "連接次數", "Downtime": "斷線時間",

    // StatusPRM (1)
    "GroupTopic": "群組主題", "OtaUrl": "OTA URL", "RestartReason": "重啟原因",
    "StartupUTC": "啟動時間 (UTC)", "Sleep": "省電比例", "BootCount": "啟動次數",
    "SaveCount": "儲存次數",

    // StatusFWR (2)
    "Version": "版本", "BuildDateTime": "編譯時間", "Core": "核心版本", "SDK": "SDK 版本",
    "CpuFrequency": "CPU 頻率 (MHz)", "Hardware": "硬體",

    // StatusLOG (3)
    "SerialLog": "序列埠日誌", "WebLog": "網頁日誌", "MqttLog": "MQTT 日誌",
    "SysLog": "系統日誌", "TelePeriod": "週期回報 (秒)", "SetOption": "設定選項",

    // StatusMEM (4)
    "ProgramSize": "程式大小 (K)", "Free": "可用程式空間 (K)", "Heap": "堆疊使用 (K)",
    "ProgramFlashSize": "程式 Flash 大小 (K)", "FlashSize": "Flash 容量 (K)",
    "Features": "啟用功能", "Drivers": "驅動", "Sensors": "感測器",

    // StatusNET (5)
    "Hostname": "主機名稱", "IPAddress": "IP 位址", "Gateway": "閘道",
    "Subnetmask": "子網路遮罩", "DNSServer1": "DNS 伺服器 1", "DNSServer2": "DNS 伺服器 2",
    "Mac": "MAC 位址", "Webserver": "網頁伺服器", "HTTP_API": "HTTP API",

    // StatusMQT (6)
    "MqttHost": "MQTT 主機", "MqttPort": "MQTT 連接埠", "MqttClient": "MQTT 客戶端 ID",
    "MqttUser": "MQTT 使用者", "MqttCount": "MQTT 連接次數", "MqttTLS": "MQTT TLS",
    "KEEPALIVE": "Keep Alive", "SOCKET_TIMEOUT": "Socket Timeout",

    // StatusTIM (7)
    "UTC": "UTC 時間", "Local": "本地時間", "Timezone": "時區",
    "StartDST": "夏令時開始", "EndDST": "夏令時結束", "Sunrise": "日出", "Sunset": "日落",

    // StatusSNS (10)
    "BME280": "BME280", "Temperature": "溫度", "Humidity": "濕度", "Pressure": "壓力"
};

let activeSliderId = null; // 追蹤正在被使用者拖曳的滑桿 ID，用於防止 MQTT 回音
let audioCtx; // Web Audio API 的上下文，用於音效

// --- UI 輔助函式 ---
/**
 * 根據 ID 在 components 陣列中尋找對應的元件物件
 * @param {string} id - 要尋找的元件 ID
 * @returns {object | undefined} 找到的元件物件，或 undefined
 */
function findComponentById(id) {
    return components.find(c => c.id === id);
}

// --- 模式管理 ---
/**
 * 設定應用程式的模式 (編輯模式或檢視模式)
 * @param {string} mode - 'edit' 或 'view'
 */
function setMode(mode) {
    if (mode === 'edit') {
        // --- 進入編輯模式 ---
        canvas.classList.remove('view-mode');
        canvas.classList.add('edit-mode');
        editModeBtn.classList.add('bg-blue-500', 'text-white');
        viewModeBtn.classList.remove('bg-blue-500', 'text-white');
        // 顯示編輯相關的 UI 面板
        addComponentPanel.style.display = 'block';
        mqttSettingsPanel.style.display = 'block';
        // 啟用元件的拖拉與縮放功能
        setupInteract();
        // 取消選中任何元件
        deselectComponent();
    } else {
        // --- 進入檢視模式 ---
        canvas.classList.remove('edit-mode');
        canvas.classList.add('view-mode');
        viewModeBtn.classList.add('bg-blue-500', 'text-white');
        editModeBtn.classList.remove('bg-blue-500', 'text-white');
        // 隱藏編輯相關的 UI 面板
        addComponentPanel.style.display = 'none';
        mqttSettingsPanel.style.display = 'none';
        // 停用元件的拖拉與縮放功能
        interact('.component').unset();
        // 取消選中任何元件並隱藏屬性面板
        deselectComponent();
    }

    // 如果切換到檢視模式，處理 tasmota_status 元件的狀態更新
    if (mode === 'view' && mqttClient && mqttClient.connected) {
        components.forEach(comp => {
            if (comp.type === 'tasmota_status') {
                // 1. 同步 selectedStatus 到 defaultStatus
                comp.selectedStatus = comp.defaultStatus;

                // 2. 立即重新訂閱所有主題，以確保我們正在監聽正確的 STATUS 主題
                subscribeToAllTopics();

                // 3. 發送 MQTT 查詢指令
                handleTasmotaInteraction(comp.id, 'status_query', { statusNumber: comp.selectedStatus });
            }
        });
    }

    // 最後，重新渲染所有元件以更新其外觀和行為 (例如，更新 tasmota_status 的下拉選單顯示)
    renderAllComponents();
}

// --- 互動 (拖拉、縮放、選取) ---
/**
 * 設定 interact.js 函式庫，讓元件可以被拖拉和縮放
 */
function setupInteract() {
    // 先取消之前的設定，避免重複綁定
    interact('.component').unset();

    interact('.component')
        .draggable({
            inertia: true, // 啟用慣性效果
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent', // 限制在父容器 (畫布) 內
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                move(event) {
                    // ... (處理拖曳中的邏輯，包含碰撞檢測)
                    const target = event.target;
                    const comp = findComponentById(target.id);
                    if (!comp) return;

                    const newX = comp.x + event.dx;
                    const newY = comp.y + event.dy;

                    // 碰撞檢測
                    let collision = false;
                    for (const otherComp of components) {
                        if (otherComp.id === comp.id) continue;
                        // AABB 碰撞檢測演算法
                        if (newX < otherComp.x + otherComp.width &&
                            newX + comp.width > otherComp.x &&
                            newY < otherComp.y + otherComp.height &&
                            newY + comp.height > otherComp.y) {
                            collision = true;
                            break;
                        }
                    }

                    if (!collision) {
                        comp.x = newX;
                        comp.y = newY;
                        target.style.transform = `translate(${comp.x}px, ${comp.y}px)`;
                    }
                },
                end(event) {
                    // 拖曳結束後，如果是圖表元件，重新渲染以適應新位置
                    const comp = findComponentById(event.target.id);
                    if (comp && comp.type === 'graph') {
                        renderAllComponents();
                    }
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true }, // 四個邊都可以縮放
            listeners: {
                move(event) {
                    // ... (處理縮放中的邏輯，包含碰撞檢測)
                    const target = event.target;
                    const comp = findComponentById(target.id);
                    if (!comp) return;

                    // 建議的新矩形位置和大小
                    const proposedRect = {
                        x: comp.x + event.deltaRect.left,
                        y: comp.y + event.deltaRect.top,
                        width: event.rect.width,
                        height: event.rect.height
                    };

                    // 碰撞檢測
                    let collision = false;
                    for (const otherComp of components) {
                        if (otherComp.id === comp.id) continue;
                        if (proposedRect.x < otherComp.x + otherComp.width &&
                            proposedRect.x + proposedRect.width > otherComp.x &&
                            proposedRect.y < otherComp.y + otherComp.height &&
                            proposedRect.y + proposedRect.height > otherComp.y) {
                            collision = true;
                            break;
                        }
                    }

                    if (!collision) {
                        // 沒有碰撞，更新元件
                        comp.width = proposedRect.width;
                        comp.height = proposedRect.height;
                        comp.x = proposedRect.x;
                        comp.y = proposedRect.y;

                        target.style.width = `${comp.width}px`;
                        target.style.height = `${comp.height}px`;
                        target.style.transform = `translate(${comp.x}px, ${comp.y}px)`;
                    }
                },
                end(event) {
                    // 縮放結束後，如果是圖表元件，重新渲染以適應新大小
                    const comp = findComponentById(event.target.id);
                    if (comp && comp.type === 'graph') {
                        renderAllComponents();
                    }
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 50, height: 40 } // 限制最小尺寸
                })
            ]
        });
}

/**
 * 選中一個元件，並顯示其屬性面板
 * @param {string} id - 要選中的元件 ID
 */
function selectComponent(id) {
    deselectComponent(); // 先取消之前選中的
    selectedComponentId = id;
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('selected'); // 加上選中樣式
    }
    showPropertiesPanel(id); // 顯示屬性面板
}

/**
 * 取消選中元件，並隱藏屬性面板
 */
function deselectComponent() {
    if (selectedComponentId) {
        const el = document.getElementById(selectedComponentId);
        if (el) el.classList.remove('selected');
    }
    selectedComponentId = null;
    hidePropertiesPanel();
}


// --- 特效 & 音效 ---
/**
 * 顯示一個 Toast (快顯) 通知
 * @param {object} comp - 通知元件的物件
 * @param {string} message - 要顯示的訊息
 */
function showToast(comp, message) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');

    let bgColor, textColor, icon;
    switch (comp.notificationType) {
        case 'success':
            bgColor = 'bg-green-500'; textColor = 'text-white'; icon = '✓';
            break;
        case 'warning':
            bgColor = 'bg-yellow-400'; textColor = 'text-gray-800'; icon = '⚠';
            break;
        case 'error':
            bgColor = 'bg-red-500'; textColor = 'text-white'; icon = '✗';
            break;
        case 'info':
        default:
            bgColor = 'bg-blue-500'; textColor = 'text-white'; icon = 'ℹ';
            break;
    }

    toast.className = `toast flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} ${textColor}`;
    toast.innerHTML = `<span class="font-bold mr-2">${icon}</span> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, comp.duration || 3000);
}

/**
 * 播放一段音效
 * @param {number} duration - 音效持續時間 (毫秒)
 */
function playSound(duration) {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
            return;
        }
    }

    const beepDuration = 0.05; // 50ms beep
    const beepGap = 0.05; // 50ms gap
    const totalCycle = beepDuration + beepGap;
    const now = audioCtx.currentTime;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square'; // More "beep" like sound
    oscillator.frequency.setValueAtTime(880, now);
    gainNode.gain.setValueAtTime(0, now);

    const totalBeeps = Math.floor(duration / (totalCycle * 1000));

    for (let i = 0; i < totalBeeps; i++) {
        const startTime = now + i * totalCycle;
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.setValueAtTime(0, startTime + beepDuration);
    }

    oscillator.start(now);
    oscillator.stop(now + (duration / 1000));
}

/**
 * 觸發蜂鳴器元件的視覺和音效效果
 * @param {object} comp - 蜂鳴器元件的物件
 */
function activateBuzzer(comp) {
    const el = document.getElementById(comp.id);
    if (!el) return;

    const icon = el.querySelector('.buzzer-icon');
    if (!icon) return;

    playSound(comp.duration);

    const originalTransform = el.style.transform;
    el.style.visibility = 'visible';
    el.style.transform = 'translate(10px, 10px)'; // Move to top-left corner
    icon.style.fill = comp.colorActive;
    el.classList.add('shaking');

    setTimeout(() => {
        icon.style.fill = comp.colorNormal;
        el.classList.remove('shaking');
        el.style.visibility = 'hidden';
        el.style.transform = originalTransform; // Restore original position
    }, comp.duration);
}

// --- 事件監聽 (程式進入點) ---
document.addEventListener('DOMContentLoaded', () => {
    // 綁定模式切換按鈕
    editModeBtn.addEventListener('click', () => setMode('edit'));
    viewModeBtn.addEventListener('click', () => setMode('view'));

    // 綁定刪除元件按鈕
    deleteComponentBtn.addEventListener('click', () => {
        if (selectedComponentId) {
            components = components.filter(c => c.id !== selectedComponentId);
            renderAllComponents();
            subscribeToAllTopics();
            deselectComponent();
        }
    });

    // 綁定屬性面板關閉按鈕和畫布點擊事件 (用於取消選中)
    closePropertiesBtn.addEventListener('click', deselectComponent);
    canvas.addEventListener('click', (e) => {
        if (e.target === canvas) {
            deselectComponent();
        }
    });

    // --- 元件面板折疊邏輯 ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('active');

            if (content.style.maxHeight) {
                content.style.maxHeight = null; // 折疊
            } else {
                content.style.maxHeight = content.scrollHeight + "px"; // 展開
            }
        });
    });

    // --- 初始化 ---
    // 應用程式啟動時，預設進入編輯模式
    setMode('edit');
});

