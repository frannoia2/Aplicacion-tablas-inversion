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

app.whenReady().then(createWindow);

// 📁 Obtener ruta de datos
function getPerfilesPath(){
    const userDataPath = app.getPath("userData");
    const perfilesPath = path.join(userDataPath, "perfiles");

    if (!fs.existsSync(perfilesPath)){
        fs.mkdirSync(perfilesPath);
    }

    return perfilesPath;
}

// 📌 Crear perfil
ipcMain.handle("crear-perfil", (event, nombre) => {
    const perfilesPath = getPerfilesPath();
    const filePath = path.join(perfilesPath, `${nombre}.json`);

    if (fs.existsSync(filePath)) {
        return { ok: false, error: "El perfil ya existe" };
    }

    const data = {
        nombre: nombre,
        inversiones: []
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return { ok: true };
});

// 📌 Obtener perfiles
ipcMain.handle("obtener-perfiles", () => {
    const perfilesPath = getPerfilesPath();
    const files = fs.readdirSync(perfilesPath);

    return files.map(file => file.replace(".json", ""));
});

// 📌 Cargar perfil
ipcMain.handle("cargar-perfil", (event, nombre) => {
    const perfilesPath = getPerfilesPath();
    const filePath = path.join(perfilesPath, `${nombre}.json`);
    const data = fs.readFileSync(filePath);

    return JSON.parse(data);
});

// 📌 Guardar perfil
ipcMain.handle("guardar-perfil", (event, perfil) =>{
    const perfilesPath = getPerfilesPath();
    const filePath = path.join(perfilesPath, `${perfil.nombre}.json`);

    fs.writeFileSync(filePath, JSON.stringify(perfil, null, 2));
    return{ok: true};

});