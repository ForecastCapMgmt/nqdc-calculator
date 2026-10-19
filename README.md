# Forecast Capital Management — NQDC scenario calculator

Educational illustration of a nonqualified deferred compensation election: defer pre-tax compensation, or take it, pay tax, and invest the remainder in a taxable account.

`app.py` is the Streamlit host. It does not calculate anything. It embeds `nqdc_calculator.html`, which is where the math lives. `web/nqdc-calculator.html` is a self-contained page with the same formula, for a Squarespace Code Block or a standalone open.

## Paste it into Squarespace

1. In the Squarespace editor, add a **Code** block (not a Markdown block). Leave “Display source” off.
2. Open `web/nqdc-calculator.html` and paste the **entire file** into the block. If Squarespace drops the outer `<html>`, `<head>`, and `<body>` tags, keep the `<div id="fcm-nqdc">` … `</div>` that remains, including both `<script>` tags and the `<style>` tag. That wrapper is the calculator.
3. Save and view the page. The illustration runs in the visitor’s browser. There is no signup and no server call.
4. CSS and element ids sit under `#fcm-nqdc`, so the block does not restyle the rest of the template.

The page also works if you open the file directly, or if you host the file and embed it:

```html
<iframe title="NQDC scenario calculator" src="https://example.com/nqdc-calculator.html" style="width:100%;min-height:1400px;border:0;"></iframe>
```

Use a taller iframe if the year-by-year table is expanded. A Code Block is the better fit, because the block grows with the content.

### Optional results email

The results are visible without an address. Below them, “Email me my results” is a normal HTML form. Its action is the constant at the top of the widget:

```javascript
var FCM_NQDC_CONFIG = {
  RESULTS_FORM_ACTION: "https://REPLACE-WITH-YOUR-FORM-ENDPOINT.example/nqdc-results"
};
```

Replace that URL with the firm’s form endpoint (a Kit form action or another email-system form that accepts a browser POST). Hidden fields carry the assumptions, the rounded results, a short summary, and the year-by-year table. While the value still contains `REPLACE-WITH`, the form does not submit and explains that delivery is not connected.

### Counting use

After a calculation settles, the page pushes `{ event: "calculation completed", calculator: "fcm-nqdc", ... }` onto `window.dataLayer` (for Google Tag Manager, if the site already loads it) and dispatches a bubbling custom event named `fcm-nqdc-calculation-completed`. Slider moves within 600ms count as one calculation. The payload has no email address.

### What the page loads

- Cormorant Garamond and Lora, from Google Fonts. If the font request fails, the page uses Georgia.
- Chart.js 4.4.0 from cdnjs, for the line chart only. If that script is blocked, the numbers, bars, and year-by-year table still render.

No credentials or account keys are in the file.

## Check the math

```bash
node --test tests/nqdc-calculator.test.mjs
```

The test runs the original `calc()` and `fcmNqdcCalculate` on the same inputs. Written output is in `tests/PARITY_RESULTS.md`.

## Streamlit

`app.py` and `nqdc_calculator.html` are the existing Streamlit tool. Leave them in place if the hosted Streamlit app should keep running.
