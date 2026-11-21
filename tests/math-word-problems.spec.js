const {test, expect} = require("@playwright/test");

test("word problems: selects four long problems from a catalogue of 50", async ({page}) => {
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
    expect(catalog).toHaveLength(50);
    expect(new Set(catalog.map(({text}) => text)).size).toBe(50);
    expect(new Set(catalog.map(({type}) => type))).toEqual(new Set([
        "addition",
        "subtraction",
        "multiplication",
        "division",
    ]));
    expect(catalog.every(({text}) => text.length > 150)).toBe(true);

    const readWorksheet = () => page.locator("#problems > li").evaluateAll(items =>
        items.map(item => ({
            id: item.dataset.problemId,
            type: item.dataset.problemType,
            first: Number(item.dataset.firstNumber),
            second: Number(item.dataset.secondNumber),
            text: item.querySelector(".problem-text").textContent,
        }))
    );
    const hasValidOperands = ({type, first, second}) => {
        switch (type) {
            case "addition":
                return first >= 1200 && second >= 1200 && first + second <= 9999;
            case "subtraction":
                return first >= 3000 && first <= 9999 && second >= 1000 && first > second;
            case "multiplication":
                return first >= 12 && first <= 99 && second >= 2 && second <= 9;
            case "division":
                return second >= 2 && second <= 9 && first % second === 0;
            default:
                return false;
        }
    };
    const firstWorksheet = await readWorksheet();
    expect(firstWorksheet).toHaveLength(4);
    expect(new Set(firstWorksheet.map(({id}) => id)).size).toBe(4);
    expect(firstWorksheet.every(({type, text}) =>
        ["addition", "subtraction", "multiplication", "division"].includes(type)
        && text.length > 150
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
