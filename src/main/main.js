const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

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

    if (nombreNormalizado.endsWith(".")) {
        return { ok: false, error: "El nombre del perfil no puede terminar en punto" };
    }

    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(nombreNormalizado)) {
        return { ok: false, error: "El nombre del perfil esta reservado por Windows" };
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

function normalizarPerfil(perfil) {
    if (!perfil || typeof perfil !== "object") {
        throw new Error("El perfil no es valido");
    }

    const validacion = validarNombrePerfil(perfil.nombre);

    if (!validacion.ok) {
        throw new Error(validacion.error);
    }

    return {
        ...perfil,
        nombre: validacion.nombre,
        inversiones: Array.isArray(perfil.inversiones) ? perfil.inversiones : []
    };
}

function leerPerfil(nombre) {
    const filePath = resolverRutaPerfil(nombre);

    if (!fs.existsSync(filePath)) {
        throw new Error("El perfil no existe");
    }

    const data = fs.readFileSync(filePath, "utf8");
    return normalizarPerfil(JSON.parse(data));
}

function manejarError(error, mensaje) {
    return {
        ok: false,
        error: error instanceof Error ? error.message : mensaje
    };
}

ipcMain.handle("crear-perfil", (event, nombre) => {
    try {
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
    } catch (error) {
        return manejarError(error, "No se pudo crear el perfil");
    }
});

ipcMain.handle("obtener-perfiles", () => {
    try {
        const perfilesPath = getPerfilesPath();
        const files = fs.readdirSync(perfilesPath);

        return {
            ok: true,
            perfiles: files
                .filter((file) => file.endsWith(".json"))
                .map((file) => file.replace(/\.json$/i, ""))
                .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        };
    } catch (error) {
        return manejarError(error, "No se pudieron obtener los perfiles");
    }
});

ipcMain.handle("cargar-perfil", (event, nombre) => {
    try {
        return { ok: true, perfil: leerPerfil(nombre) };
    } catch (error) {
        return manejarError(error, "No se pudo cargar el perfil");
    }
});

ipcMain.handle("guardar-perfil", (event, perfil) => {
    try {
        const perfilNormalizado = normalizarPerfil(perfil);
        const filePath = resolverRutaPerfil(perfilNormalizado.nombre);

        fs.writeFileSync(filePath, JSON.stringify(perfilNormalizado, null, 2));
        return { ok: true };
    } catch (error) {
        return manejarError(error, "No se pudo guardar el perfil");
    }
});

ipcMain.on("guardar-perfil-sync", (event, perfil) => {
    try {
        const perfilNormalizado = normalizarPerfil(perfil);
        const filePath = resolverRutaPerfil(perfilNormalizado.nombre);

        fs.writeFileSync(filePath, JSON.stringify(perfilNormalizado, null, 2));
        event.returnValue = { ok: true };
    } catch (error) {
        event.returnValue = manejarError(error, "No se pudo guardar el perfil");
    }
});

ipcMain.handle("generar-pdf", async (event, nombrePerfil) => {
    try {
        const ventanaActual = BrowserWindow.fromWebContents(event.sender);

        if (!ventanaActual) {
            return { ok: false, error: "No se encontro una ventana activa para exportar el PDF." };
        }

        const nombreBase = typeof nombrePerfil === "string" && nombrePerfil.trim()
            ? `datos_${nombrePerfil.trim()}.pdf`
            : "datos_perfil.pdf";

        const { canceled, filePath } = await dialog.showSaveDialog(ventanaActual, {
            title: "Guardar PDF",
            defaultPath: nombreBase,
            filters: [
                { name: "PDF", extensions: ["pdf"] }
            ]
        });

        if (canceled || !filePath) {
            return { ok: false, canceled: true };
        }

        const pdf = await ventanaActual.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            landscape: false,
            margins: {
                marginType: "custom",
                left: 0.2,
                right: 0.2
            }
        });

        fs.writeFileSync(filePath, pdf);
        return { ok: true, filePath };
    } catch (error) {
        return manejarError(error, "No se pudo generar el PDF");
    }
});
