(() => {
    const data = window.geographyExercise;
    const labels = document.querySelector("#map-labels");
    const map = document.querySelector("#exercise-map");
    if (!data || !Array.isArray(data.entries) || !data.entries.length || !labels || !map) {
        throw new Error("Falten les dades o els elements del mapa geogràfic.");
    }

    const svgNamespace = "http://www.w3.org/2000/svg";
    labels.setAttribute("viewBox", data.viewBox);
    map.alt = data.mapAlt;

    data.entries.forEach((entry) => {
        const position = entry.markerPosition || entry.insetMarker || entry;
        if (position === entry) {
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
    });

    data.entries.forEach((entry, index) => {
        const marker = document.createElementNS(svgNamespace, "g");
        const circle = document.createElementNS(svgNamespace, "circle");
        const text = document.createElementNS(svgNamespace, "text");
        const title = document.createElementNS(svgNamespace, "title");
        const number = String(index + 1);
        const position = entry.markerPosition || entry.insetMarker || entry;
        const radius = data.markerRadius || 13;

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
        text.setAttribute("font-size", String(data.markerFontSize || 12));
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", "#172b3a");
        text.textContent = number;
        title.textContent = `${number}: ${entry.name}`;
        marker.append(circle, text, title);
        labels.append(marker);
    });
})();
