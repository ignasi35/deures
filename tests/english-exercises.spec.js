const {test, expect} = require("@playwright/test");

test("verb to be: covers persons, number, and sentence forms with fresh exercises", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
        Math.random = () => 0;
        window.__printCalls = 0;
        window.print = () => {
            window.__printCalls += 1;
        };
    });
    await page.goto("/angles/verb-to-be/");

    const questions = page.locator("#exercises > li");
    await expect(questions).toHaveCount(24);
    await expect(page.locator("#exercises .answer-space")).toHaveCount(24);
    await expect(page.locator("#exercises .clue")).toHaveCount(0);
    const firstWorksheet = await questions.evaluateAll(items => items.map(item => ({
        person: item.dataset.person,
        number: item.dataset.number,
        form: item.dataset.form,
        subject: item.dataset.subject,
        predicate: item.dataset.predicate,
        missing: item.dataset.missing,
        negativeHint: item.dataset.negativeHint === "true",
        sentence: item.querySelector(".sentence").innerText.trim(),
    })));
    const combinations = new Set(firstWorksheet.map(
        ({subject, number, form}) => `${subject}:${number}:${form}`
    ));
    expect(combinations.size).toBe(24);
    expect(new Set(firstWorksheet.map(({person}) => person))).toEqual(
        new Set(["first", "second", "third"])
    );
    expect(new Set(firstWorksheet.map(({number}) => number))).toEqual(
        new Set(["singular", "plural"])
    );
    expect(new Set(firstWorksheet.map(({form}) => form))).toEqual(
        new Set(["affirmative", "negative", "question"])
    );
    expect(new Set(firstWorksheet.map(({subject}) => subject))).toEqual(new Set([
        "i", "you", "she", "george", "my mum and i", "you and sam", "they", "the dogs",
    ]));
    expect(firstWorksheet.filter(({missing}) => missing === "verb")).toHaveLength(12);
    expect(firstWorksheet.filter(({missing}) => missing === "subject")).toHaveLength(12);
    for (const form of ["affirmative", "negative", "question"]) {
        expect(firstWorksheet.filter(question =>
            question.form === form && question.missing === "verb"
        )).toHaveLength(4);
        expect(firstWorksheet.filter(question =>
            question.form === form && question.missing === "subject"
        )).toHaveLength(4);
    }
    const hintedExercises = firstWorksheet.filter(({negativeHint}) => negativeHint);
    expect(hintedExercises).toHaveLength(2);
    expect(hintedExercises.every(({form, missing}) =>
        form === "negative" && missing === "verb"
    )).toBe(true);
    expect(hintedExercises.every(({sentence}) =>
        !sentence.includes(" not ")
    )).toBe(true);
    expect(firstWorksheet.every(({missing}) =>
        missing === "verb" || missing === "subject"
    )).toBe(true);
    expect(firstWorksheet.some(({subject, form}) =>
        subject === "my mum and i" && form === "question"
    )).toBe(true);
    expect(firstWorksheet.some(({subject, form}) =>
        subject === "george" && form === "affirmative"
    )).toBe(true);
    expect(firstWorksheet.every(({predicate}) => [
        "happy", "at school", "in the park", "with a cat", "good at football",
        "ready to play", "on the red team", "near the dogs", "in the pool",
        "good at tennis", "wearing blue", "very fast", "with a ball", "at the zoo",
        "under a big tree", "excited about the game", "next to a rabbit",
        "on the green team", "good at basketball", "with a little dog",
    ].includes(predicate))).toBe(true);
    expect(firstWorksheet.filter(({form}) => form === "question")
        .every(({sentence}) => sentence.endsWith("?"))).toBe(true);
    expect(firstWorksheet.filter(({form, missing}) =>
        form === "question" && missing === "subject"
    ).every(({person, number, sentence}) => {
        const verb = person === "first" && number === "singular"
            ? "Am"
            : person === "third" && number === "singular"
                ? "Is"
                : "Are";
        return sentence.startsWith(`${verb} `) && sentence.endsWith("?");
    })).toBe(true);
    expect(firstWorksheet.filter(({form, missing}) =>
        form === "negative" && missing === "subject"
    ).every(({person, number, sentence}) => {
        const verb = person === "first" && number === "singular"
            ? "am"
            : person === "third" && number === "singular"
                ? "is"
                : "are";
        return sentence.startsWith(`${verb} not `) && sentence.endsWith(".");
    })).toBe(true);
    expect(firstWorksheet.filter(({form, missing}) =>
        form === "affirmative" && missing === "subject"
    ).every(({person, number, sentence}) => {
        const verb = person === "first" && number === "singular"
            ? "am"
            : person === "third" && number === "singular"
                ? "is"
                : "are";
        return sentence.startsWith(`${verb} `) && sentence.endsWith(".");
    })).toBe(true);
    expect(firstWorksheet.filter(({missing}) => missing === "verb")
        .every(({form, subject, sentence, negativeHint}) => {
            const displayedSubject = {
                i: "I",
                you: "You",
                she: "She",
                george: "George",
                "my mum and i": "My mum and I",
                "you and sam": "You and Sam",
                they: "They",
                "the dogs": "The dogs",
            }[subject];
            if (form === "question") {
                const questionSubject = subject === "i" || subject === "george"
                    ? displayedSubject
                    : `${displayedSubject[0].toLowerCase()}${displayedSubject.slice(1)}`;
                return sentence.startsWith(questionSubject) && sentence.endsWith("?");
            }
            if (form === "negative") {
                const expectedPrefix = negativeHint
                    ? `X ${displayedSubject}`
                    : displayedSubject;
                return sentence.startsWith(expectedPrefix)
                    && (negativeHint
                        ? !sentence.includes(" not ")
                        : sentence.includes(" not "));
            }
            return sentence.startsWith(displayedSubject) && sentence.endsWith(".");
        })).toBe(true);
    await expect(page.locator(".negative-hint")).toHaveCount(2);

    await page.evaluate(() => {
        Math.random = () => 0.99;
    });
    await page.locator("#new-worksheet").click();
    const secondWorksheet = await questions.evaluateAll(items => items.map(item =>
        item.querySelector(".sentence").innerText
    ));
    expect(secondWorksheet).toHaveLength(24);
    expect(secondWorksheet).not.toEqual(firstWorksheet.map(({sentence}) => sentence));
    await page.locator("#print-worksheet").click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
});
