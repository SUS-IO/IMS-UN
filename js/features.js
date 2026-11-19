// =====================================================================
//  FEATURE SWITCHES  -  change true / false, save, upload to GitHub, press Ctrl+F5.
//  (These are intentionally NOT in the admin screens.)
// =====================================================================
export const FEATURES = {
  // Delivery Challan PDF (same as the invoice but with NO rates or amounts).
  //   true  = "Delivery Challan" button appears on every posted Outward document.
  //   false = button hidden.
  DELIVERY_CHALLAN: true,

  // "After returns" PDF: when a posted Inward / Outward has customer or vendor returns against it,
  // an extra PDF is offered showing original qty, returned qty and the final (net) qty & values.
  // The normal PDF is always kept as it is.
  RETURN_MARKED_PDF: true,

  // Reports page (left menu): CSV reports with line items + ZIP of all PDFs for a date range.
  REPORTS: true
};
