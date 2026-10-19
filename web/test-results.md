# NQDC calculator parity results

The calculation lives entirely in `nqdc_calculator.html`. `app.py` only embeds that file in Streamlit. `web/nqdc-calculator.html` keeps `calc()`, `riskInfo()`, and the dollar / percent formatters line for line. This harness loads both copies and compares them.

## Source parity

- `calc` matches after whitespace trim.
- `riskInfo` matches after whitespace trim.
- `dollar`, `dollarSigned`, and `pct` match exactly, including the Unicode minus sign (U+2212).
- Verdict sentences and the break-even note match the current tool.

## Named scenarios

Display values use the same rounding as the page: nearest dollar, and break-even to one decimal.

| Scenario | Inputs | Deferred | Non-deferred | Net benefit | Break-even | Series points |
| --- | --- | --- | --- | --- | --- | --- |
| Default sliders | $100,000, 45% now, 35% later, 7 yrs, 7% plan, 5.5% taxable | $104,376 | $80,007 | +$24,368 | 50.2% | 8 |
| Slider minimums | $5,000, 20% now, 20% later, 1 yrs, 1% plan, 1% taxable | $4,040 | $4,040 | +$0 | 20.0% | 2 |
| Slider maximums | $500,000, 60% now, 60% later, 30 yrs, 15% plan, 15% taxable | $13,242,354 | $13,242,354 | +$0 | 60.0% | 31 |
| Future tax higher, equal returns | $250,000, 32% now, 50% later, 10 yrs, 6% plan, 6% taxable | $223,856 | $304,444 | −$80,588 | 32.0% | 11 |
| Large tax drop, long horizon | $80,000, 50% now, 22% later, 15 yrs, 8% plan, 4.5% taxable | $197,943 | $77,411 | +$120,532 | 69.5% | 16 |
| Plan return below taxable return | $100,000, 37% now, 37% later, 5 yrs, 3% plan, 9% taxable | $73,034 | $96,933 | −$23,899 | 16.4% | 6 |
| One year, equal tax | $10,000, 40% now, 40% later, 1 yrs, 7% plan, 5.5% taxable | $6,420 | $6,330 | +$90 | 40.8% | 2 |
| Half-step returns | $15,000, 24% now, 33% later, 3 yrs, 7.5% plan, 4.5% taxable | $12,485 | $13,009 | −$524 | 30.2% | 4 |
| Equal tax and equal return | $100,000, 35% now, 35% later, 10 yrs, 7% plan, 7% taxable | $127,865 | $127,865 | +$0 | 35.0% | 11 |
| Fractional text-box inputs | $123,456.7, 45.4% now, 22.2% later, 12.5 yrs, 6.25% plan, 3.1% taxable | $204,930 | $98,728 | +$106,202 | 62.5% | 13 |

Default scenario checks: deferred **$104,376**, non-deferred **$80,007**, net benefit **+$24,368**, break-even **50.2%**, verdict “Deferral adds value in this scenario”.

## Slider grid

1728 combinations of amount (3), current tax (4), future tax (4), years (4), plan return (3), and taxable return (3) matched exactly, including both year-by-year series.

## Edge cases outside the sliders

These are not reachable from the controls (typed values are clamped to the slider min and max). Both copies still agree.

| Case | Benefit | Break-even | Series points |
| --- | --- | --- | --- |
| Amount zero (division by a zero gross) | 0 | NaN | 8 |
| Zero years | 9999.999999999993 | 44.99999999999999 | 1 |
| Half year | 10744.266706647017 | 45.38687467335415 | 1 |
| Tax rates at 0 | 33825.67305121242 | 17.195256951564232 | 11 |
| Tax rates at 100 | 0 | 100 | 11 |
| Negative returns | 6634.2043128906225 | 40 | 9 |
| Plan return of -100 (zero gross) | -72930.37500000001 | -Infinity | 5 |
| Tiny amount | 0.0022521096624999997 | 42.1285947652408 | 4 |
| Negative amount | -12184.221054369656 | 50.175441033347 | 8 |
| Very large balance | 46629943725312.34 | 90.42545811301676 | 31 |

## Preserved behavior

- Employer financial health does not change the dollar results. It only changes the counterparty-risk sentence. All three labels match the current tool.
- A fractional year is used in the headline compound growth, but the chart loop is `for (y = 0; y <= n; y++)`, so it stops on the last integer year. At 12.5 years the series has 13 points and its last point is not the rounded headline value. Both copies do this.
- Typed characters other than digits and a decimal point are stripped, so a leading minus sign is dropped before clamping. That matches the current text-field parser.
- At the slider minimums the unrounded break-even is 19.999999999999996. It displays as 20.0%, and because it is not greater than a 20% future rate the note uses the “exceeds” sentence. Both copies do this.
- A zero deferral makes the break-even `NaN` (divide by a zero gross balance). The sliders do not allow it.

## Page checks

- Paste region is marked for Squarespace and does not include the standalone document shell.
- Styles under `#fcm-nqdc-css` are scoped to `#fcm-nqdc` (98 selectors checked).
- Results form action is the placeholder in `FCM_NQDC_CONFIG`.
- `calculation_completed` is pushed to `dataLayer` and dispatched as a bubbling custom event.
- Contact link and the required educational disclaimer are present.
- No credential assignment is present in the paste region.
- `app.py` still opens `nqdc_calculator.html`.
- `web/nqdc-calculator.html` is 44,855 bytes (43.8 KB).

All assertions passed.
