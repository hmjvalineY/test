(function () {
    class ComponentStateManager {
        constructor() {
            this._components = [];
            this._mode = 'edit';
            this._selectedComponentId = null;
            this._listeners = new Map([
                ['change', new Set()],
                ['selection', new Set()],
                ['mode', new Set()]
            ]);
        }

        /**
         * 取得目前所有元件的淺層拷貝陣列，避免外部直接操作內部資料結構。
         * @returns {Array<object>}
         */
        getComponents() {
            return this._components;
        }

        /**
         * 以新陣列覆寫元件清單。
         * @param {Array<object>} newComponents
         */
        setComponents(newComponents) {
            this._components.length = 0;
            newComponents.forEach(comp => {
                this._components.push({ ...comp });
            });
            this._selectedComponentId = null;
            this._emit('selection');
            this._emit('change');
        }

        /**
         * 新增元件到狀態中。
         * @param {object} component
         */
        addComponent(component) {
            this._components.push(component);
            this._emit('change');
        }

        /**
         * 更新指定元件的資料。
         * @param {string} id
         * @param {object} updates
         * @returns {object | null}
         */
        updateComponent(id, updates) {
            const component = this.findComponent(id);
            if (!component) return null;
            Object.assign(component, updates);
            this._emit('change');
            return component;
        }

        /**
         * 從狀態中移除指定元件。
         * @param {string} id
         * @returns {object | null}
         */
        removeComponent(id) {
            const index = this._components.findIndex(comp => comp.id === id);
            if (index === -1) return null;
            const [removed] = this._components.splice(index, 1);
            if (this._selectedComponentId === id) {
                this._selectedComponentId = null;
                this._emit('selection');
            }
            this._emit('change');
            return removed;
        }

        /**
         * 依照 ID 尋找元件。
         * @param {string} id
         * @returns {object | undefined}
         */
        findComponent(id) {
            return this._components.find(comp => comp.id === id);
        }

        /**
         * 取得當前模式 (edit / view)。
         * @returns {string}
         */
        getMode() {
            return this._mode;
        }

        /**
         * 設定當前模式。
         * @param {string} mode
         */
        setMode(mode) {
            if (mode === this._mode) return;
            this._mode = mode;
            this._emit('mode');
        }

        /**
         * 取得目前被選取的元件 ID。
         * @returns {string | null}
         */
        getSelectedComponentId() {
            return this._selectedComponentId;
        }

        /**
         * 設定目前被選取的元件 ID。
         * @param {string | null} id
         */
        setSelectedComponentId(id) {
            if (this._selectedComponentId === id) return;
            this._selectedComponentId = id;
            this._emit('selection');
        }

        /**
         * 訂閱狀態變更事件。
         * @param {'change' | 'selection' | 'mode'} event
         * @param {Function} handler
         * @returns {Function} 解除訂閱函式
         */
        subscribe(event, handler) {
            const listeners = this._listeners.get(event);
            if (!listeners) {
                throw new Error(`Unknown event type: ${event}`);
            }
            listeners.add(handler);
            return () => listeners.delete(handler);
        }

        _emit(event) {
            const listeners = this._listeners.get(event);
            if (!listeners) return;
            listeners.forEach(handler => handler(this));
        }
    }

    const manager = new ComponentStateManager();
    window.componentState = manager;
    window.components = manager.getComponents();
})();
