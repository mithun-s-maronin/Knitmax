# Placeholder checklist

Nothing factual about Knitmax Exports was invented for this build. Every place
that needs a real detail carries a `TODO_` token, and all of them are collected
in **`js/content.js`**.

## How to fill them in

Open `js/content.js`, replace a `null` with a string, reload. The value is
substituted everywhere that token appears — body copy, `mailto:` and `tel:`
links included.

```js
TODO_EMAIL: "exports@knitmax.example",
TODO_PHONE: "+91 00000 00000",
```

Anything left `null` keeps its visible placeholder, so you can fill these in
over several passes without the page ever looking broken.

> **Before going live**, do a find-and-replace of the same values directly in
> `index.html` and delete the token from `content.js`. The runtime substitution
> is there so the site is usable immediately; hard-coded text is better for
> search engines and for readers with JavaScript disabled.

## The full list

| Token | Appears in | What it needs |
|---|---|---|
| `TODO_EMAIL` | Contact, Footer | Enquiries address |
| `TODO_PHONE` | Contact | Phone, in dialable form |
| `TODO_ADDRESS_LINE_1` | Contact, Footer | Street / unit |
| `TODO_CITY` | Hero, Contact, Footer | City |
| `TODO_STATE` | Contact | State / region |
| `TODO_POSTCODE` | Contact | Postal code |
| `TODO_COUNTRY` | Hero, Contact | Country |
| `TODO_YEAR` | About | Year established |
| `TODO_FACILITIES` | About | Units / mills, e.g. "2 knitting units" |
| `TODO_MARKETS` | About | Markets served |
| `TODO_CAPACITY` | Hero chip | Annual capacity |
| `TODO_CERTIFICATIONS` | Quality | Certifications held |
| `TODO_REGISTRATION` | Footer | Registration / GST / IEC line |
| `TODO_ABOUT_PARAGRAPH` | About | The real company story |
| `TODO_COMPOSITION` | Products ×3 | Fibre composition per range |
| `TODO_GSM` | Products 01, 03 | GSM range |
| `TODO_GAUGE` | Product 02 | Gauge |
| `TODO_FINISHES` | Products 01, 03 | Available finishes |
| `TODO_APPLICATIONS` | Product 02 | End uses |

## Quality metrics — read this one

The Quality panel renders four figures at roughly 120px. They currently show a
neutral `00` and a visible note saying the numbers are placeholders.

```js
METRICS: [
  { value: "99", suffix: "%", label: "First-pass quality" },
  ...
]
```

Fill a slot only with a figure you can actually stand behind. Once all four are
supplied the placeholder note is replaced automatically with your certifications
line. **Do not put an unverified number here** — at that size it reads as a
headline claim.

## Copy that is drafted, not factual

This text was written to make the layout work and describes knitwear
manufacturing in general terms. It asserts nothing specific about Knitmax and
should still be reviewed and rewritten in your own voice:

- Hero: "Premium Knitwear for the world." and the eyebrow line
- About: the lede paragraph and "We make cloth that travels well."
- Products: the three range names (Single Jersey & Piqué, Rib/Interlock/Collar,
  French Terry & Fleece) and their one-line descriptions — **confirm these match
  what you actually produce**
- Process: the four step descriptions
- Quality: the inspection paragraph
- Contact: "Tell us what you need made."

## Enquiry form

`FORM_ENDPOINT` in `content.js` is `null`, so the form validates but does not
send. Point it at your handler (Formspree, Basin, or your own endpoint) and it
will POST the fields as `FormData`.
