// Runs the shared formatting corpus against the frontend implementation.
//
//   node scripts/check-format-contract.mjs
//
// The same file is asserted on the backend by
// crm-back-end/app/tests/test_attribute_formatters.py. Keeping one corpus and
// two runners is what stops formatAttributeValue and format_value drifting
// apart again — that drift was bug B-e, where a campaign email rendered a
// stored option value while the UI rendered its label.
//
// Needs node_modules (libphonenumber-js), so run it after `npm install`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const corpusPath = resolve(here, "../../crm-back-end/app/tests/fixtures/format_cases.json");

const { formatAttributeValue } = await import("../src/utils/attributeTypes.js");
const { cases } = JSON.parse(readFileSync(corpusPath, "utf8"));

let failed = 0;
for (const testCase of cases) {
    const attr = {
        type: testCase.type,
        format_config: testCase.format_config || {},
        list_values: testCase.list_values || [],
    };
    const actual = formatAttributeValue(attr, testCase.value);
    if (actual === testCase.expected) {
        console.log(`  ✓ ${testCase.name}`);
    } else {
        failed++;
        console.log(`  ✗ ${testCase.name}`);
        console.log(`      expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`      actual:   ${JSON.stringify(actual)}`);
    }
}

console.log(
    failed
        ? `\n${failed} of ${cases.length} cases disagree with the backend.`
        : `\nAll ${cases.length} cases match the backend.`
);
process.exit(failed ? 1 : 0);
