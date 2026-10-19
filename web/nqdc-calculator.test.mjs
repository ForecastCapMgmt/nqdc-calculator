/**
 * Parity harness for the Squarespace NQDC calculator.
 * The math lives in nqdc_calculator.html (Streamlit only embeds that file).
 * web/nqdc-calculator.html keeps calc(), riskInfo(), and the display helpers.
 * Run from the repo root: node web/nqdc-calculator.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const originalHtml = fs.readFileSync(path.join(root, 'nqdc_calculator.html'), 'utf8');
const nextHtml = fs.readFileSync(path.join(root, 'web', 'nqdc-calculator.html'), 'utf8');
const appPy = fs.readFileSync(path.join(root, 'app.py'), 'utf8');

function extractFunction(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const start = source.search(re);
  if (start < 0) throw new Error('Missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unclosed function ' + name);
}

function normalizeFn(src) {
  return src.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

function loadCalc(html) {
  const src = extractFunction(html, 'calc');
  return new Function('s', src + '\nreturn calc();');
}

function loadRisk(html) {
  const src = extractFunction(html, 'riskInfo');
  return new Function('employer', src + '\nreturn riskInfo(employer);');
}

function loadFn(html, name, args) {
  const src = extractFunction(html, name);
  return new Function(...args, src + '\nreturn ' + name + '(' + args.join(', ') + ');');
}

function loadFormatters(html) {
  const lines = ['dollar', 'dollarSigned', 'pct'].map((name) => {
    const match = html.match(new RegExp('const ' + name + ' = .+?;'));
    if (!match) throw new Error('Missing formatter ' + name);
    return match[0];
  });
  return new Function(lines.join('\n') + '\nreturn { dollar, dollarSigned, pct };')();
}

function sameResult(a, b) {
  assert.equal(Object.is(a.deferredNet, b.deferredNet), true);
  assert.equal(Object.is(a.nondeferredNet, b.nondeferredNet), true);
  assert.equal(Object.is(a.benefit, b.benefit), true);
  assert.equal(Object.is(a.breakEven, b.breakEven), true);
  assert.deepEqual(a.dSeries, b.dSeries);
  assert.deepEqual(a.nSeries, b.nSeries);
}

function fmtInputs(state) {
  return [
    '$' + state.amount.toLocaleString('en-US'),
    state.curTax + '% now',
    state.futTax + '% later',
    state.years + ' yrs',
    state.planRet + '% plan',
    state.taxRet + '% taxable'
  ].join(', ');
}

function describeNumber(value) {
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return String(value);
  return String(value);
}

const originalCalc = loadCalc(originalHtml);
const nextCalc = loadCalc(nextHtml);
const originalRisk = loadRisk(originalHtml);
const nextRisk = loadRisk(nextHtml);
const { dollar, dollarSigned, pct } = loadFormatters(nextHtml);
const verdictMessage = loadFn(nextHtml, 'verdictMessage', ['benefit']);
const breakEvenMessage = loadFn(nextHtml, 'breakEvenMessage', ['breakEven', 'futTax']);
const parseLooseNumber = loadFn(nextHtml, 'parseLooseNumber', ['text']);
const clampNumber = loadFn(nextHtml, 'clampNumber', ['raw', 'min', 'max']);

assert.equal(normalizeFn(extractFunction(originalHtml, 'calc')), normalizeFn(extractFunction(nextHtml, 'calc')));
assert.equal(normalizeFn(extractFunction(originalHtml, 'riskInfo')), normalizeFn(extractFunction(nextHtml, 'riskInfo')));
for (const name of ['dollar', 'dollarSigned', 'pct']) {
  const re = new RegExp('const ' + name + ' = .+?;');
  assert.equal(originalHtml.match(re)[0], nextHtml.match(re)[0]);
}

assert.ok(originalHtml.includes('Deferral adds value in this scenario'));
assert.ok(originalHtml.includes('Non-deferral outperforms in this scenario'));
assert.ok(originalHtml.includes('Your expected rate (${s.futTax}%) is below this — deferral wins'));
assert.ok(originalHtml.includes('Your expected rate (${s.futTax}%) exceeds this — reconsider deferral'));
assert.ok(nextHtml.includes('Deferral adds value in this scenario'));
assert.ok(nextHtml.includes('Non-deferral outperforms in this scenario'));
assert.ok(nextHtml.includes('Your expected rate (${futTax}%) is below this — deferral wins'));
assert.ok(nextHtml.includes('Your expected rate (${futTax}%) exceeds this — reconsider deferral'));

const named = [
  ['Default sliders', { amount: 100000, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 }],
  ['Slider minimums', { amount: 5000, curTax: 20, futTax: 20, years: 1, planRet: 1, taxRet: 1 }],
  ['Slider maximums', { amount: 500000, curTax: 60, futTax: 60, years: 30, planRet: 15, taxRet: 15 }],
  ['Future tax higher, equal returns', { amount: 250000, curTax: 32, futTax: 50, years: 10, planRet: 6, taxRet: 6 }],
  ['Large tax drop, long horizon', { amount: 80000, curTax: 50, futTax: 22, years: 15, planRet: 8, taxRet: 4.5 }],
  ['Plan return below taxable return', { amount: 100000, curTax: 37, futTax: 37, years: 5, planRet: 3, taxRet: 9 }],
  ['One year, equal tax', { amount: 10000, curTax: 40, futTax: 40, years: 1, planRet: 7, taxRet: 5.5 }],
  ['Half-step returns', { amount: 15000, curTax: 24, futTax: 33, years: 3, planRet: 7.5, taxRet: 4.5 }],
  ['Equal tax and equal return', { amount: 100000, curTax: 35, futTax: 35, years: 10, planRet: 7, taxRet: 7 }],
  ['Fractional text-box inputs', { amount: 123456.7, curTax: 45.4, futTax: 22.2, years: 12.5, planRet: 6.25, taxRet: 3.1 }]
];

const rows = [];
for (const [name, state] of named) {
  const a = originalCalc(state);
  const b = nextCalc(state);
  sameResult(a, b);
  rows.push({
    name,
    inputs: fmtInputs(state),
    deferred: dollar(b.deferredNet),
    nondeferred: dollar(b.nondeferredNet),
    benefit: dollarSigned(b.benefit),
    breakEven: pct(b.breakEven),
    verdict: verdictMessage(b.benefit),
    note: breakEvenMessage(b.breakEven, state.futTax),
    points: b.dSeries.length
  });
}

const defaults = nextCalc(named[0][1]);
assert.equal(dollar(defaults.deferredNet), '$104,376');
assert.equal(dollar(defaults.nondeferredNet), '$80,007');
assert.equal(dollarSigned(defaults.benefit), '+$24,368');
assert.equal(pct(defaults.breakEven), '50.2%');
assert.equal(verdictMessage(defaults.benefit), 'Deferral adds value in this scenario');
assert.equal(breakEvenMessage(defaults.breakEven, 35), 'Your expected rate (35%) is below this — deferral wins');
assert.equal(defaults.dSeries[0], 65000);
assert.equal(defaults.nSeries[0], 55000);
assert.equal(defaults.dSeries.length, 8);
assert.equal(defaults.dSeries.at(-1), 104376);
assert.equal(defaults.nSeries.at(-1), 80007);

const higherTax = nextCalc(named[3][1]);
assert.equal(dollarSigned(higherTax.benefit), '−$80,588');
assert.equal(higherTax.benefit < 0, true);
assert.equal(verdictMessage(higherTax.benefit), 'Non-deferral outperforms in this scenario');
assert.equal(pct(higherTax.breakEven), '32.0%');
assert.equal(breakEvenMessage(higherTax.breakEven, 50), 'Your expected rate (50%) exceeds this — reconsider deferral');

const minimums = nextCalc(named[1][1]);
assert.equal(Object.is(minimums.benefit, 0), true);
assert.equal(dollarSigned(minimums.benefit), '+$0');
assert.equal(pct(minimums.breakEven), '20.0%');
assert.equal(minimums.breakEven > 20, false);
assert.equal(breakEvenMessage(minimums.breakEven, 20), 'Your expected rate (20%) exceeds this — reconsider deferral');

const fractional = nextCalc(named[9][1]);
assert.equal(fractional.dSeries.length, 13);
assert.notEqual(fractional.dSeries.at(-1), Math.round(fractional.deferredNet));

const amounts = [5000, 100000, 500000];
const curTaxes = [20, 35, 45, 60];
const futTaxes = [20, 35, 45, 60];
const yearChoices = [1, 7, 15, 30];
const planRets = [1, 7, 15];
const taxRets = [1, 5.5, 15];
let gridCount = 0;
for (const amount of amounts) {
  for (const curTax of curTaxes) {
    for (const futTax of futTaxes) {
      for (const years of yearChoices) {
        for (const planRet of planRets) {
          for (const taxRet of taxRets) {
            const state = { amount, curTax, futTax, years, planRet, taxRet };
            sameResult(originalCalc(state), nextCalc(state));
            gridCount += 1;
          }
        }
      }
    }
  }
}
assert.equal(gridCount, 1728);

const outside = [
  ['Amount zero (division by a zero gross)', { amount: 0, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 }],
  ['Zero years', { amount: 100000, curTax: 45, futTax: 35, years: 0, planRet: 7, taxRet: 5.5 }],
  ['Half year', { amount: 100000, curTax: 45, futTax: 35, years: 0.5, planRet: 7, taxRet: 5.5 }],
  ['Tax rates at 0', { amount: 100000, curTax: 0, futTax: 0, years: 10, planRet: 7, taxRet: 5 }],
  ['Tax rates at 100', { amount: 100000, curTax: 100, futTax: 100, years: 10, planRet: 7, taxRet: 5 }],
  ['Negative returns', { amount: 100000, curTax: 40, futTax: 30, years: 8, planRet: -5, taxRet: -5 }],
  ['Plan return of -100 (zero gross)', { amount: 100000, curTax: 40, futTax: 30, years: 4, planRet: -100, taxRet: 5 }],
  ['Tiny amount', { amount: 0.01, curTax: 37, futTax: 24, years: 3, planRet: 7.5, taxRet: 4.5 }],
  ['Negative amount', { amount: -50000, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 }],
  ['Very large balance', { amount: 1e12, curTax: 37, futTax: 20, years: 30, planRet: 15, taxRet: 8 }]
];

const edgeRows = [];
for (const [name, state] of outside) {
  const a = originalCalc(state);
  const b = nextCalc(state);
  sameResult(a, b);
  edgeRows.push({
    name,
    benefit: describeNumber(b.benefit),
    breakEven: describeNumber(b.breakEven),
    points: b.dSeries.length
  });
}

for (const employer of ['strong', 'moderate', 'atrisk']) {
  const a = originalRisk(employer);
  const b = nextRisk(employer);
  assert.deepEqual(a, b);
  assert.ok(a.text.length > 0);
  assert.ok(['low', 'mod', 'high'].includes(a.cls));
}
const withEmployer = nextCalc({ amount: 100000, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 });
assert.deepEqual(withEmployer, defaults);

assert.equal(parseLooseNumber('$100,000'), 100000);
assert.equal(parseLooseNumber('45%'), 45);
assert.equal(parseLooseNumber('7 yrs'), 7);
assert.equal(parseLooseNumber('7.0%'), 7);
assert.equal(parseLooseNumber('5.5%'), 5.5);
assert.equal(Number.isNaN(parseLooseNumber('')), true);
assert.equal(Number.isNaN(parseLooseNumber('abc')), true);
assert.equal(parseLooseNumber('-100000'), 100000);
assert.equal(parseLooseNumber('$1,234.50'), 1234.5);
assert.equal(clampNumber(100000, 5000, 500000), 100000);
assert.equal(clampNumber(1000, 5000, 500000), 5000);
assert.equal(clampNumber(900000, 5000, 500000), 500000);
assert.equal(clampNumber(7.25, 1, 15), 7.25);
assert.equal(clampNumber(0, 1, 30), 1);

const pasteStart = nextHtml.indexOf('<!-- SQUARESPACE PASTE START');
const pasteEnd = nextHtml.indexOf('<!-- SQUARESPACE PASTE END -->');
assert.ok(pasteStart > 0 && pasteEnd > pasteStart);
const paste = nextHtml.slice(pasteStart, pasteEnd);
assert.equal(paste.includes('<!DOCTYPE'), false);
assert.equal(paste.includes('<body'), false);
assert.ok(paste.includes('id="fcm-nqdc"'));
assert.ok(paste.includes('var FCM_NQDC_CONFIG'));
assert.ok(paste.includes('RESULTS_FORM_ACTION: "https://example.com/REPLACE-WITH-KIT-OR-EMAIL-FORM-ACTION"'));
assert.ok(paste.includes('action="https://example.com/REPLACE-WITH-KIT-OR-EMAIL-FORM-ACTION"'));
assert.ok(paste.includes('https://www.forecastcapitalmanagement.com/contact'));
assert.ok(paste.includes('For educational purposes only; not investment, tax, or legal advice. Forecast Capital Management is a registered investment adviser. Results are hypothetical estimates based on your inputs.'));
assert.ok(paste.includes("event: 'calculation_completed'"));
assert.ok(paste.includes('window.dataLayer'));
assert.ok(paste.includes("new CustomEvent('calculation_completed'"));
assert.ok(paste.includes('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'));
assert.equal(/api[_-]?key\s*[:=]/i.test(paste), false);
assert.equal(/password\s*[:=]/i.test(paste), false);
assert.equal(/secret\s*[:=]/i.test(paste), false);
assert.equal(/bearer\s+/i.test(paste), false);

const styleMatch = nextHtml.match(/<style id="fcm-nqdc-css">([\s\S]*?)<\/style>/);
assert.ok(styleMatch);
const css = styleMatch[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/@(?:media|container)[^{]*\{/g, '');
const selectors = [];
const selectorRe = /([^{}]+)\{/g;
let selectorMatch;
while ((selectorMatch = selectorRe.exec(css))) {
  const selector = selectorMatch[1].trim();
  if (!selector || selector.startsWith('@')) continue;
  selectors.push(selector);
}
const unscoped = selectors.filter((selector) => selector.split(',').some((part) => {
  const piece = part.trim();
  return piece && !piece.includes('#fcm-nqdc');
}));
assert.deepEqual(unscoped, []);
assert.ok(selectors.length > 20);

assert.ok(appPy.includes('open("nqdc_calculator.html"'));
assert.ok(originalHtml.includes('function calc()'));

const bytes = fs.statSync(path.join(root, 'web', 'nqdc-calculator.html')).size;
const kib = (bytes / 1024).toFixed(1);

const lines = [];
lines.push('# NQDC calculator parity results');
lines.push('');
lines.push('The calculation lives entirely in `nqdc_calculator.html`. `app.py` only embeds that file in Streamlit. `web/nqdc-calculator.html` keeps `calc()`, `riskInfo()`, and the dollar / percent formatters line for line. This harness loads both copies and compares them.');
lines.push('');
lines.push('## Source parity');
lines.push('');
lines.push('- `calc` matches after whitespace trim.');
lines.push('- `riskInfo` matches after whitespace trim.');
lines.push('- `dollar`, `dollarSigned`, and `pct` match exactly, including the Unicode minus sign (U+2212).');
lines.push('- Verdict sentences and the break-even note match the current tool.');
lines.push('');
lines.push('## Named scenarios');
lines.push('');
lines.push('Display values use the same rounding as the page: nearest dollar, and break-even to one decimal.');
lines.push('');
lines.push('| Scenario | Inputs | Deferred | Non-deferred | Net benefit | Break-even | Series points |');
lines.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  lines.push('| ' + [row.name, row.inputs, row.deferred, row.nondeferred, row.benefit, row.breakEven, row.points].join(' | ') + ' |');
}
lines.push('');
lines.push('Default scenario checks: deferred **$104,376**, non-deferred **$80,007**, net benefit **+$24,368**, break-even **50.2%**, verdict “Deferral adds value in this scenario”.');
lines.push('');
lines.push('## Slider grid');
lines.push('');
lines.push(gridCount + ' combinations of amount (3), current tax (4), future tax (4), years (4), plan return (3), and taxable return (3) matched exactly, including both year-by-year series.');
lines.push('');
lines.push('## Edge cases outside the sliders');
lines.push('');
lines.push('These are not reachable from the controls (typed values are clamped to the slider min and max). Both copies still agree.');
lines.push('');
lines.push('| Case | Benefit | Break-even | Series points |');
lines.push('| --- | --- | --- | --- |');
for (const row of edgeRows) {
  lines.push('| ' + [row.name, row.benefit, row.breakEven, row.points].join(' | ') + ' |');
}
lines.push('');
lines.push('## Preserved behavior');
lines.push('');
lines.push('- Employer financial health does not change the dollar results. It only changes the counterparty-risk sentence. All three labels match the current tool.');
lines.push('- A fractional year is used in the headline compound growth, but the chart loop is `for (y = 0; y <= n; y++)`, so it stops on the last integer year. At 12.5 years the series has 13 points and its last point is not the rounded headline value. Both copies do this.');
lines.push('- Typed characters other than digits and a decimal point are stripped, so a leading minus sign is dropped before clamping. That matches the current text-field parser.');
lines.push('- At the slider minimums the unrounded break-even is 19.999999999999996. It displays as 20.0%, and because it is not greater than a 20% future rate the note uses the “exceeds” sentence. Both copies do this.');
lines.push('- A zero deferral makes the break-even `NaN` (divide by a zero gross balance). The sliders do not allow it.');
lines.push('');
lines.push('## Page checks');
lines.push('');
lines.push('- Paste region is marked for Squarespace and does not include the standalone document shell.');
lines.push('- Styles under `#fcm-nqdc-css` are scoped to `#fcm-nqdc` (' + selectors.length + ' selectors checked).');
lines.push('- Results form action is the placeholder in `FCM_NQDC_CONFIG`.');
lines.push('- `calculation_completed` is pushed to `dataLayer` and dispatched as a bubbling custom event.');
lines.push('- Contact link and the required educational disclaimer are present.');
lines.push('- No credential assignment is present in the paste region.');
lines.push('- `app.py` still opens `nqdc_calculator.html`.');
lines.push('- `web/nqdc-calculator.html` is ' + bytes.toLocaleString('en-US') + ' bytes (' + kib + ' KB).');
lines.push('');
lines.push('All assertions passed.');
lines.push('');

const report = lines.join('\n');
fs.writeFileSync(path.join(here, 'test-results.md'), report);
console.log(report);
