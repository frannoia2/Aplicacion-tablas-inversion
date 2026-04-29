const Tabulator = window.Tabulator;
const RETRASO_GUARDADO_MS = 250;

function normalizarTextoNumerico(valor) {
    if (typeof valor !== "string") {
        return valor;
    }

    let texto = valor.trim().replace(/[\u20AC\s]/g, "");

    if (!texto) {
        return texto;
    }

    const tieneComa = texto.includes(",");
    const tienePunto = texto.includes(".");

    if (tieneComa && tienePunto) {
        if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
        } else {
            texto = texto.replace(/,/g, "");
        }
    } else if (tieneComa) {
        texto = texto.replace(",", ".");
    }

    return texto;
}

function parsearNumero(valor) {
    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : Number.NaN;
    }

    if (typeof valor === "string") {
        const texto = normalizarTextoNumerico(valor);

        if (!texto) {
            return Number.NaN;
        }

        const numero = Number(texto);
        return Number.isFinite(numero) ? numero : Number.NaN;
    }

    return Number.NaN;
}

function convertirANumero(valor) {
    const numero = parsearNumero(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function esValorNumericoValido(cell, value) {
    if (value === "" || value === null || typeof value === "undefined") {
        return true;
    }

    return Number.isFinite(parsearNumero(value));
}

function obtenerSignoOperacion(tipo) {
    return tipo === "Venta" ? -1 : 1;
}

function calcularImportesFila(data = {}) {
    const precio = convertirANumero(data.precio);
    const cantidad = convertirANumero(data.cantidad);
    const comision = convertirANumero(data.comision);
    const signo = obtenerSignoOperacion(data.tipo);
    const importeBruto = signo * precio * cantidad;
    const total = importeBruto + comision;

    return {
        importeBruto,
        comision,
        total
    };
}

function formatearImporte(valor) {
    return valor.toFixed(2);
}

function normalizarFilaInversion(data = {}) {
    const filaNormalizada = {
        ...data,
        tipo: data.tipo === "Venta" ? "Venta" : "Compra",
        precio: convertirANumero(data.precio),
        cantidad: convertirANumero(data.cantidad),
        comision: convertirANumero(data.comision)
    };

    filaNormalizada.total = calcularImportesFila(filaNormalizada).total;

    return filaNormalizada;
}

const columnasInversion = [
    {
        title: "Fecha",
        field: "fecha",
        editor: "input"
    },
    {
        title: "Activo",
        field: "activo",
        editor: "input"
    },
    {
        title: "Tipo",
        field: "tipo",
        editor: "list",
        editorParams: {
            values: [
                "Compra",
                "Venta"
            ]
        },
        mutateLink: ["total"]
    },
    {
        title: "Precio",
        field: "precio",
        editor: "input",
        validator: esValorNumericoValido,
        mutateLink: ["total"]
    },
    {
        title: "Cantidad",
        field: "cantidad",
        editor: "input",
        validator: esValorNumericoValido,
        mutateLink: ["total"]
    },
    {
        title: "Comision",
        field: "comision",
        editor: "input",
        validator: esValorNumericoValido,
        mutateLink: ["total"]
    },
    {
        title: "Total",
        field: "total",
        editable: false,
        mutator: function (value, data) {
            return calcularImportesFila(data).total;
        },
        formatter: function (cell) {
            return formatearImporte(calcularImportesFila(cell.getRow().getData()).total);
        }
    }
];

// Estado global
let perfilActual = null;
let tabla = null;
let temporizadorGuardado = null;

function obtenerDatosTablaNormalizados() {
    if (!tabla) {
        return [];
    }

    return tabla.getData().map((row) => normalizarFilaInversion(row));
}

// Cargar perfiles al iniciar
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await cargarPerfiles();
    } catch (error) {
        console.error("No se pudieron cargar los perfiles al iniciar.", error);
    }

    document.getElementById("btnCrear").addEventListener("click", crearPerfil);
    document.getElementById("btnVolver").addEventListener("click", volverHome);
    document.getElementById("btnNuevaFila").addEventListener("click", nuevaFila);
    document.getElementById("btnGuardar").addEventListener("click", guardarDatos);
});

// Obtener perfiles y mostrarlos
async function cargarPerfiles() {
    const perfiles = await window.api.obtenerPerfiles();
    const lista = document.getElementById("listaPerfiles");
    lista.innerHTML = "";

    perfiles.forEach((nombre) => {
        const li = document.createElement("li");

        li.textContent = nombre;
        li.onclick = () => seleccionarPerfil(nombre);
        lista.appendChild(li);
    });
}

// Crear perfil
async function crearPerfil() {
    const input = document.getElementById("nombrePerfil");
    const nombre = input.value.trim();

    if (!nombre) {
        return;
    }

    const result = await window.api.crearPerfil(nombre);

    if (!result.ok) {
        alert(result.error);
        return;
    }

    input.value = "";
    cargarPerfiles();
}

// Seleccionar perfil
async function seleccionarPerfil(nombre) {
    const data = await window.api.cargarPerfil(nombre);

    perfilActual = data;
    document.getElementById("tituloPerfil").textContent = `Perfil: ${nombre}`;
    mostrarVistaPerfil();

    crearTabla(perfilActual.inversiones);
    actualizarResumen();
}

// Navegacion
function mostrarVistaPerfil() {
    document.getElementById("home").classList.add("hidden");
    document.getElementById("perfil").classList.remove("hidden");
}

function volverHome() {
    cancelarGuardadoProgramado();
    document.getElementById("perfil").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
}

// Crear tabla
function crearTabla(inversiones) {
    if (!Tabulator) {
        console.error("Tabulator no esta disponible en la ventana.");
        return;
    }

    if (tabla) {
        tabla.destroy();
    }

    tabla = new Tabulator("#tabla-inversiones", {
        height: "400px",
        layout: "fitColumns",
        data: Array.isArray(inversiones) ? inversiones.map((row) => normalizarFilaInversion(row)) : [],
        columns: columnasInversion,
        dataChanged: function () {
            programarGuardado();
            actualizarResumen();
        }
    });
}

function nuevaFila() {
    if (!tabla) {
        return;
    }

    tabla.addRow({
        fecha: "",
        activo: "",
        tipo: "Compra",
        precio: 0,
        cantidad: 0,
        comision: 0
    });
}

// Guardar datos
async function guardarDatos() {
    if (!tabla || !perfilActual) {
        return;
    }

    cancelarGuardadoProgramado();

    const datosTabla = obtenerDatosTablaNormalizados();
    perfilActual.inversiones = datosTabla;

    try {
        const result = await window.api.guardarPerfil(perfilActual);

        if (!result?.ok) {
            throw new Error(result?.error || "No se pudo guardar el perfil.");
        }

        console.log("Datos guardados");
    } catch (error) {
        console.error("Error al guardar los datos del perfil.", error);
    }
}

function programarGuardado() {
    cancelarGuardadoProgramado();

    temporizadorGuardado = window.setTimeout(() => {
        temporizadorGuardado = null;
        guardarDatos();
    }, RETRASO_GUARDADO_MS);
}

function cancelarGuardadoProgramado() {
    if (temporizadorGuardado) {
        window.clearTimeout(temporizadorGuardado);
        temporizadorGuardado = null;
    }
}

// Actualizar totales
function actualizarResumen() {
    if (!tabla) {
        return;
    }

    const data = obtenerDatosTablaNormalizados();
    let totalBruto = 0;
    let totalComisiones = 0;
    let totalNeto = 0;

    data.forEach((row) => {
        const importes = calcularImportesFila(row);

        totalBruto += importes.importeBruto;
        totalComisiones += importes.comision;
        totalNeto += importes.total;
    });

    document.getElementById("totalBruto").textContent = formatearImporte(totalBruto);
    document.getElementById("totalComisiones").textContent = formatearImporte(totalComisiones);
    document.getElementById("totalNeto").textContent = formatearImporte(totalNeto);
}
