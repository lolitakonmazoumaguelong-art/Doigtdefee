import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Client, Doc, LineItem, Org } from "@/db/schema";
import { computeTotals, formatDate, formatMoney, lineTotal, typeLabel } from "@/lib/format";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const RIGHT = A4.width - MARGIN;
const INK = rgb(0.09, 0.125, 0.114);
const MUTED = rgb(0.39, 0.42, 0.4);
const LINE = rgb(0.86, 0.84, 0.77);

/** Les polices PDF standard ne connaissent que le Latin-1 : on remplace le reste. */
function clean(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[   ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\t/g, " ")
    .replace(/[^\n\x20-\x7e\xa1-\xff]/g, "?");
}

function hexColor(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255) : INK;
}

/** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      const attempt = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(attempt, size) <= maxWidth || !current) current = attempt;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

export async function renderDocumentPdf({
  org,
  doc,
  client,
  items,
  paid = 0,
}: {
  org: Org;
  doc: Doc;
  client: Client;
  items: LineItem[];
  paid?: number;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexColor(org.accentColor);
  const money = (cents: number) => clean(formatMoney(cents, org.currency));
  const isQuote = doc.type === "devis";
  const title = typeLabel(doc.type);
  pdf.setTitle(`${title} ${doc.number}`);
  pdf.setAuthor(clean(org.name));

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  const text = (value: string, x: number, atY: number, size = 10, font = regular, color = INK) =>
    page.drawText(clean(value), { x, y: atY, size, font, color });
  const textRight = (value: string, atY: number, size = 10, font = regular, color = INK, right = RIGHT) => {
    const v = clean(value);
    page.drawText(v, { x: right - font.widthOfTextAtSize(v, size), y: atY, size, font, color });
  };
  const rule = (atY: number, color = LINE, thickness = 0.75) =>
    page.drawLine({ start: { x: MARGIN, y: atY }, end: { x: RIGHT, y: atY }, color, thickness });

  // Bandeau de couleur de l'entreprise
  page.drawRectangle({ x: 0, y: A4.height - 10, width: A4.width, height: 10, color: accent });

  // --- En-tête : entreprise à gauche, document à droite
  const top = y - 10;
  let leftY = top;
  const logo = /^data:image\/(png|jpeg);base64,(.+)$/.exec(org.logo);
  if (logo) {
    try {
      const bytes = Buffer.from(logo[2], "base64");
      const image = logo[1] === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const scale = Math.min(150 / image.width, 56 / image.height, 1);
      const height = image.height * scale;
      page.drawImage(image, { x: MARGIN, y: leftY - height, width: image.width * scale, height });
      leftY -= height + 14;
    } catch {
      // Logo illisible : on continue sans
    }
  }
  if (!logo) leftY -= 14;
  text(org.name, MARGIN, leftY, logo ? 12 : 18, bold);
  leftY -= 15;
  const orgLines = [
    ...wrap(org.address, regular, 9, 250).filter(Boolean),
    [org.phone, org.email].filter(Boolean).join("  |  "),
    org.legalId ? `BRN: ${org.legalId}` : "",
    org.vatNumber ? `VAT: ${org.vatNumber}` : "",
  ].filter(Boolean);
  for (const line of orgLines) {
    text(line, MARGIN, leftY, 9, regular, MUTED);
    leftY -= 12;
  }

  let rightY = top - 18;
  textRight(title.toUpperCase(), rightY, 24, bold, accent);
  rightY -= 20;
  textRight(doc.number, rightY, 11, bold);
  rightY -= 14;
  textRight(`Date: ${formatDate(doc.issueDate)}`, rightY, 9, regular, MUTED);
  if (doc.dueDate) {
    rightY -= 12;
    textRight(`${isQuote ? "Valid until" : "Due by"} ${formatDate(doc.dueDate)}`, rightY, 9, regular, MUTED);
  }

  y = Math.min(leftY, rightY) - 18;

  // --- Client
  text("BILL TO", MARGIN, y, 8, bold, MUTED);
  y -= 14;
  text(client.name, MARGIN, y, 11, bold);
  y -= 13;
  const clientLines = [
    ...wrap(client.address, regular, 9, 300).filter(Boolean),
    [client.phone, client.email].filter(Boolean).join("  |  "),
  ].filter(Boolean);
  for (const line of clientLines) {
    text(line, MARGIN, y, 9, regular, MUTED);
    y -= 12;
  }
  y -= 14;

  // --- Tableau des lignes, avec saut de page automatique
  const COL = { qty: 372, price: 462, total: RIGHT };
  const DESC_WIDTH = 270;
  const tableHeader = () => {
    text("DESCRIPTION", MARGIN, y, 8, bold, MUTED);
    textRight("QTY", y, 8, bold, MUTED, COL.qty);
    textRight("UNIT PRICE", y, 8, bold, MUTED, COL.price);
    textRight("TOTAL", y, 8, bold, MUTED, COL.total);
    y -= 7;
    rule(y, accent, 1.5);
    y -= 15;
  };
  const newPage = () => {
    page = pdf.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN;
  };
  tableHeader();
  for (const item of items) {
    const lines = wrap(item.description, regular, 10, DESC_WIDTH);
    const height = lines.length * 13 + 9;
    if (y - height < MARGIN + 40) {
      newPage();
      tableHeader();
    }
    lines.forEach((line, i) => text(line, MARGIN, y - i * 13));
    textRight(String(item.quantity), y, 10, regular, INK, COL.qty);
    textRight(money(item.unitPrice), y, 10, regular, INK, COL.price);
    textRight(money(lineTotal(item.quantity, item.unitPrice)), y, 10, regular, INK, COL.total);
    y -= height - 4;
    rule(y + 6);
    y -= 8;
  }

  // --- Totaux
  const totals = computeTotals(items, doc.taxRate);
  if (y < MARGIN + 110) newPage();
  y -= 6;
  const LABEL_X = 360;
  if (doc.taxRate > 0) {
    text("Subtotal (excl. VAT)", LABEL_X, y, 10, regular, MUTED);
    textRight(money(totals.subtotal), y);
    y -= 15;
    text(`VAT (${doc.taxRate}%)`, LABEL_X, y, 10, regular, MUTED);
    textRight(money(totals.tax), y);
    y -= 10;
  }
  page.drawLine({ start: { x: LABEL_X, y }, end: { x: RIGHT, y }, color: accent, thickness: 1.5 });
  y -= 17;
  text(doc.taxRate > 0 ? "Total (incl. VAT)" : "Total", LABEL_X, y, 12, bold);
  textRight(money(totals.total), y, 12, bold);
  if (doc.type === "facture" && paid > 0) {
    y -= 17;
    text("Paid", LABEL_X, y, 10, regular, MUTED);
    textRight(`- ${money(paid)}`, y);
    y -= 15;
    text("Balance due", LABEL_X, y, 11, bold);
    textRight(money(Math.max(totals.total - paid, 0)), y, 11, bold);
  }
  y -= 30;

  // --- Note et mentions
  const block = (content: string, size: number, color = INK) => {
    for (const line of wrap(content, regular, size, RIGHT - MARGIN)) {
      if (y < MARGIN + 30) newPage();
      text(line, MARGIN, y, size, regular, color);
      y -= size + 3;
    }
    y -= 8;
  };
  if (doc.notes) block(doc.notes, 10);
  if (org.footerNote) {
    if (y < MARGIN + 50) newPage();
    rule(y + 4);
    y -= 10;
    block(org.footerNote, 8.5, MUTED);
  }

  // --- Pied de page numéroté
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    const label = clean(`${org.name}  |  ${title} ${doc.number}  |  Page ${index + 1} of ${pages.length}`);
    p.drawText(label, { x: MARGIN, y: 24, size: 8, font: regular, color: MUTED });
  });

  return pdf.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
