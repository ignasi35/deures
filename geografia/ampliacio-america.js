(() => {
    const data = window.geographyExercise;
    const labels = document.querySelector("#map-labels");
    if (!data || !data.inset || !labels) {
        throw new Error("Falten les dades de l'ampliació del mapa d'Amèrica.");
    }

    const svgNamespace = "http://www.w3.org/2000/svg";
    const inset = data.inset;
    const [minX, minY, width, height] = inset.viewBox.split(/\s+/).map(Number);
    const group = document.createElementNS(svgNamespace, "g");
    const background = document.createElementNS(svgNamespace, "rect");
    const zoom = document.createElementNS(svgNamespace, "svg");
    const image = document.createElementNS(svgNamespace, "image");

    background.setAttribute("x", String(inset.x));
    background.setAttribute("y", String(inset.y));
    background.setAttribute("width", String(inset.size));
    background.setAttribute("height", String(inset.size));
    background.setAttribute("fill", "#fff");
    background.setAttribute("stroke", "#263746");
    background.setAttribute("stroke-width", "4");
    zoom.setAttribute("x", String(inset.x + 4));
    zoom.setAttribute("y", String(inset.y + 4));
    zoom.setAttribute("width", String(inset.size - 8));
    zoom.setAttribute("height", String(inset.size - 8));
    zoom.setAttribute("viewBox", inset.viewBox);
    zoom.setAttribute("preserveAspectRatio", "xMidYMid meet");
    image.setAttribute("href", "mapa.svg");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", "1000");
    image.setAttribute("height", "720");
    image.setAttribute("preserveAspectRatio", "none");
    zoom.append(image);

    const insetEntries = data.entries
        .map((entry, index) => ({entry, index}))
        .filter(({entry}) => entry.x >= minX && entry.x <= minX + width
            && entry.y >= minY && entry.y <= minY + height);

    insetEntries.forEach(({entry}) => {
        if (!entry.insetMarker) {
            return;
        }

        const connector = document.createElementNS(svgNamespace, "line");
        connector.setAttribute("x1", String(entry.x));
        connector.setAttribute("y1", String(entry.y));
        connector.setAttribute("x2", String(entry.insetMarker.x));
        connector.setAttribute("y2", String(entry.insetMarker.y));
        connector.setAttribute("stroke", "#263746");
        connector.setAttribute("stroke-width", "1.3");
        zoom.append(connector);
    });

    insetEntries.forEach(({entry, index}) => {
        const marker = document.createElementNS(svgNamespace, "g");
        const circle = document.createElementNS(svgNamespace, "circle");
        const text = document.createElementNS(svgNamespace, "text");
        const markerTitle = document.createElementNS(svgNamespace, "title");
        const number = String(index + 1);
        const position = entry.insetMarker || entry;
        const radius = 5;
        const fontSize = 7;

        circle.setAttribute("cx", String(position.x));
        circle.setAttribute("cy", String(position.y));
        circle.setAttribute("r", String(radius));
        circle.setAttribute("fill", entry.fill || "#fff");
        circle.setAttribute("stroke", "#263746");
        circle.setAttribute("stroke-width", "1.2");
        text.setAttribute("x", String(position.x));
        text.setAttribute("y", String(position.y + radius * 0.34));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("font-size", String(fontSize));
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", "#172b3a");
        text.textContent = number;
        markerTitle.textContent = `${number}: ${entry.name}`;
        marker.append(circle, text, markerTitle);
        zoom.append(marker);
    });

    group.append(background, zoom);
    labels.append(group);
    document.querySelector("#new-questions")?.addEventListener("click", () => {
        labels.append(group);
    });
})();
