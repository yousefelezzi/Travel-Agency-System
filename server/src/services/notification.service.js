const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "ATLAS Travel <noreply@atlas.com>";

const isConfigured =
  SMTP_HOST && SMTP_USER && SMTP_PASS && !SMTP_USER.includes("your_email");

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

if (!isConfigured) {
  console.warn(
    "[notifications] SMTP_* not set — emails will be logged to console instead of sent."
  );
}

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

const wrap = (title, html) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0A0E17;">
    <div style="text-align: center; padding: 16px 0; border-bottom: 2px solid #F59E0B;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">ATLAS</h1>
      <p style="margin: 4px 0 0; color: #94A3B8; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Your Trip. Your Way.</p>
    </div>
    <h2 style="font-size: 22px; margin: 28px 0 16px; color: #0A0E17;">${title}</h2>
    ${html}
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #94A3B8; text-align: center;">
      ATLAS Travel Agency System · Need help? <a href="mailto:concierge@atlas.com" style="color: #F59E0B;">concierge@atlas.com</a>
    </p>
  </div>
`;

const itemsTable = (booking) => {
  if (!booking.items || booking.items.length === 0) return "";
  const rows = booking.items
    .map((i) => {
      const label =
        (i.flight && `Flight ${i.flight.flightNumber} (${i.flight.departurePort} → ${i.flight.arrivalPort})`) ||
        (i.hotel && `Hotel: ${i.hotel.name} — ${i.hotel.city}`) ||
        (i.package && `Package: ${i.package.packageName}`) ||
        "Item";
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F1F5F9;">${label}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F1F5F9; text-align: right; font-weight: 600;">${fmtMoney(Number(i.unitPrice) * (i.quantity || 1))}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr><th style="text-align: left; padding: 8px 0; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em;">Item</th><th style="text-align: right; padding: 8px 0; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em;">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

async function sendEmail({ to, subject, html, text }) {
  const payload = { from: MAIL_FROM, to, subject, html, text };
  if (!transporter) {
    console.log(
      `[notifications] (mock) Would email ${to} | Subject: ${subject}`
    );
    return { mock: true };
  }
  try {
    const info = await transporter.sendMail(payload);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[notifications] sendMail failed:", err.message);
    return { error: err.message };
  }
}

const subjects = {
  confirmation: (b) => `Booking confirmed · ATLAS #${b.id.slice(0, 8).toUpperCase()}`,
  modification: (b) => `Booking updated · ATLAS #${b.id.slice(0, 8).toUpperCase()}`,
  cancellation: (b) => `Booking cancelled · ATLAS #${b.id.slice(0, 8).toUpperCase()}`,
  reminder: (b) => `Trip reminder · ATLAS #${b.id.slice(0, 8).toUpperCase()}`,
};

async function sendBookingConfirmation({ booking, customerEmail }) {
  const html = wrap(
    "Your trip is confirmed.",
    `
      <p>Thanks for booking with ATLAS. Your reservation is locked in.</p>
      <p style="background: #FFF7E6; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #F59E0B;">
        <strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br />
        <strong>Status:</strong> ${booking.status}<br />
        <strong>Travelers:</strong> ${booking.numberOfPersons}<br />
        <strong>Total:</strong> ${fmtMoney(Number(booking.totalAmount) - Number(booking.discount || 0))}
      </p>
      ${itemsTable(booking)}
      <p>Manage your booking at any time from the dashboard.</p>
    `
  );
  return sendEmail({
    to: customerEmail,
    subject: subjects.confirmation(booking),
    html,
    text: `Booking ${booking.id} confirmed. Total ${fmtMoney(booking.totalAmount)}.`,
  });
}

async function sendBookingModification({ booking, customerEmail, changes = [] }) {
  const changesList = changes.length
    ? `<ul>${changes.map((c) => `<li>${c}</li>`).join("")}</ul>`
    : "<p>Your booking details were updated.</p>";
  const html = wrap(
    "Your booking has been updated.",
    `
      <p>We've applied the following changes to your reservation:</p>
      ${changesList}
      <p style="background: #F0F9FF; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #0EA5E9;">
        <strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br />
        <strong>New total:</strong> ${fmtMoney(Number(booking.totalAmount) - Number(booking.discount || 0))}
      </p>
      ${itemsTable(booking)}
    `
  );
  return sendEmail({
    to: customerEmail,
    subject: subjects.modification(booking),
    html,
    text: `Booking ${booking.id} updated.`,
  });
}

async function sendBookingCancellation({
  booking,
  customerEmail,
  cancellationFee,
  refundAmount,
  refundEta = "5–10 business days",
}) {
  const html = wrap(
    "Your booking has been cancelled.",
    `
      <p>We've cancelled your reservation as requested.</p>
      <p style="background: #FEF2F2; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #EF4444;">
        <strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br />
        <strong>Cancellation fee:</strong> ${fmtMoney(cancellationFee)}<br />
        <strong>Refund amount:</strong> ${fmtMoney(refundAmount)}<br />
        <strong>Expected refund:</strong> ${refundEta}
      </p>
      <p>If you didn't request this cancellation, please contact concierge@atlas.com immediately.</p>
    `
  );
  return sendEmail({
    to: customerEmail,
    subject: subjects.cancellation(booking),
    html,
    text: `Booking ${booking.id} cancelled. Refund ${fmtMoney(refundAmount)}.`,
  });
}

async function sendProviderBookingNotification({ booking, providerEmail, providerName, items }) {
  const itemLines = (items || [])
    .map((i) => {
      if (i.flight) {
        return `<li><strong>${i.flight.flightNumber}</strong> · ${i.flight.departurePort} → ${i.flight.arrivalPort} · ${fmtDate(i.flight.departureDate)} · ${i.quantity || 1} seat${(i.quantity || 1) === 1 ? "" : "s"}</li>`;
      }
      if (i.hotel) {
        return `<li><strong>${i.hotel.name}</strong> · ${i.hotel.city} · ${fmtDate(i.checkIn)} → ${fmtDate(i.checkOut)}</li>`;
      }
      if (i.package) {
        return `<li><strong>${i.package.packageName}</strong> · ${i.quantity || 1} pax</li>`;
      }
      return "";
    })
    .join("");

  const passengerLines = (booking.passengers || [])
    .map(
      (p) =>
        `<li>${[p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ")}${
          p.passportNumber ? ` · Passport ${p.passportNumber}` : ""
        }${p.nationality ? ` (${p.nationality})` : ""}</li>`
    )
    .join("");

  const html = wrap(
    `New booking from ATLAS — ${booking.id.slice(0, 8).toUpperCase()}`,
    `
      <p>Hi ${providerName},</p>
      <p>A traveler just booked one of your services through ATLAS. Please confirm receipt and provision the reservation on your end.</p>
      <p style="background: #F0F9FF; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #0EA5E9;">
        <strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br />
        <strong>Travelers:</strong> ${booking.numberOfPersons}
      </p>
      <strong>Items</strong>
      <ul>${itemLines}</ul>
      ${passengerLines ? `<strong>Passengers</strong><ul>${passengerLines}</ul>` : ""}
      <p>Reply to this email or hit the ATLAS provider API to confirm. Bookings without confirmation within 24h are flagged as PENDING.</p>
    `
  );
  return sendEmail({
    to: providerEmail,
    subject: `New ATLAS booking · ${booking.id.slice(0, 8).toUpperCase()}`,
    html,
    text: `New booking ${booking.id} for ${booking.numberOfPersons} traveler(s).`,
  });
}

async function sendTripReminder({ booking, customerEmail, departureDate }) {
  const html = wrap(
    "Your trip is coming up.",
    `
      <p>Just a heads-up that your ATLAS trip is around the corner.</p>
      <p style="background: #F0FDF4; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #22C55E;">
        <strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br />
        <strong>Departure:</strong> ${fmtDate(departureDate)}
      </p>
      ${itemsTable(booking)}
      <p>Pack well, leave early, and have an incredible trip.</p>
    `
  );
  return sendEmail({
    to: customerEmail,
    subject: subjects.reminder(booking),
    html,
    text: `Reminder: your ATLAS trip ${booking.id} departs ${fmtDate(departureDate)}.`,
  });
}

module.exports = {
  isConfigured,
  sendEmail,
  sendBookingConfirmation,
  sendBookingModification,
  sendBookingCancellation,
  sendTripReminder,
  sendProviderBookingNotification,
};
