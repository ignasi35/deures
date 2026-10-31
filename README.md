# deures

## Development and tests

The geography exercises are static pages. Their browser tests use Node.js,
Playwright Test, and Chromium.

1. Install Node.js 20 or later (npm is included).
2. Install the dependencies and browser:

   ```sh
   npm ci
   npx playwright install chromium
   ```

3. Run the tests from the repository root:

   ```sh
   npm test
   ```

The GitHub Actions workflow runs the same tests for pull requests and pushes to
`main`. It deploys to GitHub Pages only after the tests pass.
