/* ===========================================================================
   KNITMAX EXPORTS — SINGLE CONTENT FILE
   ---------------------------------------------------------------------------
   Every factual detail on the site lives here and nowhere else.
   Fill in a value and it replaces the matching TODO_ token across the page,
   including inside mailto: and tel: links.

   Leave a value as null (or delete the line) to keep the visible placeholder.
   Nothing here is invented — all figures are yours to supply.

   See PLACEHOLDERS.md for the full checklist.
   =========================================================================== */

window.KNITMAX_CONTENT = {

  /* ---- Contact -------------------------------------------------------- */
  TODO_EMAIL:            null,   // e.g. "exports@knitmax.com"
  TODO_PHONE:            null,   // e.g. "+91 00000 00000"
  TODO_ADDRESS_LINE_1:   null,   // street / unit
  TODO_CITY:             null,
  TODO_STATE:            null,
  TODO_POSTCODE:         null,
  TODO_COUNTRY:          null,

  /* ---- Company facts -------------------------------------------------- */
  TODO_YEAR:             null,   // year established
  TODO_FACILITIES:       null,   // e.g. "2 knitting units"
  TODO_MARKETS:          null,   // e.g. "EU, UK, US"
  TODO_CAPACITY:         null,   // hero chip, e.g. "1.2M pcs"
  TODO_CERTIFICATIONS:   null,   // e.g. "GOTS, OEKO-TEX Standard 100"
  TODO_REGISTRATION:     null,   // registration / GST / IEC line

  /* ---- About ---------------------------------------------------------- */
  TODO_ABOUT_PARAGRAPH:  null,   // the real company story

  /* ---- Product specs (shared tokens across the three lookbook panels) --- */
  TODO_COMPOSITION:      null,
  TODO_GSM:              null,
  TODO_GAUGE:            null,
  TODO_FINISHES:         null,
  TODO_APPLICATIONS:     null,

  /* ---- Quality metrics ------------------------------------------------
     Four slots. Supply { value, suffix, label } for each one you can verify.
     Anything left null keeps the neutral "00" placeholder on screen.
     NEVER put an unverified number here — it renders at 120px.
     -------------------------------------------------------------------- */
  METRICS: [
    null,  // { value: "99", suffix: "%",  label: "First-pass quality" }
    null,  // { value: "14", suffix: "",   label: "Inspection gates" }
    null,  // { value: "30", suffix: "+",  label: "Export markets" }
    null   // { value: "12", suffix: "",   label: "Years in operation" }
  ],

  /* ---- Enquiry form ---------------------------------------------------
     Set this to your form handler URL (Formspree, Basin, your own endpoint).
     While it is null the form validates but does not send.
     -------------------------------------------------------------------- */
  FORM_ENDPOINT: null
};
