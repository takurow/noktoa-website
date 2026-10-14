/* ============================================================
   Site configuration — the ONLY file you need to edit before launch.
   Leave a value empty ("") if it is not confirmed yet. Nothing is
   invented: empty = feature hidden or falls back gracefully.
   ============================================================ */
window.SITE_CONFIG = {
  // Form endpoint (e.g. Formspree "https://formspree.io/f/xxxx").
  // Empty → the form falls back to a mailto: link using CONTACT_EMAIL.
  // If both are empty, the form shows the dealer's phone number instead.
  FORM_ENDPOINT: "",

  // Dealer contact details for the enquiry fallback and footer.
  // Confirm the exact address with SeaBreeze before filling in.
  CONTACT_EMAIL: "",
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
