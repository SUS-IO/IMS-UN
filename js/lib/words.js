const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function below1000(n) {
  let s = "";
  if (n >= 100) {
    s += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) s += ONES[n] + " ";
  return s;
}
function rupeesInWords(amount) {
  const total = Math.round(Math.abs(Number(amount) || 0) * 100);
  let rupees = Math.floor(total / 100);
  const paise = total % 100;
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  let words = "";
  const crore = Math.floor(rupees / 1e7);
  rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5);
  rupees %= 1e5;
  const thousand = Math.floor(rupees / 1e3);
  rupees %= 1e3;
  if (crore) words += below1000(crore) + "Crore ";
  if (lakh) words += below1000(lakh) + "Lakh ";
  if (thousand) words += below1000(thousand) + "Thousand ";
  if (rupees) words += below1000(rupees);
  words = words.trim();
  const rs = words ? `${words} Rupees` : "";
  const ps = paise ? `${below1000(paise).trim()} Paise` : "";
  return `${[rs, ps].filter(Boolean).join(" and ")} Only`;
}
export {
  rupeesInWords
};
