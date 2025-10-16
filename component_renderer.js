// --- Component Rendering Logic ---

// --- UI 輔助函式 (僅限渲染) ---
function getThermometerColor(percentage) {
    if (percentage < 25) return 'bg-blue-500';
    if (percentage < 75) return 'bg-orange-500';
    return 'bg-red-500';
}

function applyBrightnessToHex(hex, brightness) {
    if (!hex || !hex.startsWith('#')) return '#000000';
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    const factor = brightness / 100;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);

    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

let cachedGpios = {};
/**
 * 解析從 Tasmota 裝置收到的 GPIOs JSON，並根據規則擴展有索引的元件
 * @param {object} gpios - 從 Tasmota 收到的包含 GPIOs1 和 GPIOs2 的物件
 * @returns {Array<object>} - 解析和分組後的選項陣列
 */
function parseAndGroupTasmotaGpios(gpios) {
    if (!gpios || !gpios.GPIOs1) {
        // 返回帶有預設值的結構，以避免渲染錯誤
        const defaultOption = [{ name: '等待裝置回應...', baseValue: 0, maxIndex: 0 }];
        return { standard: defaultOption, adc: defaultOption };
    }
    const cacheKey = JSON.stringify(gpios);
    if (cachedGpios[cacheKey]) {
        return cachedGpios[cacheKey];
    }
    const counts = {
        'Button': 8, 'Button_n': 8, 'Button_i': 8, 'Button_in': 8,
        'Option A': 8,
        'Switch': 8, 'Switch_n': 8,
        'Relay': 8, 'Relay_i': 8, 'Relay_b': 8, 'Relay_bi': 8,
        'Led': 4, 'Led_i': 4,
        'Counter': 4, 'Counter_n': 4,
        'PWM': 5, 'PWM_i': 5,
        'Rotary A': 2, 'Rotary B': 2, 'Rotary A_n': 2, 'Rotary B_n': 2
    };

    const processGpioList = (gpioList) => {
        // 如果列表不存在或為空，則返回一個僅包含「無」的預設選項
        if (!gpioList || Object.keys(gpioList).length === 0) {
            return [{ name: '無', baseValue: 0, maxIndex: 0 }];
        }
        const options = [];
        for (const name in gpioList) {
            const value = gpioList[name];
            let processed = false;

            for (const baseName in counts) {
                if (name === baseName) {
                    options.push({
                        name: baseName,
                        baseValue: value,
                        maxIndex: counts[baseName]
                    });
                    processed = true;
                    break;
                }
            }

            if (!processed) {
                options.push({
                    name: name,
                    baseValue: value,
                    maxIndex: 0
                });
            }
        }
        // 確保「無」選項 (值為 0) 永遠存在於列表頂部
        if (!options.some(opt => opt.baseValue === 0)) {
            options.unshift({ name: '無', baseValue: 0, maxIndex: 0 });
        }
        return options.sort((a, b) => a.baseValue - b.baseValue);
    };

    const result = {
        standard: processGpioList(gpios.GPIOs1),
        adc: processGpioList(gpios.GPIOs2)
    };

    cachedGpios[cacheKey] = result;
    return result;
}

const TASMOTA_STATUS_OPTIONS = {
    1: "系統參數與 Uptime",
    2: "韌體與硬體版本",
    3: "日誌與 TelePeriod",
    4: "記憶體與 Flash",
    5: "網路資訊 (IP/MAC)",
    6: "MQTT 連線資訊",
    7: "時間與時區",
    10: "感測器讀值",
    11: "即時運作狀態"
};

function calculateHistogram(data) {
    if (!data || data.length === 0) {
        return { labels: [], counts: [] };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const binCount = 5;
    const binSize = range > 0 ? range / binCount : 1;
    const bins = Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        labels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
        data.forEach(value => {
            if (value >= binStart && (value < binEnd || (i === binCount - 1 && value <= binEnd))) {
                bins[i]++;
            }
        });
    }
    return { labels, counts: bins };
}


function renderComponentHTML(comp) {
    let innerHTML = '';
    switch (comp.type) {
        case 'switch':
            const switchStyle = comp.switchStyle || 'slide';
            let switchHTML = '';
            switch (switchStyle) {
                case 'rocker':
                    switchHTML = `
                        <div class="flex items-center space-x-3">
                            <div class="rocker-switch component-input ${comp.value ? 'on' : ''}">
                                <div class="rocker-handle"></div>
                            </div>
                            <span class="text-gray-700 font-medium">${comp.label}</span>
                        </div>
                    `;
                    break;
                case 'push':
                    switchHTML = `
                        <div class="flex items-center space-x-3">
                            <div class="push-switch component-input ${comp.value ? 'on' : ''}"></div>
                            <span class="text-gray-700 font-medium">${comp.label}</span>
                        </div>
                    `;
                    break;
                case 'slide':
                default:
                    switchHTML = `
                        <label class="flex items-center cursor-pointer">
                            <div class="relative"><input type="checkbox" class="sr-only component-input" ${comp.value ? 'checked' : ''}><div class="block bg-gray-600 w-14 h-8 rounded-full"></div><div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div></div>
                            <div class="ml-3 text-gray-700 font-medium">${comp.label}</div>
                        </label>
                    `;
                    break;
            }
            innerHTML = switchHTML;
            break;
        case 'button':
            const shapeClass = comp.shape === 'circular' ? 'rounded-full' : 'rounded-lg';
            innerHTML = `<button class="component-input bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 ${shapeClass} w-full h-full">${comp.label}</button>`;
            break;
        case 'slider':
            innerHTML = `
                <label class="w-full text-center p-2">
                    <span class="text-gray-700">${comp.label}</span>
                    <input type="range" min="0" max="100" value="${comp.value}" class="component-input w-full mt-2">
                </label>
            `;
            break;
        case 'text':
            innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center">
                    <span class="text-xs text-gray-500">${comp.label}</span>
                    <p class="component-output text-2xl font-bold">${comp.value}</p>
                </div>`;
            break;
        case 'led':
            const finalColor = comp.value ? applyBrightnessToHex(comp.color, comp.brightness) : '#374151';
            const finalBoxShadowColor = comp.value ? finalColor : 'transparent';
            innerHTML = `
                <div class="flex items-center space-x-3">
                   <div class="led-indicator" style="background-color: ${finalColor}; box-shadow: 0 0 15px ${finalBoxShadowColor};"></div>
                   <span class="text-gray-700 font-medium">${comp.label}</span>
                </div>
            `;
            break;
        case 'progress':
            const percentage = Math.max(0, Math.min(100, ((comp.value - comp.min) / (comp.max - comp.min)) * 100));
            innerHTML = `
                <div class="w-full p-2">
                    <span class="text-sm text-gray-700">${comp.label} (${comp.value})</span>
                    <div class="w-full bg-gray-200 rounded-full h-4 mt-1">
                        <div class="bg-blue-600 h-4 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
             `;
            break;
        case 'gauge':
            innerHTML = `
                <div class="w-full h-full relative">
                    <svg viewBox="0 0 120 120" class="w-full h-full">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#3498db" />
                                <stop offset="50%" stop-color="#f1c40f" />
                                <stop offset="100%" stop-color="#e74c3c" />
                            </linearGradient>
                        </defs>
                        <path d="M 20 100 A 50 50 0 0 1 100 100" stroke-width="12" stroke="#e0e0e0" fill="none" />
                        <path d="M 20 100 A 50 50 0 0 1 100 100" stroke-width="12" stroke="url(#gaugeGradient)" fill="none" class="gauge-value-arc" style="stroke-dasharray: 157; stroke-dashoffset: 157;" />
                        <text x="60" y="85" text-anchor="middle" font-size="20" class="gauge-value-text">${comp.value}</text>
                        <text x="60" y="105" text-anchor="middle" font-size="10">${comp.label}</text>
                        <line x1="60" y1="100" x2="60" y2="40" stroke="black" stroke-width="2" class="gauge-needle" transform-origin="60 100" />
                    </svg>
                </div>
            `;
            break;
        case 'graph':
            innerHTML = `<canvas class="p-2"></canvas>`;
            break;
        case 'radio':
            let radioHTML = `<div class="p-2 w-full"><p class="text-sm font-medium mb-2">${comp.label}</p><div class="flex flex-col space-y-1">`;
            comp.options.forEach((opt, index) => {
                const checked = (comp.value === opt.value) ? 'checked' : '';
                radioHTML += `
                    <label class="flex items-center text-sm">
                        <input type="radio" name="${comp.id}_radio" value="${opt.value}" data-index="${index}" class="component-input" ${checked}>
                        <span class="ml-2">${opt.label}</span>
                    </label>
                `;
            });
            radioHTML += '</div></div>';
            innerHTML = radioHTML;
            break;
        case 'checkbox':
            let checkboxHTML = `<div class="p-2 w-full"><p class="text-sm font-medium mb-2">${comp.label}</p><div class="flex flex-col space-y-1">`;
            comp.options.forEach((opt, index) => {
                let isChecked = false;
                if (comp.topicMode === 'single') {
                    isChecked = Array.isArray(comp.value) && comp.value.includes(opt.value);
                } else {
                    isChecked = opt.checked;
                }
                const checkedAttr = isChecked ? 'checked' : '';
                checkboxHTML += `
                    <label class="flex items-center text-sm">
                        <input type="checkbox" value="${opt.value}" data-index="${index}" class="component-input" ${checkedAttr}>
                        <span class="ml-2">${opt.label}</span>
                    </label>
                `;
            });
            checkboxHTML += '</div></div>';
            innerHTML = checkboxHTML;
            break;
        case 'dropdown':
            let dropdownHTML = `<div class="p-2 w-full"><label class="text-sm font-medium mb-2">${comp.label}</label><select class="component-input w-full mt-1 border-gray-300 rounded-md shadow-sm">`;
            (comp.options || '').split('\n').filter(o => o.trim() !== '').forEach(opt => {
                const selected = (comp.value === opt) ? 'selected' : '';
                dropdownHTML += `<option value="${opt}" ${selected}>${opt}</option>`;
            });
            dropdownHTML += '</select></div>';
            innerHTML = dropdownHTML;
            break;
        case 'color':
            innerHTML = `
                <div class="flex items-center space-x-3">
                   <input type="color" class="component-input color-picker-input" value="${comp.value}">
                   <span class="text-gray-700 font-medium">${comp.label}</span>
                </div>
            `;
            break;
        case 'text_input':
            innerHTML = `
                <div class="p-2 w-full flex flex-col">
                    <label class="text-sm font-medium mb-1">${comp.label}</label>
                    <div class="flex">
                        <input type="text" class="text-input-field w-full border-gray-300 rounded-l-md shadow-sm" value="">
                        <button class="send-btn bg-blue-500 text-white px-3 rounded-r-md">發送</button>
                    </div>
                </div>`;
            break;
        case 'date':
            innerHTML = `
                <div class="p-2 w-full flex flex-col justify-center h-full">
                    <label class="text-sm font-medium mb-1">${comp.label}</label>
                    <input type="date" class="component-input w-full mt-1 border-gray-300 rounded-md shadow-sm p-1" value="${comp.value}">
                </div>
            `;
            break;
        case 'time':
            innerHTML = `
                <div class="p-2 w-full flex flex-col justify-center h-full">
                    <label class="text-sm font-medium mb-1">${comp.label}</label>
                    <input type="time" class="component-input w-full mt-1 border-gray-300 rounded-md shadow-sm p-1" value="${comp.value}">
                </div>
            `;
            break;
        case 'datetime':
            innerHTML = `
                <div class="p-2 w-full flex flex-col justify-center h-full">
                    <label class="text-sm font-medium mb-1">${comp.label}</label>
                    <input type="datetime-local" class="component-input w-full mt-1 border-gray-300 rounded-md shadow-sm p-1" value="${comp.value}">
                </div>
            `;
            break;
        case 'notification':
            innerHTML = `
                <div class="flex flex-col items-center justify-center text-gray-500">
                   <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                   <span class="text-xs mt-1">${comp.label}</span>
                </div>`;
            break;
        case 'template':
            innerHTML = comp.htmlTemplate.replace(/{{value}}/g, comp.value);
            break;
        case 'buzzer':
            innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full">
                    <svg class="buzzer-icon w-2/3 h-2/3" style="fill: ${comp.colorNormal}; transition: fill 0.2s;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.348 5.352A6 6 0 0118 9v3.159c0 .538-.214 1.055-.595 1.436l.999 1.001a1 1 0 01-.707 1.707H5.765a1 1 0 01-.707-1.707l.999-1.001A2.032 2.032 0 006 12.159V9a6 6 0 012.652-5.648M9 17v1a3 3 0 006 0v-1"></path></svg>
                    <span class="text-xs mt-1">${comp.label}</span>
                </div>`;
            break;
        case 'speech':
            innerHTML = `
                <div class="flex flex-col items-center justify-center text-gray-500 relative w-full h-full">
                   <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                   <span class="text-xs mt-1">${comp.label}</span>
                   <button class="speech-stop-btn absolute bottom-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs ${comp.isPlaying ? '' : 'hidden'}">停止</button>
                </div>
            `;
            break;
        case 'qrcode':
            innerHTML = `<div class="p-1 w-full h-full flex items-center justify-center bg-white"><div id="qr-${comp.id}" class="flex items-center justify-center"></div></div><p class="absolute bottom-1 text-xs text-gray-500">${comp.label}</p>`;
            break;
        case 'thermometer':
            const tempPercentage = Math.max(0, Math.min(100, ((comp.value - comp.min) / (comp.max - comp.min)) * 100));
            const tempColor = getThermometerColor(tempPercentage);
            innerHTML = `
                <div class="w-full h-full flex items-center justify-center p-4">
                    <div class="relative w-8 h-4/5 bg-gray-200 rounded-full flex items-end shadow-inner">
                        <div class="absolute w-full h-full top-0 left-0">
                            <div class="absolute h-px w-2 bg-gray-400 left-full top-0"></div>
                            <div class="absolute h-px w-2 bg-gray-400 right-full top-0"></div>
                            <div class="absolute h-px w-2 bg-gray-400 left-full top-1/2"></div>
                            <div class="absolute h-px w-2 bg-gray-400 right-full top-1/2"></div>
                            <div class="absolute h-px w-2 bg-gray-400 left-full bottom-0"></div>
                            <div class="absolute h-px w-2 bg-gray-400 right-full bottom-0"></div>
                        </div>
                        <div class="thermometer-mercury w-full ${tempColor} rounded-full" style="height: ${tempPercentage}%;"></div>
                        <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 ${tempColor} rounded-full border-4 border-gray-200"></div>
                    </div>
                    <div class="ml-4 text-xs flex flex-col justify-between h-4/5 text-gray-600 font-semibold">
                        <span>${comp.max}°</span>
                        <span>${comp.min}°</span>
                    </div>
                </div>
                <div class="absolute bottom-2 text-center w-full">
                    <p class="text-xl font-bold">${comp.value}°${comp.unit}</p>
                    <p class="text-xs text-gray-500">${comp.label}</p>
                </div>
            `;
            break;
        case 'image':
            let imgSrc = 'https://placehold.co/150x150?text=Image';
            if (comp.sourceType === 'staticUrl') {
                imgSrc = comp.staticUrl;
            } else if (comp.sourceType === 'urlPayload' && comp.value) {
                imgSrc = comp.value;
            } else if (comp.sourceType === 'base64Payload' && comp.value) {
                imgSrc = `data:image/jpeg;base64,${comp.value}`;
            }
            innerHTML = `<img src="${imgSrc}" class="image-component-img" onerror="this.src='https://placehold.co/150x150?text=Error'"><p class="absolute bottom-1 text-xs text-gray-500 bg-white bg-opacity-50 px-1 rounded">${comp.label}</p>`;
            break;
        case 'joystick':
            innerHTML = `
        <div class="w-full h-full flex items-center justify-center p-2 space-x-4 relative">
            <p class="absolute top-1.5 left-2.5 font-semibold text-gray-800">${comp.label}</p>
            <!-- Joystick Area -->
            <div class="joystick-area w-36 h-36 bg-gray-200 rounded-full relative flex items-center justify-center border-4 border-gray-300">
                <div class="joystick-handle w-12 h-12 bg-blue-500 rounded-full cursor-pointer absolute shadow-lg" style="top: calc(50% - 24px); left: calc(50% - 24px);"></div>
            </div>
            <!-- Buttons Area -->
            <div class="flex flex-col space-y-2">
                <div class="grid grid-cols-3 gap-2 w-28">
                    <div></div>
                    <button data-btn="Y" class="joystick-btn w-8 h-8 rounded-full bg-yellow-400 text-white font-bold">Y</button>
                    <div></div>
                    <button data-btn="X" class="joystick-btn w-8 h-8 rounded-full bg-red-500 text-white font-bold">X</button>
                    <div></div>
                    <button data-btn="B" class="joystick-btn w-8 h-8 rounded-full bg-green-500 text-white font-bold">B</button>
                    <div></div>
                    <button data-btn="A" class="joystick-btn w-8 h-8 rounded-full bg-blue-500 text-white font-bold">A</button>
                    <div></div>
                </div>
            </div>
        </div>`;
            break;
        case 'tasmota_relay':
            const onlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            const switchOn = comp.state === 'ON';
            let iconSVG = '';
            switch (comp.icon) {
                case 'fan':
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5C7.5 4.5 4.5 7.5 4.5 12s3 7.5 7.5 7.5 7.5-3 7.5-7.5-3-7.5-7.5-7.5zM12 4.5v3m0 9v3m-4.5-4.5h3m9 0h3m-5.25-5.25l-2.12 2.12m-6.36 6.36l-2.12 2.12m6.36-10.48l2.12-2.12m-10.48 6.36l2.12-2.12"></path></svg>`;
                    break;
                case 'heater':
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 8l.2.8c.2.8.9 1.4 1.7 1.4h8.2c.8 0 1.5-.6 1.7-1.4l.2-.8M6 8h12v11H6V8z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13v4m3-4v4m3-4v4"></path></svg>`;
                    break;
                case 'pump':
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>`;
                    break;
                case 'aircon':
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M3 6h18M3 18h18M5 3v18M19 3v18"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9l6 6m0-6l-6 6"></path></svg>`;
                    break;
                case 'tv':
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 21h6"></path></svg>`;
                    break;
                case 'lightbulb':
                default:
                    iconSVG = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
                    break;
            }

            innerHTML = `
                <div class="w-full h-full flex flex-col justify-between p-2 relative">
                    <div class="absolute top-1.5 right-1.5 flex items-center space-x-2">
                         <div class="online-dot w-3 h-3 rounded-full ${onlineColor} transition-colors"></div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="text-gray-600">${iconSVG}</div>
                        <div>
                            <p class="font-semibold text-gray-800">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <p class="text-lg font-bold ${switchOn ? 'text-green-600' : 'text-gray-500'}">${comp.state}</p>
                        <label class="flex items-center cursor-pointer">
                            <div class="relative"><input type="checkbox" class="sr-only tasmota-toggle-btn" ${switchOn ? 'checked' : ''}><div class="block bg-gray-600 w-14 h-8 rounded-full"></div><div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div></div>
                        </label>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_ws2812':
            const wsOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            const saturationGradient = `linear-gradient(to right, #808080, hsl(${comp.hue}, 100%, 50%))`;
            const wsSwitchOn = comp.state === 'ON';

            const schemeOptions = [
                "0: 單色模式", "1: 喚醒序列", "2: 顏色循環 (上)", "3: 顏色循環 (下)", "4: 隨機循環",
                "5: 時鐘模式", "6: 燭光模式", "7: RGB 模式", "8: 聖誕節", "9: 光明節",
                "10: 寬扎節", "11: 彩虹模式", "12: 火焰模式", "13: 樓梯模式"
            ];

            const width1Visible = [2, 6].includes(comp.scheme) ? '' : 'hidden';
            const width234Visible = comp.scheme === 5 ? '' : 'hidden';

            innerHTML = `
                <div class="w-full h-full flex flex-col p-2 text-sm text-gray-800">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <label class="flex items-center cursor-pointer">
                                <div class="relative"><input type="checkbox" class="sr-only tasmota-toggle-btn" ${wsSwitchOn ? 'checked' : ''}><div class="block bg-gray-600 w-10 h-5 rounded-full"></div><div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div></div>
                            </label>
                            <div class="online-dot w-3 h-3 rounded-full ${wsOnlineColor} transition-colors"></div>
                        </div>
                    </div>
                    
                    <div class="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-1">
                        <!-- Left Column -->
                        <div class="col-span-1 space-y-1 flex flex-col justify-around">
                             <div>
                                <input type="range" min="0" max="360" value="${comp.hue}" class="hsb-slider hue-slider w-full" data-hsb="hue">
                            </div>
                            <div>
                                <input type="range" min="0" max="100" value="${comp.saturation}" class="hsb-slider saturation-slider w-full" data-hsb="saturation" style="background: ${saturationGradient};">
                            </div>
                            <div>
                                <input type="range" min="0" max="100" value="${comp.brightness}" class="hsb-slider brightness-slider w-full" data-hsb="brightness">
                            </div>
                        </div>
                        <!-- Right Column -->
                        <div class="col-span-1 space-y-1 flex flex-col justify-around">
                            <div>
                                <label class="font-medium">燈效方案</label>
                                <div class="flex items-center space-x-1">
                                    <button class="ws2812-scheme-btn bg-gray-200 px-1 rounded disabled:opacity-50" data-value="-" ${comp.scheme <= 0 ? 'disabled' : ''}>-</button>
                                    <select class="ws2812-scheme-select w-full border-gray-300 rounded text-xs p-0.5">
                                        ${schemeOptions.map((opt, i) => `<option value="${i}" ${comp.scheme === i ? 'selected' : ''}>${opt}</option>`).join('')}
                                    </select>
                                    <button class="ws2812-scheme-btn bg-gray-200 px-1 rounded disabled:opacity-50" data-value="+" ${comp.scheme >= 13 ? 'disabled' : ''}>+</button>
                                </div>
                            </div>
                            <div>
                                <label class="font-medium">速度 (${comp.speed})</label>
                                <div class="flex items-center space-x-1">
                                    <button class="ws2812-speed-btn bg-gray-200 px-1 rounded disabled:opacity-50" data-value="-" ${comp.speed <= 1 ? 'disabled' : ''}>-</button>
                                    <input type="range" min="1" max="40" value="${comp.speed}" class="ws2812-speed-slider w-full">
                                    <button class="ws2812-speed-btn bg-gray-200 px-1 rounded disabled:opacity-50" data-value="+" ${comp.speed >= 40 ? 'disabled' : ''}>+</button>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Row -->
                        <div class="col-span-2 grid grid-cols-4 gap-x-2 border-t pt-1 mt-1">
                            <div>
                                <label class="font-medium">燈珠數</label>
                                <input type="number" min="1" max="512" value="${comp.pixels}" class="ws2812-pixels-input w-full p-1 border rounded text-xs">
                            </div>
                            <div class="ws2812-width1-container ${width1Visible}">
                                <label class="font-medium">群組(W1)</label>
                                <input type="number" min="0" max="4" value="${comp.width1}" class="ws2812-width-input w-full p-1 border rounded text-xs" data-width="1">
                            </div>
                             <div class="col-span-3 grid grid-cols-3 gap-x-2 ws2812-width234-container ${width234Visible}">
                                <div>
                                    <label class="font-medium">秒針(W2)</label>
                                    <input type="number" min="0" max="32" value="${comp.width2}" class="ws2812-width-input w-full p-1 border rounded text-xs" data-width="2">
                                </div>
                                <div>
                                    <label class="font-medium">分針(W3)</label>
                                    <input type="number" min="0" max="32" value="${comp.width3}" class="ws2812-width-input w-full p-1 border rounded text-xs" data-width="3">
                                </div>
                                <div>
                                    <label class="font-medium">時針(W4)</label>
                                    <input type="number" min="0" max="32" value="${comp.width4}" class="ws2812-width-input w-full p-1 border rounded text-xs" data-width="4">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_status':
            const statusOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            let optionsHTML = '';

            for (const [key, value] of Object.entries(TASMOTA_STATUS_OPTIONS)) {
                optionsHTML += `<option value="${key}">Status ${key}: ${value}</option>`;
            }

            innerHTML = `
                <div class="w-full h-full flex flex-col p-2 text-sm">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <p class="font-semibold text-gray-800">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                        <div class="online-dot w-3 h-3 rounded-full ${statusOnlineColor} transition-colors"></div>
                    </div>
                    <select class="tasmota-status-select w-full p-1 border rounded-md shadow-sm component-input">
                        ${optionsHTML}
                    </select>
                    <div class="tasmota-status-content flex-1 mt-2 border-t pt-2 overflow-y-auto text-xs"></div>
                </div>`;
            break;
        case 'tasmota_console':
            const consoleOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            innerHTML = `
                <div class="w-full h-full flex flex-col p-2 space-y-2 text-sm">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                        <div class="online-dot w-3 h-3 rounded-full ${consoleOnlineColor} transition-colors"></div>
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <label class="block font-medium text-gray-600 text-xs mb-1">輸入指令</label>
                        <div class="flex">
                            <input type="text" placeholder="例如: scheme 5" class="tasmota-console-input w-full border-gray-300 rounded-l-md shadow-sm text-xs p-2">
                            <button class="tasmota-console-send bg-blue-500 hover:bg-blue-600 text-white px-3 rounded-r-md text-xs">發送</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_timer_setter':
            const timerOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            const currentTimer = comp.timers[comp.selectedTimerIndex - 1] || {};
            const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const dayChars = (currentTimer.Days || '0000000').split('');

            let dayCheckboxesHTML = days.map((day, index) => `
                <div class="text-center">
                    <input type="checkbox" id="day-${comp.id}-${index}" class="hidden timer-day-input" data-day-index="${index}" ${dayChars[index] !== '0' && dayChars[index] !== '-' ? 'checked' : ''}>
                    <label for="day-${comp.id}-${index}" class="timer-day-label cursor-pointer text-xs">${day}</label>
                </div>
            `).join('');

            innerHTML = `
                <div class="w-full h-full flex flex-col p-3 space-y-2 text-xs text-gray-800">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                         <div class="online-dot w-3 h-3 rounded-full ${timerOnlineColor} transition-colors"></div>
                    </div>
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                        <span class="font-medium">啟用所有定時器</span>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only tasmota-timers-global-toggle" ${comp.timersEnabled ? 'checked' : ''}>
                            <div class="block bg-gray-600 w-10 h-5 rounded-full"></div>
                            <div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div>
                        </label>
                    </div>
                     <div class="flex items-center space-x-2">
                        <label for="timer-select-${comp.id}" class="font-medium">選擇:</label>
                        <select id="timer-select-${comp.id}" class="tasmota-timer-select flex-1 p-1 border rounded-md shadow-sm text-xs">
                           ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${comp.selectedTimerIndex == (i + 1) ? 'selected' : ''}>Timer ${i + 1}</option>`).join('')}
                        </select>
                    </div>

                    <div class="timer-config-form flex-1 border-t pt-2 space-y-2 overflow-y-auto">
                         <div class="flex items-center justify-between">
                            <span class="font-medium">啟用此定時器</span>
                            <label class="relative cursor-pointer">
                                <input type="checkbox" class="sr-only timer-config-input" data-prop="Enable" ${currentTimer.Enable ? 'checked' : ''}>
                                <div class="block bg-gray-600 w-10 h-5 rounded-full"></div>
                                <div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div>
                            </label>
                        </div>

                        <div class="grid grid-cols-2 gap-x-2 gap-y-2">
                            <div>
                                <label class="block font-medium mb-1">模式</label>
                                <select class="w-full p-1 border rounded-md text-xs timer-config-input" data-prop="Mode">
                                    <option value="0" ${currentTimer.Mode == 0 ? 'selected' : ''}>時間</option>
                                    <option value="1" ${currentTimer.Mode == 1 ? 'selected' : ''}>日出</option>
                                    <option value="2" ${currentTimer.Mode == 2 ? 'selected' : ''}>日落</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-medium mb-1">時間 / 偏移</label>
                                <input type="time" class="w-full p-1 border rounded-md text-xs timer-config-input" data-prop="Time" value="${currentTimer.Time || '00:00'}">
                            </div>
                             <div>
                                <label class="block font-medium mb-1">動作</label>
                                <select class="w-full p-1 border rounded-md text-xs timer-config-input" data-prop="Action">
                                    <option value="0" ${currentTimer.Action == 0 ? 'selected' : ''}>OFF</option>
                                    <option value="1" ${currentTimer.Action == 1 ? 'selected' : ''}>ON</option>
                                    <option value="2" ${currentTimer.Action == 2 ? 'selected' : ''}>TOGGLE</option>
                                    <option value="3" ${currentTimer.Action == 3 ? 'selected' : ''}>RULE</option>
                                </select>
                            </div>
                             <div>
                                <label class="block font-medium mb-1">輸出 (POWER)</label>
                                 <select class="w-full p-1 border rounded-md text-xs timer-config-input" data-prop="Output">
                                     ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${currentTimer.Output == (i + 1) ? 'selected' : ''}>${i + 1}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                             <label class="block font-medium mb-1">星期</label>
                             <div class="grid grid-cols-7 gap-1">${dayCheckboxesHTML}</div>
                        </div>

                        <div class="grid grid-cols-2 gap-x-2 items-center">
                            <div>
                                <label class="block font-medium mb-1">隨機延遲 (±分)</label>
                                <input type="number" min="0" max="15" class="w-full p-1 border rounded-md text-xs timer-config-input" data-prop="Window" value="${currentTimer.Window || 0}">
                            </div>
                             <div class="flex items-center justify-between pt-5">
                                <span class="font-medium">重複</span>
                                <label class="relative cursor-pointer">
                                    <input type="checkbox" class="sr-only timer-config-input" data-prop="Repeat" ${currentTimer.Repeat ? 'checked' : ''}>
                                    <div class="block bg-gray-600 w-10 h-5 rounded-full"></div>
                                    <div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t">
                        <button class="tasmota-timer-query bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md text-xs">查詢</button>
                        <button class="tasmota-timer-send bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md text-xs">發送設定</button>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_rules_editor':
            const rulesOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            innerHTML = `
                <div class="w-full h-full flex flex-col p-3 space-y-2 text-xs text-gray-800">
                     <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                         <div class="online-dot w-3 h-3 rounded-full ${rulesOnlineColor} transition-colors"></div>
                    </div>

                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                        <div class="flex items-center space-x-2">
                             <label for="rule-select-${comp.id}" class="font-medium">規則:</label>
                             <select id="rule-select-${comp.id}" class="tasmota-rule-select p-1 border rounded-md shadow-sm text-xs">
                               ${[1, 2, 3].map(i => `<option value="${i}" ${comp.selectedRuleIndex == i ? 'selected' : ''}>Rule ${i}</option>`).join('')}
                             </select>
                        </div>
                        <label class="relative cursor-pointer">
                            <input type="checkbox" class="sr-only tasmota-rule-enable-toggle" ${comp.ruleEnabled ? 'checked' : ''}>
                            <div class="block bg-gray-600 w-10 h-5 rounded-full"></div>
                            <div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div>
                        </label>
                    </div>
                    
                    <div class="rule-builder flex-1 border-t pt-2 space-y-2 overflow-y-auto">
                        <label class="block font-medium">規則產生器</label>
                        <div class="grid grid-cols-2 gap-2">
                            <select class="rule-helper-trigger w-full p-1 border rounded-md text-xs">
                                <option value="">-- 選擇觸發 (ON) --</option>
                                <option value="System#Boot">系統啟動 (System#Boot)</option>
                                <option value="Time#Minute|">每隔N分鐘 (Time#Minute|N)</option>
                                <option value="Clock#Timer=">GUI定時器 (Clock#Timer=N)</option>
                                <option value="Rules#Timer=">規則計時器 (Rules#Timer=N)</option>
                                <option value="Button<N>#State">按鈕狀態 (Button<N>#State)</option>
                                <option value="Switch<N>#State">開關狀態 (Switch<N>#State)</option>
                                <option value="Tele-<Sensor>#<Metric>">感測器回報 (Tele-Sensor#Metric)</option>
                                <option value="Event#">自訂事件 (Event#Name)</option>
                                <option value="Mqtt#Connected">MQTT 連線</option>
                            </select>
                            <select class="rule-helper-action w-full p-1 border rounded-md text-xs">
                                 <option value="">-- 選擇動作 (DO) --</option>
                                 <option value="Power<N> 1">開啟電源 (Power<N> 1)</option>
                                 <option value="Power<N> 0">關閉電源 (Power<N> 0)</option>
                                 <option value="Power<N> 2">切換電源 (Power<N> 2)</option>
                                 <option value="RuleTimer<N> ">啟動規則計時器 (RuleTimer<N> secs)</option>
                                 <option value="Publish ">發布MQTT訊息 (Publish topic payload)</option>
                                 <option value="Backlog ">執行多指令 (Backlog cmd1; cmd2)</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex flex-col space-y-1">
                         <label class="block font-medium">規則內容</label>
                         <textarea class="tasmota-rule-textarea w-full font-mono text-xs p-1 border rounded-md" rows="5" placeholder="例: ON System#Boot DO Power1 1 ENDON">${comp.ruleText}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-2 pt-2 border-t">
                        <button class="tasmota-rule-query bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md text-xs">查詢</button>
                        <button class="tasmota-rule-set bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md text-xs">設定規則</button>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_options_setter':
            const optionsOnlineColor = comp.isOnline ? 'bg-green-500' : 'bg-red-500';
            let setOptionsHTML = '';
            if (typeof TASMOTA_SETOPTIONS_DATA !== 'undefined') {
                TASMOTA_SETOPTIONS_DATA.forEach(opt => {
                    setOptionsHTML += `<option value="${opt.command}" ${comp.selectedOption === opt.command ? 'selected' : ''}>${opt.name}</option>`;
                });
            }

            innerHTML = `
                <div class="w-full h-full flex flex-col p-3 space-y-2 text-xs text-gray-800">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                         <div class="online-dot w-3 h-3 rounded-full ${optionsOnlineColor} transition-colors"></div>
                    </div>
                    <select class="tasmota-options-select w-full p-1 border rounded-md shadow-sm">
                        ${setOptionsHTML}
                    </select>
                    <div class="tasmota-options-description flex-1 p-2 bg-gray-100 rounded text-gray-600 overflow-y-auto">
                        ${comp.description || '請選擇一個選項...'}
                    </div>
                    <div class="border-t pt-2 space-y-1">
                        <p>目前設定值: <span class="font-bold text-blue-600 tasmota-options-current-value">${comp.value !== null ? comp.value : 'N/A'}</span></p>
                        <div class="flex">
                            <input type="text" class="tasmota-options-input w-full p-1 border-gray-300 rounded-l-md shadow-sm" placeholder="輸入新值...">
                            <button class="tasmota-options-send bg-blue-500 hover:bg-blue-600 text-white px-3 rounded-r-md">設定</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'tasmota_gpio_module':
            const gpioPins = [0, 1, 2, 3, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17];
            const { standard: standardOptions, adc: adcOptions } = parseAndGroupTasmotaGpios(comp.availableGpios);

            let gpioRowsHTML = gpioPins.map(pin => {
                const setting = comp.gpioSettings[pin] || { value: 0 };
                const finalValue = setting.value;

                // 根據腳位決定要使用的選項列表
                const optionsForThisPin = (pin === 17) ? adcOptions : standardOptions;

                let selectedGroup = optionsForThisPin.find(g => g.baseValue === finalValue);
                let selectedIndex = 0; // 預設索引為 0 (代表第一個項目)

                if (!selectedGroup) {
                    // 尋找該值是否落在某個索引群組的範圍內
                    for (const group of optionsForThisPin) {
                        if (group.maxIndex > 0 && finalValue >= group.baseValue && finalValue < group.baseValue + group.maxIndex) {
                            selectedGroup = group;
                            selectedIndex = finalValue - group.baseValue; // 0-based index
                            break;
                        }
                    }
                }
                if (!selectedGroup) selectedGroup = optionsForThisPin.find(g => g.baseValue === 0) || optionsForThisPin[0]; // Fallback to 'None'

                const optionsHTML = optionsForThisPin.map(g => `<option value="${g.baseValue}" ${g.baseValue === selectedGroup.baseValue ? 'selected' : ''}>${g.name}</option>`).join('');

                const needsIndex = selectedGroup.maxIndex > 0;
                let indexOptionsHTML = '';
                if (needsIndex) {
                    for (let i = 0; i < selectedGroup.maxIndex; i++) {
                        indexOptionsHTML += `<option value="${i}" ${i === selectedIndex ? 'selected' : ''}>${i + 1}</option>`;
                    }
                }

                return `
                    <div class="grid grid-cols-3 gap-2 items-center">
                        <label class="font-medium text-right">GPIO${pin}</label>
                        <select data-gpio-pin="${pin}" class="tasmota-gpio-select col-span-1 p-1 border rounded-md text-xs">${optionsHTML}</select>
                        <select data-gpio-pin="${pin}" class="tasmota-gpio-index-select col-span-1 p-1 border rounded-md text-xs ${needsIndex ? '' : 'hidden'}">${indexOptionsHTML}</select>
                    </div>`;
            }).join('');

            innerHTML = `
                <div class="w-full h-full flex flex-col p-3 space-y-2 text-xs text-gray-800">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${comp.deviceName}</p>
                            <p class="text-xs text-gray-500">${comp.tasmotaName}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                             <button class="tasmota-gpio-refresh-btn bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">查詢功能</button>
                              <div class="online-dot w-3 h-3 rounded-full ${comp.isOnline ? 'bg-green-500' : 'bg-red-500'}"></div>
                        </div>
                    </div>
                    <div class="text-center p-1 bg-gray-100 rounded-md">
                        <span class="font-medium">目前模組: </span>
                        <span class="font-bold text-blue-600">${comp.currentModule}</span>
                    </div>
                    <div class="flex-1 border-t pt-2 space-y-2 overflow-y-auto">
                        ${gpioRowsHTML}
                    </div>
                    <div class="border-t pt-2 space-y-2">
                         <div>
                            <label class="block font-medium">模板名稱</label>
                            <input type="text" class="tasmota-gpio-template-name w-full p-1 border rounded-md" value="${comp.templateName}">
                        </div>
                        <button class="tasmota-gpio-apply-template-btn w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md text-xs">套用自訂模組</button>
                    </div>
                </div>
            `;
            break;
    }
    return innerHTML;
}

