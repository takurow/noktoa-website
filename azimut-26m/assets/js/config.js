/* ============================================================
   Site configuration — the ONLY file you need to edit before launch.
   Leave a value empty ("") if it is not confirmed yet. Nothing is
   invented: empty = feature hidden or falls back gracefully.
   ============================================================ */
window.SITE_CONFIG = {
  // Form endpoint (Formspree). V7: the same Formspree form NOKTOA's own contact page uses,
  // so enquiries arrive at the address that form is registered to (info@noktoa.com).
  // The form POSTs JSON with Accept: application/json; _subject / _replyto / lang / page are added by main.js.
  // Empty → the form falls back to a mailto: link using CONTACT_EMAIL.
  // If both are empty, the form shows the dealer's phone number instead.
  FORM_ENDPOINT: "https://formspree.io/f/xwlprdoa",

  // Enquiry address shown as a plain mailto link (Enquire section + footer) and used by the mailto fallback.
  // V7: enquiries go to NOKTOA first (info@noktoa.com), then on to the dealer.
  CONTACT_EMAIL: "info@noktoa.com",
  // International format without "+" or spaces, e.g. "81451234567".
  WHATSAPP: "",

  // Dealer phone (confirmed from listing).
  PHONE_DISPLAY: "+81-45-771-1000",
  PHONE_TEL: "+81457711000",

  // Analytics — loaded only when an ID is present.
  GA4_ID: "",          // e.g. "G-XXXXXXXXXX"
  META_PIXEL_ID: "",   // e.g. "1234567890"

  /* Event names fired to GA4 (gtag) and Meta Pixel (fbq trackCustom):
     - "cta_click"     : any "Request price & private viewing" button
                         params: { location: "hero" | "header" | "sticky" | "beyond" | "dealer" }
     - "form_start"    : first focus inside the enquiry form
     - "form_submit"   : enquiry submitted successfully (= primary conversion)
     - "form_error"    : validation failed or endpoint error
     - "gallery_open"  : lightbox opened
  */
  EVENTS: {
    CTA_CLICK: "cta_click",
    FORM_START: "form_start",
    FORM_SUBMIT: "form_submit",
    FORM_ERROR: "form_error",
    GALLERY_OPEN: "gallery_open"
  }
};
