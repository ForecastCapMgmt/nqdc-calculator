# NQDC parity results

The Streamlit app (`app.py`) does no tax math. It reads `nqdc_calculator.html` and embeds it with `st.components.v1.html`. The port is `fcmNqdcCalculate` in `web/nqdc-calculator.html`.

Each case below was run through the original `calc()` and through `fcmNqdcCalculate`. Deferred value, taxable value, net benefit, break-even rate, and both year-by-year series matched exactly, including non-finite break-even values.

Intentional formula changes: none.

Page file size: 65,120 bytes (63.6 KB).

| Case | Deferred, after tax | Taxable path | Net benefit | Break-even rate | Chart points |
| --- | ---: | ---: | ---: | ---: | ---: |
| defaults | $104,376 | $80,007 | $24,368 | 50.2% | 8 |
| slider minimums | $4,040 | $4,040 | $0 | 20.0% | 2 |
| slider maximums | $13,242,354 | $13,242,354 | $0 | 60.0% | 31 |
| one year, higher rate later | $132,500 | $164,588 | -$32,088 | 37.9% | 2 |
| long horizon, lower rate later | $764,762 | $287,175 | $477,587 | 71.5% | 31 |
| equal tax rates | $94,423 | $78,187 | $16,236 | 50.3% | 11 |
| equal returns | $167,170 | $141,451 | $25,718 | 45.0% | 16 |
| taxable return much higher | $108,367 | $752,411 | -$644,044 | -316.6% | 21 |
| short window, deferral loses | $30,319 | $37,485 | -$7,166 | 32.0% | 3 |
| half-step returns | $12,604 | $22,435 | -$9,831 | -38.8% | 6 |
| typed fractional inputs | $14,869 | $11,899 | $2,970 | 42.6% | 8 |
| zero amount (edge, blocked in the UI) | $0 | $0 | $0 | not defined | 8 |
| zero years (edge, blocked in the UI) | $65,000 | $55,000 | $10,000 | 45.0% | 1 |
| negative years (edge, blocked in the UI) | $53,059 | $46,839 | $6,221 | 42.6% | 0 |
| zero tax and equal returns | $162,889 | $162,889 | $0 | 0.0% | 11 |

## What matched

- Headline formula: plan balance compounds pre-tax, distribution tax is applied once, the taxable path invests the after-tax amount at a constant after-tax return, and the net benefit is the difference.
- Break-even rate: `1 − (taxable value ÷ pre-tax plan balance)`, as a percent. At that rate the two after-tax paths are equal.
- Year series: whole years from now through the last year `<= n`, each point rounded to the nearest dollar. For an integer year count, the last point matches the rounded headline.
- Verdict strings when the benefit is finite: "Deferral adds value in this scenario" and "Non-deferral outperforms in this scenario", including a zero benefit on the deferral side, as in the original.
- Employer health does not enter the dollar math.
- Slider defaults: $100,000, 45% now, 35% at distribution, 7 years, 7.0% inside the plan, 5.5% after tax, employer "strong".

## Display differences (not formula changes)

- Break-even sentences no longer say "deferral wins" or "reconsider deferral". The same greater-than test decides which path is larger. An exact tie now has its own sentence. A non-finite break-even (plan balance of zero) displays "Not defined" instead of "NaN%".
- Counterparty-risk sentences describe the label. They no longer say to cap exposure or review with an advisor. The low / moderate / high classes are unchanged.
- Added, from the same intermediates: tax if taken now, tax at distribution, amount invested outside the plan, a pre-tax balance column, a plain-English summary, and proportional bars.
- Axis labels on the chart use a slightly finer dollar format. The plotted numbers are the original rounded series.
- Fractional years still compound in the headline and still plot only whole years, with a note when that split happens. The original did this without a note.

## Not carried over from the Streamlit wrapper

- The "Book a 30-Minute Review" Calendly button and the sentence under the iframe live in `app.py`, not in the calculator. The embedded page uses the requested contact line instead. The Streamlit app is unchanged.
