const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    crearPerfil: (nombre) => ipcRenderer.invoke("crear-perfil", nombre),
    obtenerPerfiles: () => ipcRenderer.invoke("obtener-perfiles"),
    cargarPerfil: (nombre) => ipcRenderer.invoke("cargar-perfil", nombre)
});