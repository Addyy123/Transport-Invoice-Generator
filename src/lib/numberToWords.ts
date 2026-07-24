export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero";

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n: number, suffix: string): string => {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else {
      str += a[n];
    }
    if (n !== 0) str += suffix;
    return str;
  };

  const amountStr = Math.floor(amount).toString().padStart(9, "0"); // pad to 9 digits (crores)

  const crores = parseInt(amountStr.substring(0, 2), 10);
  const lakhs = parseInt(amountStr.substring(2, 4), 10);
  const thousands = parseInt(amountStr.substring(4, 6), 10);
  const hundreds = parseInt(amountStr.substring(6, 7), 10);
  const tensUnits = parseInt(amountStr.substring(7, 9), 10);

  let words = "";
  words += numToWords(crores, "Crore ");
  words += numToWords(lakhs, "Lakh ");
  words += numToWords(thousands, "Thousand ");
  words += numToWords(hundreds, "Hundred ");
  
  if (tensUnits > 0) {
    if (words !== "") words += "and ";
    words += numToWords(tensUnits, "");
  }

  const fraction = Math.round((amount - Math.floor(amount)) * 100);
  if (fraction > 0) {
    words += " and " + numToWords(fraction, "Paise");
  }

  return words.trim() + " Only";
}
