(() => {
    const data = window.geographyExercise;
    if (!data || !Array.isArray(data.entries) || !data.entries.length) {
        throw new Error("Falten les dades de l'exercici geogràfic.");
    }

    const list = document.querySelector("#country-list");
    data.entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        [index + 1, entry.name, entry.capital].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.append(cell);
        });
        list.append(row);
    });

    document.querySelector("#print-list").addEventListener("click", () => window.print());
})();
