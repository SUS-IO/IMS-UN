const DOC_TYPES = {
  INWARD: {
    type: "INWARD",
    path: "inward",
    perm: "inward",
    title: "Inward",
    long: "Inward from Vendor",
    icon: "PackagePlus",
    partyKind: "vendor",
    refLabel: "Vendor invoice no.",
    refRequired: true,
    showReason: false,
    kind: "cost",
    blurb: "Receive stock from a vendor. Each line becomes its own stock lot with MRP, cost, GST and rack."
  },
  OUTWARD: {
    type: "OUTWARD",
    path: "outward",
    perm: "outward",
    title: "Outward",
    long: "Outward to Customer",
    icon: "PackageMinus",
    partyKind: "customer",
    refLabel: "Customer PO / reference",
    refRequired: false,
    showReason: false,
    kind: "sale",
    blurb: "Sell stock to a customer. Pick the exact MRP & GST stock; the sale GST can differ for this entry only."
  },
  VENDOR_RETURN: {
    type: "VENDOR_RETURN",
    path: "vendor-return",
    perm: "vreturn",
    title: "Vendor Return",
    long: "Return to Vendor",
    icon: "Undo2",
    partyKind: "vendor",
    refLabel: "Debit note / reference",
    refRequired: false,
    showReason: true,
    kind: "cost",
    blurb: "Send stock back to the vendor it was bought from. Choose the exact lot being returned."
  },
  CUSTOMER_RETURN: {
    type: "CUSTOMER_RETURN",
    path: "customer-return",
    perm: "creturn",
    title: "Customer Return",
    long: "Return from Customer",
    icon: "Redo2",
    partyKind: "customer",
    refLabel: "Credit note / reference",
    refRequired: false,
    showReason: true,
    kind: "sale",
    blurb: "Accept goods back from a customer against a posted outward. Stock goes back to its original lot and rack."
  }
};
const DOC_LIST = Object.values(DOC_TYPES);
const docByPath = (path) => DOC_LIST.find((d) => d.path === path);
const TYPE_LABEL = Object.fromEntries(DOC_LIST.map((d) => [d.type, d.long]));
const STATUS_TONE = { DRAFT: "warn", POSTED: "ok", REVERSED: "danger", CANCELLED: "muted" };
export {
  DOC_LIST,
  DOC_TYPES,
  STATUS_TONE,
  TYPE_LABEL,
  docByPath
};
