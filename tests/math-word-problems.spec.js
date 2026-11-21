const {test, expect} = require("@playwright/test");

test("word problems: mixes four problems from a catalogue of 100", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/matematiques/problemes/");

    const catalog = await page.locator("#problem-bank template").evaluateAll(templates =>
        templates.map(template => ({
            type: template.dataset.type,
            text: template.content.textContent.trim(),
        }))
    );
    expect(catalog).toHaveLength(100);
    expect(new Set(catalog.map(({text}) => text)).size).toBe(100);
    const oneOperationCatalog = catalog.filter(({type}) => !type.includes("-"));
    const multiOperationCatalog = catalog.filter(({type}) => type.includes("-"));
    expect(oneOperationCatalog).toHaveLength(50);
    expect(multiOperationCatalog).toHaveLength(50);
    expect(new Set(catalog.map(({type}) => type))).toEqual(new Set([
        "addition",
        "subtraction",
        "multiplication",
        "division",
        "addition-subtraction",
        "subtraction-subtraction-multiplication",
        "division-addition-addition",
        "addition-multiplication",
        "multiplication-addition-subtraction",
    ]));
    expect(multiOperationCatalog.every(({type}) => type.split("-").length >= 2)).toBe(true);
    for (const type of [
        "addition-subtraction",
        "subtraction-subtraction-multiplication",
        "division-addition-addition",
        "addition-multiplication",
        "multiplication-addition-subtraction",
    ]) {
        expect(multiOperationCatalog.filter(problem => problem.type === type)).toHaveLength(10);
    }
    expect(catalog.every(({text}) => text.length > 150)).toBe(true);

    const readWorksheet = () => page.locator("#problems > li").evaluateAll(items =>
        items.map(item => ({
            id: item.dataset.problemId,
            type: item.dataset.problemType,
            operands: JSON.parse(item.dataset.operands),
            text: item.querySelector(".problem-text").textContent,
        }))
    );
    const hasValidOperands = ({type, operands}) => {
        const [first, second, third, fourth] = operands;
        switch (type) {
            case "addition":
                return first >= 1200 && second >= 1200 && first + second <= 9999;
            case "subtraction":
                return first >= 3000 && first <= 9999 && second >= 1000 && first > second;
            case "multiplication":
                return first >= 12 && first <= 99 && second >= 2 && second <= 9;
            case "division":
                return second >= 2 && second <= 9 && first % second === 0;
            case "addition-subtraction":
                return first >= 3000 && first <= 6000
                    && second >= 1000 && first + second <= 9999
                    && third >= 500 && first + second > third;
            case "subtraction-subtraction-multiplication":
                return first >= 35 && first <= 90
                    && second >= 5 && second <= 20
                    && third >= 3 && first > second + third
                    && fourth >= 8 && fourth <= 30;
            case "division-addition-addition":
                return second >= 2 && second <= 9 && first % second === 0
                    && third >= 10 && fourth >= 10;
            case "addition-multiplication":
                return first >= 10 && second >= 5 && third >= 12;
            case "multiplication-addition-subtraction":
                return first >= 12 && second >= 10 && third >= 100
                    && first * second + third > fourth;
            default:
                return false;
        }
    };
    const firstWorksheet = await readWorksheet();
    expect(firstWorksheet).toHaveLength(4);
    expect(new Set(firstWorksheet.map(({id}) => id)).size).toBe(4);
    expect(firstWorksheet.filter(({type}) => !type.includes("-"))).toHaveLength(2);
    expect(firstWorksheet.filter(({type}) => type.includes("-"))).toHaveLength(2);
    expect(firstWorksheet.every(({text}) =>
        text.length > 150 && !/\{(?:first|second|third|fourth)\}/.test(text)
    )).toBe(true);
    expect(firstWorksheet.every(hasValidOperands)).toBe(true);
    await expect(page.locator("#regenerate-worksheet")).toHaveCount(0);
    await expect(page.locator("#problems .working-lines")).toHaveCount(0);
    const screenGap = await page.locator("#problems").evaluate(list =>
        Number.parseFloat(getComputedStyle(list).rowGap)
    );
    expect(screenGap).toBeGreaterThan(64);
    const actionsMargin = await page.locator(".actions").evaluate(actions =>
        Number.parseFloat(getComputedStyle(actions).marginTop)
    );
    expect(actionsMargin).toBe(screenGap * 2);

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-worksheet").click();
    const secondWorksheet = await readWorksheet();
    expect(secondWorksheet).toHaveLength(4);
    expect(secondWorksheet.filter(({type}) => !type.includes("-"))).toHaveLength(2);
    expect(secondWorksheet.filter(({type}) => type.includes("-"))).toHaveLength(2);
    expect(secondWorksheet.map(({id}) => id))
        .not.toEqual(firstWorksheet.map(({id}) => id));
    expect(secondWorksheet.every(hasValidOperands)).toBe(true);

    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    await page.emulateMedia({media: "print"});
    await expect(page.locator(".actions")).toHaveCSS("display", "none");
    await expect(page.locator("#new-worksheet")).toBeHidden();
    const printGap = await page.locator("#problems").evaluate(list =>
        Number.parseFloat(getComputedStyle(list).rowGap)
    );
    expect(printGap).toBeGreaterThan(56);
    expect(pageErrors).toEqual([]);
});
