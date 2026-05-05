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

function esFechaValida(cell, value) {
    if (value === "" || value === null || typeof value === "undefined") {
        return true;
    }

    if (typeof value !== "string") {
        return false;
    }

    const texto = value.trim();
    const matchISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const matchES = texto.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);

    if (!matchISO && !matchES) {
        return false;
    }

    const [, primer, segundo, tercero] = matchISO || matchES;
    const year = matchISO ? Number(primer) : Number(tercero);
    const month = Number(segundo);
    const day = matchISO ? Number(tercero) : Number(primer);
    const fecha = new Date(year, month - 1, day);

    return fecha.getFullYear() === year
        && fecha.getMonth() === month - 1
        && fecha.getDate() === day;
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
        editor: "input",
        validator: esFechaValida
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
        title: "Comisión",
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
let tablaPDF = null;

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
    document.getElementById("btnPDF").addEventListener("click", exportarPDF);
    window.addEventListener("beforeunload", guardarAntesDeCerrar);
});

// Obtener perfiles y mostrarlos
async function cargarPerfiles() {
    const result = await window.api.obtenerPerfiles();

    if (!result?.ok) {
        throw new Error(result?.error || "No se pudieron obtener los perfiles.");
    }

    const perfiles = result.perfiles;
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

    try {
        const result = await window.api.crearPerfil(nombre);

        if (!result.ok) {
            alert(result.error);
            return;
        }

        input.value = "";
        await cargarPerfiles();
    } catch (error) {
        console.error("Error al crear el perfil.", error);
        alert("No se pudo crear el perfil.");
    }
}

// Seleccionar perfil
async function seleccionarPerfil(nombre) {
    try {
        const result = await window.api.cargarPerfil(nombre);

        if (!result?.ok) {
            throw new Error(result?.error || "No se pudo cargar el perfil.");
        }

        perfilActual = result.perfil;
        document.getElementById("tituloPerfil").textContent = `Perfil: ${perfilActual.nombre}`;
        mostrarVistaPerfil();

        crearTabla(perfilActual.inversiones);
        actualizarResumen();
        mostrarEstadoGuardado("");
    } catch (error) {
        console.error("Error al cargar el perfil.", error);
        alert(error.message || "No se pudo cargar el perfil.");
    }
}

// Navegacion
function mostrarVistaPerfil() {
    document.getElementById("home").classList.add("hidden");
    document.getElementById("perfil").classList.remove("hidden");
}

async function volverHome() {
    cancelarGuardadoProgramado();
    await guardarDatos({ silencioso: true });
    restaurarVistaPDF();
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
            mostrarEstadoGuardado("Guardando...");
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
async function guardarDatos(options) {
    const silencioso = Boolean(options?.silencioso);

    if (!tabla || !perfilActual) {
        return true;
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
        mostrarEstadoGuardado("Guardado");
        return true;
    } catch (error) {
        console.error("Error al guardar los datos del perfil.", error);
        mostrarEstadoGuardado("Error al guardar");

        if (!silencioso) {
            alert(error.message || "No se pudieron guardar los datos.");
        }

        return false;
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

function mostrarEstadoGuardado(texto) {
    const estado = document.getElementById("estadoGuardado");

    if (estado) {
        estado.textContent = texto;
    }
}

function crearCeldaTexto(tag, texto) {
    const celda = document.createElement(tag);
    celda.textContent = texto;
    return celda;
}

function prepararVistaPDF() {
    restaurarVistaPDF();

    if (!tabla) {
        return;
    }

    const contenedorTabla = document.getElementById("tabla-inversiones");
    const datos = obtenerDatosTablaNormalizados();
    const columnas = [
        ["fecha", "Fecha"],
        ["activo", "Activo"],
        ["tipo", "Tipo"],
        ["precio", "Precio"],
        ["cantidad", "Cantidad"],
        ["comision", "Comisión"],
        ["total", "Total"]
    ];

    tablaPDF = document.createElement("table");
    tablaPDF.className = "tabla-pdf";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    columnas.forEach(([, titulo]) => {
        headerRow.appendChild(crearCeldaTexto("th", titulo));
    });

    thead.appendChild(headerRow);
    tablaPDF.appendChild(thead);

    const tbody = document.createElement("tbody");

    datos.forEach((row) => {
        const tr = document.createElement("tr");

        columnas.forEach(([campo]) => {
            const valor = ["precio", "cantidad", "comision", "total"].includes(campo)
                ? formatearImporte(convertirANumero(row[campo]))
                : row[campo] || "";

            tr.appendChild(crearCeldaTexto("td", valor));
        });

        tbody.appendChild(tr);
    });

    tablaPDF.appendChild(tbody);
    contenedorTabla.classList.add("preparando-pdf");
    contenedorTabla.parentNode.insertBefore(tablaPDF, contenedorTabla.nextSibling);
}

function restaurarVistaPDF() {
    const contenedorTabla = document.getElementById("tabla-inversiones");

    if (tablaPDF) {
        tablaPDF.remove();
        tablaPDF = null;
    }

    if (contenedorTabla) {
        contenedorTabla.classList.remove("preparando-pdf");
    }
}

function esperarRenderizado() {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
        });
    });
}

function guardarAntesDeCerrar() {
    if (!tabla || !perfilActual) {
        return;
    }

    cancelarGuardadoProgramado();

    try {
        perfilActual.inversiones = obtenerDatosTablaNormalizados();
        const result = window.api.guardarPerfilSync(perfilActual);

        if (!result?.ok) {
            console.error("No se pudo guardar el perfil al cerrar.", result?.error);
        }
    } catch (error) {
        console.error("Error al guardar el perfil al cerrar.", error);
    }
}

// Exportar PDF
async function exportarPDF() {
    try {
        const guardado = await guardarDatos({ silencioso: true });

        if (!guardado) {
            alert("No se generó el PDF porque no se pudieron guardar los datos.");
            return;
        }

        prepararVistaPDF();
        await esperarRenderizado();

        const result = await window.api.generarPDF(perfilActual?.nombre);

        if (result?.ok) {
            alert("PDF generado correctamente");
            return;
        }

        if (!result?.canceled) {
            alert(result?.error || "No se pudo generar el PDF.");
        }
    } catch (error) {
        console.error("Error al exportar el PDF.", error);
        alert("Ocurrió un error al generar el PDF.");
    } finally {
        restaurarVistaPDF();
    }
}
