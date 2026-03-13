const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
    getVersion: () => {
        return "1.0.0";
    }
});