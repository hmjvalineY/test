const TASMOTA_SETOPTIONS_DATA = [
    {
        command: "SetOption1",
        name: "SetOption1 儲存電源狀態",
        description: "儲存電源狀態並在重新啟動後使用(=SaveState)。0=停用, 1=啟用(預設)。注意:電源狀態指的是繼電器或燈光等裝置的開/關狀態。",
    },
    {
        command: "SetOption2",
        name: "SetOption2 按鈕多按模式",
        description: "將按鈕多按模式設定為。0=允許所有按鈕操作(預設), 1=限制為單擊到五次按下並保持操作。",
    },
    {
        command: "SetOption3",
        name: "SetOption3 MQTT 功能",
        description: "MQTT 功能。0=停用 MQTT, 1=啟用 MQTT(預設)。",
    },
    {
        command: "SetOption4",
        name: "SetOption4 MQTT 回應主題",
        description: "設定 MQTT 回應主題。0=回應至 RESULT 主題(預設), 1=回應至 %COMMAND% 主題。",
    },
    {
        command: "SetOption8",
        name: "SetOption8 溫度單位",
        description: "顯示溫度單位。0=攝氏度(預設), 1=華氏度。",
    },
    {
        command: "SetOption10",
        name: "SetOption10 LWT 訊息行為",
        description: "當裝置 MQTT 主題變更時的行為。0=刪除舊主題LWT上保留的訊息(預設), 1=向舊主題 LWT發送“離線”。",
    },
    {
        command: "SetOption11",
        name: "SetOption11 交換按鈕功能",
        description: "交換按鈕點選與雙擊功能。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption12",
        name: "SetOption12 Flash 儲存選項",
        description: "配置儲存到快閃記憶體選項。0=允許動態快閃儲存槽旋轉(預設), 1=使用固定 eeprom 快閃記憶體槽。",
    },
    {
        command: "SetOption13",
        name: "SetOption13 按鈕立即回應",
        description: "允許單次按下後立即執行操作。0=點選、多次按下和按住按鈕操作(預設), 1=僅單次按下操作可立即回應。",
    },
    {
        command: "SetOption15",
        name: "SetOption15 LED PWM 控制",
        description: "設定 LED燈的PWM 控制。0=基本 PWM 控制, 1=使用 Color 或 Dimmer 指令控制(預設)。",
    },
    {
        command: "SetOption16",
        name: "SetOption16 LED 時鐘模式",
        description: "設定可定址 LED 時鐘方案參數。0=順時針模式(預設), 1=逆時針模式。",
    },
    {
        command: "SetOption17",
        name: "SetOption17 Color 指令格式",
        description: "Color 指令回傳的字串格式。0=十六進位字串(預設), 1=逗號分隔的十進位字串。",
    },
    {
        command: "SetOption18",
        name: "SetOption18 CO2 感測器信號燈",
        description: "與二氧化碳感測器配對的信號燈狀態。0=禁用燈(預設), 1=啟用燈。",
    },
    {
        command: "SetOption19",
        name: "SetOption19 Home Assistant 發現協定",
        description: "Home Assistant Tasmota 整合中使用的 Tasmota 發現協定。0=啟用 Tasmota 發現(預設), 1=使用已棄用的 MQTT 發現。",
    },
    {
        command: "SetOption20",
        name: "SetOption20 無需開機更新燈光",
        description: "無需開啟電源即可更新調光器/顏色/CT。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption21",
        name: "SetOption21 斷電時能量監控",
        description: "斷電時的能量監控。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption24",
        name: "SetOption24 壓力單位",
        description: "設定壓力單位。0=hPa(預設), 1=mmHg。",
    },
    {
        command: "SetOption26",
        name: "SetOption26 強制使用繼電器索引",
        description: "即使只有一個繼電器，也使用索引。0=訊息使用 POWER(預設), 1=訊息使用 POWER1。",
    },
    {
        command: "SetOption28",
        name: "SetOption28 RF 接收資料格式",
        description: "RF 接收資料格式。0=十六進位(預設), 1=十進位。",
    },
    {
        command: "SetOption29",
        name: "SetOption29 IR 接收資料格式",
        description: "IR 接收資料格式。0=十六進位(預設), 1=十進位。",
    },
    {
        command: "SetOption30",
        name: "SetOption30 強制 HA 自動發現為燈光",
        description: "強制 Home Assistant 自動發現為燈光。0=繼電器為開關,PWM為燈光(預設), 1=繼電器和 PWM 都為燈光。",
    },
    {
        command: "SetOption31",
        name: "SetOption31 狀態 LED 閃爍",
        description: "Wi-Fi和MQTT 連線問題期間狀態 LED 閃爍。0=啟用(預設), 1=停用。",
    },
    {
        command: "SetOption32",
        name: "SetOption32 按鈕按住時間",
        description: "設定按鈕按住時間(0.1秒為單位)。1..100 (預設=40)。",
    },
    {
        command: "SetOption33",
        name: "SetOption33 超功率重試次數",
        description: "因超過最大功率限製而關閉電源後重試供電的次數。1..250 (預設=5)。",
    },
    {
        command: "SetOption34",
        name: "SetOption34 Backlog 指令延遲",
        description: "設定 Backlog 指令間延遲(以毫秒為單位)。0..255。",
    },
    {
        command: "SetOption35",
        name: "SetOption35 串列橋跳過訊息數",
        description: "跳過串列橋中接收的訊息數。0..255 (預設=0)。",
    },
    {
        command: "SetOption36",
        name: "SetOption36 循環預設恢復",
        description: "啟用循環預設恢復控制。0=停用, 1..200 設定啟動循環次數。",
    },
    {
        command: "SetOption38",
        name: "SetOption38 IR 接收靈敏度",
        description: "設定 IRReceive 協定偵測靈敏度。6..255。",
    },
    {
        command: "SetOption39",
        name: "SetOption39 無效功率處理",
        description: "控制無效功率測量值的處理。0=下次重開機時重設為預設值, 1..255=報告無負載前的無效功率讀數次數(預設=128)。",
    },
    {
        command: "SetOption40",
        name: "SetOption40 停止偵測按鈕變化",
        description: "停止偵測按鈕 GPIO 上的輸入變化(0.1秒為單位)。0..250。",
    },
    {
        command: "SetOption41",
        name: "SetOption41 強制發送免費 ARP",
        description: "強制發送免費 ARP (Wi-Fi 保持活動)。0=停用, >0=秒數或分鐘數。",
    },
    {
        command: "SetOption42",
        name: "SetOption42 過熱閾值",
        description: "設定過熱閾值(攝氏度)。0..255 (預設=90)。",
    },
    {
        command: "SetOption43",
        name: "SetOption43 旋轉步進控制",
        description: "控制旋轉步進。0..255。",
    },
    {
        command: "SetOption44",
        name: "SetOption44 IR 容差百分比",
        description: "設定匹配傳入 IR 訊息的基本容差百分比。1..100 (預設=25)。",
    },
    {
        command: "SetOption45",
        name: "SetOption45 雙穩態繼電器脈衝長度",
        description: "改變雙穩態鎖存繼電器脈衝長度(毫秒)。1..250 (預設=40)。",
    },
    {
        command: "SetOption46",
        name: "SetOption46 開機延遲",
        description: "初始化前的開機延遲(10毫秒為單位)。0..255。",
    },
    {
        command: "SetOption47",
        name: "SetOption47 繼電器通電延遲",
        description: "延遲繼電器通電狀態。3..255=秒數, 1=延遲至網路連線, 2=延遲至 MQTT 連接。",
    },
    {
        command: "SetOption48",
        name: "SetOption48 能量假繼電器",
        description: "支援能量假繼電器。0=停用, 1=啟用。",
    },
    {
        command: "SetOption51",
        name: "SetOption51 啟用 GPIO9/10",
        description: "在模組配置中啟用 GPIO9 和 GPIO10 元件選擇 (請勿在 ESP8266 上使用)。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption52",
        name: "SetOption52 顯示 UTC 時間偏移",
        description: "在 JSON 有效負載中顯示與 UTC 的可選時間偏移。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption53",
        name: "SetOption53 顯示主機名稱/IP",
        description: "在 GUI 中顯示主機名稱和 IP 位址。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption54",
        name: "SetOption54 套用 SetOption20 至塗鴉",
        description: "將 SetOption20 設定套用至塗鴉設備的命令。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption55",
        name: "SetOption55 mDNS 服務",
        description: "mDNS 服務。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption56",
        name: "SetOption56 Wi-Fi 啟動時掃描",
        description: "Wi-Fi 網路掃描以在重新啟動時選擇最強訊號。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption57",
        name: "SetOption57 Wi-Fi 定期重新掃描",
        description: "Wi-Fi 網路每44分鐘重新掃描一次以尋找更強訊號。0=停用, 1=啟用(預設)。",
    },
    {
        command: "SetOption58",
        name: "SetOption58 IR 包含原始資料",
        description: "在 JSON 有效負載中包含 IR 原始資料。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption59",
        name: "SetOption59 也發送 RESULT",
        description: "除了 StatePower 之外，也發送 RESULT。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption60",
        name: "SetOption60 睡眠模式",
        description: "設定睡眠模式。0=動態睡眠(預設), 1=正常睡眠。",
    },
    {
        command: "SetOption61",
        name: "SetOption61 強制本地操作",
        description: "強制本地操作 (ButtonTopic/SwitchTopic)。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption62",
        name: "SetOption62 按鈕/開關保留訊息",
        description: "設定按鈕或開關保留訊息。0=停用(預設), 1=不在 HOLD 訊息上使用保留標誌。",
    },
    {
        command: "SetOption63",
        name: "SetOption63 重啟時繼電器狀態掃描",
        description: "設定重啟時繼電器狀態回饋掃描。0=重新啟動時掃描電源狀態(預設), 1=重新啟動時停用電源狀態掃描。",
    },
    {
        command: "SetOption64",
        name: "SetOption64 感測器名稱分隔符",
        description: "切換感測器名稱分隔符號。0=感測器名稱索引分隔符號為-(連字符)(預設), 1=感測器名稱索引分隔符號為_(下劃線)。",
    },
    {
        command: "SetOption65",
        name: "SetOption65 快速電源循環偵測",
        description: "使用快速電源循環偵測進行裝置恢復。0=啟用(預設), 1=停用。",
    },
    {
        command: "SetOption66",
        name: "SetOption66 發布 TuyaReceived",
        description: "將 TuyaReceived 發佈至 MQTT。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption68",
        name: "SetOption68 Multi-channel PWM",
        description: "參見 Light->MultiPWM。",
    },
    {
        command: "SetOption69",
        name: "SetOption69 反轉串列接收",
        description: "反轉 Serial Bridge 上的串行接收。舊版: Tuya 調光器 10% 下限。0=停用, 1=啟用(預設)。",
    },
    {
        command: "SetOption71",
        name: "SetOption71 DDS238 電能暫存器",
        description: "設定 DDS238 Modbus 暫存器的有功電能。0=主暫存器(預設), 1=備用暫存器。",
    },
    {
        command: "SetOption72",
        name: "SetOption72 總能量參考",
        description: "設定用於總能量的參考。0=使用韌體計數器(預設), 1=使用能量監視器硬體計數器。",
    },
    {
        command: "SetOption73",
        name: "SetOption73 分離按鈕與繼電器",
        description: "將按鈕從繼電器上分離並發送 MQTT 訊息。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption74",
        name: "SetOption74 DS18x20 內部上拉",
        description: "為單一 DS18x20 感測器啟用內部上拉。0=停用(預設), 1=啟用 (僅 ESP8266)。",
    },
    {
        command: "SetOption75",
        name: "SetOption75 grouptopic 行為",
        description: "設定 grouptopic 行為。0=GroupTopic 使用 FullTopic(預設), 1=GroupTopic 是 cmnd/%grouptopic%/。",
    },
    {
        command: "SetOption76",
        name: "SetOption76 Deep Sleep 啟動計數",
        description: "啟用 Deep Sleep 時啟動計數遞增。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption77",
        name: "SetOption77 滑桿最左側不關機",
        description: "如果滑桿移到最左邊則不關機。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption78",
        name: "SetOption78 OTA 相容性檢查",
        description: "OTA 相容性檢查。0=啟用(預設), 1=停用。",
    },
    {
        command: "SetOption79",
        name: "SetOption79 TelePeriod 重置計數器",
        description: "在 TelePeriod 時間重置計數器。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption80",
        name: "SetOption80 百葉窗支援",
        description: "百葉窗和百葉窗支援。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption81",
        name: "SetOption81 PCF8574 行為",
        description: "設定所有連接埠的 PCF8574 元件行為。0=常規狀態(預設), 1=反轉狀態。",
    },
    {
        command: "SetOption82",
        name: "SetOption82 縮減 CT 範圍 (Alexa)",
        description: "將 CT 範圍從 153..500 減少到 200..380 以適應 Alexa 範圍。0=153-500(預設), 1=200-380。",
    },
    {
        command: "SetOption83",
        name: "SetOption83 Zigbee 使用友好名稱",
        description: "報告值和命令時，使用 Zigbee 設備友好名稱而不是短地址。0=短地址, 1=友好名稱。",
    },
    {
        command: "SetOption84",
        name: "SetOption84 AWS IoT 影子更新",
        description: "使用 AWS IoT 時，發送裝置影子更新。0=不更新(預設), 1=更新。",
    },
    {
        command: "SetOption85",
        name: "SetOption85 設備組支援",
        description: "設備組支援。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption86",
        name: "SetOption86 調光器 LED 自動關閉",
        description: "僅限 PWM 調光器!上次變更後5秒關閉亮度 LED。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption87",
        name: "SetOption87 調光器 LED 斷電亮紅燈",
        description: "僅限 PWM 調光器!斷電時亮起紅色 LED。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption88",
        name: "SetOption88 繼電器設為獨立設備組",
        description: "將每個繼電器設定為單獨的設備組。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption90",
        name: "SetOption90 僅發送 JSON MQTT",
        description: "停用發送非 JSON 訊息的 MQTT。0=發送所有(預設), 1=僅發送 JSON。",
    },
    {
        command: "SetOption93",
        name: "SetOption93 壓縮規則快取",
        description: "控制壓縮規則的快取。0=停用快取, 1=啟用快取(預設)。",
    },
    {
        command: "SetOption94",
        name: "SetOption94 熱電偶選擇",
        description: "選擇 MAX31855 或 MAX6675 熱電偶支援。0=MAX31855(預設), 1=MAX6675。",
    },
    {
        command: "SetOption97",
        name: "SetOption97 TuyaMCU 串列波特率",
        description: "設定 TuyaMCU 串口波特率。0=9600bps(預設), 1=115200bps。",
    },
    {
        command: "SetOption98",
        name: "SetOption98 旋轉調光規則觸發",
        description: "提供旋轉調光規則觸發器。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption99",
        name: "SetOption99 交流調光器零交叉",
        description: "啟用支援零交叉的交流調光器。0=未連接(預設), 1=連接。",
    },
    {
        command: "SetOption101",
        name: "SetOption101 Zigbee 屬性後綴",
        description: "將 Zigbee 來源端點作為後綴新增至屬性。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption103",
        name: "SetOption103 TLS 模式",
        description: "設定 TLS 模式。0=停用, 1=啟用。",
    },
    {
        command: "SetOption104",
        name: "SetOption104 停用 MQTT 保留訊息",
        description: "停用 MQTT 保留訊息。0=啟用保留(預設), 1=停用保留。",
    },
    {
        command: "SetOption107",
        name: "SetOption107 虛擬 CT 通道燈光類型",
        description: "設定虛擬 CT 通道燈光類型。0=暖白, 1=冷白。",
    },
    {
        command: "SetOption108",
        name: "SetOption108 Teleinfo 遙測訊息",
        description: "Teleinfo 遙測訊息發送。0=僅發送至 Energy MQTT JSON(預設), 1=每個接收的訊框也由 MQTT 傳送。",
    },
    {
        command: "SetOption109",
        name: "SetOption109 強制 gen1 Alexa 模式",
        description: "強制 gen1 Alexa 模式 (僅適用於 Echo Dot 2nd gen)。0=預設, 1=強制。",
    },
    {
        command: "SetOption113",
        name: "SetOption113 旋轉撥號調光器行為",
        description: "僅適用於旋轉撥號按鈕，關閉電源後將調光器調低。0=預設, 1=啟用。",
    },
    {
        command: "SetOption114",
        name: "SetOption114 分離交換器與繼電器",
        description: "將交換器與中繼器分離並傳送 MQTT 訊息。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption115",
        name: "SetOption115 ESP32 M132 BLE",
        description: "ESP32 M132 BLE。0=停用(預設), 1=啟用。",
    },
    {
        command: "SetOption116",
        name: "SetOption116 Zigbee 自動查詢",
        description: "Zigbee 自動查詢燈光和設備。0=啟用, 1=停用。",
    },
    {
        command: "SetOption117",
        name: "SetOption117 固定持續時間淡入淡出",
        description: "以固定持續時間運行淡入淡出，而不是固定斜率。0=停用, 1=啟用。",
    },
    {
        command: "SetOption123",
        name: "SetOption123 Wiegand 十六進位格式",
        description: "十六進位格式的 Wiegand 標籤號碼輸出。0=停用, 1=啟用。",
    },
    {
        command: "SetOption124",
        name: "SetOption124 Wiegand 鍵盤敲擊格式",
        description: "Wiegand 鍵盤敲擊格式。0=一個標籤(預設), 1=一個鍵。",
    },
    {
        command: "SetOption125",
        name: "SetOption125 ZbBridge 隱藏橋接主題",
        description: "ZbBridge 僅隱藏來自 zigbee 主題的橋接主題。0=停用, 1=啟用。",
    },
    {
        command: "SetOption126",
        name: "SetOption126 DS18x20 算術平均值",
        description: "啟用 DS18x20 感測器 JSON 溫度的遠端週期算術平均值。0=停用, 1=啟用。",
    },
    {
        command: "SetOption127",
        name: "SetOption127 強制 Wi-Fi 非睡眠模式",
        description: "即使未啟用 sleep 0，也強制 Wi-Fi 處於非睡眠模式。0=停用, 1=啟用。",
    },
    {
        command: "SetOption128",
        name: "SetOption128 Web referrer 檢查",
        description: "HTTP API 指令的 Web referrer 檢查。0=停用, 1=啟用(預設)。",
    },
    {
        command: "SetOption129",
        name: "SetOption129 分割總能量結果",
        description: "啟用分割總能量結果。0=停用, 1=啟用。",
    },
    {
        command: "SetOption130",
        name: "SetOption130 在日誌中新增堆疊大小",
        description: "將堆疊大小新增至日誌時間戳記以進行偵錯。0=停用, 1=啟用。",
    },
    {
        command: "SetOption131",
        name: "SetOption131 允許保存塗鴉調光器值=0",
        description: "允許保存塗鴉調光器值=0。0=停用, 1=啟用。",
    },
    {
        command: "SetOption132",
        name: "SetOption132 MQTT TLS 指紋驗證",
        description: "啟用 MQTT TLS 後，強制進行伺服器身分指紋驗證。0=CA, 1=Fingerprint。",
    },
    {
        command: "SetOption133",
        name: "SetOption133 反轉 74x595 輸出",
        description: "反轉 74x595 移位暫存器的輸出。0=不反轉, 1=反轉。",
    },
    {
        command: "SetOption134",
        name: "SetOption134 PWM 強制相位同步",
        description: "PWM 強制相位同步(僅限 ESP32)。0=相位自動對齊, 1=所有相位同時啟動。",
    },
    {
        command: "SetOption135",
        name: "SetOption135 停用啟動畫面",
        description: "停用顯示啟動畫面。0=顯示, 1=停用。",
    },
    {
        command: "SetOption136",
        name: "SetOption136 停用塗鴉單一感測器報告",
        description: "停用塗鴉設備的單一感測器報告。0=立即發布(預設), 1=停用。",
    },
    {
        command: "SetOption137",
        name: "SetOption137 過濾部分塗鴉回應",
        description: "啟用 SetOption66 後，過濾部分塗鴉回應。0=不過濾, 1=過濾。",
    },
    {
        command: "SetOption138",
        name: "SetOption138 GUI 能量佈局對齊",
        description: "在 WebUI 中對齊 GUI 能量多列佈局。0=左/中(預設), 1=右。",
    },
    {
        command: "SetOption139",
        name: "SetOption139 切換壓力單位 (inHg)",
        description: "當 SetOption24=1 時，切換壓力單位。0=mmHg(預設), 1=inHg。",
    },
    {
        command: "SetOption140",
        name: "SetOption140 MQTT 會話類型",
        description: "設定 MQTT 會話類型。0=開啟乾淨的會話(預設), 1=開啟持久的會話。",
    },
    {
        command: "SetOption141",
        name: "SetOption141 停用 WebUI 模型名稱",
        description: "停用在 webUI 標題中顯示模型名稱。0=顯示, 1=停用。",
    },
    {
        command: "SetOption142",
        name: "SetOption142 等待 WiFi 連接",
        description: "等待1秒連接 WiFi (解決 FRITZ!Box 問題)。0=不等, 1=等待。",
    },
    {
        command: "SetOption143",
        name: "SetOption143 停用 ZigBee 自動探測",
        description: "停用 ZigBee 自動探測並配置返回屬性報告。0=啟用, 1=停用。",
    },
    {
        command: "SetOption144",
        name: "SetOption144 ZbReceived 包含時間戳",
        description: "在 ZbReceived 訊息中包含時間戳。0=不包含, 1=包含。",
    },
    {
        command: "SetOption146",
        name: "SetOption146 ESP32 內部溫度",
        description: "啟用 ESP32 內部溫度顯示。0=停用, 1=啟用。",
    },
    {
        command: "SetOption147",
        name: "SetOption147 停用發布 SSerial/IrReceived",
        description: "停用 SSerialReceived/IrReceived MQTT 訊息的發布。0=發布, 1=停用。",
    },
    {
        command: "SetOption148",
        name: "SetOption148 ArtNet 自動運作",
        description: "啟動時啟用 ArtNet 模式的自動運作。0=停用, 1=啟用。",
    },
    {
        command: "SetOption149",
        name: "SetOption149 DNS 首先嘗試 IPv6",
        description: "DNS 首先嘗試解析 IPv6 位址。0=先 IPv4(預設), 1=先 IPv6。",
    },
    {
        command: "SetOption150",
        name: "SetOption150 強制能量驅動器無共同點",
        description: "強制能量驅動器中沒有電壓/頻率共同點。0=停用, 1=啟用。",
    },
    {
        command: "SetOption151",
        name: "SetOption151 啟用 Matter 支援",
        description: "啟用 Matter 支援。0=停用, 1=啟用。",
    },
    {
        command: "SetOption152",
        name: "SetOption152 雙穩態繼電器控制引腳",
        description: "在一個(1)或兩個(0)引腳雙穩態繼電器控制之間切換。",
    },
    {
        command: "SetOption153",
        name: "SetOption153 停用 autoexec.be",
        description: "停用重新啟動時執行 (Berry) autoexec.be。0=執行, 1=停用。",
    },
    {
        command: "SetOption154",
        name: "SetOption154 Berry led 附加方案",
        description: "使用 RMT0 作為附加 WS2812 方案處理 Berry led。0=停用, 1=啟用。",
    },
    {
        command: "SetOption155",
        name: "SetOption155 ZCDimmer 下降沿調光",
        description: "(ZCDimmer)啟用罕見的下降沿調光器。0=前緣, 1=下降沿。",
    },
    {
        command: "SetOption156",
        name: "SetOption156 Sen5x 被動模式",
        description: "(Sen5x)當有另一個 I2C 主設備時以被動模式運行。0=主動, 1=被動。",
    },
    {
        command: "SetOption157",
        name: "SetOption157 顯示 NeoPool 敏感數據",
        description: "顯示 NeoPool 敏感數據。0=隱藏(預設), 1=顯示。",
    },
    {
        command: "SetOption158",
        name: "SetOption158 停用 ModbusReceived 發布",
        description: "停用發布 ModbusReceived MQTT 訊息。0=發布, 1=停用。",
    },
    {
        command: "SetOption159",
        name: "SetOption159 計數器邊緣觸發",
        description: "設定計數器在下降沿或上升沿和下降沿計數。0=僅下降沿(預設), 1=下降沿和上升沿。",
    },
    {
        command: "SetOption160",
        name: "SetOption160 停用感測器移動事件",
        description: "停用透過感測器報告產生移動事件。0=啟用, 1=停用。",
    },
    {
        command: "SetOption161",
        name: "SetOption161 禁用狀態文字",
        description: "禁用狀態文字的顯示。0=顯示, 1=禁用。",
    },
    {
        command: "SetOption162",
        name: "SetOption162 今日能源計算",
        description: "今天不要將出口能源加入能源中。0=加入, 1=不加入。",
    },
    {
        command: "SetOption163",
        name: "SetOption163 停用 GUI 設備名稱",
        description: "停用 GUI 設備名稱的顯示。0=顯示, 1=停用。",
    },
    {
        command: "SetOption164",
        name: "SetOption164 Wiz 智慧遠端支援",
        description: "啟用 Wiz 智慧遠端支援。0=停用, 1=啟用。",
    },
    {
        command: "SetOption165",
        name: "SetOption165 允許 TLS ECDSA 證書",
        description: "允許 TLS ECDSA 證書。0=僅 RSA, 1=允許 RSA 和 ECDSA。",
    }
];

  