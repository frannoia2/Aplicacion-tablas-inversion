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

function formatearFecha(valor) {
    if (typeof valor !== "string") {
        return valor;
    }

    const texto = valor.trim();
    const matchCompacto = texto.match(/^(\d{2})(\d{2})(\d{4})$/);

    if (!matchCompacto) {
        return texto;
    }

    const [, day, month, year] = matchCompacto;
    return `${day}/${month}/${year}`;
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

    const texto = formatearFecha(value);
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

function calcularImportesFila(data = {}) {
    const precioCompra = convertirANumero(data.precio_c);
    const numeroAcciones = convertirANumero(data.n_acc);
    const precioVenta = convertirANumero(data.precio_v);
    const dividendos = convertirANumero(data.dividendos);
    const precioAccion = numeroAcciones > 0 ? precioCompra / numeroAcciones : 0;
    const totalInvertido = precioVenta > 0 ? 0 : precioCompra;
    const beneficios = precioVenta > 0 ? precioVenta - precioCompra : 0;
    const total = beneficios + dividendos;

    return {
        precioAccion,
        totalInvertido,
        dividendos,
        beneficios,
        total
    };
}

function formatearImporte(valor) {
    return valor.toFixed(2);
}

function formatearEuros(valor) {
    return `${formatearImporte(convertirANumero(valor))} €`;
}

function calcularPorcentajeBalance(data = {}) {
    const precioCompra = convertirANumero(data.precio_c);

    if (precioCompra <= 0) {
        return null;
    }

    return (calcularImportesFila(data).total / precioCompra) * 100;
}

function formatearPorcentaje(valor) {
    const signo = valor > 0 ? "+" : "";
    return `${signo}${valor.toFixed(2)} %`;
}

function formatearBalanceTotal(data = {}) {
    const importes = calcularImportesFila(data);
    const porcentaje = calcularPorcentajeBalance(data);
    const porcentajeTexto = porcentaje === null ? "N/D" : formatearPorcentaje(porcentaje);

    return `${formatearEuros(importes.total)} (${porcentajeTexto})`;
}

function formatearCeldaEuros(cell) {
    return formatearEuros(cell.getValue());
}

function formatearCeldaFechaEditada(cell) {
    const valorActual = cell.getValue();
    const valorFormateado = formatearFecha(valorActual);

    if (valorFormateado !== valorActual) {
        cell.setValue(valorFormateado);
    }
}

function obtenerClaseColorFila(data = {}) {
    const balanceTotal = calcularImportesFila(data).total;

    if (balanceTotal > 0) {
        return "fila-balance-positivo";
    }

    if (balanceTotal < 0) {
        return "fila-balance-negativo";
    }

    return "fila-balance-neutro";
}

function aplicarColorFila(row) {
    const elemento = row.getElement();

    elemento.classList.remove(
        "fila-balance-positivo",
        "fila-balance-negativo",
        "fila-balance-neutro"
    );
    elemento.classList.add(obtenerClaseColorFila(row.getData()));
}

function actualizarColoresFilas() {
    if (!tabla) {
        return;
    }

    tabla.getRows().forEach(aplicarColorFila);
}

function normalizarFilaInversion(data = {}) {
    const precioCompra = typeof data.precio_c !== "undefined"
        ? data.precio_c
        : convertirANumero(data.precio) * convertirANumero(data.cantidad);

    const filaNormalizada = {
        fecha_c: formatearFecha(data.fecha_c || data.fecha || ""),
        acc: data.acc || data.activo || "",
        n_acc: convertirANumero(data.n_acc ?? data.cantidad),
        precio_c: convertirANumero(precioCompra),
        prec_acc: 0,
        stop: convertirANumero(data.stop),
        fecha_v: formatearFecha(data.fecha_v || ""),
        precio_v: convertirANumero(data.precio_v),
        dividendos: convertirANumero(data.dividendos)
    };

    filaNormalizada.prec_acc = calcularImportesFila(filaNormalizada).precioAccion;
    filaNormalizada.total = calcularImportesFila(filaNormalizada).total;

    return filaNormalizada;
}

const columnasInversion = [
    {
        title: "Fecha compra",
        field: "fecha_c",
        editor: "input",
        validator: esFechaValida,
        cellEdited: formatearCeldaFechaEditada
    },
    {
        title: "Acción",
        field: "acc",
        editor: "input"
    },
    {
        title: "Nº Acciones",
        field: "n_acc",
        editor: "input",
        validator: esValorNumericoValido,
        mutateLink: ["prec_acc", "total"]
    },
    {
        title: "Precio compra",
        field: "precio_c",
        editor: "input",
        validator: esValorNumericoValido,
        formatter: formatearCeldaEuros,
        mutateLink: ["prec_acc", "total"]
    },
    {
        title: "Precio/acc",
        field: "prec_acc",
        editable: false,
        mutator: function (value, data) {
            return calcularImportesFila(data).precioAccion;
        },
        formatter: function (cell) {
            return formatearEuros(calcularImportesFila(cell.getRow().getData()).precioAccion);
        }
    },
    {
        title: "Stop-loss",
        field: "stop",
        editor: "input",
        validator: esValorNumericoValido,
        formatter: formatearCeldaEuros
    },
    {
        title: "Fecha venta",
        field: "fecha_v",
        editor: "input",
        validator: esFechaValida,
        cellEdited: formatearCeldaFechaEditada
    },
    {
        title: "Precio venta",
        field: "precio_v",
        editor: "input",
        validator: esValorNumericoValido,
        formatter: formatearCeldaEuros,
        mutateLink: ["total"]
    },
    {
        title: "Dividendos",
        field: "dividendos",
        editor: "input",
        validator: esValorNumericoValido,
        formatter: formatearCeldaEuros,
        mutateLink: ["total"]
    },
    {
        title: "Balance total",
        field: "total",
        editable: false,
        mutator: function (value, data) {
            return calcularImportesFila(data).total;
        },
        formatter: function (cell) {
            return formatearBalanceTotal(cell.getRow().getData());
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
    document.getElementById("btnBorrarFila").addEventListener("click", borrarFilasSeleccionadas);
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
        selectableRows: "highlight",
        rowHeader: {
            formatter: "rowSelection",
            titleFormatter: "rowSelection",
            hozAlign: "center",
            headerHozAlign: "center",
            headerSort: false,
            width: 44
        },
        data: Array.isArray(inversiones) ? inversiones.map((row) => normalizarFilaInversion(row)) : [],
        columns: columnasInversion,
        rowFormatter: aplicarColorFila,
        dataChanged: function () {
            mostrarEstadoGuardado("Guardando...");
            programarGuardado();
            actualizarResumen();
            actualizarColoresFilas();
        }
    });
}

async function borrarFilasSeleccionadas() {
    if (!tabla) {
        return;
    }

    const filasSeleccionadas = tabla.getSelectedRows();

    if (!filasSeleccionadas.length) {
        alert("Selecciona una o varias filas para borrar.");
        return;
    }

    try {
        await Promise.all(filasSeleccionadas.map((fila) => fila.delete()));
        actualizarResumen();
        mostrarEstadoGuardado("Guardando...");
        programarGuardado();
    } catch (error) {
        console.error("Error al borrar filas seleccionadas.", error);
        alert("No se pudieron borrar las filas seleccionadas.");
    }
}

function nuevaFila() {
    if (!tabla) {
        return;
    }

    tabla.addRow({
        fecha_c: "",
        acc: "",
        n_acc: 0,
        precio_c: 0,
        prec_acc: 0,
        stop: 0,
        fecha_v: "",
        precio_v: 0,
        dividendos: 0,
        total: 0
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
    let totalInvertido = 0;
    let totalDividendos = 0;
    let totalBeneficios = 0;
    let totalFinal = 0;

    data.forEach((row) => {
        const importes = calcularImportesFila(row);

        totalInvertido += importes.totalInvertido;
        totalDividendos += importes.dividendos;
        totalBeneficios += importes.beneficios;
        totalFinal += importes.totalInvertido + importes.total;
    });

    document.getElementById("totalInvertido").textContent = formatearImporte(totalInvertido);
    document.getElementById("totalDividendos").textContent = formatearImporte(totalDividendos);
    document.getElementById("totalBeneficios").textContent = formatearImporte(totalBeneficios);
    document.getElementById("totalFinal").textContent = formatearImporte(totalFinal);
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
        ["fecha_c", "Fecha compra", "col-pdf-ajustada"],
        ["acc", "Acción"],
        ["n_acc", "Nº Acciones"],
        ["precio_c", "Precio compra", "col-pdf-ajustada"],
        ["prec_acc", "Precio/acc", "col-pdf-ajustada"],
        ["stop", "Stop-loss", "col-pdf-ajustada"],
        ["fecha_v", "Fecha venta", "col-pdf-ajustada"],
        ["precio_v", "Precio venta", "col-pdf-ajustada"],
        ["dividendos", "Dividendos", "col-pdf-ajustada"],
        ["total", "Balance total", "col-pdf-balance"]
    ];
    columnas.forEach((columna) => {
        if (columna[0] === "acc") {
            columna[2] = "col-pdf-flexible";
        }

        if (columna[0] === "n_acc") {
            columna[2] = "col-pdf-ajustada";
        }
    });

    const camposEuro = ["precio_c", "prec_acc", "stop", "precio_v", "dividendos", "total"];

    tablaPDF = document.createElement("table");
    tablaPDF.className = "tabla-pdf";

    const colgroup = document.createElement("colgroup");

    columnas.forEach(([, , clase]) => {
        const col = document.createElement("col");

        if (clase) {
            col.className = clase;
        }

        colgroup.appendChild(col);
    });

    tablaPDF.appendChild(colgroup);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    columnas.forEach(([, titulo, clase]) => {
        const th = crearCeldaTexto("th", titulo);

        if (clase) {
            th.classList.add(clase);
        }

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    tablaPDF.appendChild(thead);

    const tbody = document.createElement("tbody");

    datos.forEach((row) => {
        const tr = document.createElement("tr");

        tr.classList.add(obtenerClaseColorFila(row));

        columnas.forEach(([campo, , clase]) => {
            const valor = campo === "total"
                ? formatearBalanceTotal(row)
                : camposEuro.includes(campo)
                ? formatearEuros(row[campo])
                : row[campo] || "";

            const td = crearCeldaTexto("td", valor);

            if (clase) {
                td.classList.add(clase);
            }

            tr.appendChild(td);
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
