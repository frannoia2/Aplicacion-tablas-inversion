const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 1500,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(createWindow);

function getPerfilesPath() {
    const userDataPath = app.getPath("userData");
    const perfilesPath = path.join(userDataPath, "perfiles");

    fs.mkdirSync(perfilesPath, { recursive: true });

    return perfilesPath;
}

function validarNombrePerfil(nombre) {
    const nombreNormalizado = typeof nombre === "string" ? nombre.trim() : "";

    if (!nombreNormalizado) {
        return { ok: false, error: "El nombre del perfil es obligatorio" };
    }

    if (nombreNormalizado === "." || nombreNormalizado === "..") {
        return { ok: false, error: "El nombre del perfil no es valido" };
    }

    if (/[<>:"/\\|?*\u0000-\u001F]/.test(nombreNormalizado)) {
        return { ok: false, error: "El nombre del perfil contiene caracteres no permitidos" };
    }

    return { ok: true, nombre: nombreNormalizado };
}

function resolverRutaPerfil(nombre) {
    const validacion = validarNombrePerfil(nombre);

    if (!validacion.ok) {
        throw new Error(validacion.error);
    }

    return path.join(getPerfilesPath(), `${validacion.nombre}.json`);
}

ipcMain.handle("crear-perfil", (event, nombre) => {
    const validacion = validarNombrePerfil(nombre);

    if (!validacion.ok) {
        return validacion;
    }

    const filePath = resolverRutaPerfil(validacion.nombre);

    if (fs.existsSync(filePath)) {
        return { ok: false, error: "El perfil ya existe" };
    }

    const data = {
        nombre: validacion.nombre,
        inversiones: []
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return { ok: true };
});

ipcMain.handle("obtener-perfiles", () => {
    const perfilesPath = getPerfilesPath();
    const files = fs.readdirSync(perfilesPath);

    return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
});

ipcMain.handle("cargar-perfil", (event, nombre) => {
    const filePath = resolverRutaPerfil(nombre);
    const data = fs.readFileSync(filePath);

    return JSON.parse(data);
});

ipcMain.handle("guardar-perfil", (event, perfil) => {
    const filePath = resolverRutaPerfil(perfil?.nombre);

    fs.writeFileSync(filePath, JSON.stringify(perfil, null, 2));
    return { ok: true };
});
