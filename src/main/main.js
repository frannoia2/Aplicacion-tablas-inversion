const {app, BrowserWindow, ipcMain} = require("electron");
const fs = require("fs");
const path = require("path");

function createWindow(){
    const win = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function getDataPath(){
    const userDataPath = app.getPath("userData");
    const perfilesPath = path.join(userDataPath, "perfiles");

    if (!fs.existsSync(perfilesPath)){
        fs.mkdirSync(perfilesPath);
    }

    return perfilesPath;
}

ipcMain.handle("crear-perfil", (event, nombre) => {
    const perfilesPath = getDataPath();
    const filePath = path.join(perfilesPath, `${nombre}.json`);
    const data = {
        nombre: nombre,
        inversiones: []
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return true;
});

ipcMain.handle("obtener-perfiles", () => {
    const perfilesPath = getDataPath();
    const files = fs.readdirSync(perfilesPath);

    return files.map(file => file.replace(".json", ""));
});

ipcMain.handle("cargar-perfil", (event, nombre) => {
    const perfilesPath = getDataPath();
    const filePath = path.join(perfilesPath, `${nombre}.json`);
    const data = fs.readFileSync(filePath);

    return JSON.parse(data);
});

app.whenReady().then(() => {
    createWindow();
});