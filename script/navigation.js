  
  document.getElementById("nav-resources").onclick = function () {
    document.getElementById("resource-list").scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
  };


  document.getElementById("nav-reserved").onclick = function () {
    document.getElementById("reserved-resources-container").scrollIntoView({
        behavior: 'smooth',
        block: 'start',
    })};

   
  document.getElementById("nav-create").onclick = function () {
    document.getElementById("create-resource-form").scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });}

  document.getElementById("nav-history").onclick = function () {
    document.getElementById("toggle-history").scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });}
    document.getElementById("toggle-history").onclick = function () {
    const historyTable = document.getElementById("history-section");
    if (historyTable.style.display === "none") {
        historyTable.style.display = "block";
        fetchHistory(); // Isso garante que o histórico seja carregado quando o usuário clicar para mostrar.
        this.textContent = "Ocultar Histórico";
    } else {
        historyTable.style.display = "none";
        this.textContent = "Mostrar Histórico";
    }
};