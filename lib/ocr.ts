import { createWorker } from "tesseract.js";

export type OcrGuess = {
  text: string;
  confidence: number;
  guessedAmount: number | null; // pence
  guessedInvoiceNumber: string | null;
  guessedDate: string | null; // yyyy-mm-dd for <input type=date>
};

const AMOUNT_RE = /£?\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2}))/g;
const INVOICE_NO_RE = /(?:invoice|inv)[\s#:-]*([A-Z0-9-]{3,15})/i;
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;

export async function runInvoiceOcr(buffer: Buffer, mimeType: string): Promise<OcrGuess | null> {
  if (!mimeType.startsWith("image/")) return null;

  const worker = await createWorker("eng");
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);

    const amounts = [...text.matchAll(AMOUNT_RE)].map((m) => parseFloat(m[1].replace(/,/g, "")));
    const largestAmount = amounts.length ? Math.max(...amounts) : null;

    const invoiceMatch = text.match(INVOICE_NO_RE);
    const dateMatch = text.match(DATE_RE);

    let guessedDate: string | null = null;
    if (dateMatch) {
      const [, d, m, y] = dateMatch;
      const year = y.length === 2 ? `20${y}` : y;
      guessedDate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return {
      text,
      confidence,
      guessedAmount: largestAmount != null ? Math.round(largestAmount * 100) : null,
      guessedInvoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
      guessedDate,
    };
  } finally {
    await worker.terminate();
  }
}
