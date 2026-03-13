const btn = document.getElementById("btn");
const output = document.getElementById("output");

btn.addEventListener("click", () => {
    const version = window.api.getVersion();
    output.innerText = "Version: " + version;
})