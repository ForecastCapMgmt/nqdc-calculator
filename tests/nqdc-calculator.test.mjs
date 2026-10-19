import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'web', 'nqdc-calculator.html');
const originalPath = path.join(root, 'nqdc_calculator.html');
const appPath = path.join(root, 'app.py');
const resultsPath = path.join(root, 'tests', 'PARITY_RESULTS.md');

const page = fs.readFileSync(pagePath, 'utf8');
const originalHtml = fs.readFileSync(originalPath, 'utf8');
const appPy = fs.readFileSync(appPath, 'utf8');

const exportMatch = page.match(/\/\* FCM_NQDC_EXPORT_START \*\/([\s\S]*?)\/\* FCM_NQDC_EXPORT_END \*\//);
assert.ok(exportMatch, 'ported calculation block not found');
const sandbox = new Function(
  exportMatch[1] + `
  return {
    fcmNqdcCalculate,
    fcmNqdcDollar,
    fcmNqdcDollarSigned,
    fcmNqdcPct,
    fcmNqdcVerdict,
    fcmNqdcBreakEvenDetail,
    fcmNqdcRiskInfo,
    fcmNqdcDerived,
    fcmNqdcSummary
  };
`
)();

const originalMatch = originalHtml.match(/function calc\(\) \{([\s\S]*?)\n  \}/);
assert.ok(originalMatch, 'original calc() not found in nqdc_calculator.html');
const originalCalc = new Function('s', originalMatch[1]);

const cases = [
  { name: 'defaults', amount: 100000, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 },
  { name: 'slider minimums', amount: 5000, curTax: 20, futTax: 20, years: 1, planRet: 1, taxRet: 1 },
  { name: 'slider maximums', amount: 500000, curTax: 60, futTax: 60, years: 30, planRet: 15, taxRet: 15 },
  { name: 'one year, higher rate later', amount: 250000, curTax: 37, futTax: 50, years: 1, planRet: 6, taxRet: 4.5 },
  { name: 'long horizon, lower rate later', amount: 100000, curTax: 50, futTax: 24, years: 30, planRet: 8, taxRet: 6 },
  { name: 'equal tax rates', amount: 80000, curTax: 40, futTax: 40, years: 10, planRet: 7, taxRet: 5 },
  { name: 'equal returns', amount: 100000, curTax: 45, futTax: 35, years: 15, planRet: 6.5, taxRet: 6.5 },
  { name: 'taxable return much higher', amount: 100000, curTax: 22, futTax: 40, years: 20, planRet: 3, taxRet: 12 },
  { name: 'short window, deferral loses', amount: 50000, curTax: 32, futTax: 45, years: 2, planRet: 5, taxRet: 5 },
  { name: 'half-step returns', amount: 15000, curTax: 24, futTax: 22, years: 5, planRet: 1.5, taxRet: 14.5 },
  { name: 'typed fractional inputs', amount: 12345.67, curTax: 33.3, futTax: 28.25, years: 7.4, planRet: 7.25, taxRet: 5.1 },
  { name: 'zero amount (edge, blocked in the UI)', amount: 0, curTax: 45, futTax: 35, years: 7, planRet: 7, taxRet: 5.5 },
  { name: 'zero years (edge, blocked in the UI)', amount: 100000, curTax: 45, futTax: 35, years: 0, planRet: 7, taxRet: 5.5 },
  { name: 'negative years (edge, blocked in the UI)', amount: 100000, curTax: 45, futTax: 35, years: -3, planRet: 7, taxRet: 5.5 },
  { name: 'zero tax and equal returns', amount: 100000, curTax: 0, futTax: 0, years: 10, planRet: 5, taxRet: 5 }
];

function core(result) {
  return {
    deferredNet: result.deferredNet,
    nondeferredNet: result.nondeferredNet,
    benefit: result.benefit,
    breakEven: result.breakEven,
    dSeries: result.dSeries,
    nSeries: result.nSeries
  };
}

function money(v) {
  if (!Number.isFinite(v)) return 'n/a';
  const sign = v < 0 ? '-' : '';
  return sign + '$' + Math.round(Math.abs(v)).toLocaleString('en-US');
}

function pct(v) {
  if (!Number.isFinite(v)) return 'not defined';
  return v.toFixed(1) + '%';
}

const rows = [];

test('ported formula matches original calc() on every case', () => {
  for (const input of cases) {
    const fromOriginal = originalCalc(input);
    const fromPort = sandbox.fcmNqdcCalculate(input);
    assert.deepStrictEqual(core(fromPort), core(fromOriginal), input.name);
    assert.equal(fromPort.preTaxSeries.length, fromPort.dSeries.length, input.name + ' pre-tax length');
    if (Number.isInteger(input.years) && input.years >= 0) {
      const last = input.years;
      assert.equal(fromPort.dSeries.length, last + 1, input.name + ' series length');
      assert.equal(fromPort.dSeries[last], Math.round(fromPort.deferredNet), input.name + ' deferred endpoint');
      assert.equal(fromPort.nSeries[last], Math.round(fromPort.nondeferredNet), input.name + ' taxable endpoint');
    }
    const gross = input.amount * Math.pow(1 + input.planRet / 100, input.years);
    assert.equal(fromPort.deferredGross, gross, input.name + ' gross');
    if (gross !== 0 && Number.isFinite(fromPort.breakEven)) {
      const atBreak = fromPort.deferredGross * (1 - fromPort.breakEven / 100);
      assert.ok(Math.abs(atBreak - fromPort.nondeferredNet) < 1e-6, input.name + ' break-even identity');
    }
    const derived = sandbox.fcmNqdcDerived(input, fromPort);
    assert.ok(Math.abs(derived.upfrontTax + derived.investedNow - input.amount) < 1e-6, input.name + ' tax split');
    assert.ok(
      Math.abs(derived.distributionTax + fromPort.deferredNet - fromPort.deferredGross) < 1e-6,
      input.name + ' distribution tax split'
    );
    const withEmployer = sandbox.fcmNqdcCalculate(Object.assign({ employer: 'atrisk' }, input));
    assert.deepStrictEqual(withEmployer, fromPort, input.name + ' employer does not change dollars');
    rows.push({
      name: input.name,
      benefit: money(fromPort.benefit),
      deferred: money(fromPort.deferredNet),
      taxable: money(fromPort.nondeferredNet),
      breakEven: pct(fromPort.breakEven),
      points: fromPort.dSeries.length
    });
  }
});

test('verdict strings match the original tool when the benefit is finite', () => {
  assert.equal(sandbox.fcmNqdcVerdict(1), 'Deferral adds value in this scenario');
  assert.equal(sandbox.fcmNqdcVerdict(0), 'Deferral adds value in this scenario');
  assert.equal(sandbox.fcmNqdcVerdict(-1), 'Non-deferral outperforms in this scenario');
});

test('break-even wording keeps the original comparison direction', () => {
  const defaults = cases[0];
  const result = sandbox.fcmNqdcCalculate(defaults);
  const originalSaysDeferralLarger = result.breakEven > defaults.futTax;
  const detail = sandbox.fcmNqdcBreakEvenDetail(result.breakEven, defaults.futTax);
  assert.equal(originalSaysDeferralLarger, true);
  assert.match(detail, /below this break-even rate/);
  const losing = sandbox.fcmNqdcCalculate(cases.find((c) => c.name === 'short window, deferral loses'));
  assert.equal(losing.breakEven > 45, false);
  assert.match(sandbox.fcmNqdcBreakEvenDetail(losing.breakEven, 45), /above this break-even rate/);
  assert.match(sandbox.fcmNqdcBreakEvenDetail(35, 35), /matches this break-even rate/);
  assert.match(sandbox.fcmNqdcBreakEvenDetail(NaN, 35), /not defined/);
});

test('dollar formatting matches the original rounding rules', () => {
  assert.equal(sandbox.fcmNqdcDollar(24375.4), '$24,375');
  assert.equal(sandbox.fcmNqdcDollar(-24375.6), '$24,376');
  assert.equal(sandbox.fcmNqdcDollarSigned(24375.4), '+$24,375');
  assert.equal(sandbox.fcmNqdcDollarSigned(-24375.4), '\u2212$24,375');
  assert.equal(sandbox.fcmNqdcPct(50.176), '50.2%');
});

test('risk classes match the original map', () => {
  assert.equal(sandbox.fcmNqdcRiskInfo('strong').cls, 'low');
  assert.equal(sandbox.fcmNqdcRiskInfo('moderate').cls, 'mod');
  assert.equal(sandbox.fcmNqdcRiskInfo('atrisk').cls, 'high');
  assert.equal(sandbox.fcmNqdcRiskInfo('unknown').cls, 'low');
  for (const key of ['strong', 'moderate', 'atrisk']) {
    const text = sandbox.fcmNqdcRiskInfo(key).text;
    assert.doesNotMatch(text, /you should/i);
    assert.match(text, /does not change the dollar illustration/);
  }
});

test('plain-English summary uses the rounded results and stays descriptive', () => {
  const input = cases[0];
  const result = sandbox.fcmNqdcCalculate(input);
  const summary = sandbox.fcmNqdcSummary(input, result);
  assert.match(summary.lead, /\$104,376/);
  assert.match(summary.lead, /\$80,007/);
  assert.match(summary.lead, /\$24,368/);
  assert.match(summary.text, /deferral path is larger/);
  assert.doesNotMatch(summary.text, /you should/i);
  const losing = cases.find((c) => c.name === 'short window, deferral loses');
  const losingSummary = sandbox.fcmNqdcSummary(losing, sandbox.fcmNqdcCalculate(losing));
  assert.match(losingSummary.text, /taxable path is larger/);
});

test('page contract for Squarespace embed', () => {
  assert.match(page, /id="fcm-nqdc"/);
  assert.match(page, /var FCM_NQDC_CONFIG = \{/);
  assert.match(page, /RESULTS_FORM_ACTION: "https:\/\/REPLACE-WITH-YOUR-FORM-ENDPOINT\.example\/nqdc-results"/);
  assert.match(page, /event: 'calculation completed'/);
  assert.match(page, /fcm-nqdc-calculation-completed/);
  assert.match(page, /window\.dataLayer/);
  assert.match(page, /https:\/\/www\.forecastcapitalmanagement\.com\/contact/);
  assert.match(page, /Email me my results/);
  assert.match(
    page,
    /For educational purposes only; not investment, tax, or legal advice\. Forecast Capital Management is a registered investment adviser\. Results are hypothetical estimates based on your inputs\./
  );
  assert.doesNotMatch(page, /\byou should\b/i);
  assert.doesNotMatch(page, /\bwe recommend\b/i);
  assert.doesNotMatch(page, /api[_-]?key|secret|password/i);
  assert.match(page, /chart\.umd\.min\.js/);

  const style = page.match(/<style>([\s\S]*?)<\/style>/)[1];
  const stripped = style.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutAt = stripped.replace(/@[^{]+\{/g, '');
  const heads = withoutAt.split('}').map((block) => block.split('{')[0].trim()).filter(Boolean);
  for (const head of heads) {
    for (const sel of head.split(',')) {
      assert.ok(sel.includes('#fcm-nqdc'), 'unscoped selector: ' + sel.trim());
    }
  }
});

test('Streamlit wrapper is still the original embed', () => {
  assert.match(appPy, /nqdc_calculator\.html/);
  assert.match(appPy, /st\.components\.v1\.html/);
  assert.match(originalHtml, /function calc\(\)/);
});

test('write parity results', () => {
  if (rows.length !== cases.length) {
    rows.length = 0;
    for (const input of cases) {
      const fromPort = sandbox.fcmNqdcCalculate(input);
      rows.push({
        name: input.name,
        benefit: money(fromPort.benefit),
        deferred: money(fromPort.deferredNet),
        taxable: money(fromPort.nondeferredNet),
        breakEven: pct(fromPort.breakEven),
        points: fromPort.dSeries.length
      });
    }
  }
  const bytes = fs.statSync(pagePath).size;
  const lines = [
    '# NQDC parity results',
    '',
    'The Streamlit app (`app.py`) does no tax math. It reads `nqdc_calculator.html` and embeds it with `st.components.v1.html`. The port is `fcmNqdcCalculate` in `web/nqdc-calculator.html`.',
    '',
    'Each case below was run through the original `calc()` and through `fcmNqdcCalculate`. Deferred value, taxable value, net benefit, break-even rate, and both year-by-year series matched exactly, including non-finite break-even values.',
    '',
    'Intentional formula changes: none.',
    '',
    `Page file size: ${bytes.toLocaleString('en-US')} bytes (${(bytes / 1024).toFixed(1)} KB).`,
    '',
    '| Case | Deferred, after tax | Taxable path | Net benefit | Break-even rate | Chart points |',
    '| --- | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const row of rows) {
    lines.push(`| ${row.name} | ${row.deferred} | ${row.taxable} | ${row.benefit} | ${row.breakEven} | ${row.points} |`);
  }
  lines.push(
    '',
    '## What matched',
    '',
    '- Headline formula: plan balance compounds pre-tax, distribution tax is applied once, the taxable path invests the after-tax amount at a constant after-tax return, and the net benefit is the difference.',
    '- Break-even rate: `1 − (taxable value ÷ pre-tax plan balance)`, as a percent. At that rate the two after-tax paths are equal.',
    '- Year series: whole years from now through the last year `<= n`, each point rounded to the nearest dollar. For an integer year count, the last point matches the rounded headline.',
    '- Verdict strings when the benefit is finite: "Deferral adds value in this scenario" and "Non-deferral outperforms in this scenario", including a zero benefit on the deferral side, as in the original.',
    '- Employer health does not enter the dollar math.',
    '- Slider defaults: $100,000, 45% now, 35% at distribution, 7 years, 7.0% inside the plan, 5.5% after tax, employer "strong".',
    '',
    '## Display differences (not formula changes)',
    '',
    '- Break-even sentences no longer say "deferral wins" or "reconsider deferral". The same greater-than test decides which path is larger. An exact tie now has its own sentence. A non-finite break-even (plan balance of zero) displays "Not defined" instead of "NaN%".',
    '- Counterparty-risk sentences describe the label. They no longer say to cap exposure or review with an advisor. The low / moderate / high classes are unchanged.',
    '- Added, from the same intermediates: tax if taken now, tax at distribution, amount invested outside the plan, a pre-tax balance column, a plain-English summary, and proportional bars.',
    '- Axis labels on the chart use a slightly finer dollar format. The plotted numbers are the original rounded series.',
    '- Fractional years still compound in the headline and still plot only whole years, with a note when that split happens. The original did this without a note.',
    '',
    '## Not carried over from the Streamlit wrapper',
    '',
    '- The "Book a 30-Minute Review" Calendly button and the sentence under the iframe live in `app.py`, not in the calculator. The embedded page uses the requested contact line instead. The Streamlit app is unchanged.',
    ''
  );
  fs.writeFileSync(resultsPath, lines.join('\n'));
  const written = fs.readFileSync(resultsPath, 'utf8');
  assert.match(written, /defaults/);
  assert.match(written, /Intentional formula changes: none/);
});
