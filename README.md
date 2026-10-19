# Forecast Capital Management — NQDC scenario calculator

Educational illustration of a nonqualified deferred compensation election: defer pre-tax compensation, or take it, pay tax, and invest the remainder in a taxable account.

`app.py` is the Streamlit host. It does not calculate anything. It embeds `nqdc_calculator.html`, which is where the math lives. `web/nqdc-calculator.html` is a self-contained page with the same formula, for a Squarespace Code Block or a standalone open.

## Paste it into Squarespace

1. In the Squarespace editor, add a **Code** block (not a Markdown block). Leave “Display source” off.
2. Open `web/nqdc-calculator.html` and paste the **entire file** into the block. If Squarespace drops the outer `<html>`, `<head>`, and `<body>` tags, keep the `<div id="fcm-nqdc">` … `</div>` that remains, including both `<script>` tags and the `<style>` tag. That wrapper is the calculator.
3. Save and view the page. The illustration runs in the visitor’s browser. The figures do not require an email. The optional Friday 5 signup below the results is the only request the page sends.
4. CSS and element ids sit under `#fcm-nqdc`, so the block does not restyle the rest of the template.

The page also works if you open the file directly, or if you host the file and embed it:

```html
<iframe title="NQDC scenario calculator" src="https://example.com/nqdc-calculator.html" style="width:100%;min-height:1400px;border:0;"></iframe>
```

Use a taller iframe if the year-by-year table is expanded. A Code Block is the better fit, because the block grows with the content.

### The Friday 5

The illustration does not need an email. To keep the figures, use “Print or save PDF.” Below that, “Get The Friday 5” offers the firm’s Friday note: one short email each Friday, plus the most recent Forecast Report as a bonus. The button reads “Send me The Friday 5.” Joining agrees to occasional emails from Forecast Capital Management, and the note says unsubscribe anytime. After a send, the page says “You're on the list. Check your inbox for the Forecast Report.” The follow-up link under the form is the contact page only: https://www.forecastcapitalmanagement.com/contact.

The request goes to the constant at the top of the widget:

```javascript
var FCM_NQDC_CONFIG = {
  SUBSCRIBE_ENDPOINT: "https://go.forecastcapitalmanagement.com/api/subscribe"
};
```

That route is the same one the firm’s own landing page uses. The body is JSON `{"email","name","source":"nqdc-calculator"}`. The route does not send CORS headers, and this page is served from www.forecastcapitalmanagement.com, so the browser would block a normal `application/json` fetch after a preflight. The page instead uses `fetch` with `mode: "no-cors"` and `Content-Type: text/plain;charset=UTF-8`, with the JSON string as the body. That is a simple request: no preflight, and the response is opaque. The page treats a completed send as fire-and-forget.

A blank honeypot field is ignored by visitors. If it is filled, the page does not send. The submit button locks after a send so the same click cannot subscribe twice. An address that is not an email is not sent. The subscribe body is only the name, the email, and the source. It does not include the illustration.

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
