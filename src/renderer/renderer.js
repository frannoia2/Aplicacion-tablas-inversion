const Tabulator = window.Tabulator;
const columnasInversion=[
            {
                title:"Fecha",
                field:"fecha",
                editor:"input"
            },
            {
                title:"Activo",
                field:"activo",
                editor:"input"
            },
            {
                title:"Tipo",
                field:"tipo",
                editor:"list",
                editorParams:{
                    values:[
                        "Compra",
                        "Venta"
                    ]
                }
            },
            {
                title:"Precio",
                field:"precio",
                editor:"input",
                validator:"numeric"
            },
            {
                title:"Cantidad",
                field:"cantidad",
                editor:"input",
                validator:"numeric"
            },
            {
                title:"Comisión",
                field:"comision",
                editor:"input",
                validator:"numeric"
            },
            {
                title:"Total",
                field:"total",
                mutator:function(value,data){
                    return (data.precio*data.cantidad)+data.comision; 
                }
            }
        ];

// Estado global
let perfilActual = null;
let tabla = null;

// 📌 Cargar perfiles al iniciar
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarPerfiles();
  } catch (error) {
    console.error("No se pudieron cargar los perfiles al iniciar.", error);
  }

  document.getElementById("btnCrear").addEventListener("click", crearPerfil);
  document.getElementById("btnVolver").addEventListener("click", volverHome);
  document.getElementById("btnNuevaFila").addEventListener("click", nuevaFila);
});

// 📌 Obtener perfiles y mostrarlos
async function cargarPerfiles() {
    const perfiles = await window.api.obtenerPerfiles();
    const lista = document.getElementById("listaPerfiles");
    lista.innerHTML = "";

    perfiles.forEach(nombre => {
        const li = document.createElement("li");
        
        li.textContent = nombre;
        li.onclick = () => seleccionarPerfil(nombre);
        lista.appendChild(li);
    });
}

// 📌 Crear perfil
async function crearPerfil() {
    const input = document.getElementById("nombrePerfil");
    const nombre = input.value.trim();

    if (!nombre) return;
    const result = await window.api.crearPerfil(nombre);

    if (!result.ok) {
        alert(result.error);
        return;
    }

    input.value = "";
    cargarPerfiles();
}

// 📌 Seleccionar perfil
async function seleccionarPerfil(nombre) {
    const data = await window.api.cargarPerfil(nombre);

    perfilActual = data;
    document.getElementById("tituloPerfil").textContent = `Perfil: ${nombre}`;
    mostrarVistaPerfil();

    crearTabla(perfilActual.inversiones);
}

// 📌 Navegación
function mostrarVistaPerfil() {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("perfil").classList.remove("hidden");
}

function volverHome() {
  document.getElementById("perfil").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
}

// 📌 Crear tabla
function crearTabla(inversiones){
    if (!Tabulator) {
        console.error("Tabulator no esta disponible en la ventana.");
        return;
    }

    if(tabla){
        tabla.destroy();
    }

    tabla = new Tabulator("#tabla-inversiones", {
        height:"400px",
        layout:"fitColumns",
        data: inversiones,
        columns:columnasInversion
    });
}

function nuevaFila(){
    if (!tabla) {
        return;
    }

    tabla.addRow({
        fecha:"",
        activo:"",
        tipo:"Compra",
        precio:0,
        cantidad:0,
        comision:0
    });
}
