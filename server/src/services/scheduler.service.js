const cron = require("node-cron");
const prisma = require("../config/db");
const { sendTripReminder } = require("./notification.service");
const { earliestTravelDate, daysUntil } = require("./cancellation.service");

const REMINDER_WINDOW_DAYS = 7; // Send reminder ~7 days before travel
const TIMEZONE = process.env.CRON_TZ || "Asia/Beirut";

// Find confirmed bookings with earliest travel date inside today's reminder
// window (7-day mark) and email each customer once.
async function runTripReminderJob() {
  const startedAt = new Date();
  console.log(`[scheduler] trip reminder job started at ${startedAt.toISOString()}`);

  const upcoming = await prisma.booking.findMany({
    where: { status: "CONFIRMED" },
    include: {
      items: { include: { flight: true, hotel: true, package: true } },
      customer: { include: { user: { select: { email: true } } } },
    },
  });

  let queued = 0;
  for (const booking of upcoming) {
    const travel = earliestTravelDate(booking);
    if (!travel) continue;
    const days = daysUntil(travel, startedAt);
    // Fire once for bookings sitting in the [REMINDER_WINDOW_DAYS - 0, +0] day window.
    // The job runs daily at the same time so the window is essentially 24h wide.
    if (days !== REMINDER_WINDOW_DAYS) continue;

    const email = booking.customer?.user?.email;
    if (!email) continue;

    try {
      await sendTripReminder({
        booking,
        customerEmail: email,
        departureDate: travel,
      });
      queued += 1;
    } catch (err) {
      console.error(
        `[scheduler] reminder failed for booking ${booking.id}:`,
        err.message
      );
    }
  }
  console.log(`[scheduler] trip reminder job done — ${queued} email(s) queued`);
}

function start() {
  // Daily at 09:00 in the configured timezone.
  cron.schedule("0 9 * * *", runTripReminderJob, { timezone: TIMEZONE });
  console.log(`[scheduler] trip reminder cron registered (daily 09:00 ${TIMEZONE})`);
}

module.exports = { start, runTripReminderJob };
