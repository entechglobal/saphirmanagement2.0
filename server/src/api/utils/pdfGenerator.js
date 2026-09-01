import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { resolveDocumentHeaderConfig } from "./documentHeaderConfig.js";

/* ============================================================
   SHARED PDF GENERATOR
   Config-driven document builder used by BonLivraison and
   BonRetourClient (and any future document type).

   generateDocumentPDF(documentData, config) → PDFDocument

   Config shape:
   {
     title:        string              — e.g. "BON DE LIVRAISON"
     clientLabel:  string              — label above client block
     getSubLine:   (data) => string    — subtitle under the title
     getInfoBar:   (data) => string    — logistics bar text
     signatureLeft:  string            — left signature label
     signatureRight: string            — right signature label
   }
============================================================ */

const MARGIN = 50;

const UNIT_LABELS_FR = {
  pc: "Pièce",
  pcs: "Pièce",
  pce: "Pièce",
  piece: "Pièce",
  pair: "Paire",
  box: "Boîte",
  kg: "KG",
  g: "g",
  l: "L",
  lt: "L",
  m: "m",
  ml: "ml",
  u: "U",
  carton: "Carton",
  pack: "Pack",
  set: "Set",
  dozen: "Douzaine",
  douzaine: "Douzaine",
};

const formatUnitSymbol = (symbol) => {
  if (!symbol) return "U";
  const key = String(symbol).trim().toLowerCase();
  return UNIT_LABELS_FR[key] || (/^[a-z]{1,3}$/i.test(symbol) ? String(symbol).toUpperCase() : symbol);
};

const resolveLogoPath = (logo) => {
  if (!logo || typeof logo !== "string") return null;
  const file = logo.includes("/") ? logo.split("/").pop() : logo;
  if (!file) return null;
  const logoPath = path.join(process.cwd(), "uploads", "societes", file);
  return fs.existsSync(logoPath) ? logoPath : null;
};

/* ============================================================
   FORMATTING HELPERS (exported for use in service config fns)
============================================================ */

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatNumber = (number, decimals = 2) => {
  if (number === undefined || number === null || isNaN(number)) return "0,00";
  return parseFloat(number)
    .toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/[\u00A0\u202F]/g, " ");
};

export const formatMoney = (val) =>
  `${Number(val).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

/* ============================================================
   DRAW HEADER — invoice-style templates
============================================================ */

const tryDrawLogo = (doc, societe, theme, x, y, size = 52) => {
  const logoPath =
    theme.showLogo && societe.logo ? resolveLogoPath(societe.logo) : null;
  if (!logoPath) return { used: false };
  try {
    doc.image(logoPath, x, y, { fit: [size, size] });
    return { used: true };
  } catch {
    return { used: false };
  }
};

const getDocMeta = (data) => {
  const d = data.document || {};
  const num =
    d.numero || d.documentNumber || d.number || d.reference || d.code || "—";
  const rawDate = d.date || d.documentDate || d.createdAt;
  const date = rawDate ? formatDate(rawDate) : "—";
  return { num: String(num), date };
};

const drawHeader = (doc, data, config) => {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 2 * MARGIN;
  const societe = data.document.societe || {};
  const theme = resolveDocumentHeaderConfig(societe.documentHeaderConfig);
  const client =
    data.document.client ||
    (data.document.clientName
      ? { name: data.document.clientName, address: null, phone: null }
      : { name: "—", address: null, phone: null });
  const half = contentWidth / 2 - 10;
  const rightX = MARGIN + half + 20;
  const { num, date } = getDocMeta(data);
  const company = societe.raisonSocial || "—";
  const phone = societe.tel || societe.phone;
  const info = config.getInfoBar(data);
  let y = 40;

  if (theme.layout === "ledger") {
    y = 36;
    const logo = tryDrawLogo(doc, societe, theme, MARGIN, y, 40);
    const leftX = logo.used ? MARGIN + 48 : MARGIN;
    doc.fillColor(theme.primaryColor).font("Helvetica-Bold").fontSize(12);
    doc.text(company, leftX, y, { width: half - 20 });
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    if (theme.showAddress && societe.address) doc.text(societe.address, { width: half - 20 });
    if (theme.showPhone && phone) doc.text(`Tél: ${phone}`, { width: half - 20 });
    if (theme.showIce && societe.ice) doc.text(`ICE: ${societe.ice}`, { width: half - 20 });
    const leftEnd = doc.y;

    doc.fillColor(theme.titleColor).font("Helvetica-Bold").fontSize(22);
    doc.text(config.title, rightX, y, { width: half, align: "right" });
    const metaX = rightX;
    let metaY = y + 28;
    const rows = [
      ["Date", date],
      ["N°", num],
      ["Infos", info || "—"],
    ];
    rows.forEach(([label, value], i) => {
      const bg = i === 2 ? theme.highlightBg : "#ffffff";
      doc.rect(metaX, metaY, half, 16).fill(bg);
      doc.strokeColor(theme.dividerColor).lineWidth(0.6).rect(metaX, metaY, half * 0.35, 16).stroke();
      doc.strokeColor(theme.dividerColor).lineWidth(0.6).rect(metaX + half * 0.35, metaY, half * 0.65, 16).stroke();
      doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(7);
      doc.text(label, metaX + 4, metaY + 4, { width: half * 0.35 - 6 });
      doc.font("Helvetica").fontSize(7).fillColor(theme.textColor);
      doc.text(String(value).slice(0, 40), metaX + half * 0.35 + 4, metaY + 4, {
        width: half * 0.65 - 8,
        lineBreak: false,
      });
      metaY += 16;
    });
    y = Math.max(leftEnd, metaY) + 12;
    doc.rect(MARGIN, y, contentWidth, 16).fill(theme.primaryColor);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    doc.text(config.clientLabel, MARGIN + 8, y + 4);
    y += 16;
    doc.strokeColor(theme.dividerColor).lineWidth(0.7).rect(MARGIN, y, contentWidth, 48).stroke();
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(10);
    doc.text(client.name || "—", MARGIN + 8, y + 6, { width: contentWidth - 16 });
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    if (client.address) doc.text(client.address, MARGIN + 8, doc.y, { width: contentWidth - 16 });
    if (client.phone) doc.text(`Tél: ${client.phone}`, MARGIN + 8, doc.y);
    y += 56;
  } else if (theme.layout === "strip") {
    const logo = tryDrawLogo(doc, societe, theme, MARGIN, y, 44);
    const leftX = logo.used ? MARGIN + 52 : MARGIN;
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(12);
    doc.text(company, leftX, y + 4, { width: half - 30 });
    if (theme.showAddress && societe.address) {
      doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
      doc.text(societe.address, leftX, y + 20, { width: half - 30 });
    }
    doc.fillColor(theme.titleColor).font("Helvetica-Bold").fontSize(14);
    doc.text(`${config.title} ${num}`, rightX, y, { width: half, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    doc.text(config.getSubLine(data), rightX, y + 18, { width: half, align: "right" });
    y += 52;
    doc.fillColor(theme.textColor).font("Helvetica-Bold").fontSize(8);
    doc.text(config.clientLabel, MARGIN, y);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(theme.accentColor);
    doc.text(client.name || "—", MARGIN, y + 12);
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    if (client.address) doc.text(client.address, MARGIN, y + 26, { width: half });
    doc.text(`Date: ${date}`, rightX, y, { width: half, align: "right" });
    doc.text(`N°: ${num}`, rightX, y + 12, { width: half, align: "right" });
    y += 48;
    const blockW = contentWidth / 4;
    const blocks = [
      { label: "N°", value: num, bg: theme.primaryColor },
      { label: "Date", value: date, bg: theme.primaryColor },
      { label: "Infos", value: (info || "—").slice(0, 28), bg: theme.primaryColor },
      { label: "Document", value: config.title, bg: theme.highlightBg },
    ];
    blocks.forEach((b, i) => {
      const bx = MARGIN + i * blockW;
      doc.rect(bx, y, blockW - (i < 3 ? 2 : 0), 36).fill(b.bg);
      doc.fillColor("#ffffff").font("Helvetica").fontSize(7);
      doc.text(b.label, bx + 6, y + 6, { width: blockW - 12 });
      doc.font("Helvetica-Bold").fontSize(8);
      doc.text(String(b.value), bx + 6, y + 18, { width: blockW - 12, lineBreak: false });
    });
    y += 48;
  } else if (theme.layout === "framed") {
    doc.rect(0, 0, pageWidth, 70).fill(theme.primaryColor);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20);
    doc.text(config.title, MARGIN, 22);
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text(company, rightX, 16, { width: half, align: "right" });
    doc.font("Helvetica").fontSize(7).fillColor("#ffffff");
    let cy = 30;
    if (theme.showAddress && societe.address) {
      doc.text(societe.address, rightX, cy, { width: half, align: "right" });
      cy = doc.y;
    }
    if (theme.showPhone && phone) doc.text(phone, rightX, cy, { width: half, align: "right" });
    y = 85;
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(9);
    doc.text(`N°: ${num}`, MARGIN, y);
    doc.text(`Date: ${date}`, MARGIN, y + 14);
    if (info) {
      doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
      doc.text(info, MARGIN, y + 28, { width: half });
    }
    doc.fillColor(theme.primaryColor).font("Helvetica-Bold").fontSize(9);
    doc.text(config.clientLabel, rightX, y, { width: half, align: "right" });
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(10);
    doc.text(client.name || "—", rightX, y + 14, { width: half, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    if (client.address) doc.text(client.address, rightX, y + 28, { width: half, align: "right" });
    y += 55;
  } else if (theme.layout === "wave") {
    doc.rect(0, 0, pageWidth, 78).fill(theme.primaryColor);
    // soft wave approximation
    doc
      .moveTo(0, 70)
      .bezierCurveTo(pageWidth * 0.25, 95, pageWidth * 0.55, 55, pageWidth, 80)
      .lineTo(pageWidth, 0)
      .lineTo(0, 0)
      .fill(theme.primaryColor);
    doc.rect(0, 0, pageWidth, 70).fill(theme.secondaryColor);
    doc.rect(0, 0, pageWidth, 62).fill(theme.primaryColor);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20);
    doc.text(config.title, MARGIN, 22);
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`N°: ${num}`, rightX, 28, { width: half, align: "right" });
    y = 95;
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(9);
    doc.text(`${config.clientLabel}:`, MARGIN, y);
    doc.font("Helvetica").fontSize(9).fillColor(theme.textColor);
    doc.text(client.name || "—", MARGIN, y + 14);
    if (client.address) doc.text(client.address, MARGIN, y + 28, { width: half });
    if (client.phone) doc.text(client.phone, MARGIN, doc.y);
    doc.text(`Date: ${date}`, MARGIN, doc.y + 6);
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(9);
    doc.text("De:", rightX, y);
    doc.font("Helvetica").fontSize(9).fillColor(theme.textColor);
    doc.text(company, rightX, y + 14, { width: half });
    if (theme.showAddress && societe.address) doc.text(societe.address, rightX, y + 28, { width: half });
    if (theme.showPhone && phone) doc.text(phone, rightX, doc.y, { width: half });
    y = Math.max(doc.y, y + 70) + 8;
    if (info) {
      doc.fillColor(theme.infoBarText).font("Helvetica").fontSize(8);
      doc.text(info, MARGIN, y, { width: contentWidth });
      y = doc.y + 10;
    }
  } else {
    // atelier
    doc.fillColor(theme.titleColor).font("Helvetica-Bold").fontSize(22);
    doc.text(config.title, MARGIN, y);
    const logo = tryDrawLogo(doc, societe, theme, pageWidth - MARGIN - 52, y, 48);
    if (!logo.used) {
      doc.circle(pageWidth - MARGIN - 26, y + 24, 24).fill("#94a3b8");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
      doc.text("LOGO", pageWidth - MARGIN - 42, y + 20, { width: 32, align: "center" });
    }
    y += 34;
    doc.fillColor(theme.accentColor).font("Helvetica-Bold").fontSize(11);
    doc.text(company, MARGIN, y);
    doc.font("Helvetica").fontSize(8).fillColor(theme.textColor);
    if (theme.showAddress && societe.address) doc.text(societe.address, MARGIN, y + 14);
    if (theme.showPhone && phone) doc.text(phone, MARGIN, doc.y);
    y = Math.max(doc.y, y + 28) + 12;

    const colW = contentWidth / 3;
    doc.fillColor(theme.primaryColor).font("Helvetica-Bold").fontSize(8);
    doc.text(config.clientLabel, MARGIN, y);
    doc.text("CONTACT", MARGIN + colW, y);
    doc.text("N° DOC", MARGIN + colW * 2, y, { width: colW, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(theme.textColor);
    doc.text(client.name || "—", MARGIN, y + 12, { width: colW - 8 });
    if (client.address) doc.text(client.address, MARGIN, y + 26, { width: colW - 8 });
    const contactBits = [client.phone, theme.showIce && societe.ice ? `ICE ${societe.ice}` : null]
      .filter(Boolean)
      .join("\n");
    doc.text(contactBits || "—", MARGIN + colW, y + 12, { width: colW - 8 });
    doc.text(num, MARGIN + colW * 2, y + 12, { width: colW, align: "right" });
    doc.fillColor(theme.primaryColor).font("Helvetica-Bold").fontSize(8);
    doc.text("DATE", MARGIN + colW * 2, y + 28, { width: colW, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(theme.textColor);
    doc.text(date, MARGIN + colW * 2, y + 40, { width: colW, align: "right" });
    y += 62;
    doc.rect(MARGIN, y, contentWidth, 2).fill(theme.secondaryColor);
    y += 12;
    if (info) {
      doc.fillColor(theme.infoBarText).font("Helvetica").fontSize(8);
      doc.text(info, MARGIN, y, { width: contentWidth });
      y = doc.y + 10;
    }
  }

  doc.__docHeaderTheme = theme;
  doc.y = y;
};

/* ============================================================
   DRAW TABLE HEADER
============================================================ */

const TABLE_COLS = {
  no: 25,
  desc: 190,
  qty: 45,
  unit: 40,
  pu: 60,
  rem: 40,
  total: 75,
};

const TABLE_COLS_QTY_ONLY = {
  no: 40,
  desc: 340,
  qty: 70,
  unit: 70,
};

const buildTableX = (hidePrices = false) => {
  const cols = hidePrices ? TABLE_COLS_QTY_ONLY : TABLE_COLS;
  const x = { no: MARGIN };
  x.desc = x.no + cols.no;
  x.qty = x.desc + cols.desc;
  x.unit = x.qty + cols.qty;
  if (!hidePrices) {
    x.pu = x.unit + cols.unit;
    x.rem = x.pu + cols.pu;
    x.total = x.rem + cols.rem;
  }
  return { x, col: cols, hidePrices };
};

const drawTableHeader = (doc, config = {}) => {
  const hidePrices = !!config.hidePrices;
  const startY = doc.y;
  const tableWidth = doc.page.width - 2 * MARGIN;
  const { x, col } = buildTableX(hidePrices);
  const theme = doc.__docHeaderTheme || resolveDocumentHeaderConfig(null);
  const headerText = theme.tableHeaderText || theme.accentColor;

  if (theme.tableStyle === "lined") {
    doc
      .strokeColor(theme.primaryColor)
      .lineWidth(1.5)
      .moveTo(MARGIN, startY + 12)
      .lineTo(MARGIN + tableWidth, startY + 12)
      .stroke();
  } else if (theme.tableStyle === "bordered") {
    doc.rect(MARGIN, startY - 5, tableWidth, 20).fill(theme.tableHeaderBg);
    doc
      .strokeColor(theme.dividerColor)
      .lineWidth(0.8)
      .rect(MARGIN, startY - 5, tableWidth, 20)
      .stroke();
  } else {
    doc.rect(MARGIN, startY - 5, tableWidth, 20).fill(theme.tableHeaderBg);
  }

  doc.fillColor(headerText).fontSize(8).font("Helvetica-Bold");

  doc.text("N°", x.no, startY);
  doc.text("Désignation", x.desc, startY);
  doc.text("Qté", x.qty, startY, { width: col.qty, align: "right" });
  doc.text("Unité", x.unit, startY + 1, { width: col.unit, align: "center" });
  if (!hidePrices) {
    doc.text("P.U. (DH)", x.pu, startY, { width: col.pu, align: "right" });
    doc.text("Rem %", x.rem, startY, { width: col.rem, align: "right" });
    doc.text("Total HT", x.total, startY, { width: col.total, align: "right" });
  }

  doc.moveDown(1.5);
  return { x, col, hidePrices };
};

/* ============================================================
   DRAW TABLE ROW (recursive page-break)
============================================================ */

const drawTableRow = (doc, line, tableData, isAlternate, config = {}) => {
  const { x, col, hidePrices } = tableData;
  const startY = doc.y;
  const rowHeight = 20;

  if (startY + rowHeight > doc.page.height - 140) {
    doc.addPage();
    const newTableData = drawTableHeader(doc, config);
    return drawTableRow(doc, line, newTableData, isAlternate, config);
  }

  if (isAlternate) {
    doc
      .rect(MARGIN, startY - 2, doc.page.width - 2 * MARGIN, rowHeight)
      .fill("#fdfdfd");
  }

  doc.fillColor("#362323").fontSize(8).font("Helvetica");

  const productName =
    line.article?.name || line.variant?.name || line.description || "";
  const unit = formatUnitSymbol(
    line.article?.unitePrincipale?.symbol ||
      line.variant?.article?.unitePrincipale?.symbol ||
      "U",
  );

  doc.text(line.lineNumber.toString(), x.no, startY);
  doc.text(productName, x.desc, startY, {
    width: col.desc - 5,
    lineBreak: false,
  });
  doc.text(formatNumber(line.quantity), x.qty, startY, {
    width: col.qty,
    align: "right",
  });
  doc.text(unit, x.unit, startY, { width: col.unit, align: "center" });
  if (!hidePrices) {
    doc.text(formatNumber(line.unitPrice), x.pu, startY, {
      width: col.pu,
      align: "right",
    });
    doc.text(`${formatNumber((line.remise || 0) * 100, 0)}%`, x.rem, startY, {
      width: col.rem,
      align: "right",
    });
    doc.text(formatNumber(line.totalHT), x.total, startY, {
      width: col.total,
      align: "right",
    });
  }

  doc.moveDown(1.2);
};

/* ============================================================
   DRAW PACK ROW (with component sub-rows)
============================================================ */

const drawPackRow = (doc, packLine, lineNumber, tableData, isAlternate, config = {}) => {
  const { x, col, hidePrices } = tableData;
  const startY = doc.y;
  const rowHeight = 20;

  if (startY + rowHeight > doc.page.height - 140) {
    doc.addPage();
    const newTableData = drawTableHeader(doc, config);
    return drawPackRow(doc, packLine, lineNumber, newTableData, isAlternate, config);
  }

  if (isAlternate) {
    doc
      .rect(MARGIN, startY - 2, doc.page.width - 2 * MARGIN, rowHeight)
      .fill("#fdfdfd");
  }

  const quantity = parseFloat(packLine.quantity);
  const unitPrice = parseFloat(packLine.prixVente);
  const total = quantity * unitPrice;
  const packName = packLine.pack?.name || "Pack";

  doc.fillColor("#362323").fontSize(8).font("Helvetica-Bold");
  doc.text(lineNumber.toString(), x.no, startY);
  doc.text(`Pack: ${packName}`, x.desc, startY, {
    width: col.desc - 5,
    lineBreak: false,
  });
  doc.font("Helvetica");
  doc.text(formatNumber(quantity), x.qty, startY, {
    width: col.qty,
    align: "right",
  });
  doc.text("PACK", x.unit, startY, { width: col.unit, align: "center" });
  if (!hidePrices) {
    doc.text(formatNumber(unitPrice), x.pu, startY, {
      width: col.pu,
      align: "right",
    });
    doc.text("0%", x.rem, startY, { width: col.rem, align: "right" });
    doc.text(formatNumber(total), x.total, startY, {
      width: col.total,
      align: "right",
    });
  }

  doc.moveDown(1.2);

  // Component sub-rows (the pack's internal composition)
  const components = packLine.pack?.components || [];
  for (const comp of components) {
    drawPackComponentRow(doc, comp, quantity, tableData, config);
  }
};

const drawPackComponentRow = (doc, component, packQty, tableData, config = {}) => {
  const { x, col } = tableData;
  const startY = doc.y;
  const rowHeight = 14;

  if (startY + rowHeight > doc.page.height - 140) {
    doc.addPage();
    drawTableHeader(doc, config);
  }

  const componentName =
    component.article?.name || component.variant?.name || "—";
  const componentQty = parseFloat(component.quantity) * packQty;

  doc
    .fillColor("#666666")
    .fontSize(7)
    .font("Helvetica-Oblique")
    .text(`↳ ${componentName}`, x.desc + 8, startY, {
      width: col.desc - 13,
      lineBreak: false,
    });
  doc.text(formatNumber(componentQty), x.qty, startY, {
    width: col.qty,
    align: "right",
  });

  doc.moveDown(1);
};

/* ============================================================
   DRAW SUMMARY + SIGNATURES
============================================================ */

const drawSummary = (doc, data, config) => {
  const pageWidth = doc.page.width;
  const hidePrices = !!config.hidePrices;

  if (doc.y > doc.page.height - 200) doc.addPage();

  doc.moveDown(2);
  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(MARGIN, doc.y)
    .lineTo(pageWidth - MARGIN, doc.y)
    .stroke();
  doc.moveDown(1);

  if (!hidePrices) {
    const summaryX = pageWidth - 260;
    const valueWidth = 100;
    let y = doc.y;

    const row = (label, value, bold = false) => {
      doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(9)
        .text(label, summaryX, y);
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(String(value), summaryX + 130, y, {
          align: "right",
          width: valueWidth,
        });
      y += 16;
    };

    row("Total HT:", formatMoney(data.document.totalHT));
    row("Total TVA:", formatMoney(data.document.totalTVA));
    row("Total TTC:", formatMoney(data.document.totalTTC), true);
  }

  if (data.document.notes) {
    doc.moveDown(2);
    doc.fontSize(9).font("Helvetica-Bold").text("Notes:", MARGIN, doc.y);
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(data.document.notes, MARGIN, doc.y, {
        width: pageWidth - 2 * MARGIN,
      });
  }

  doc.moveDown(3);
  let y = doc.y;
  doc.fontSize(9).font("Helvetica");
  doc.text(config.signatureLeft, MARGIN, y, { lineBreak: false });
  doc.text(config.signatureRight, pageWidth - MARGIN - 150, y);
  doc.text("_________________", MARGIN, y + 40, { lineBreak: false });
  doc.text("_________________", pageWidth - MARGIN - 150, y + 40, {
    lineBreak: false,
  });
};

/* ============================================================
   DRAW FOOTER (page number)
============================================================ */

const drawFooter = (doc, pageNumber, totalPages) => {
  const pageWidth = doc.page.width;
  doc.save();
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(`Page ${pageNumber} / ${totalPages}`, MARGIN, doc.page.height - 40, {
      align: "center",
      width: pageWidth - 2 * MARGIN,
      lineBreak: false,
    });
  doc.restore();
};

/* ============================================================
   MAIN ENTRY POINT
============================================================ */

/**
 * Generates a PDF document for any client document type.
 *
 * @param {object} documentData  — the fully-loaded document object
 * @param {object} config        — rendering config (title, labels, fns)
 * @returns {PDFDocument}
 */
export const generateDocumentPDF = (documentData, config) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
  });

  drawHeader(doc, documentData, config);

  const columns = drawTableHeader(doc, config);
  const lines = documentData.document.lines || [];
  const packLines = documentData.packLines || [];

  lines.forEach((line, index) => {
    drawTableRow(doc, line, columns, index % 2 === 1, config);
  });

  packLines.forEach((packLine, index) => {
    const lineNumber = lines.length + index + 1;
    const isAlternate = (lines.length + index) % 2 === 1;
    drawPackRow(doc, packLine, lineNumber, columns, isAlternate, config);
  });

  drawSummary(doc, documentData, config);

  doc.flushPages();

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1, range.count);
  }

  return doc;
};

export default {
  generateDocumentPDF,
  formatDate,
  formatDateTime,
  formatNumber,
  formatMoney,
};
