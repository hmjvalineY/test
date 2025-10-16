// --- UI 渲染與生成 ---

/**
 * 核心函式：重新渲染畫布上的所有元件
 * 這個函式會清空畫布，然後根據 `components` 陣列中的資料重新建立每個元件的 DOM 元素和事件監聽器。
 */
function renderAllComponents() {
    // 1. 清空畫布和銷毀舊的圖表實例，避免記憶體洩漏
    canvas.innerHTML = '';
    Object.values(chartInstances).forEach(chart => chart.destroy());
    for (const key in chartInstances) delete chartInstances[key];
    for (const key in qrCodeInstances) delete qrCodeInstances[key];

    // 2. 遍歷 `components` 陣列中的每一個元件物件
    components.forEach(comp => {
        // 3. 為每個元件建立一個 div 容器
        const el = document.createElement('div');
        el.id = comp.id;
        el.className = 'component absolute rounded-lg bg-white shadow p-2 flex flex-col justify-center items-center box-border overflow-hidden';
        // 設定元件的大小和位置
        el.style.width = `${comp.width}px`;
        el.style.height = `${comp.height}px`;
        el.style.transform = `translate(${comp.x}px, ${comp.y}px)`;

        // 特殊處理：在檢視模式下隱藏通知和蜂鳴器元件的圖示
        if (comp.type === 'notification' && canvas.classList.contains('view-mode')) {
            el.style.display = 'none';
        }
        if (comp.type === 'buzzer' && canvas.classList.contains('view-mode')) {
            el.style.visibility = 'hidden';
            el.style.zIndex = '2000';
        }

        // 4. 從 `component_renderer.js` 獲取該元件類型的內部 HTML 結構
        el.innerHTML = renderComponentHTML(comp);

        // 5. 綁定點擊事件：在編輯模式下，點擊元件會選中它
        el.addEventListener('click', (e) => {
            if (canvas.classList.contains('edit-mode')) {
                selectComponent(comp.id);
            }
        });

        // 6. 綁定輸入事件：為元件內部的輸入元素 (如開關、滑桿) 綁定事件監聽器
        const inputs = el.querySelectorAll('.component-input');
        inputs.forEach(input => {
            // 特殊處理不同樣式的開關
            if (comp.type === 'switch' && (comp.switchStyle === 'rocker' || comp.switchStyle === 'push')) {
                input.addEventListener('click', (e) => {
                    const newValue = !comp.value;
                    handleComponentInteraction(comp.id, newValue);
                });
            } else if (comp.type === 'slider') {
                // 滑桿的特殊處理，以區分拖曳過程和釋放滑鼠
                input.addEventListener('mousedown', () => activeSliderId = comp.id); // 按下滑鼠時，記錄 activeSliderId
                input.addEventListener('touchstart', () => activeSliderId = comp.id);

                // 'input' 事件：在拖曳過程中持續觸發，僅更新 UI
                input.addEventListener('input', (e) => {
                    comp.value = e.target.value;
                    updateComponent(comp.id, { value: comp.value });
                });

                // 'change' 事件：在放開滑鼠時觸發，此時才發布 MQTT 訊息
                input.addEventListener('change', (e) => {
                    handleComponentInteraction(comp.id, e.target.value);
                    // 3 秒後清除 activeSliderId，允許再次接收 MQTT 更新
                    setTimeout(() => {
                        if (activeSliderId === comp.id) activeSliderId = null;
                    }, 3000);
                });
            } else {
                // 其他標準輸入元素的處理
                const eventType = (input.type === 'range' || input.type === 'color') ? 'input' : 'change';
                input.addEventListener(eventType, (e) => {
                    const val = input.type === 'checkbox' ? e.target.checked : e.target.value;
                    const index = e.target.dataset.index;
                    handleComponentInteraction(comp.id, val, index);
                });
            }
        });

        // 綁定按鈕點擊事件
        const button = el.querySelector('button.component-input');
        if (button) {
            button.addEventListener('click', () => handleComponentInteraction(comp.id, comp.payloadOn));
        }

        // 綁定文字輸入框的發送按鈕事件
        const sendBtn = el.querySelector('.send-btn');
        if (sendBtn) {
            const textInput = el.querySelector('.text-input-field');
            sendBtn.addEventListener('click', () => {
                handleComponentInteraction(comp.id, textInput.value);
            });
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleComponentInteraction(comp.id, textInput.value);
                }
            })
        }

        if (comp.type === 'joystick') {
            if (canvas.classList.contains('view-mode')) {
                const handle = el.querySelector('.joystick-handle');
                const area = el.querySelector('.joystick-area');
                const buttons = el.querySelectorAll('.joystick-btn');

                let isDragging = false;
                let publishInterval;
                let lastPublished = { x: null, y: null };

                const startDrag = (e) => {
                    e.preventDefault();
                    isDragging = true;

                    document.addEventListener('mousemove', onDrag);
                    document.addEventListener('mouseup', endDrag);
                    document.addEventListener('touchmove', onDrag, { passive: false });
                    document.addEventListener('touchend', endDrag);

                    publishInterval = setInterval(() => {
                        if (!isDragging) return;

                        const areaRect = area.getBoundingClientRect();
                        const handleRect = handle.getBoundingClientRect();

                        const centerX = areaRect.left + areaRect.width / 2;
                        const centerY = areaRect.top + areaRect.height / 2;

                        const handleCenterX = handleRect.left + handleRect.width / 2;
                        const handleCenterY = handleRect.top + handleRect.height / 2;

                        const deltaX = handleCenterX - centerX;
                        const deltaY = centerY - handleCenterY; // Invert Y-axis

                        const radius = areaRect.width / 2 - handleRect.width / 2;

                        let x = Math.round((deltaX / radius) * comp.maxX);
                        let y = Math.round((deltaY / radius) * comp.maxY);

                        x = Math.max(-comp.maxX, Math.min(comp.maxX, x));
                        y = Math.max(-comp.maxY, Math.min(comp.maxY, y));


                        if (mqttClient && mqttClient.connected) {
                            if (x !== lastPublished.x && comp.topicX) {
                                mqttClient.publish(comp.topicX, String(x));
                                lastPublished.x = x;
                            }
                            if (y !== lastPublished.y && comp.topicY) {
                                mqttClient.publish(comp.topicY, String(y));
                                lastPublished.y = y;
                            }
                        }
                    }, 100);
                };

                const onDrag = (e) => {
                    if (!isDragging) return;
                    e.preventDefault();

                    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                    const areaRect = area.getBoundingClientRect();
                    const centerX = areaRect.left + areaRect.width / 2;
                    const centerY = areaRect.top + areaRect.height / 2;

                    let deltaX = clientX - centerX;
                    let deltaY = clientY - centerY;

                    const angle = Math.atan2(deltaY, deltaX);
                    const distance = Math.min(areaRect.width / 2 - handle.offsetWidth / 2, Math.hypot(deltaX, deltaY));

                    const newX = distance * Math.cos(angle);
                    const newY = distance * Math.sin(angle);

                    handle.style.transform = `translate(${newX}px, ${newY}px)`;
                };

                const endDrag = () => {
                    if (!isDragging) return;
                    isDragging = false;
                    clearInterval(publishInterval);

                    handle.style.transform = `translate(0px, 0px)`;
                    if (mqttClient && mqttClient.connected) {
                        if (comp.topicX) mqttClient.publish(comp.topicX, '0');
                        if (comp.topicY) mqttClient.publish(comp.topicY, '0');
                    }
                    lastPublished = { x: null, y: null };

                    document.removeEventListener('mousemove', onDrag);
                    document.removeEventListener('mouseup', endDrag);
                    document.removeEventListener('touchmove', onDrag);
                    document.removeEventListener('touchend', endDrag);
                };

                handle.addEventListener('mousedown', startDrag);
                handle.addEventListener('touchstart', startDrag, { passive: false });

                buttons.forEach(button => {
                    const btnType = button.dataset.btn;
                    const topic = comp[`topicBtn${btnType}`];
                    const payloadOn = comp[`payloadBtn${btnType}On`];
                    const payloadOff = comp[`payloadBtn${btnType}Off`];

                    const press = () => {
                        button.classList.add('pressed');
                        if (topic && payloadOn && mqttClient && mqttClient.connected) {
                            mqttClient.publish(topic, payloadOn);
                        }
                    };
                    const release = () => {
                        button.classList.remove('pressed');
                        if (topic && payloadOff && mqttClient && mqttClient.connected) {
                            mqttClient.publish(topic, payloadOff);
                        }
                    };

                    button.addEventListener('mousedown', press);
                    button.addEventListener('touchstart', press);
                    button.addEventListener('mouseup', release);
                    button.addEventListener('touchend', release);
                    button.addEventListener('mouseleave', release);
                });
            }
        }

        // --- Event Listener for Speech Component ---
        if (comp.type === 'speech') {
            const stopBtn = el.querySelector('.speech-stop-btn');
            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    handleSpeechInteraction(comp.id, 'stop');
                });
            }
        }

        // 7. 為 Tasmota 元件綁定專屬的事件監聽器
        const tasmotaToggle = el.querySelector('.tasmota-toggle-btn');
        if (tasmotaToggle) {
            tasmotaToggle.addEventListener('change', () => {
                handleTasmotaInteraction(comp.id, 'toggle');
            });
        }
        const tasmotaRefresh = el.querySelector('.tasmota-refresh-btn');
        if (tasmotaRefresh) {
            tasmotaRefresh.addEventListener('click', () => {
                handleTasmotaInteraction(comp.id, 'refresh');
            });
        }
        const tasmotaSendBtns = el.querySelectorAll('.tasmota-control-send');
        if (tasmotaSendBtns.length > 0) {
            tasmotaSendBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const commandType = btn.dataset.cmnd;
                    handleTasmotaInteraction(comp.id, 'control', { commandType });
                });
            });
        }
        const hsbSliders = el.querySelectorAll('.hsb-slider');
        if (hsbSliders.length > 0) {
            hsbSliders.forEach(slider => {
                slider.addEventListener('mousedown', () => activeSliderId = comp.id);
                slider.addEventListener('touchstart', () => activeSliderId = comp.id);

                slider.addEventListener('input', (e) => {
                    const prop = e.target.dataset.hsb;
                    const value = parseInt(e.target.value, 10);
                    comp[prop] = value;
                    if (prop === 'hue') {
                        const saturationSlider = el.querySelector('.saturation-slider');
                        saturationSlider.style.background = `linear-gradient(to right, #808080, hsl(${value}, 100%, 50%))`;
                    }
                });

                slider.addEventListener('change', (e) => {
                    handleTasmotaInteraction(comp.id, 'hsb_change');
                    setTimeout(() => {
                        if (activeSliderId === comp.id) activeSliderId = null;
                    }, 3000);
                });
            });
        }
        const tasmotaStatusSelect = el.querySelector('.tasmota-status-select');
        if (tasmotaStatusSelect) {
            // Set initial selected value
            tasmotaStatusSelect.value = comp.selectedStatus;
            // Add event listener
            tasmotaStatusSelect.addEventListener('change', (e) => {
                const newStatus = parseInt(e.target.value, 10);
                if (canvas.classList.contains('view-mode')) {
                    // In view mode, publish MQTT command
                    handleTasmotaInteraction(comp.id, 'status_query', { statusNumber: newStatus });
                }
                // Update the component's state
                updateComponent(comp.id, { selectedStatus: newStatus, statusData: {} }); // Clear previous data
                // Trigger a re-subscription to listen to the new topic
                subscribeToAllTopics();
            });
        }

        const tasmotaConsoleSendBtn = el.querySelector('.tasmota-console-send');
        if (tasmotaConsoleSendBtn) {
            const input = el.querySelector('.tasmota-console-input');
            const sendAction = () => {
                if (input && input.value) {
                    handleTasmotaInteraction(comp.id, 'send_command', { commandText: input.value });
                    input.value = ''; // 可選：發送後清空
                }
            };

            tasmotaConsoleSendBtn.addEventListener('click', sendAction);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    sendAction();
                }
            });
        }

        // --- Event Listeners for Tasmota WS2812 ---
        if (comp.type === 'tasmota_ws2812') {
            const schemeSelect = el.querySelector('.ws2812-scheme-select');
            const schemeBtns = el.querySelectorAll('.ws2812-scheme-btn');
            const speedSlider = el.querySelector('.ws2812-speed-slider');
            const speedBtns = el.querySelectorAll('.ws2812-speed-btn');
            const pixelsInput = el.querySelector('.ws2812-pixels-input');
            const widthInputs = el.querySelectorAll('.ws2812-width-input');

            if (schemeSelect) {
                schemeSelect.addEventListener('change', (e) => {
                    const newValue = parseInt(e.target.value, 10);
                    updateComponent(comp.id, { scheme: newValue });
                    // 修正: 將值作為字串傳遞以確保 MQTT 發布
                    handleTasmotaInteraction(comp.id, 'ws2812_scheme', { value: String(newValue) });
                });
            }
            schemeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    handleTasmotaInteraction(comp.id, 'ws2812_scheme', { value: btn.dataset.value });
                });
            });
            if (speedSlider) {
                // 修正: 新增 mousedown/touchstart 以設定 activeSliderId，防止 MQTT 回音
                speedSlider.addEventListener('mousedown', () => activeSliderId = comp.id);
                speedSlider.addEventListener('touchstart', () => activeSliderId = comp.id);

                speedSlider.addEventListener('change', (e) => { // 'change' 事件在放開滑鼠時觸發，發布 MQTT
                    const newValue = parseInt(e.target.value, 10);
                    // 修正: 將值作為字串傳遞，並在發布後清除 activeSliderId
                    handleTasmotaInteraction(comp.id, 'ws2812_speed', { value: String(newValue) });
                    setTimeout(() => {
                        if (activeSliderId === comp.id) activeSliderId = null;
                    }, 3000);
                });
                speedSlider.addEventListener('input', (e) => { // 'input' 事件在拖曳中觸發，僅更新 UI
                    updateComponent(comp.id, { speed: parseInt(e.target.value, 10) });
                });
            }
            speedBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    handleTasmotaInteraction(comp.id, 'ws2812_speed', { value: btn.dataset.value });
                });
            });
            if (pixelsInput) {
                pixelsInput.addEventListener('change', (e) => {
                    const newValue = Math.max(1, Math.min(512, parseInt(e.target.value, 10) || 1));
                    updateComponent(comp.id, { pixels: newValue });
                    handleTasmotaInteraction(comp.id, 'ws2812_pixels', { value: newValue });
                });
            }
            widthInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const widthIndex = e.target.dataset.width;
                    const max = (widthIndex === '1') ? 4 : 32;
                    const newValue = Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0));
                    const propName = `width${widthIndex}`;
                    updateComponent(comp.id, { [propName]: newValue });
                    handleTasmotaInteraction(comp.id, `ws2812_${propName}`);
                });
            });
        }

        // --- Event Listeners for Tasmota Timer Setter ---
        if (comp.type === 'tasmota_timer_setter') {
            const globalToggle = el.querySelector('.tasmota-timers-global-toggle');
            const timerSelect = el.querySelector('.tasmota-timer-select');
            const queryBtn = el.querySelector('.tasmota-timer-query');
            const sendBtn = el.querySelector('.tasmota-timer-send');
            // 分開處理不同類型的輸入，以確保邏輯清晰
            const configOtherInputs = el.querySelectorAll('.timer-config-input:not([type="checkbox"])');
            const configCheckboxes = el.querySelectorAll('.timer-config-input[type="checkbox"]');
            const dayInputs = el.querySelectorAll('.timer-day-input');

            if (globalToggle) {
                globalToggle.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    // 先更新本地狀態以提供即時 UI 回饋
                    updateComponent(comp.id, { timersEnabled: isChecked });
                    // 再發送 MQTT 指令
                    handleTasmotaInteraction(comp.id, 'timers_global_toggle', { value: isChecked });
                });
            }

            if (timerSelect) {
                timerSelect.addEventListener('change', (e) => {
                    const newIndex = parseInt(e.target.value, 10);
                    updateComponent(comp.id, { selectedTimerIndex: newIndex });
                    // 自動查詢新選擇的計時器狀態
                    setTimeout(() => handleTasmotaInteraction(comp.id, 'timer_query'), 50);
                });
            }

            if (queryBtn) {
                queryBtn.addEventListener('click', () => {
                    handleTasmotaInteraction(comp.id, 'timer_query');
                });
            }

            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    handleTasmotaInteraction(comp.id, 'timer_send');
                });
            }

            // 處理文字、下拉選單、數字輸入
            configOtherInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const prop = e.target.dataset.prop;
                    const value = e.target.value;
                    const newTimers = [...comp.timers];
                    const currentTimer = newTimers[comp.selectedTimerIndex - 1] || {};
                    currentTimer[prop] = value;
                    newTimers[comp.selectedTimerIndex - 1] = currentTimer;
                    updateComponent(comp.id, { timers: newTimers });
                });
            });

            // 專門處理「啟用」和「重複」開關
            configCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const prop = e.target.dataset.prop;
                    const isChecked = e.target.checked;
                    const newTimers = [...comp.timers];
                    const currentTimer = newTimers[comp.selectedTimerIndex - 1] || {};
                    currentTimer[prop] = isChecked;
                    newTimers[comp.selectedTimerIndex - 1] = currentTimer;
                    updateComponent(comp.id, { timers: newTimers });
                });
            });


            dayInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const dayIndex = parseInt(e.target.dataset.dayIndex, 10);
                    const isChecked = e.target.checked;
                    const newTimers = [...comp.timers];
                    const currentTimer = newTimers[comp.selectedTimerIndex - 1] || {};
                    let daysArray = (currentTimer.Days || '0000000').split('');
                    daysArray[dayIndex] = isChecked ? '1' : '0';
                    currentTimer.Days = daysArray.join('');
                    newTimers[comp.selectedTimerIndex - 1] = currentTimer;
                    updateComponent(comp.id, { timers: newTimers });
                });
            });
        }

        // --- Event Listeners for Tasmota Rules Editor ---
        if (comp.type === 'tasmota_rules_editor') {
            const ruleSelect = el.querySelector('.tasmota-rule-select');
            const enableToggle = el.querySelector('.tasmota-rule-enable-toggle');
            const queryBtn = el.querySelector('.tasmota-rule-query');
            const setBtn = el.querySelector('.tasmota-rule-set');
            const textarea = el.querySelector('.tasmota-rule-textarea');
            const triggerSelect = el.querySelector('.rule-helper-trigger');
            const actionSelect = el.querySelector('.rule-helper-action');

            if (ruleSelect) {
                ruleSelect.addEventListener('change', (e) => {
                    const newIndex = parseInt(e.target.value, 10);
                    updateComponent(comp.id, { selectedRuleIndex: newIndex, ruleText: '', ruleEnabled: false }); // Clear old data
                    setTimeout(() => handleTasmotaInteraction(comp.id, 'rule_query'), 50);
                });
            }

            if (enableToggle) {
                enableToggle.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    updateComponent(comp.id, { ruleEnabled: isChecked });
                    handleTasmotaInteraction(comp.id, 'rule_enable_toggle', { value: isChecked });
                });
            }

            if (queryBtn) {
                queryBtn.addEventListener('click', () => handleTasmotaInteraction(comp.id, 'rule_query'));
            }
            if (setBtn) {
                setBtn.addEventListener('click', () => handleTasmotaInteraction(comp.id, 'rule_set'));
            }

            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    // Directly update the model without re-rendering for performance
                    const compToUpdate = findComponentById(comp.id);
                    if (compToUpdate) compToUpdate.ruleText = e.target.value;
                });
            }

            const updateRuleFromHelper = () => {
                const trigger = triggerSelect.value;
                const action = actionSelect.value;
                if (!trigger || !action) return;

                // Simple placeholder replacement
                const finalTrigger = trigger.replace(/<N>/g, '1').replace(/<Sensor>/g, 'AM2301').replace(/<Metric>/g, 'Temperature');
                const finalAction = action.replace(/<N>/g, '1');
                const newRuleText = `ON ${finalTrigger} DO ${finalAction} ENDON`;

                textarea.value = newRuleText;
                const compToUpdate = findComponentById(comp.id);
                if (compToUpdate) compToUpdate.ruleText = newRuleText;
            };

            if (triggerSelect) triggerSelect.addEventListener('change', updateRuleFromHelper);
            if (actionSelect) actionSelect.addEventListener('change', updateRuleFromHelper);
        }

        // --- Event Listeners for Tasmota Options Setter ---
        if (comp.type === 'tasmota_options_setter') {
            const select = el.querySelector('.tasmota-options-select');
            const sendBtn = el.querySelector('.tasmota-options-send');
            const input = el.querySelector('.tasmota-options-input');

            if (select) {
                select.addEventListener('change', (e) => {
                    const newOptionCommand = e.target.value;
                    const optionData = TASMOTA_SETOPTIONS_DATA.find(o => o.command === newOptionCommand);
                    if (optionData) {
                        updateComponent(comp.id, {
                            selectedOption: newOptionCommand,
                            description: optionData.description,
                            value: null // Reset value when option changes
                        });
                        // Automatically query the new option's value
                        handleTasmotaInteraction(comp.id, 'option_action', { value: '' });
                    }
                });
            }

            if (sendBtn) {
                const sendValue = () => {
                    if (input.value.trim() !== '') {
                        handleTasmotaInteraction(comp.id, 'option_action', { value: input.value.trim() });
                        input.value = ''; // Clear after sending
                    }
                };
                sendBtn.addEventListener('click', sendValue);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        sendValue();
                    }
                });
            }
        }


        // --- Event Listeners for Tasmota GPIO Module ---
        if (comp.type === 'tasmota_gpio_module') {

            const handleGpioChange = (pin, newBaseValue, newIndex = 0) => {
                const finalValue = newBaseValue + newIndex;
                // Re-render to show/hide index dropdown
                updateComponent(comp.id, {
                    gpioSettings: {
                        ...comp.gpioSettings,
                        [pin]: { value: finalValue }
                    }
                });
                // Send MQTT command
                handleTasmotaInteraction(comp.id, 'gpio_pin_set', { pin: pin, value: finalValue });
            };

            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('tasmota-gpio-refresh-btn')) {
                    handleTasmotaInteraction(comp.id, 'gpio_module_query');
                }
                if (e.target.classList.contains('tasmota-gpio-apply-template-btn')) {
                    handleTasmotaInteraction(comp.id, 'gpio_template_apply');
                }
            });

            el.addEventListener('input', (e) => {
                if (e.target.classList.contains('tasmota-gpio-template-name')) {
                    const compToUpdate = findComponentById(comp.id);
                    if (compToUpdate) compToUpdate.templateName = e.target.value;
                }
            });

            el.addEventListener('change', (e) => {
                const target = e.target;
                const pin = parseInt(target.dataset.gpioPin, 10);
                if (isNaN(pin)) return;

                if (target.classList.contains('tasmota-gpio-select')) {
                    const newBaseValue = parseInt(target.value, 10);
                    // 從 <option> 的文字中直接判斷，而不是依賴外部變數
                    const selectedOptionText = target.options[target.selectedIndex].text;

                    if (selectedOptionText.match(/^(Button|Switch|Relay)/)) {
                        handleGpioChange(pin, newBaseValue, 0); // Default to index 0 (which is 1)
                    } else {
                        handleGpioChange(pin, newBaseValue); // No index needed
                    }
                } else if (target.classList.contains('tasmota-gpio-index-select')) {
                    const mainSelect = target.closest('.flex').querySelector('.tasmota-gpio-select');
                    const baseValue = parseInt(mainSelect.value, 10);
                    const newIndex = parseInt(target.value, 10);
                    handleGpioChange(pin, baseValue, newIndex);
                }
            });
        }

        // 8. 將建立好的元件 DOM 元素附加到畫布上
        canvas.appendChild(el);

        // 9. 如果是需要 Javascript 初始化的元件 (如儀表板、圖表、QR Code)，在此進行初始化
        if (comp.type === 'gauge') {
            updateGauge(comp, el);
        } else if (comp.type === 'graph') {
            // ... (圖表初始化邏輯)
            let chartData, chartLabels;
            let datasetOptions = {
                label: comp.label,
                tension: 0.1
            };

            if (comp.chartType === 'bar') { // Histogram logic
                const { labels, counts } = calculateHistogram(comp.data);
                chartLabels = labels;
                chartData = counts;
            } else if (comp.chartType === 'line') {
                chartData = Array.isArray(comp.data) ? comp.data.map(d => d.value) : [];
                chartLabels = Array.isArray(comp.data) ? comp.data.map(d => d.label) : [];
            } else { // 'pie' or 'doughnut'
                chartData = Array.isArray(comp.data) ? comp.data : [];
                chartLabels = comp.chartLabels ? comp.chartLabels.split(',') : [];
            }

            datasetOptions.data = chartData;

            if (['pie', 'doughnut'].includes(comp.chartType)) {
                datasetOptions.backgroundColor = [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                    '#858796', '#5a5c69', '#f8f9fc', '#e9ecef', '#ced4da'
                ];
            } else {
                datasetOptions.borderColor = 'rgb(75, 192, 192)';
                datasetOptions.backgroundColor = 'rgba(75, 192, 192, 0.5)';
                if (comp.chartType === 'line') datasetOptions.fill = false;
            }

            chartInstances[comp.id] = new Chart(el.querySelector('canvas').getContext('2d'), {
                type: comp.chartType || 'line',
                data: {
                    labels: chartLabels,
                    datasets: [datasetOptions]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } else if (comp.type === 'qrcode') {
            const qrContainer = document.getElementById(`qr-${comp.id}`);
            if (qrContainer) {
                qrContainer.innerHTML = '';
                qrCodeInstances[comp.id] = new QRCode(qrContainer, {
                    text: String(comp.value),
                    width: Math.min(comp.width, comp.height) - 20,
                    height: Math.min(comp.width, comp.height) - 20,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        } else if (comp.type === 'tasmota_status' && comp.statusData && Object.keys(comp.statusData).length > 0) {
            // Tasmota 狀態元件需要在這裡填充其內容
            const contentDiv = el.querySelector('.tasmota-status-content');
            if (contentDiv) {
                // 使用現有的 renderStatusData 函式來填充內容
                renderStatusData(contentDiv, comp.statusData);
            }
        }
    });
    // 10. 確保拖拉縮放功能在重新渲染後依然可用，並恢復選中狀態
    if (canvas.classList.contains('edit-mode')) {
        setupInteract();
        if (selectedComponentId) {
            const selectedEl = document.getElementById(selectedComponentId);
            if (selectedEl) selectedEl.classList.add('selected');
        }
    }
}

/**
 * 高效率地更新單一元件的 UI，避免重新渲染整個畫布
 * @param {string} id - 要更新的元件 ID
 * @param {object} newProps - 包含新屬性值的物件
 */
function updateComponent(id, newProps) {
    const compIndex = components.findIndex(c => c.id === id);
    if (compIndex !== -1) {
        // 更新 `components` 陣列中的資料
        const currentComp = components[compIndex];

        if (newProps.options && Array.isArray(newProps.options)) {
            components[compIndex].options = newProps.options;
            delete newProps.options;
        }

        Object.assign(components[compIndex], newProps);

        // 找到對應的 DOM 元素
        const el = document.getElementById(id);
        if (el) {
            const comp = components[compIndex];
            // --- 針對特定元件類型進行高效能的局部 DOM 更新 ---
            if (comp.type === 'tasmota_relay') {
                const stateText = el.querySelector('p.text-lg');
                const toggleInput = el.querySelector('.tasmota-toggle-btn');
                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');

                if (newProps.hasOwnProperty('deviceName') && deviceNameText) {
                    deviceNameText.textContent = comp.deviceName;
                }
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) {
                    tasmotaNameText.textContent = comp.tasmotaName;
                }

                // 只在 state 變更時更新相關元素
                if (newProps.hasOwnProperty('state')) {
                    const is_on = comp.state === 'ON';
                    if (stateText) {
                        stateText.textContent = comp.state;
                        stateText.classList.remove('text-green-600', 'text-gray-500');
                        stateText.classList.add(is_on ? 'text-green-600' : 'text-gray-500');
                    }
                    if (toggleInput) {
                        toggleInput.checked = is_on;
                    }
                }

                // 只在 isOnline 變更時更新圖示
                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.remove('bg-green-500', 'bg-red-500');
                    onlineDot.classList.add(comp.isOnline ? 'bg-green-500' : 'bg-red-500');
                }
                return;
            }
            else if (comp.type === 'speech') {
                const stopBtn = el.querySelector('.speech-stop-btn');
                if (newProps.hasOwnProperty('isPlaying')) {
                    if (stopBtn) {
                        stopBtn.classList.toggle('hidden', !comp.isPlaying);
                    }
                }

                // 如果屬性面板正在顯示此元件，則同步更新
                if (selectedComponentId === id) {
                    const panel = document.getElementById('propertiesPanel');
                    if (newProps.hasOwnProperty('encoding')) {
                        panel.querySelector('[data-prop="encoding"]').value = comp.encoding;
                    }
                    if (newProps.hasOwnProperty('text')) {
                        panel.querySelector('[data-prop="text"]').value = comp.text;
                    }
                    if (newProps.hasOwnProperty('speed')) {
                        panel.querySelector('[data-prop="speed"]').value = comp.speed;
                    }
                    if (newProps.hasOwnProperty('times')) {
                        panel.querySelector('[data-prop="times"]').value = comp.times;
                    }
                }
                return;
            }
            else if (comp.type === 'tasmota_ws2812') {
                const onlineDot = el.querySelector('.online-dot');
                const hueSlider = el.querySelector('.hue-slider');
                const saturationSlider = el.querySelector('.saturation-slider');
                const brightnessSlider = el.querySelector('.brightness-slider');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');
                const toggleInput = el.querySelector('.tasmota-toggle-btn');
                const schemeSelect = el.querySelector('.ws2812-scheme-select');
                const speedSlider = el.querySelector('.ws2812-speed-slider');
                const speedLabel = el.querySelector('label[for="ws2812-speed-slider"]'); // Assuming you add this
                const pixelsInput = el.querySelector('.ws2812-pixels-input');

                if (newProps.hasOwnProperty('deviceName') && deviceNameText) {
                    deviceNameText.textContent = comp.deviceName;
                }
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) {
                    tasmotaNameText.textContent = comp.tasmotaName;
                }

                if (newProps.hasOwnProperty('state') && toggleInput) {
                    toggleInput.checked = (comp.state === 'ON');
                }

                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.remove('bg-green-500', 'bg-red-500');
                    onlineDot.classList.add(comp.isOnline ? 'bg-green-500' : 'bg-red-500');
                }

                if (newProps.hasOwnProperty('hue')) {
                    if (hueSlider) hueSlider.value = comp.hue;
                    if (saturationSlider) saturationSlider.style.background = `linear-gradient(to right, #808080, hsl(${comp.hue}, 100%, 50%))`;
                }
                if (newProps.hasOwnProperty('saturation') && saturationSlider) {
                    saturationSlider.value = comp.saturation;
                }
                if (newProps.hasOwnProperty('brightness') && brightnessSlider) {
                    brightnessSlider.value = comp.brightness;
                }
                if (newProps.hasOwnProperty('scheme')) {
                    if (schemeSelect) schemeSelect.value = comp.scheme;
                    const schemeBtns = el.querySelectorAll('.ws2812-scheme-btn');
                    if (schemeBtns.length === 2) {
                        schemeBtns[0].disabled = comp.scheme <= 0; // Minus button
                        schemeBtns[1].disabled = comp.scheme >= 13; // Plus button
                    }
                    // Update visibility of width containers
                    const width1Container = el.querySelector('.ws2812-width1-container');
                    const width234Container = el.querySelector('.ws2812-width234-container');
                    if (width1Container) width1Container.classList.toggle('hidden', ![2, 6].includes(comp.scheme));
                    if (width234Container) width234Container.classList.toggle('hidden', comp.scheme !== 5);
                }
                if (newProps.hasOwnProperty('speed')) {
                    if (speedSlider) speedSlider.value = comp.speed;
                    const speedLabel = el.querySelector('label[class="font-medium"]');
                    if (speedLabel && speedLabel.textContent.startsWith('速度')) {
                        speedLabel.textContent = `速度 (${comp.speed})`;
                    }
                    const speedBtns = el.querySelectorAll('.ws2812-speed-btn');
                    if (speedBtns.length === 2) {
                        speedBtns[0].disabled = comp.speed <= 1; // Minus button
                        speedBtns[1].disabled = comp.speed >= 40; // Plus button
                    }
                }
                if (newProps.hasOwnProperty('pixels') && pixelsInput) {
                    pixelsInput.value = comp.pixels;
                }
                ['width1', 'width2', 'width3', 'width4'].forEach((prop, i) => {
                    if (newProps.hasOwnProperty(prop)) {
                        const widthInput = el.querySelector(`.ws2812-width-input[data-width="${i + 1}"]`);
                        if (widthInput) {
                            widthInput.value = comp[prop];
                        }
                    }
                });

                return;
            }
            else if (comp.type === 'tasmota_status') {
                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');
                const contentDiv = el.querySelector('.tasmota-status-content');

                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.toggle('bg-green-500', comp.isOnline);
                    onlineDot.classList.toggle('bg-red-500', !comp.isOnline);
                }
                if (newProps.hasOwnProperty('deviceName') && deviceNameText) {
                    deviceNameText.textContent = comp.deviceName;
                }
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) {
                    tasmotaNameText.textContent = comp.tasmotaName;
                }
                if (newProps.hasOwnProperty('statusData') && contentDiv) {
                    // 內容更新較複雜，直接觸發一次完整的重新渲染來確保同步
                    renderAllComponents();
                    return;
                }
                if (newProps.hasOwnProperty('selectedStatus')) {
                    el.querySelector('.tasmota-status-select').value = comp.selectedStatus;
                }
                return;
            }
            else if (comp.type === 'tasmota_console') {
                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');

                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.toggle('bg-green-500', comp.isOnline);
                    onlineDot.classList.toggle('bg-red-500', !comp.isOnline);
                }
                if (newProps.hasOwnProperty('deviceName') && deviceNameText) {
                    deviceNameText.textContent = comp.deviceName;
                }
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) {
                    tasmotaNameText.textContent = comp.tasmotaName;
                }
                return;
            }
            // 為 tasmota_rules_editor 增加高效能的局部更新邏輯
            else if (comp.type === 'tasmota_rules_editor') {
                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');
                const ruleTextarea = el.querySelector('.tasmota-rule-textarea');
                const enableToggle = el.querySelector('.tasmota-rule-enable-toggle');

                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.toggle('bg-green-500', comp.isOnline);
                    onlineDot.classList.toggle('bg-red-500', !comp.isOnline);
                }
                if (newProps.hasOwnProperty('deviceName') && deviceNameText) deviceNameText.textContent = comp.deviceName;
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) tasmotaNameText.textContent = comp.tasmotaName;
                if (newProps.hasOwnProperty('ruleText') && ruleTextarea) { // 直接更新 textarea 的值
                    ruleTextarea.value = comp.ruleText;
                }
                if (newProps.hasOwnProperty('ruleEnabled') && enableToggle) { // 更新啟用/停用開關的狀態
                    enableToggle.checked = comp.ruleEnabled;
                }
                return;
            }
            else if (comp.type === 'tasmota_timer_setter') {
                // 對於 timer setter，由於其內部狀態複雜，收到任何相關更新後都重新渲染整個元件以確保同步
                if (newProps.hasOwnProperty('timers') || newProps.hasOwnProperty('selectedTimerIndex') || newProps.hasOwnProperty('timersEnabled')) {
                    el.innerHTML = renderComponentHTML(comp);
                    // --- 為更新後的元件重新綁定事件監聽器 ---
                    const globalToggle = el.querySelector('.tasmota-timers-global-toggle');
                    const timerSelect = el.querySelector('.tasmota-timer-select');
                    const queryBtn = el.querySelector('.tasmota-timer-query');
                    const sendBtn = el.querySelector('.tasmota-timer-send');
                    const configOtherInputs = el.querySelectorAll('.timer-config-input:not([type="checkbox"])');
                    const configCheckboxes = el.querySelectorAll('.timer-config-input[type="checkbox"]');
                    const dayInputs = el.querySelectorAll('.timer-day-input');

                    if (globalToggle) globalToggle.addEventListener('change', (e) => {
                        updateComponent(id, { timersEnabled: e.target.checked });
                        handleTasmotaInteraction(id, 'timers_global_toggle', { value: e.target.checked });
                    });
                    if (timerSelect) timerSelect.addEventListener('change', (e) => {
                        updateComponent(id, { selectedTimerIndex: parseInt(e.target.value, 10) });
                        setTimeout(() => handleTasmotaInteraction(id, 'timer_query'), 50);
                    });
                    if (queryBtn) queryBtn.addEventListener('click', () => handleTasmotaInteraction(id, 'timer_query'));
                    if (sendBtn) sendBtn.addEventListener('click', () => handleTasmotaInteraction(id, 'timer_send'));

                    const updateTimerProperty = (prop, value) => {
                        const currentTimers = findComponentById(id).timers;
                        const timerToUpdate = currentTimers[comp.selectedTimerIndex - 1] || {};
                        timerToUpdate[prop] = value;
                        updateComponent(id, { timers: currentTimers });
                    };

                    configOtherInputs.forEach(input => input.addEventListener('change', (e) => updateTimerProperty(e.target.dataset.prop, e.target.value)));
                    configCheckboxes.forEach(checkbox => checkbox.addEventListener('change', (e) => updateTimerProperty(e.target.dataset.prop, e.target.checked)));

                    dayInputs.forEach(input => input.addEventListener('change', (e) => {
                        const dayIndex = parseInt(e.target.dataset.dayIndex, 10);
                        const isChecked = e.target.checked;
                        const currentTimers = findComponentById(id).timers;
                        const timerToUpdate = currentTimers[comp.selectedTimerIndex - 1] || {};
                        let daysArray = (timerToUpdate.Days || '0000000').split('');
                        daysArray[dayIndex] = isChecked ? '1' : '0';
                        timerToUpdate.Days = daysArray.join('');
                        updateComponent(id, { timers: currentTimers });
                    }));
                }

                // 處理無需重繪內容的簡單屬性更新
                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');
                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.toggle('bg-green-500', comp.isOnline);
                    onlineDot.classList.toggle('bg-red-500', !comp.isOnline);
                }
                if (newProps.hasOwnProperty('deviceName') && deviceNameText) deviceNameText.textContent = comp.deviceName;
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) tasmotaNameText.textContent = comp.tasmotaName;

                return;
            }
            else if (comp.type === 'tasmota_options_setter') {
                // 對於 timer setter，由於其內部狀態複雜，收到任何相關更新後都重新渲染整個元件以確保同步
                if (newProps.hasOwnProperty('timers') || newProps.hasOwnProperty('selectedTimerIndex') || newProps.hasOwnProperty('timersEnabled')) {

                    // 1. 重新生成內部 HTML
                    el.innerHTML = renderComponentHTML(comp);

                    // 2. 重新綁定所有事件監聽器
                    // 注意：這是一個簡化的重新綁定過程，實際應用中可能需要一個更通用的綁定函式
                    // 這裡我們直接再次呼叫 renderAllComponents 的一部分邏輯
                    // 為了簡化，我們直接呼叫 renderAllComponents()，但在一個理想的重構中，我們會抽出一個 rebindEvents(el, comp) 函式
                    renderAllComponents(); // 暫時使用全局重繪來確保事件被重新綁定
                    const newEl = document.getElementById(id);
                    if (newEl) newEl.classList.add('selected'); // 恢復選中狀態
                }
                return;
            } else if (comp.type === 'tasmota_gpio_module') {
                // Since GPIO module UI is complex, a full re-render is better here.
                if (newProps.hasOwnProperty('gpioSettings') || newProps.hasOwnProperty('currentModule') || newProps.hasOwnProperty('availableGpios')) {
                    renderAllComponents();
                    const el = document.getElementById(id);
                    if (el) el.classList.add('selected');
                    return;
                }

                const onlineDot = el.querySelector('.online-dot');
                const deviceNameText = el.querySelector('p.font-semibold');
                const tasmotaNameText = el.querySelector('p.text-xs.text-gray-500');

                if (newProps.hasOwnProperty('isOnline') && onlineDot) {
                    onlineDot.classList.toggle('bg-green-500', comp.isOnline);
                    onlineDot.classList.toggle('bg-red-500', !comp.isOnline);
                }
                if (newProps.hasOwnProperty('deviceName') && deviceNameText) deviceNameText.textContent = comp.deviceName;
                if (newProps.hasOwnProperty('tasmotaName') && tasmotaNameText) tasmotaNameText.textContent = comp.tasmotaName;
                return;
            }


            // --- 通用屬性更新 (如標籤) ---
            if (newProps.hasOwnProperty('label')) {
                let labelElement;
                // ... (根據不同元件類型找到對應的標籤元素並更新)
                switch (comp.type) {
                    case 'button':
                        labelElement = el.querySelector('.component-input');
                        break;
                    case 'progress':
                    case 'slider':
                        labelElement = el.querySelector('span');
                        break;
                    case 'text':
                    case 'notification':
                    case 'buzzer':
                    case 'qrcode':
                    case 'thermometer':
                    case 'image':
                    case 'joystick':
                    case 'speech':
                        labelElement = el.querySelector('span.text-xs');
                        break;
                    case 'led':
                    case 'switch':
                        labelElement = el.querySelector('.font-medium');
                        break;
                    case 'radio':
                    case 'checkbox':
                    case 'dropdown':
                    case 'text_input':
                    case 'date':
                    case 'time':
                    case 'datetime':
                        labelElement = el.querySelector('.text-sm.font-medium');
                        break;
                    case 'gauge':
                        labelElement = el.querySelector('text[y="105"]');
                        break;
                }
                if (labelElement) {
                    if (comp.type === 'progress') {
                        labelElement.textContent = `${comp.label} (${comp.value})`;
                    } else {
                        labelElement.textContent = comp.label;
                    }
                }
            }

            // --- 根據元件類型執行特定的值更新 ---
            switch (comp.type) {
                // ... (針對各種元件，僅更新其值的顯示部分，如文字、顏色、進度條寬度等)
                case 'switch':
                    if (comp.switchStyle === 'slide') {
                        const input = el.querySelector('.component-input');
                        if (input) input.checked = comp.value;
                    } else if (comp.switchStyle === 'rocker' || comp.switchStyle === 'push') {
                        const switchEl = el.querySelector('.component-input');
                        if (switchEl) {
                            if (comp.value) switchEl.classList.add('on');
                            else switchEl.classList.remove('on');
                        }
                    }
                    break;
                case 'text':
                    el.querySelector('.component-output').textContent = comp.value;
                    break;
                case 'led':
                    const finalColor = comp.value ? applyBrightnessToHex(comp.color, comp.brightness) : '#374151';
                    const finalBoxShadowColor = comp.value ? finalColor : 'transparent';
                    const ledDiv = el.querySelector('.led-indicator');
                    if (ledDiv) {
                        ledDiv.style.backgroundColor = finalColor;
                        ledDiv.style.boxShadow = `0 0 15px ${finalBoxShadowColor}`;
                    }
                    break;
                case 'progress':
                    const percentage = Math.max(0, Math.min(100, ((comp.value - comp.min) / (comp.max - comp.min)) * 100));
                    el.querySelector('.bg-blue-600').style.width = `${percentage}%`;
                    el.querySelector('span').textContent = `${comp.label} (${comp.value})`;
                    break;
                case 'gauge':
                    updateGauge(comp, el);
                    break;
                case 'radio':
                    const radioInput = el.querySelector(`input[value="${comp.value}"]`);
                    if (radioInput) radioInput.checked = true;
                    break;
                case 'checkbox':
                    comp.options.forEach((opt, index) => {
                        const chk = el.querySelector(`input[data-index="${index}"]`);
                        if (chk) {
                            let isChecked = false;
                            if (comp.topicMode === 'single') {
                                isChecked = Array.isArray(comp.value) && comp.value.includes(opt.value);
                            } else {
                                isChecked = opt.checked;
                            }
                            chk.checked = isChecked;
                        }
                    });
                    break;
                case 'dropdown':
                case 'slider':
                case 'color':
                case 'date':
                case 'time':
                case 'datetime':
                    el.querySelector('.component-input').value = comp.value;
                    break;
                case 'template':
                    el.innerHTML = comp.htmlTemplate.replace(/{{value}}/g, comp.value);
                    break;
                case 'qrcode':
                    const qrInstance = qrCodeInstances[comp.id];
                    if (qrInstance) {
                        qrInstance.makeCode(String(comp.value));
                    }
                    break;
                case 'thermometer':
                    const tempPercentage = Math.max(0, Math.min(100, ((comp.value - comp.min) / (comp.max - comp.min)) * 100));
                    const tempColor = getThermometerColor(tempPercentage);
                    const mercury = el.querySelector('.thermometer-mercury');
                    const bulb = el.querySelector('.absolute.-bottom-4');
                    const valueText = el.querySelector('.text-xl');
                    const minLabel = el.querySelector('.ml-4 span:last-child');
                    const maxLabel = el.querySelector('.ml-4 span:first-child');

                    if (mercury) {
                        mercury.style.height = `${tempPercentage}%`;
                        mercury.className = `thermometer-mercury w-full ${tempColor} rounded-full`;
                    }
                    if (bulb) {
                        bulb.className = `absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 ${tempColor} rounded-full border-4 border-gray-200`;
                    }
                    if (valueText) valueText.textContent = `${comp.value}°${comp.unit}`;
                    if (minLabel) minLabel.textContent = `${comp.min}°`;
                    if (maxLabel) maxLabel.textContent = `${comp.max}°`;
                    break;
                case 'image':
                    const img = el.querySelector('.image-component-img');
                    if (img) {
                        let newSrc = img.src;
                        if (comp.sourceType === 'staticUrl') {
                            newSrc = comp.staticUrl;
                        } else if (comp.sourceType === 'urlPayload') {
                            newSrc = comp.value;
                        } else if (comp.sourceType === 'base64Payload') {
                            newSrc = `data:image/jpeg;base64,${comp.value}`;
                        }
                        if (img.src !== newSrc) {
                            img.src = newSrc;
                        }
                    }
                    break;
                default:
                    // 如果是沒有特定高效更新邏輯的元件，則退回使用完整渲染
                    renderAllComponents();
                    const selectedEl = document.getElementById(id);
                    if (selectedEl) selectedEl.classList.add('selected');
                    return;
            }
        }
    }
}

/**
 * 更新儀表板 (Gauge) 元件的指針和數值
 * @param {object} comp - 元件物件
 * @param {HTMLElement} el - 元件的 DOM 元素
 */
function updateGauge(comp, el) {
    const needle = el.querySelector('.gauge-needle');
    const valueText = el.querySelector('.gauge-value-text');
    const valueArc = el.querySelector('.gauge-value-arc');
    const percentage = Math.max(0, Math.min(100, ((comp.value - comp.min) / (comp.max - comp.min)) * 100));
    const angle = -90 + (percentage * 1.8);
    const arcLength = 157;
    const offset = arcLength - (percentage / 100) * arcLength;

    if (needle) needle.setAttribute('transform', `rotate(${angle})`);
    if (valueText) valueText.textContent = comp.value;
    if (valueArc) valueArc.style.strokeDashoffset = offset;
}
/**
 * 遞迴渲染 Tasmota 狀態 JSON 資料
 * @param {HTMLElement} container - 要渲染內容的容器元素
 * @param {object} data - 從 MQTT 收到的 JSON 物件
 * @param {number} [level=0] - 遞迴層級，用於縮排
 */
function renderStatusData(container, data, level = 0) {
    if (level === 0) container.innerHTML = '';

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            const translatedKey = TASMOTA_STATUS_TRANSLATIONS[key] || key;

            const itemEl = document.createElement('div');
            itemEl.style.paddingLeft = `${level * 10}px`;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                itemEl.innerHTML = `<p class="font-semibold">${translatedKey}:</p>`;
                container.appendChild(itemEl);
                renderStatusData(container, value, level + 1); // 遞迴呼叫
            } else {
                itemEl.innerHTML = `<p><span class="font-semibold">${translatedKey}:</span> <span class="text-blue-600">${Array.isArray(value) ? value.join(', ') : value}</span></p>`;
                container.appendChild(itemEl);
            }
        }
    }
}


// --- 屬性面板 UI ---
/**
 * 隱藏屬性面板
 */
function hidePropertiesPanel() {
    propertiesContent.innerHTML = '<p class="text-sm text-gray-500">在編輯模式下選擇一個元件以編輯其屬性。</p>';
    deleteComponentBtn.classList.add('hidden');
    propertiesPanel.classList.add('translate-x-full');
}

/**
 * 根據選中的元件 ID，動態生成並顯示其屬性面板
 * @param {string} id - 選中的元件 ID
 */
function showPropertiesPanel(id) {
    const comp = findComponentById(id);
    if (!comp) return;

    // ... (這是一個非常長的函式，它根據元件的類型動態建立 HTML 表單欄位)
    // 1. 建立通用欄位 (如標籤、主題)
    let commonFields = `
        <div class="space-y-2">
             <h3 class="text-xs font-semibold text-gray-500 uppercase">通用設定</h3>
        </div>
    `;
    // 2. 建立 Payload 相關欄位
    let payloadFields = '';
    const hasPayload = ['switch', 'button', 'slider', 'radio', 'checkbox', 'dropdown', 'color', 'text_input', 'date', 'time', 'datetime'].includes(comp.type);

    if (hasPayload) {
        let onOffFields = '';
        if (['switch'].includes(comp.type) || (comp.type === 'checkbox' && comp.topicMode === 'multiple')) {
            onOffFields = `
            <div>
                <label class="block font-medium text-gray-700">開啟時 Payload</label>
                <input type="text" data-prop="payloadOn" value="${comp.payloadOn}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>
            <div>
                <label class="block font-medium text-gray-700">關閉時 Payload</label>
                <input type="text" data-prop="payloadOff" value="${comp.payloadOff}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>`;
        } else if (comp.type === 'button') {
            onOffFields = `
             <div>
                <label class="block font-medium text-gray-700">點擊時 Payload</label>
                <input type="text" data-prop="payloadOn" value="${comp.payloadOn}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>
            `;
        }

        let jsonCheckbox = `
            <div>
                <label class="flex items-center">
                    <input type="checkbox" data-prop="isJsonPayload" class="prop-input rounded" ${comp.isJsonPayload ? 'checked' : ''}>
                    <span class="ml-2 text-gray-700">Payload 是 JSON 字串</span>
                </label>
            </div>
        `;
        if (comp.type === 'checkbox' && comp.topicMode === 'multiple') {
            jsonCheckbox = '';
        }

        payloadFields = `
        <div id="payload-settings-container" class="space-y-2 mt-4 border-t pt-4 ${(comp.type === 'radio') && comp.topicMode === 'multiple' ? 'hidden' : ''}">
            <h3 class="text-xs font-semibold text-gray-500 uppercase">Payload 設定</h3>
            ${onOffFields}
            ${jsonCheckbox}
        </div>
        `;
    }

    // 3. 建立該元件專屬的欄位 (如開關樣式、儀表板最大/最小值)
    let specificFields = '';
    const hasSpecifics = true;
    if (hasSpecifics) {
        specificFields += '<div class="space-y-2 mt-4 border-t pt-4"><h3 class="text-xs font-semibold text-gray-500 uppercase">專屬設定</h3>';
        switch (comp.type) {
            case 'switch':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">開關樣式</label>
                        <select data-prop="switchStyle" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="slide" ${comp.switchStyle === 'slide' ? 'selected' : ''}>滑動開關</option>
                            <option value="rocker" ${comp.switchStyle === 'rocker' ? 'selected' : ''}>船形開關</option>
                            <option value="push" ${comp.switchStyle === 'push' ? 'selected' : ''}>圓形按鈕</option>
                        </select>
                    </div>
                 `;
                break;
            case 'button':
                specificFields += `
                <div>
                    <label class="block font-medium text-gray-700">按鈕形狀</label>
                    <select data-prop="shape" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="square" ${comp.shape === 'square' ? 'selected' : ''}>方形</option>
                        <option value="circular" ${comp.shape === 'circular' ? 'selected' : ''}>圓形</option>
                    </select>
                </div>`;
                break;
            case 'led':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">主題模式</label>
                        <select data-prop="topicMode" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="single" ${comp.topicMode === 'single' ? 'selected' : ''}>單一主題</option>
                            <option value="multiple" ${comp.topicMode === 'multiple' ? 'selected' : ''}>多主題</option>
                        </select>
                    </div>
                    <div id="led-multi-topic-container" class="space-y-2 ${comp.topicMode !== 'multiple' ? 'hidden' : ''}">
                         <div>
                            <label class="block font-medium text-gray-700">開關主題</label>
                            <input type="text" data-prop="topic" value="${comp.topic}" class="prop-input mt-1 block w-full">
                        </div>
                        <div>
                            <label class="block font-medium text-gray-700">顏色主題</label>
                            <input type="text" data-prop="colorTopic" value="${comp.colorTopic}" class="prop-input mt-1 block w-full">
                        </div>
                        <div>
                            <label class="block font-medium text-gray-700">亮度主題</label>
                            <input type="text" data-prop="brightnessTopic" value="${comp.brightnessTopic}" class="prop-input mt-1 block w-full">
                        </div>
                    </div>
                 `;
                break;
            case 'progress':
            case 'gauge':
            case 'thermometer':
                if (comp.type === 'thermometer') {
                    specificFields += `
                        <div>
                            <label class="block font-medium text-gray-700">單位</label>
                            <select data-prop="unit" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="C" ${comp.unit === 'C' ? 'selected' : ''}>攝氏 (°C)</option>
                                <option value="F" ${comp.unit === 'F' ? 'selected' : ''}>華氏 (°F)</option>
                            </select>
                        </div>`;
                }
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">最小值</label>
                        <input type="number" data-prop="min" value="${comp.min}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">最大值</label>
                        <input type="number" data-prop="max" value="${comp.max}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                `;
                break;
            case 'graph':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">圖表類型</label>
                        <select data-prop="chartType" class="prop-input mt-1 block w-full">
                            <option value="line" ${comp.chartType === 'line' ? 'selected' : ''}>折線圖</option>
                            <option value="bar" ${comp.chartType === 'bar' ? 'selected' : ''}>群組次數直條圖</option>
                            <option value="pie" ${comp.chartType === 'pie' ? 'selected' : ''}>圓餅圖</option>
                            <option value="doughnut" ${comp.chartType === 'doughnut' ? 'selected' : ''}>甜甜圈圖</option>
                        </select>
                    </div>
                    <div id="max-data-points-container" class="${!['line', 'bar'].includes(comp.chartType) ? 'hidden' : ''}">
                        <label class="block font-medium text-gray-700">最大資料點數</label>
                        <input type="number" data-prop="maxDataPoints" value="${comp.maxDataPoints}" class="prop-input mt-1 block w-full">
                    </div>
                    <div id="chart-labels-container" class="${!['pie', 'doughnut'].includes(comp.chartType) ? 'hidden' : ''}">
                        <label class="block font-medium text-gray-700">圖表標籤 (以逗號分隔)</label>
                        <textarea data-prop="chartLabels" class="prop-input mt-1 block w-full" rows="3">${comp.chartLabels || ''}</textarea>
                    </div>
                 `;
                break;
            case 'radio':
            case 'checkbox':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">主題模式</label>
                        <select data-prop="topicMode" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="single" ${comp.topicMode === 'single' ? 'selected' : ''}>單一主題</option>
                            <option value="multiple" ${comp.topicMode === 'multiple' ? 'selected' : ''}>每個選項一個主題</option>
                        </select>
                    </div>
                    <div id="options-editor" class="mt-2 space-y-2"></div>
                 `;
                break;
            case 'dropdown':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">選項 (每行一個)</label>
                        <textarea data-prop="options" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows="4">${comp.options}</textarea>
                    </div>
                `;
                break;
            case 'notification':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">通知類型</label>
                        <select data-prop="notificationType" class="prop-input mt-1 block w-full">
                            <option value="info" ${comp.notificationType === 'info' ? 'selected' : ''}>資訊</option>
                            <option value="success" ${comp.notificationType === 'success' ? 'selected' : ''}>成功</option>
                            <option value="warning" ${comp.notificationType === 'warning' ? 'selected' : ''}>警告</option>
                            <option value="error" ${comp.notificationType === 'error' ? 'selected' : ''}>錯誤</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">持續時間 (ms)</label>
                        <input type="number" data-prop="duration" value="${comp.duration}" class="prop-input mt-1 block w-full">
                    </div>
                 `;
                break;
            case 'template':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">HTML 範本</label>
                        <textarea data-prop="htmlTemplate" class="prop-input mt-1 block w-full font-mono text-xs" rows="6">${comp.htmlTemplate}</textarea>
                        <p class="text-xs text-gray-500 mt-1">使用 <code>{{value}}</code> 來插入來自 MQTT 的值。</p>
                    </div>
                 `;
                break;
            case 'speech':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">文字編碼</label>
                        <input type="text" data-prop="encoding" value="${comp.encoding}" class="prop-input mt-1 block w-full">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">語音用文字</label>
                        <textarea data-prop="text" class="prop-input mt-1 block w-full" rows="3">${comp.text}</textarea>
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">速度</label>
                        <input type="number" data-prop="speed" value="${comp.speed}" class="prop-input mt-1 block w-full">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">次數 (0=重複)</label>
                        <input type="number" data-prop="times" value="${comp.times}" class="prop-input mt-1 block w-full">
                    </div>
                    <div><label class="block font-medium text-gray-700">編碼 Topic</label><input type="text" data-prop="encodingTopic" value="${comp.encodingTopic}" class="prop-input mt-1 block w-full"></div>
                    <div><label class="block font-medium text-gray-700">文字 Topic</label><input type="text" data-prop="textTopic" value="${comp.textTopic}" class="prop-input mt-1 block w-full"></div>
                    <div><label class="block font-medium text-gray-700">速度 Topic</label><input type="text" data-prop="speedTopic" value="${comp.speedTopic}" class="prop-input mt-1 block w-full"></div>
                    <div><label class="block font-medium text-gray-700">次數 Topic</label><input type="text" data-prop="timesTopic" value="${comp.timesTopic}" class="prop-input mt-1 block w-full"></div>
                `;
                break;
            case 'buzzer':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">正常顏色</label>
                        <input type="color" data-prop="colorNormal" value="${comp.colorNormal}" class="prop-input h-8 w-full p-0 border-none rounded">
                    </div>
                     <div>
                        <label class="block font-medium text-gray-700">觸發顏色</label>
                        <input type="color" data-prop="colorActive" value="${comp.colorActive}" class="prop-input h-8 w-full p-0 border-none rounded">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">持續時間 (ms)</label>
                        <input type="number" data-prop="duration" value="${comp.duration}" class="prop-input mt-1 block w-full">
                    </div>
                `;
                break;
            case 'image':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">圖片來源</label>
                        <select data-prop="sourceType" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="staticUrl" ${comp.sourceType === 'staticUrl' ? 'selected' : ''}>靜態 URL</option>
                            <option value="urlPayload" ${comp.sourceType === 'urlPayload' ? 'selected' : ''}>URL Payload</option>
                            <option value="base64Payload" ${comp.sourceType === 'base64Payload' ? 'selected' : ''}>Base64 Payload</option>
                        </select>
                    </div>
                    <div id="static-url-container" class="${comp.sourceType !== 'staticUrl' ? 'hidden' : ''}">
                        <label class="block font-medium text-gray-700">靜態圖片 URL</label>
                        <input type="text" data-prop="staticUrl" value="${comp.staticUrl}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                `;
                break;
            case 'joystick':
                specificFields = `
                    <div class="grid grid-cols-2 gap-2">
                         <div>
                            <label class="block font-medium text-gray-700">X 軸範圍</label>
                            <input type="number" data-prop="maxX" value="${comp.maxX}" class="prop-input mt-1 block w-full">
                        </div>
                        <div>
                            <label class="block font-medium text-gray-700">Y 軸範圍</label>
                            <input type="number" data-prop="maxY" value="${comp.maxY}" class="prop-input mt-1 block w-full">
                        </div>
                    </div>
                     <div>
                        <label class="block font-medium text-gray-700">X 軸 Topic</label>
                        <input type="text" data-prop="topicX" value="${comp.topicX}" class="prop-input mt-1 block w-full">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Y 軸 Topic</label>
                        <input type="text" data-prop="topicY" value="${comp.topicY}" class="prop-input mt-1 block w-full">
                    </div>
                `;
                ['A', 'B', 'X', 'Y'].forEach(btn => {
                    specificFields += `
                    <div class="p-2 border rounded-md mt-2">
                         <label class="block font-medium text-gray-700">按鈕 ${btn} Topic</label>
                         <input type="text" data-prop="topicBtn${btn}" value="${comp[`topicBtn${btn}`]}" class="prop-input mt-1 block w-full">
                         <div class="grid grid-cols-2 gap-2 mt-1">
                            <input type="text" data-prop="payloadBtn${btn}On" value="${comp[`payloadBtn${btn}On`]}" placeholder="On Payload" class="prop-input text-xs block w-full">
                            <input type="text" data-prop="payloadBtn${btn}Off" value="${comp[`payloadBtn${btn}Off`]}" placeholder="Off Payload" class="prop-input text-xs block w-full">
                         </div>
                    </div>
                    `;
                });

                break;
            case 'tasmota_relay':
                specificFields = `
                     <div>
                        <label class="block font-medium text-gray-700">裝置顯示名稱</label>
                        <input type="text" data-prop="deviceName" value="${comp.deviceName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Tasmota MQTT 名稱</label>
                        <input type="text" data-prop="tasmotaName" value="${comp.tasmotaName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Relay 編號</label>
                        <select data-prop="relayIndex" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="" ${comp.relayIndex === '' ? 'selected' : ''}>無</option>
                            ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<option value="${i}" ${comp.relayIndex == i ? 'selected' : ''}>${i}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">圖示</label>
                        <select data-prop="icon" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="lightbulb" ${comp.icon === 'lightbulb' ? 'selected' : ''}>燈泡</option>
                            <option value="fan" ${comp.icon === 'fan' ? 'selected' : ''}>風扇</option>
                             <option value="aircon" ${comp.icon === 'aircon' ? 'selected' : ''}>空調</option>
                            <option value="heater" ${comp.icon === 'heater' ? 'selected' : ''}>加熱器</option>
                             <option value="tv" ${comp.icon === 'tv' ? 'selected' : ''}>電視</option>
                            <option value="pump" ${comp.icon === 'pump' ? 'selected' : ''}>水泵</option>
                        </select>
                    </div>
                `;
                break;
            case 'tasmota_ws2812':
                specificFields += `
                    <div>
                        <label class="block font-medium text-gray-700">裝置顯示名稱</label>
                        <input type="text" data-prop="deviceName" value="${comp.deviceName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Tasmota Name</label>
                        <input type="text" data-prop="tasmotaName" value="${comp.tasmotaName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">燈控編號</label>
                        <select data-prop="lightIndex" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="" ${!comp.lightIndex ? 'selected' : ''}>無</option>
                            ${[2, 3, 4, 5, 6, 7, 8].map(i => `<option value="${i}" ${comp.lightIndex == i ? 'selected' : ''}>${i}</option>`).join('')}
                        </select>
                    </div>
                `;
                break;
            case 'tasmota_status':
                specificFields = `
                    <div>
                        <label class="block font-medium text-gray-700">Tasmota MQTT 名稱</label>
                        <input type="text" data-prop="tasmotaName" value="${comp.tasmotaName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">裝置顯示名稱</label>
                        <input type="text" data-prop="deviceName" value="${comp.deviceName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">預設顯示項目</label>
                        <select data-prop="defaultStatus" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            ${Object.entries(TASMOTA_STATUS_OPTIONS)
                        .map(([key, value]) => `<option value="${key}" ${comp.defaultStatus == key ? 'selected' : ''}>Status ${key}: ${value}</option>`)
                        .join('')}
                        </select>
                    </div>
                `;
                break;
            case 'tasmota_console':
            case 'tasmota_timer_setter':
            case 'tasmota_rules_editor':
            case 'tasmota_options_setter':
            case 'tasmota_gpio_module':
                specificFields = `
                    <div>
                        <label class="block font-medium text-gray-700">裝置顯示名稱</label>
                        <input type="text" data-prop="deviceName" value="${comp.deviceName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Tasmota MQTT 名稱</label>
                        <input type="text" data-prop="tasmotaName" value="${comp.tasmotaName}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                `;
                break;
        }
        specificFields += '</div>';
    }

    // 4. 組合 HTML 並注入到屬性面板
    let finalHTML = '';
    if (comp.type.startsWith('tasmota_')) {
        finalHTML = specificFields;
    } else {
        commonFields += `<div><label class="block font-medium text-gray-700">標籤</label><input type="text" data-prop="label" value="${comp.label}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div><div id="main-topic-container" class="${((comp.type === 'radio' || comp.type === 'checkbox' || comp.type === 'led') && comp.topicMode === 'multiple') || (comp.type === 'image' && comp.sourceType === 'staticUrl') || (comp.type === 'joystick') || (comp.type === 'speech') ? 'hidden' : ''}"><label class="block font-medium text-gray-700">MQTT 主題 (Topic)</label><input type="text" data-prop="topic" value="${comp.topic || ''}" class="prop-input mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>`;
        finalHTML = commonFields + payloadFields + specificFields;
    }
    propertiesContent.innerHTML = `<div class="space-y-4 text-sm">${finalHTML}</div>`;

    // 5. 如果是選項類元件，呼叫專門的編輯器
    if (comp.type === 'radio' || comp.type === 'checkbox') {
        setupOptionsEditor(comp);
    }

    // 6. 為所有屬性輸入框綁定 'input' 事件，當使用者修改屬性時，即時更新元件
    document.querySelectorAll('.prop-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const prop = e.target.dataset.prop;
            let value = (e.target.type === 'checkbox') ? e.target.checked : e.target.value;
            if (input.type === 'number') value = parseFloat(value) || 0;

            const updates = { [prop]: value };

            // **REVISED LOGIC**: 當 tasmotaName 變更時，從狀態中心查詢
            if (prop === 'tasmotaName') {
                // 檢查此設備名稱是否已知為上線狀態
                if (tasmotaDeviceStatus[value] === true) {
                    updates.isOnline = true;
                } else {
                    // 如果狀態未知或為離線，則確保設定為離線
                    updates.isOnline = false;
                }
            }

            // --- Tasmota Status: Special handling for defaultStatus change ---
            if (prop === 'defaultStatus') {
                const changedComp = findComponentById(selectedComponentId);
                // 確保只有在檢視模式下，或是 MQTT 已連線時才觸發查詢
                if (changedComp && changedComp.type === 'tasmota_status' &&
                    (canvas.classList.contains('view-mode') || (mqttClient && mqttClient.connected))) {
                    const newStatus = parseInt(value, 10);
                    // 1. 同步當前選擇、清除舊資料並更新元件狀態
                    updates.selectedStatus = newStatus;
                    updates.statusData = {};
                    updateComponent(selectedComponentId, updates);

                    // 2. 為新選擇的狀態觸發 MQTT 查詢
                    handleTasmotaInteraction(selectedComponentId, 'status_query', { statusNumber: newStatus });

                    // 3. 重新訂閱主題以獲取新的 STATUS 主題
                    subscribeToAllTopics();
                }
            }

            const propsThatRebuildPanel = ['topicMode', 'isJsonPayload', 'sourceType', 'chartType'];
            const propsThatReRenderAll = ['shape', 'options', 'switchStyle', 'icon'];

            if (propsThatRebuildPanel.includes(prop) || (prop === 'defaultStatus' && canvas.classList.contains('edit-mode'))) {
                updateComponent(id, updates);
                showPropertiesPanel(id);
            } else if (propsThatReRenderAll.includes(prop)) {
                updateComponent(id, updates);
                renderAllComponents();
                const el = document.getElementById(id);
                if (el) el.classList.add('selected');
            } else {
                updateComponent(selectedComponentId, updates);
            }

            // 如果是 tasmota_status 元件的 tasmotaName 發生變化，自動獲取其預設狀態
            const changedComp = findComponentById(selectedComponentId);
            if (changedComp && changedComp.type === 'tasmota_status' && prop === 'tasmotaName' && changedComp.tasmotaName) {
                handleTasmotaInteraction(selectedComponentId, 'status_query', { statusNumber: changedComp.selectedStatus });
                updateComponent(selectedComponentId, { statusData: {} }); // 清空舊資料
            }
            // 如果是 tasmota_gpio_module 元件的 tasmotaName 發生變化，自動獲取其 GPIO 功能列表
            if (changedComp && changedComp.type === 'tasmota_gpio_module' && prop === 'tasmotaName' && changedComp.tasmotaName) {
                // 清空舊資料並觸發查詢
                updateComponent(selectedComponentId, { availableGpios: null, currentModule: 'N/A' });
                handleTasmotaInteraction(selectedComponentId, 'gpio_options_query');
            }

            // 如果修改了影響 MQTT 訂閱的屬性，則重新訂閱
            const subscriptionProps = ['topic', 'topicMode', 'colorTopic', 'brightnessTopic', 'sourceType', 'tasmotaName', 'topicX', 'topicY', 'topicBtnA', 'topicBtnB', 'topicBtnX', 'topicBtnY', 'encodingTopic', 'textTopic', 'speedTopic', 'timesTopic'];
            if (subscriptionProps.includes(prop) || propsThatReRenderAll.includes(prop)) {
                subscribeToAllTopics();
            }
        });
    });

    // 顯示刪除按鈕和屬性面板
    deleteComponentBtn.classList.remove('hidden');
    propertiesPanel.classList.remove('translate-x-full');
}

/**
 * 為選項類型元件 (radio, checkbox) 設定選項編輯器
 * @param {object} comp - 元件物件
 */
function setupOptionsEditor(comp) {
    const editor = document.getElementById('options-editor');
    if (!editor) return;

    function renderOptions() {
        // ... (動態生成選項的輸入框、刪除按鈕和新增按鈕)
        editor.innerHTML = '';
        comp.options.forEach((opt, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'p-2 border rounded-md space-y-1';
            let topicInput = '';
            if (comp.topicMode === 'multiple') {
                topicInput = `
                    <input type="text" value="${opt.topic || ''}" placeholder="Topic for this option" 
                           class="w-full text-xs p-1 border rounded" data-index="${index}" data-opt-prop="topic">
                `;
            }
            optionEl.innerHTML = `
                <div class="flex items-center space-x-1">
                    <input type="text" value="${opt.label}" placeholder="Label" class="w-1/2 p-1 border rounded" data-index="${index}" data-opt-prop="label">
                    <input type="text" value="${opt.value}" placeholder="Value" class="w-1/2 p-1 border rounded" data-index="${index}" data-opt-prop="value">
                    <button class="remove-option-btn text-red-500 hover:text-red-700 px-2" data-index="${index}">&times;</button>
                </div>
                ${topicInput}
            `;
            editor.appendChild(optionEl);
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '新增選項';
        addBtn.className = 'w-full text-sm py-1 bg-gray-200 hover:bg-gray-300 rounded mt-2';
        addBtn.id = 'add-option-btn';
        editor.appendChild(addBtn);
    }

    renderOptions();

    // ... (為編輯器內的輸入框和按鈕綁定事件)
    editor.addEventListener('input', (e) => {
        const target = e.target;
        if (target.dataset.optProp) {
            const index = parseInt(target.dataset.index, 10);
            const prop = target.dataset.optProp;
            comp.options[index][prop] = target.value;
            updateComponent(comp.id, { options: comp.options });
            if (prop === 'topic') subscribeToAllTopics();
        }
    });

    editor.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-option-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            comp.options.splice(index, 1);
        } else if (e.target.id === 'add-option-btn') {
            const newValue = `val${Date.now()}`;
            comp.options.push({ label: '新選項', value: newValue, topic: '' });
        }
        updateComponent(comp.id, { options: comp.options });
        renderOptions();
        renderAllComponents();
        const el = document.getElementById(comp.id);
        if (el) el.classList.add('selected');
    });
}
