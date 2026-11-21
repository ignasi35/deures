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
    await page.goto("/geografia/comarques-catalunya/index.html");

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

    await page.goto("/geografia/comarques-catalunya/llistat.html");
    await page.setViewportSize({width: 666, height: 983});
    const counties = await page.evaluate(() =>
        window.geographyExercise.entries.map(({name, capital, province}, index) => ({
            number: String(index + 1),
            name,
            capital,
            province,
        }))
    );
    const groups = await page.locator("#comarca-list").evaluate(tbody => {
        const provinces = [];
        const rows = [];
        let currentProvince;
        for (const row of tbody.rows) {
            const heading = row.querySelector("th");
            if (heading) {
                currentProvince = heading.textContent;
                provinces.push(currentProvince);
                continue;
            }
            rows.push({
                province: currentProvince,
                number: row.cells[0].textContent,
                name: row.cells[1].textContent,
                capital: row.cells[2].textContent,
            });
        }
        return {provinces, rows};
    });
    const provinceOrder = ["Barcelona", "Girona", "Lleida", "Tarragona"];
    expect(counties).toHaveLength(43);
    expect(groups.provinces).toEqual(provinceOrder);
    expect(groups.rows).toHaveLength(43);
    expect(groups.rows).toEqual(provinceOrder.flatMap(province =>
        counties.filter(county => county.province === province)
    ));
    expect(Object.fromEntries(provinceOrder.map(province => [
        province,
        groups.rows.filter(row => row.province === province).length,
    ]))).toEqual({
        Barcelona: 13,
        Girona: 8,
        Lleida: 12,
        Tarragona: 10,
    });
    const mapMarkers = await page.locator("#map-labels > g").evaluateAll(markers =>
        markers.map(marker => ({
            number: marker.querySelector("text").textContent,
            radius: marker.querySelector("circle").getAttribute("r"),
            label: marker.querySelector("title").textContent,
        }))
    );
    expect(mapMarkers).toHaveLength(43);
    expect(mapMarkers.map(marker => marker.number)).toEqual(
        counties.map(county => county.number)
    );
    expect(mapMarkers.every(marker => marker.radius === "18")).toBe(true);
    expect(mapMarkers.map(marker => marker.label)).toEqual(
        counties.map(county => `${county.number}: ${county.name}`)
    );
    await expect(page.locator(".maps > figure")).toHaveCount(2);
    await expect(page.locator(".maps")).toHaveCSS("position", "sticky");
    await expect(page.locator(".maps")).toHaveCSS("grid-template-columns", /.+/);
    for (const map of await page.locator(".maps .map").all()) {
        await expect.poll(() => map.evaluate(
            image => image.complete && image.naturalWidth > 0
        )).toBe(true);
    }
    await expect(page.locator(".maps > figure").nth(0).locator("#map-labels"))
        .toHaveCount(0);
    await expect(page.locator(".maps > figure").nth(0).locator(".map"))
        .toHaveAttribute("alt", "Mapa de Catalunya amb els límits de les comarques, sense números.");
    await expect(page.locator(".maps > figure").nth(1).locator("#map-labels > g > circle"))
        .toHaveCount(43);
    const numberedMapLayout = await page.locator(".maps > figure").nth(1)
        .locator(".map-container").evaluate(container => {
            const image = container.querySelector("img");
            const labels = container.querySelector("svg");
            const imageBounds = image.getBoundingClientRect();
            const labelsBounds = labels.getBoundingClientRect();
            return {
                containerPosition: getComputedStyle(container).position,
                labelsPosition: getComputedStyle(labels).position,
                image: {
                    left: imageBounds.left,
                    top: imageBounds.top,
                    right: imageBounds.right,
                    bottom: imageBounds.bottom,
                },
                labels: {
                    left: labelsBounds.left,
                    top: labelsBounds.top,
                    right: labelsBounds.right,
                    bottom: labelsBounds.bottom,
                },
            };
        });
    expect(numberedMapLayout.containerPosition).toBe("relative");
    expect(numberedMapLayout.labelsPosition).toBe("absolute");
    expect(numberedMapLayout.labels).toEqual(numberedMapLayout.image);
    const mapOrder = await page.locator(".maps > figure").evaluateAll(figures =>
        figures.map(figure => figure.getBoundingClientRect().toJSON())
    );
    expect(mapOrder[0].height).toBeGreaterThan(0);
    expect(mapOrder[1].height).toBeGreaterThan(0);
    expect(mapOrder[0].bottom).toBeLessThan(mapOrder[1].top);
    const referenceListLayout = await page.locator(".worksheet").evaluate(worksheet => {
        const maps = worksheet.querySelector(".maps").getBoundingClientRect();
        const list = worksheet.querySelector("table").getBoundingClientRect();
        return {maps, list};
    });
    expect(referenceListLayout.list.left).toBeGreaterThan(referenceListLayout.maps.right);
    const referenceMarkerSizes = await page.locator("#map-labels circle").evaluateAll(circles =>
        [...new Set(circles.map(circle => circle.getAttribute("r")))]
    );
    expect(referenceMarkerSizes).toEqual(["18"]);
    await expect(page.locator(".maps > figure").nth(1).locator(".map"))
        .toHaveAttribute("alt", "Mapa de Catalunya amb les 43 comarques identificades amb números.");
    const lastCountyRow = page.locator("#comarca-list .comarca-row").last();
    await lastCountyRow.scrollIntoViewIfNeeded();
    const stickyMapPosition = await page.locator(".maps").evaluate(maps =>
        maps.getBoundingClientRect().top
    );
    expect(stickyMapPosition).toBeGreaterThanOrEqual(0);
    expect(stickyMapPosition).toBeLessThan(32);
    await page.emulateMedia({media: "print"});
    await expect(page.locator(".maps")).toHaveCSS("position", "static");
    const printStyles = await page.evaluate(() => {
        const rules = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]);
        const printRules = rules.find(rule => rule.type === CSSRule.MEDIA_RULE && rule.conditionText === "print");
        return {
            pageSize: printRules.cssRules[0].style.getPropertyValue("size"),
            mapsColumns: [...printRules.cssRules].find(rule =>
                rule.selectorText === ".maps"
            ).style.getPropertyValue("grid-template-columns"),
        };
    });
    expect(printStyles.pageSize).toBe("a4");
    expect(printStyles.mapsColumns).toBe("1fr");
    await page.emulateMedia({media: "screen"});
    await page.locator("#print-list").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);

    await page.goto("/geografia/comarques-catalunya/mapa.html");
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

test("all printable pages use portrait orientation", async ({page}) => {
    const printablePages = [
        "/",
        "/geografia/provincies-espanya/index.html",
        "/geografia/provincies-espanya/llistat.html",
        "/geografia/provincies-espanya/mapa.html",
        "/geografia/comarques-catalunya/index.html",
        "/geografia/comarques-catalunya/llistat.html",
        "/geografia/comarques-catalunya/mapa.html",
        "/geografia/paisos-mon/index.html",
        ...["africa", "america", "asia", "europa", "oceania"].flatMap(continent => [
            `/geografia/paisos-mon/${continent}/index.html`,
            `/geografia/paisos-mon/${continent}/llistat.html`,
            `/geografia/paisos-mon/${continent}/mapa.html`,
        ]),
        "/matematiques/taules-multiplicar/index.html",
        "/matematiques/taules-multiplicar/multiplicacions-grans.html",
        "/matematiques/sumes-diverses-xifres/index.html",
        "/matematiques/restes-diverses-xifres/index.html",
        "/matematiques/divisions/dues-tres-xifres-un-digit.html",
        "/matematiques/divisions/tres-quatre-xifres-un-dos-digits.html",
        "/angles/verb-to-be/index.html",
        "/lecto-escriptura/caligrafia/index.html",
    ];

    for (const path of printablePages) {
        await page.goto(path);
        const pdf = await page.pdf({preferCSSPageSize: true});
        const pageSizes = [...pdf.toString("latin1").matchAll(
            /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g
        )].map(([, left, bottom, right, top]) => ({
            width: Number(right) - Number(left),
            height: Number(top) - Number(bottom),
        }));

        expect(pageSizes, `${path} should produce a PDF with page dimensions`).not.toHaveLength(0);
        expect(pageSizes.every(({width, height}) => height > width), path).toBe(true);
    }
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
    await page.goto("/matematiques/taules-multiplicar/");

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
    await page.goto("/matematiques/taules-multiplicar/multiplicacions-grans.html");

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

test("multi-digit subtraction: most problems require borrowing and all stay positive", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/matematiques/restes-diverses-xifres/");

    await expect(page.locator("#regenerate-worksheet")).toHaveText("regenerar");
    const readProblems = () => page.locator("#exercises li").evaluateAll(items =>
        items.map(item => ({
            minuend: Number(item.dataset.minuend),
            subtrahend: Number(item.dataset.subtrahend),
            digits: item.querySelector(".number").textContent.length,
            carryBoxes: item.querySelectorAll(".carry-box").length,
            digitAlignment: (() => {
                const boxes = [...item.querySelectorAll(".carry-box")];
                const digits = [...item.querySelectorAll(".minuend-number > span")];
                const lowerDigits = [...item.querySelectorAll(".subtrahend-digits > span")];
                const alignedCenters = (elements, reference) => elements.every((element, index) => {
                    const bounds = element.getBoundingClientRect();
                    const referenceBounds = reference[index].getBoundingClientRect();
                    return Math.abs(
                        bounds.x + bounds.width / 2
                        - referenceBounds.x - referenceBounds.width / 2
                    ) < 1;
                });
                return alignedCenters(boxes, digits) && alignedCenters(lowerDigits, digits);
            })(),
            visibleNumbers: [...item.querySelectorAll(".number")].map(number =>
                Number(number.textContent)
            ),
        }))
    );
    const requiresBorrowing = ({minuend, subtrahend}) => {
        let borrow = 0;
        let borrowedColumns = 0;
        while (minuend > 0 || subtrahend > 0) {
            const minuendDigit = minuend % 10;
            const subtrahendDigit = subtrahend % 10;
            if (minuendDigit - borrow < subtrahendDigit) {
                borrow = 1;
                borrowedColumns += 1;
            } else {
                borrow = 0;
            }
            minuend = Math.floor(minuend / 10);
            subtrahend = Math.floor(subtrahend / 10);
        }
        return borrowedColumns > 0;
    };
    const firstWorksheet = await readProblems();
    expect(firstWorksheet).toHaveLength(10);
    expect(new Set(firstWorksheet.map(({digits}) => digits))).toEqual(new Set([3, 4]));
    expect(firstWorksheet.every(({minuend, subtrahend, digits, visibleNumbers}) =>
        minuend > subtrahend
        && minuend.toString().length === digits
        && subtrahend.toString().length === digits
        && visibleNumbers[0] === minuend
        && visibleNumbers[1] === subtrahend
    )).toBe(true);
    expect(firstWorksheet.every(({digits, carryBoxes, digitAlignment}) =>
        carryBoxes === digits - 1 && digitAlignment
    )).toBe(true);
    expect(firstWorksheet.filter(requiresBorrowing)).toHaveLength(8);
    expect(firstWorksheet.filter(problem => !requiresBorrowing(problem))).toHaveLength(2);
    await expect(page.locator("#exercises .answer-space")).toHaveCount(10);

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#regenerate-worksheet").click();
    const secondWorksheet = await readProblems();
    expect(secondWorksheet).toHaveLength(10);
    expect(secondWorksheet.filter(requiresBorrowing)).toHaveLength(8);
    expect(secondWorksheet.filter(problem => !requiresBorrowing(problem))).toHaveLength(2);
    expect(secondWorksheet.map(({minuend, subtrahend}) => [minuend, subtrahend]))
        .not.toEqual(firstWorksheet.map(({minuend, subtrahend}) => [minuend, subtrahend]));
    await page.emulateMedia({media: "print"});
    await expect(page.locator("#regenerate-worksheet")).toHaveCSS("display", "none");
    await page.emulateMedia({media: "screen"});
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});

test("multi-digit addition: creates sums with operands of up to four digits", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/matematiques/sumes-diverses-xifres/");

    const readProblems = () => page.locator("#exercises > li").evaluateAll(items =>
        items.map(item => ({
            first: Number(item.dataset.firstNumber),
            second: Number(item.dataset.secondNumber),
            firstDigits: [...item.querySelectorAll(".number-digits")][0]
                .innerText.replace(/\s/g, ""),
            secondDigits: [...item.querySelectorAll(".number-digits")][1]
                .innerText.replace(/\s/g, ""),
        }))
    );
    const firstWorksheet = await readProblems();
    expect(firstWorksheet).toHaveLength(10);
    expect(firstWorksheet.every(({first, second, firstDigits, secondDigits}) =>
        first >= 10
        && second >= 10
        && first <= 9999
        && second <= 9999
        && firstDigits === String(first)
        && secondDigits === String(second)
    )).toBe(true);
    await expect(page.locator("#exercises .answer-space")).toHaveCount(10);

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#regenerate-worksheet").click();
    const secondWorksheet = await readProblems();
    expect(secondWorksheet).toHaveLength(10);
    expect(secondWorksheet.map(({first, second}) => [first, second]))
        .not.toEqual(firstWorksheet.map(({first, second}) => [first, second]));
    await page.emulateMedia({media: "print"});
    await expect(page.locator("#regenerate-worksheet")).toHaveCSS("display", "none");
    await page.emulateMedia({media: "screen"});
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});

test("division worksheets generate exact problems with the requested digit lengths", async ({page}) => {
    await page.addInitScript(() => {
        Math.random = () => 0;
    });
    const divisionPages = [
        {
            path: "/matematiques/divisions/dues-tres-xifres-un-digit.html",
            expectedDigitPairs: [[2, 1], [3, 1]],
        },
        {
            path: "/matematiques/divisions/tres-quatre-xifres-un-dos-digits.html",
            expectedDigitPairs: [[3, 1], [3, 2], [4, 1], [4, 2]],
        },
    ];

    for (const {path, expectedDigitPairs} of divisionPages) {
        await page.goto(path);
        const readProblems = () => page.locator("#exercises > li").evaluateAll(items =>
            items.map(item => ({
                dividend: Number(item.dataset.dividend),
                divisor: Number(item.dataset.divisor),
                dividendDigits: item.dataset.dividendDigits || item.dataset.digits,
                divisorDigits: item.dataset.divisorDigits || "1",
                layout: {
                    dividend: item.querySelector(".dividend")?.textContent,
                    divisor: item.querySelector(".divisor-box")?.textContent,
                    bracket: !!item.querySelector(".division-bracket"),
                    quotientField: !!item.querySelector('[aria-label="Quocient"]'),
                    divisionSymbolVisible: item.querySelector(".problem").innerText.includes("÷"),
                },
            }))
        );
        const firstWorksheet = await readProblems();
        expect(firstWorksheet).toHaveLength(10);
        expect(firstWorksheet.every(({
            dividend,
            divisor,
            dividendDigits,
            divisorDigits,
            layout,
        }) =>
            dividend > 0
            && divisor >= 2
            && dividend % divisor === 0
            && dividend.toString().length === Number(dividendDigits)
            && divisor.toString().length === Number(divisorDigits)
            && layout.dividend === String(dividend)
            && layout.divisor === String(divisor)
            && layout.bracket
            && !layout.quotientField
            && !layout.divisionSymbolVisible
        ), path).toBe(true);
        expect(new Set(firstWorksheet.map(({dividendDigits, divisorDigits}) =>
            `${dividendDigits}:${divisorDigits}`
        ))).toEqual(new Set(expectedDigitPairs.map(([dividendDigits, divisorDigits]) =>
            `${dividendDigits}:${divisorDigits}`
        )));
        await expect(page.locator("#exercises [aria-label='Quocient']")).toHaveCount(0);

        await page.evaluate(() => {
            Math.random = () => 0.99;
        });
        await page.locator("#regenerate-worksheet").click();
        const secondWorksheet = await readProblems();
        expect(secondWorksheet).toHaveLength(10);
        expect(secondWorksheet.every(({dividend, divisor}) => dividend % divisor === 0)).toBe(true);
        expect(secondWorksheet.map(({dividend, divisor}) => [dividend, divisor]))
            .not.toEqual(firstWorksheet.map(({dividend, divisor}) => [dividend, divisor]));
    }
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
    await page.goto("/lecto-escriptura/caligrafia/");

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

test("random worksheets can be regenerated from a small button hidden in print", async ({page}) => {
    await page.addInitScript(() => {
        Math.random = () => 0;
    });
    const randomExercisePages = [
        "/angles/verb-to-be/",
        "/lecto-escriptura/caligrafia/",
        "/matematiques/taules-multiplicar/",
        "/matematiques/taules-multiplicar/multiplicacions-grans.html",
        "/matematiques/sumes-diverses-xifres/",
        "/matematiques/restes-diverses-xifres/",
        "/matematiques/divisions/dues-tres-xifres-un-digit.html",
        "/matematiques/divisions/tres-quatre-xifres-un-dos-digits.html",
        "/geografia/comarques-catalunya/index.html",
        "/geografia/provincies-espanya/index.html",
        ...["africa", "america", "asia", "europa", "oceania"].map(continent =>
            `/geografia/paisos-mon/${continent}/index.html`
        ),
    ];

    for (const path of randomExercisePages) {
        await page.goto(path);
        const regenerateButton = page.locator("#regenerate-worksheet");
        await expect(regenerateButton).toHaveText("regenerar");
        await expect(regenerateButton).toHaveCSS("position", "fixed");
        const readWorksheet = () => path.startsWith("/geografia/")
            ? page.locator(".worksheet").evaluate(worksheet => JSON.stringify({
                mode: worksheet.dataset.mode,
                title: worksheet.querySelector("#quiz-title").textContent,
                questions: worksheet.querySelector("#questions").innerHTML,
                labels: worksheet.querySelector("#map-labels").innerHTML,
            }))
            : page.locator("#exercises, #sentences").evaluate(
                worksheet => worksheet.innerHTML
            );
        const firstWorksheet = await readWorksheet();

        await page.evaluate(() => {
            Math.random = () => 0.99;
        });
        await regenerateButton.click();
        expect(await readWorksheet(), path).not.toBe(firstWorksheet);
        expect(page.url()).toContain(path);

        await page.emulateMedia({media: "print"});
        await expect(regenerateButton).toHaveCSS("display", "none");
        await page.emulateMedia({media: "screen"});
    }
});
