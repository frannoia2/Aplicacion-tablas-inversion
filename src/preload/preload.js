const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    crearPerfil: (nombre) => ipcRenderer.invoke("crear-perfil", nombre),
    obtenerPerfiles: () => ipcRenderer.invoke("obtener-perfiles"),
    cargarPerfil: (nombre) => ipcRenderer.invoke("cargar-perfil", nombre),
    guardarPerfil: (perfil) => ipcRenderer.invoke("guardar-perfil", perfil),
    guardarPerfilSync: (perfil) => ipcRenderer.sendSync("guardar-perfil-sync", perfil),
    generarPDF: (nombrePerfil) => ipcRenderer.invoke("generar-pdf", nombrePerfil)
});
