(() => {
    const data = window.geographyExercise;
    if (!data || !Array.isArray(data.entries) || !data.entries.length) {
        throw new Error("Falten les dades de l'exercici geogràfic.");
    }
    if (typeof data.letterInstructions !== "string") {
        throw new Error("Falten les instruccions del mode de lletres.");
    }

    const fields = ["name", "capital", "number"];
    const fieldLabels = {
        name: data.nameLabel || "Nom",
        capital: "Capital",
        number: "Número"
    };
    const worksheet = document.querySelector(".worksheet");
    const map = document.querySelector("#exercise-map");
    const labels = document.querySelector("#map-labels");
    const questions = document.querySelector("#questions");
    const title = document.querySelector("#quiz-title");
    const instructions = document.querySelector("#quiz-instructions");
    const questionHeadings = document.querySelector("#question-headings");
    const svgNamespace = "http://www.w3.org/2000/svg";
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const exerciseCount = Math.min(18, data.entries.length);

    map.alt = data.mapAlt;
    labels.setAttribute("viewBox", data.viewBox);

    function shuffle(items) {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
        }
        return items;
    }

    function createMarker(entry, label) {
        const marker = document.createElementNS(svgNamespace, "g");
        const circle = document.createElementNS(svgNamespace, "circle");
        const text = document.createElementNS(svgNamespace, "text");
        const markerTitle = document.createElementNS(svgNamespace, "title");
        const markerRadius = data.markerRadius || 13;
        const position = entry.markerPosition || entry.insetMarker || entry;

        circle.setAttribute("cx", String(position.x));
        circle.setAttribute("cy", String(position.y));
        circle.setAttribute("r", String(markerRadius));
        circle.setAttribute("fill", entry.fill || "#fff");
        circle.setAttribute("stroke", "#263746");
        circle.setAttribute("stroke-width", "1.2");
        text.setAttribute("x", String(position.x));
        text.setAttribute("y", String(position.y + markerRadius * 0.34));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("font-size", String(data.markerFontSize || 12));
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", "#172b3a");
        text.textContent = label;
        markerTitle.textContent = `${label}: ${entry.name}`;
        marker.append(circle, text, markerTitle);
        labels.append(marker);
    }

    function createConnector(entry) {
        const position = entry.markerPosition || entry.insetMarker;
        if (!position) {
            return;
        }

        const connector = document.createElementNS(svgNamespace, "line");
        connector.setAttribute("x1", String(entry.x));
        connector.setAttribute("y1", String(entry.y));
        connector.setAttribute("x2", String(position.x));
        connector.setAttribute("y2", String(position.y));
        connector.setAttribute("stroke", "#263746");
        connector.setAttribute("stroke-width", "1.3");
        labels.append(connector);
    }

    function createClueQuestions() {
        worksheet.dataset.mode = "clues";
        const promptField = fields[Math.floor(Math.random() * fields.length)];
        const prompts = shuffle([...data.entries]).slice(0, exerciseCount);
        const clueDescription = {
            name: "del nom",
            capital: "de la capital",
            number: "del número"
        };

        labels.replaceChildren();
        data.entries.forEach(createConnector);
        data.entries.forEach((entry, index) => createMarker(entry, String(index + 1)));
        title.textContent = `A partir ${clueDescription[promptField]}, completa les altres dades`;
        instructions.textContent = "Cada fila mostra una dada. Escriu les altres dues.";
        questionHeadings.replaceChildren();
        questionHeadings.classList.remove("letter-mode");
        questions.replaceChildren();

        fields.forEach((field) => {
            const heading = document.createElement("span");
            heading.textContent = fieldLabels[field];
            questionHeadings.append(heading);
        });

        prompts.forEach((entry) => {
            const question = document.createElement("li");
            fields.forEach((field) => {
                if (field === promptField) {
                    const prompt = document.createElement("span");
                    prompt.textContent = field === "number"
                        ? String(data.entries.indexOf(entry) + 1)
                        : entry[field];
                    question.append(prompt);
                } else {
                    const answer = document.createElement("span");
                    answer.className = "answer-space";
                    answer.setAttribute("aria-label", fieldLabels[field]);
                    question.append(answer);
                }
            });
            questions.append(question);
        });
    }

    function createLetterQuestions() {
        const prompts = shuffle([...data.entries]).slice(0, exerciseCount);
        worksheet.dataset.mode = "letters";
        title.textContent = `Escriu el nom de cada ${data.itemLabel} i la seva capital`;
        instructions.textContent = data.letterInstructions.replace("{count}", String(prompts.length));
        labels.replaceChildren();
        questionHeadings.replaceChildren();
        questionHeadings.classList.add("letter-mode");
        questions.replaceChildren();
        prompts.forEach(createConnector);

        [".", fieldLabels.name, fieldLabels.capital].forEach((label) => {
            const heading = document.createElement("span");
            heading.textContent = label;
            questionHeadings.append(heading);
        });

        prompts.forEach((entry, index) => {
            createMarker(entry, letters[index]);
            const question = document.createElement("li");
            const letter = document.createElement("span");
            letter.textContent = letters[index];
            question.classList.add("letter-mode");
            question.append(letter);

            ["name", "capital"].forEach((field) => {
                const answer = document.createElement("span");
                answer.className = "answer-space";
                answer.setAttribute("aria-label", fieldLabels[field]);
                question.append(answer);
            });
            questions.append(question);
        });
    }

    function createQuestions() {
        if (Math.random() < 0.5) {
            createLetterQuestions();
        } else {
            createClueQuestions();
        }
    }

    document.querySelector("#new-questions").addEventListener("click", createQuestions);
    document.querySelector("#print-worksheet").addEventListener("click", () => window.print());
    createQuestions();
})();
