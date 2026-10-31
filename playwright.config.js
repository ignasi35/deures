const {defineConfig, devices} = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:4173",
        ...devices["Desktop Chrome"],
    },
    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],
    webServer: {
        command: "node tests/serve.js",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
    },
});
