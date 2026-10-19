# NQDC Scenario Calculator

Forecast Capital Management’s nonqualified deferred compensation scenario calculator. Visitors compare the after-tax value of deferring compensation with investing the after-tax amount in a taxable account.

`app.py` is a Streamlit wrapper. It reads `nqdc_calculator.html` and embeds it. That file is still the Streamlit version; leave both in place if the hosted Streamlit app should keep running.

`web/nqdc-calculator.html` is the same math as a single client-side page for the firm’s site. CSS and JavaScript are inline. Chart.js 4.4.0 is loaded from a CDN. There is no server and no credentials in the page.

## Paste it into Squarespace

1. In the Squarespace editor, add a **Code** block (not a Markdown block) on the page or blog post.
2. Open `web/nqdc-calculator.html`.
3. Copy only the region between `SQUARESPACE PASTE START` and `SQUARESPACE PASTE END`.
4. Paste that region into the Code block and save. Do not paste the outer `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags. Those exist so the same file also opens on its own and works as an iframe document.
5. Move a slider. The net benefit, both paths, the break-even rate, and the chart should update immediately. No signup is required.
6. If the headings come through in the site’s font, or the chart never draws, Squarespace stripped the font link or the chart script. Add these two lines under **Settings → Advanced → Code Injection → Header**, and only in that case:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
```

The calculator’s styles and IDs all start with `fcm-nqdc`, so they stay inside the widget. On a narrow column or phone the inputs stack above the results.

To embed the whole file in an iframe instead, host `web/nqdc-calculator.html` and point the iframe at that URL. Give the frame a tall minimum height (about 1600px) or let it scroll. The contact link uses `target="_top"` so it leaves the frame.

```html
<iframe title="NQDC Scenario Calculator" src="https://example.com/path/nqdc-calculator.html" style="width:100%;min-height:1600px;border:0;"></iframe>
```

## Wire “Email me my results”

At the top of the pasted region, `FCM_NQDC_CONFIG.RESULTS_FORM_ACTION` is a placeholder. Replace it with the firm’s Kit form action or other email endpoint when that URL exists. Until the placeholder text `REPLACE-WITH-KIT-OR-EMAIL-FORM-ACTION` is gone, submit stays on the page.

The form is a normal HTML POST. It sends `email`, `name`, the scenario inputs, the displayed results, and a `breakdown` field with the full plain-text summary. Kit subscription forms usually want the email field named `email_address` and the name field named `first_name`; rename those two inputs if you point the action at Kit.

A completed calculation pushes `{ event: 'calculation_completed', calculator: 'nqdc', ... }` onto `window.dataLayer` and dispatches a bubbling `calculation_completed` custom event on the widget. The first run on page load is marked `trigger: 'initial'`. Later input changes are marked `trigger: 'input'` and fire once, 800ms after the visitor stops moving the controls.

## Tests

```bash
node web/nqdc-calculator.test.mjs
```

The harness compares the Squarespace page with `nqdc_calculator.html` and writes `web/test-results.md`.
