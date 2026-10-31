const {test, expect} = require("@playwright/test");

test("comarques: exercise and reference pages contain all 43 counties", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/comarques-catalunya/index.html");

    await expect.poll(() => page.locator("#exercise-map").evaluate(
        image => image.complete && image.naturalWidth > 0
    )).toBe(true);
    await expect(page.locator(".worksheet")).toHaveAttribute("data-mode", "letters");
    await expect(page.locator("#questions > li")).toHaveCount(18);
    await expect(page.locator("#map-labels > g > circle")).toHaveCount(18);
    await expect(page.locator('a[href="llistat.html"]')).toHaveCount(1);
    await expect(page.locator('a[href="mapa.html"]')).toHaveCount(1);

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-questions").click();
    await expect(page.locator(".worksheet")).toHaveAttribute("data-mode", "clues");
    await expect(page.locator("#questions > li")).toHaveCount(18);
    await expect(page.locator("#map-labels > g > circle")).toHaveCount(43);
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);

    await page.goto("/comarques-catalunya/llistat.html");
    const counties = await page.evaluate(() =>
        window.geographyExercise.entries.map(({name, capital}) => [name, capital])
    );
    expect(counties).toHaveLength(43);
    await expect(page.locator("#comarca-list tr")).toHaveCount(43);
    const rows = await page.locator("#comarca-list tr").all();
    const displayedRows = await Promise.all(rows.map(async row => (
        await row.locator("td").allInnerTexts()
    )));
    expect(displayedRows).toEqual(counties.map(([name, capital], index) => [
        String(index + 1),
        name,
        capital,
    ]));
    await expect.poll(() => page.locator(".map").evaluate(
        image => image.complete && image.naturalWidth > 0
    )).toBe(true);
    await page.locator("#print-list").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);

    await page.goto("/comarques-catalunya/mapa.html");
    await expect.poll(() => page.locator(".map").evaluate(
        image => image.complete && image.naturalWidth > 0
    )).toBe(true);
    await expect(page.locator(".map")).toHaveAttribute(
        "alt",
        "Mapa de Catalunya amb els límits de les 43 comarques, cadascuna identificada amb un número."
    );
    await page.locator("#print-map").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});

test("multiplication table: generates 40 distinct facts from 1 to 9", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/taules-multiplicar/");

    await expect(page.locator('a[href="multiplicacions-grans.html"]')).toHaveCount(1);
    const readFacts = async () => page.locator("#exercises li").evaluateAll(items =>
        items.map(item => item.querySelector("span").textContent.match(/\d+/g).map(Number))
    );
    const firstWorksheet = await readFacts();
    expect(firstWorksheet).toHaveLength(40);
    expect(new Set(firstWorksheet.map(fact => fact.join("x"))).size).toBe(40);
    await expect(page.locator("#exercises .answer-space")).toHaveCount(40);
    await expect(page.locator("#exercises .answer-space").first()).toBeEmpty();
    for (const [first, second] of firstWorksheet) {
        expect(first).toBeGreaterThanOrEqual(1);
        expect(first).toBeLessThanOrEqual(9);
        expect(second).toBeGreaterThanOrEqual(1);
        expect(second).toBeLessThanOrEqual(9);
    }

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-worksheet").click();
    const secondWorksheet = await readFacts();
    expect(secondWorksheet).toHaveLength(40);
    expect(new Set(secondWorksheet.map(fact => fact.join("x"))).size).toBe(40);
    expect(secondWorksheet).not.toEqual(firstWorksheet);
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});

test("multi-digit multiplication: generates ten two- or three-digit problems", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/taules-multiplicar/multiplicacions-grans.html");

    const readProblems = async () => page.locator("#exercises li").evaluateAll(items =>
        items.map(item => [...item.querySelectorAll(".factor")].map(factor => factor.textContent))
    );
    const isValidWorksheet = problems => {
        expect(problems).toHaveLength(10);
        for (const factors of problems) {
            expect(factors).toHaveLength(2);
            for (const factor of factors) {
                expect([2, 3]).toContain(factor.length);
                expect(Number(factor)).toBeGreaterThanOrEqual(
                    factor.length === 2 ? 10 : 100
                );
                expect(Number(factor)).toBeLessThanOrEqual(999);
            }
        }
    };

    const firstWorksheet = await readProblems();
    isValidWorksheet(firstWorksheet);
    expect(firstWorksheet.flat().every(factor => factor.length === 2)).toBe(true);
    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-worksheet").click();
    const secondWorksheet = await readProblems();
    isValidWorksheet(secondWorksheet);
    expect(secondWorksheet.flat().every(factor => factor.length === 3)).toBe(true);
    expect(secondWorksheet).not.toEqual(firstWorksheet);
    await expect(page.locator("#exercises .answer-space")).toHaveCount(10);
    await expect(page.locator("#exercises .answer-space").first()).toBeEmpty();
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});

test("handwriting: displays four sentences, practice lines, and selectable fonts", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/caligrafia/");

    const sentences = page.locator("#sentences > li");
    await expect(sentences).toHaveCount(4);
    const corpus = await page.evaluate(() => sentenceCorpus);
    const firstWorksheet = [];
    for (const sentence of await sentences.all()) {
        await expect(sentence.locator(".sentence")).not.toBeEmpty();
        await expect(sentence.locator(".practice-lines > span")).toHaveCount(5);
        firstWorksheet.push(await sentence.locator(".sentence").innerText());
    }
    expect(new Set(firstWorksheet).size).toBe(4);
    expect(firstWorksheet.every(sentence => corpus.includes(sentence))).toBe(true);

    const fontFamilies = {
        "playwrite-es": "Playwrite ES",
        "learning-curve": "Learning Curve",
        sacramento: "Sacramento",
        "dancing-script": "Dancing Script",
    };
    for (const [value, family] of Object.entries(fontFamilies)) {
        await page.locator("#font-choice").selectOption(value);
        await expect.poll(() => page.locator(".sentence").first().evaluate(
            sentence => getComputedStyle(sentence).fontFamily
        )).toContain(family);
        const fontLoaded = await page.evaluate(async name => {
            await document.fonts.load(`16px "${name}"`);
            return [...document.fonts].some(font => (
                font.family === name && font.status === "loaded"
            ));
        }, family);
        expect(fontLoaded).toBe(true);
        const expectedSize = value === "playwrite-es" ? "25.6px" : "38.4px";
        await expect(page.locator(".sentence").first()).toHaveCSS("font-size", expectedSize);
    }

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-worksheet").click();
    await expect(page.locator("#sentences > li")).toHaveCount(4);
    const nextWorksheet = await page.locator(".sentence").allInnerTexts();
    expect(new Set(nextWorksheet).size).toBe(4);
    expect(nextWorksheet.every(sentence => corpus.includes(sentence))).toBe(true);
    expect(nextWorksheet).not.toEqual(firstWorksheet);
    for (const sentence of await page.locator("#sentences > li").all()) {
        await expect(sentence.locator(".practice-lines > span")).toHaveCount(5);
    }
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    await page.emulateMedia({media: "print"});
    await expect(page.locator(".font-selector")).toHaveCSS("display", "none");
    await expect(page.locator(".actions")).toHaveCSS("display", "none");
    const printFontSize = await page.locator(".sentence").first().evaluate(
        sentence => Number.parseFloat(getComputedStyle(sentence).fontSize)
    );
    expect(printFontSize).toBeGreaterThan(30);
    expect(printFontSize).toBeLessThan(31);
    expect(pageErrors).toEqual([]);
});
