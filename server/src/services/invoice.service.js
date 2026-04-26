const PDFDocument = require("pdfkit");

const ATLAS_NAVY = "#0A0E17";
const ATLAS_AMBER = "#F59E0B";
const ATLAS_SLATE = "#475569";
const ATLAS_LIGHT = "#94A3B8";

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// Streams a styled invoice PDF for a fully-loaded booking record.
// Caller provides the response object so we can stream directly without
// buffering the whole PDF in memory.
function streamInvoicePdf({ booking, customer, response }) {
  const invoice = booking.invoice;
  const total = Number(booking.totalAmount) - Number(booking.discount || 0);

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `ATLAS Invoice ${invoice?.invoiceNumber || ""}`,
      Author: "ATLAS Travel",
    },
  });

  // Set headers + pipe
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="ATLAS-${invoice?.invoiceNumber || booking.id.slice(0, 8)}.pdf"`
  );
  doc.pipe(response);

  // ─── Header band ───
  doc.rect(0, 0, doc.page.width, 90).fill(ATLAS_NAVY);
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text("ATLAS", 50, 30);
  doc
    .fillColor(ATLAS_AMBER)
    .fontSize(9)
    .text("YOUR TRIP. YOUR WAY.", 50, 62, { characterSpacing: 2 });
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica")
    .fontSize(10)
    .text("ATLAS Travel Agency System", doc.page.width - 250, 32, {
      width: 200,
      align: "right",
    })
    .text("concierge@atlas.com", doc.page.width - 250, 48, {
      width: 200,
      align: "right",
    })
    .text("Beirut · Lebanon", doc.page.width - 250, 62, {
      width: 200,
      align: "right",
    });

  doc.fillColor("#000000").y = 120;

  // ─── Invoice meta block ───
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(ATLAS_NAVY)
    .text("Invoice", 50);
  doc
    .moveDown(0.2)
    .font("Helvetica")
    .fontSize(10)
    .fillColor(ATLAS_SLATE)
    .text(`Invoice #: ${invoice?.invoiceNumber || "PENDING"}`)
    .text(`Issued:    ${fmtDate(invoice?.issuedAt || booking.bookingDate)}`)
    .text(`Booking:   ${booking.id}`);

  doc.moveDown(1);

  // ─── Bill-to ───
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(ATLAS_NAVY)
    .text("Billed to", 50);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(ATLAS_SLATE)
    .text(`${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Guest")
    .text(customer.email || "");
  if (customer.street || customer.city) {
    doc.text(
      [customer.street, customer.city, customer.state]
        .filter(Boolean)
        .join(", ")
    );
  }
  if (customer.phone) doc.text(customer.phone);

  doc.moveDown(1.2);

  // ─── Items table ───
  const tableTop = doc.y;
  const colX = { item: 50, qty: 360, unit: 410, total: 480 };

  // Table header
  doc
    .rect(50, tableTop, doc.page.width - 100, 22)
    .fill("#F1F5F9");
  doc
    .fillColor(ATLAS_NAVY)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("DESCRIPTION", colX.item + 6, tableTop + 6)
    .text("QTY", colX.qty, tableTop + 6, { width: 40, align: "right" })
    .text("UNIT", colX.unit, tableTop + 6, { width: 50, align: "right" })
    .text("AMOUNT", colX.total, tableTop + 6, { width: 60, align: "right" });

  let y = tableTop + 30;
  for (const item of booking.items || []) {
    const label =
      (item.flight &&
        `Flight ${item.flight.flightNumber}\n${item.flight.departurePort} → ${item.flight.arrivalPort} (${item.seatClass || "economy"})`) ||
      (item.hotel &&
        `${item.hotel.name}\n${item.hotel.city}${
          item.checkIn && item.checkOut
            ? ` · ${fmtDate(item.checkIn)} → ${fmtDate(item.checkOut)}`
            : ""
        }`) ||
      (item.package && `Package: ${item.package.packageName}`) ||
      "Item";

    const qty = item.quantity || 1;
    const unit = Number(item.unitPrice || 0);
    const lineTotal = unit * qty;

    doc
      .fillColor(ATLAS_NAVY)
      .font("Helvetica")
      .fontSize(10)
      .text(label, colX.item, y, { width: colX.qty - colX.item - 10 });

    doc
      .fillColor(ATLAS_SLATE)
      .text(String(qty), colX.qty, y, { width: 40, align: "right" })
      .text(fmtMoney(unit), colX.unit, y, { width: 50, align: "right" });

    doc
      .fillColor(ATLAS_NAVY)
      .font("Helvetica-Bold")
      .text(fmtMoney(lineTotal), colX.total, y, { width: 60, align: "right" });

    y = doc.y + 10;
    doc
      .strokeColor("#E2E8F0")
      .moveTo(50, y - 4)
      .lineTo(doc.page.width - 50, y - 4)
      .stroke();
  }

  // ─── Totals block ───
  doc.moveDown(1);
  const totalsX = doc.page.width - 200;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(ATLAS_SLATE)
    .text("Subtotal", totalsX, doc.y, { width: 90, align: "right" })
    .text(fmtMoney(booking.totalAmount), totalsX + 90, doc.y - 12, {
      width: 60,
      align: "right",
    });

  if (Number(booking.discount) > 0) {
    doc
      .moveDown(0.3)
      .text("Discount", totalsX, doc.y, { width: 90, align: "right" })
      .text(`− ${fmtMoney(booking.discount)}`, totalsX + 90, doc.y - 12, {
        width: 60,
        align: "right",
      });
  }

  doc
    .moveDown(0.5)
    .strokeColor(ATLAS_AMBER)
    .lineWidth(1.5)
    .moveTo(totalsX, doc.y)
    .lineTo(totalsX + 150, doc.y)
    .stroke();

  doc
    .moveDown(0.4)
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(ATLAS_NAVY)
    .text("TOTAL PAID", totalsX, doc.y, { width: 90, align: "right" })
    .text(fmtMoney(total), totalsX + 90, doc.y - 14, {
      width: 60,
      align: "right",
    });

  // ─── Passengers ───
  if (booking.passengers?.length) {
    doc.moveDown(2);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(ATLAS_NAVY)
      .text("Passengers");
    doc.font("Helvetica").fontSize(10).fillColor(ATLAS_SLATE);
    booking.passengers.forEach((p, i) => {
      const name = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(" ");
      const passport = p.passportNumber
        ? ` · Passport ${p.passportNumber}`
        : "";
      doc.text(`${i + 1}. ${name}${passport}`);
    });
  }

  // ─── Footer ───
  const footerY = doc.page.height - 80;
  doc
    .strokeColor("#E2E8F0")
    .moveTo(50, footerY)
    .lineTo(doc.page.width - 50, footerY)
    .stroke();
  doc
    .fillColor(ATLAS_LIGHT)
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Thank you for booking with ATLAS. For changes or questions, contact concierge@atlas.com.",
      50,
      footerY + 12,
      { align: "center", width: doc.page.width - 100 }
    )
    .text(
      "This invoice is issued by ATLAS Travel Agency System for educational use as part of CSC 490.",
      50,
      footerY + 28,
      { align: "center", width: doc.page.width - 100 }
    );

  doc.end();
}

module.exports = { streamInvoicePdf };
