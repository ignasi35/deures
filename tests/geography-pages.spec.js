const {test, expect} = require("@playwright/test");

const exercises = [
    {path: "provincies-espanya", entryCount: 50},
    {path: "paisos-mon/europa", entryCount: 45},
    {path: "paisos-mon/america", entryCount: 35, hasInset: true},
    {path: "paisos-mon/africa", entryCount: 54},
    {path: "paisos-mon/asia", entryCount: 47},
    {path: "paisos-mon/oceania", entryCount: 14},
];

for (const {path, entryCount, hasInset = false} of exercises) {
    test(`${path}: exercise generates both question modes`, async ({page}) => {
        const pageErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message));
        await page.addInitScript(() => {
            Math.random = () => 0;
        });
        await page.goto(`/${path}/index.html`);

        await expect.poll(() => page.locator("#exercise-map").evaluate(
            image => image.complete && image.naturalWidth > 0
        )).toBe(true);
        await expect(page.locator("#map-labels > g > circle"))
            .toHaveCount(Math.min(18, entryCount));
        await expect(page.locator("#questions > li"))
            .toHaveCount(Math.min(18, entryCount));
        await expect(page.locator(".worksheet")).toHaveAttribute("data-mode", "letters");
        await expect(page.locator('a[href="llistat.html"]')).toHaveCount(1);

        await page.evaluate(() => {
            Math.random = () => 0.99;
        });
        await page.locator("#new-questions").click();
        await expect(page.locator(".worksheet")).toHaveAttribute("data-mode", "clues");
        await expect(page.locator("#questions > li"))
            .toHaveCount(Math.min(18, entryCount));
        await expect(page.locator("#map-labels > g > circle")).toHaveCount(entryCount);
        await expect(page.locator("#map-labels > g > svg")).toHaveCount(Number(hasInset));
        expect(pageErrors).toEqual([]);
    });

    test(`${path}: reference list matches exercise data`, async ({page}) => {
        const pageErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message));
        await page.goto(`/${path}/llistat.html`);

        const entries = await page.evaluate(
            () => window.geographyExercise.entries.map(({name, capital}) => [name, capital])
        );
        const rows = await page.locator("#country-list tr").all();
        expect(entries).toHaveLength(entryCount);
        expect(rows).toHaveLength(entryCount);
        const displayedRows = await Promise.all(rows.map(async row => (
            await row.locator("td").allInnerTexts()
        )));
        expect(displayedRows).toEqual(entries.map(([name, capital], index) => [
            String(index + 1),
            name,
            capital,
        ]));
        expect(pageErrors).toEqual([]);
    });

    test(`${path}: reference map marks every entry`, async ({page}) => {
        const pageErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message));
        await page.goto(`/${path}/mapa.html`);

        await expect.poll(() => page.locator(".full-map, #exercise-map").evaluate(
            image => image.complete && image.naturalWidth > 0
        )).toBe(true);
        await expect(page.locator("#map-labels > g > circle")).toHaveCount(entryCount);
        await expect(page.locator("#map-labels > g > svg")).toHaveCount(Number(hasInset));
        expect(pageErrors).toEqual([]);
    });
}
