const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.passenger.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.travelProfile.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.traveler.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.package.deleteMany();

  const passwordHash = await bcrypt.hash("Test@1234", 12);

  // ---- USERS ----

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@atlas.com",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      employee: {
        create: {
          firstName: "System",
          lastName: "Admin",
          isFullTime: true,
        },
      },
    },
  });

  const agentUser = await prisma.user.create({
    data: {
      email: "agent@atlas.com",
      username: "agent",
      passwordHash,
      role: "TRAVEL_AGENT",
      employee: {
        create: {
          firstName: "Jane",
          lastName: "Smith",
          isFullTime: true,
        },
      },
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: "john@example.com",
      username: "johndoe",
      passwordHash,
      role: "CUSTOMER",
      customer: {
        create: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-15"),
          phone: "+1234567890",
          accountType: "INDIVIDUAL",
          street: "123 Main St",
          city: "Beirut",
          state: "Beirut",
        },
      },
    },
  });

  const customer2User = await prisma.user.create({
    data: {
      email: "alice@example.com",
      username: "alicesmith",
      passwordHash,
      role: "CUSTOMER",
      customer: {
        create: {
          firstName: "Alice",
          lastName: "Smith",
          dateOfBirth: new Date("1985-06-20"),
          phone: "+9876543210",
          accountType: "GROUP",
          city: "Dubai",
          state: "Dubai",
        },
      },
    },
  });

  // ---- FLIGHTS ----

  const flightSeeds = [
    ["MEA-201", "Middle East Airlines", "Airbus A320", "2026-06-15T08:00:00Z", "Beirut (BEY)", "2026-06-15T12:00:00Z", "Dubai (DXB)", 350, 900, 180, 45],
    ["TK-742", "Turkish Airlines", "Boeing 737-800", "2026-06-15T14:30:00Z", "Beirut (BEY)", "2026-06-15T16:30:00Z", "Istanbul (IST)", 200, 550, 160, 72],
    ["AF-562", "Air France", "Airbus A330", "2026-07-01T06:00:00Z", "Beirut (BEY)", "2026-07-01T10:30:00Z", "Paris (CDG)", 450, 1200, 250, 98],
    ["EK-958", "Emirates", "Boeing 777-300ER", "2026-06-20T22:00:00Z", "Dubai (DXB)", "2026-06-21T02:00:00Z", "Beirut (BEY)", 380, 950, 300, 120],
    ["PC-315", "Pegasus Airlines", "Airbus A320neo", "2026-06-15T10:00:00Z", "Beirut (BEY)", "2026-06-15T12:30:00Z", "Istanbul (SAW)", 120, null, 186, 55],
    ["MEA-202", "Middle East Airlines", "Airbus A321", "2026-06-16T09:15:00Z", "Beirut (BEY)", "2026-06-16T12:50:00Z", "London (LHR)", 520, 1400, 200, 64],
    ["BA-673", "British Airways", "Boeing 787-9", "2026-06-18T11:00:00Z", "London (LHR)", "2026-06-18T18:20:00Z", "Beirut (BEY)", 540, 1450, 260, 110],
    ["LH-1340", "Lufthansa", "Airbus A320neo", "2026-06-22T07:45:00Z", "Beirut (BEY)", "2026-06-22T11:10:00Z", "Frankfurt (FRA)", 410, 1100, 180, 88],
    ["LH-1341", "Lufthansa", "Airbus A330", "2026-06-22T13:00:00Z", "Frankfurt (FRA)", "2026-06-22T18:00:00Z", "Dubai (DXB)", 460, 1250, 250, 145],
    ["QR-419", "Qatar Airways", "Boeing 777-300ER", "2026-06-19T02:45:00Z", "Beirut (BEY)", "2026-06-19T06:15:00Z", "Doha (DOH)", 310, 900, 320, 160],
    ["QR-001", "Qatar Airways", "Airbus A380", "2026-06-19T08:30:00Z", "Doha (DOH)", "2026-06-19T20:40:00Z", "New York (JFK)", 1100, 3800, 500, 220],
    ["EK-201", "Emirates", "Airbus A380", "2026-06-20T08:30:00Z", "Dubai (DXB)", "2026-06-20T14:00:00Z", "New York (JFK)", 1250, 4200, 500, 190],
    ["EK-202", "Emirates", "Airbus A380", "2026-06-21T01:30:00Z", "New York (JFK)", "2026-06-21T22:00:00Z", "Dubai (DXB)", 1180, 4000, 500, 175],
    ["TK-83", "Turkish Airlines", "Boeing 777-300ER", "2026-06-23T01:15:00Z", "Istanbul (IST)", "2026-06-23T06:40:00Z", "Tokyo (NRT)", 890, 2600, 340, 210],
    ["TK-84", "Turkish Airlines", "Airbus A350", "2026-06-25T10:00:00Z", "Istanbul (IST)", "2026-06-25T13:30:00Z", "Rome (FCO)", 180, 520, 280, 145],
    ["AZ-795", "ITA Airways", "Airbus A330", "2026-06-26T14:00:00Z", "Rome (FCO)", "2026-06-26T17:30:00Z", "Cairo (CAI)", 230, 640, 220, 98],
    ["MS-707", "EgyptAir", "Boeing 737-800", "2026-06-27T09:30:00Z", "Cairo (CAI)", "2026-06-27T11:10:00Z", "Beirut (BEY)", 180, 430, 180, 77],
    ["MS-801", "EgyptAir", "Boeing 787-9", "2026-06-28T02:30:00Z", "Cairo (CAI)", "2026-06-28T13:15:00Z", "Bangkok (BKK)", 720, 2100, 280, 155],
    ["TG-507", "Thai Airways", "Airbus A350", "2026-06-30T23:10:00Z", "Bangkok (BKK)", "2026-07-01T06:50:00Z", "Dubai (DXB)", 480, 1400, 300, 180],
    ["SQ-495", "Singapore Airlines", "Airbus A350", "2026-07-02T21:00:00Z", "Singapore (SIN)", "2026-07-03T01:30:00Z", "Dubai (DXB)", 650, 1900, 320, 140],
    ["SQ-26", "Singapore Airlines", "Airbus A380", "2026-07-03T10:00:00Z", "Singapore (SIN)", "2026-07-03T18:15:00Z", "London (LHR)", 980, 3500, 480, 245],
    ["CX-238", "Cathay Pacific", "Boeing 777-300ER", "2026-07-04T11:30:00Z", "Hong Kong (HKG)", "2026-07-04T17:40:00Z", "London (LHR)", 920, 2800, 340, 180],
    ["JL-45", "Japan Airlines", "Boeing 787-9", "2026-07-05T11:00:00Z", "Tokyo (HND)", "2026-07-05T15:30:00Z", "Singapore (SIN)", 560, 1650, 290, 200],
    ["AC-849", "Air Canada", "Boeing 787-9", "2026-07-06T21:30:00Z", "Toronto (YYZ)", "2026-07-07T10:10:00Z", "Frankfurt (FRA)", 690, 2100, 300, 155],
    ["UA-990", "United Airlines", "Boeing 767-300", "2026-07-07T17:00:00Z", "New York (JFK)", "2026-07-08T06:15:00Z", "Paris (CDG)", 640, 1850, 210, 90],
    ["DL-262", "Delta Air Lines", "Airbus A330", "2026-07-09T22:00:00Z", "Atlanta (ATL)", "2026-07-10T13:15:00Z", "Paris (CDG)", 720, 2050, 280, 120],
    ["KL-1534", "KLM", "Boeing 737-800", "2026-07-11T08:20:00Z", "Amsterdam (AMS)", "2026-07-11T10:35:00Z", "Rome (FCO)", 170, 450, 180, 92],
    ["KL-447", "KLM", "Boeing 777-300ER", "2026-07-12T14:00:00Z", "Amsterdam (AMS)", "2026-07-12T23:40:00Z", "Dubai (DXB)", 520, 1550, 320, 170],
    ["IB-3401", "Iberia", "Airbus A321", "2026-07-13T09:40:00Z", "Madrid (MAD)", "2026-07-13T12:05:00Z", "London (LHR)", 160, 420, 200, 78],
    ["FR-1848", "Ryanair", "Boeing 737-800", "2026-07-13T13:15:00Z", "London (STN)", "2026-07-13T16:50:00Z", "Athens (ATH)", 95, null, 189, 140],
    ["A3-652", "Aegean Airlines", "Airbus A320", "2026-07-14T07:30:00Z", "Athens (ATH)", "2026-07-14T09:15:00Z", "Santorini (JTR)", 85, null, 170, 115],
    ["OS-872", "Austrian Airlines", "Airbus A321neo", "2026-07-15T12:00:00Z", "Vienna (VIE)", "2026-07-15T15:40:00Z", "Dubai (DXB)", 430, 1180, 200, 108],
    ["SV-307", "Saudia", "Boeing 787-9", "2026-07-16T03:30:00Z", "Riyadh (RUH)", "2026-07-16T06:15:00Z", "Cairo (CAI)", 280, 780, 290, 150],
    ["SV-312", "Saudia", "Boeing 777-300ER", "2026-07-16T10:45:00Z", "Jeddah (JED)", "2026-07-16T13:20:00Z", "Istanbul (IST)", 340, 920, 320, 170],
    ["EY-601", "Etihad Airways", "Boeing 787-10", "2026-07-17T09:00:00Z", "Abu Dhabi (AUH)", "2026-07-17T13:50:00Z", "London (LHR)", 610, 1780, 280, 145],
    ["QF-2", "Qantas", "Airbus A380", "2026-07-18T22:10:00Z", "Sydney (SYD)", "2026-07-19T05:00:00Z", "Singapore (SIN)", 780, 2400, 480, 260],

    // ── BALI (DPS) ──
    ["SQ-936", "Singapore Airlines", "Boeing 787-10", "2026-07-20T07:30:00Z", "Singapore (SIN)", "2026-07-20T10:10:00Z", "Bali (DPS)", 320, 950, 280, 130],
    ["EK-368", "Emirates", "Boeing 777-300ER", "2026-07-21T03:00:00Z", "Dubai (DXB)", "2026-07-21T15:30:00Z", "Bali (DPS)", 720, 2100, 360, 140],
    ["QR-960", "Qatar Airways", "Boeing 777-300ER", "2026-07-22T01:50:00Z", "Doha (DOH)", "2026-07-22T16:00:00Z", "Bali (DPS)", 690, 2050, 320, 155],
    ["GA-715", "Garuda Indonesia", "Boeing 737-800", "2026-07-23T11:00:00Z", "Bali (DPS)", "2026-07-23T13:30:00Z", "Singapore (SIN)", 280, 820, 200, 88],
    ["TG-431", "Thai Airways", "Airbus A330", "2026-07-24T10:00:00Z", "Bangkok (BKK)", "2026-07-24T15:30:00Z", "Bali (DPS)", 380, 1100, 280, 102],

    // ── MALDIVES (MLE) ──
    ["EK-654", "Emirates", "Boeing 777-300ER", "2026-07-25T09:30:00Z", "Dubai (DXB)", "2026-07-25T15:00:00Z", "Maldives (MLE)", 580, 1700, 320, 140],
    ["QR-674", "Qatar Airways", "Airbus A350", "2026-07-26T08:15:00Z", "Doha (DOH)", "2026-07-26T15:30:00Z", "Maldives (MLE)", 550, 1620, 280, 90],
    ["SQ-454", "Singapore Airlines", "Boeing 787-10", "2026-07-27T19:00:00Z", "Singapore (SIN)", "2026-07-27T21:00:00Z", "Maldives (MLE)", 490, 1450, 280, 105],
    ["BA-265", "British Airways", "Boeing 777-200", "2026-07-28T11:30:00Z", "London (LHR)", "2026-07-29T03:00:00Z", "Maldives (MLE)", 920, 2700, 320, 70],
    ["EK-655", "Emirates", "Boeing 777-300ER", "2026-08-02T17:00:00Z", "Maldives (MLE)", "2026-08-02T20:30:00Z", "Dubai (DXB)", 590, 1730, 320, 145],

    // ── MARRAKECH (RAK) ──
    ["AT-401", "Royal Air Maroc", "Boeing 737-800", "2026-07-29T08:00:00Z", "Casablanca (CMN)", "2026-07-29T08:50:00Z", "Marrakech (RAK)", 95, 280, 162, 84],
    ["AF-1996", "Air France", "Airbus A320", "2026-07-30T13:00:00Z", "Paris (CDG)", "2026-07-30T16:30:00Z", "Marrakech (RAK)", 220, 640, 174, 95],
    ["BA-2698", "British Airways", "Airbus A320", "2026-07-31T07:30:00Z", "London (LGW)", "2026-07-31T11:30:00Z", "Marrakech (RAK)", 195, 540, 180, 110],
    ["MS-855", "EgyptAir", "Boeing 737-800", "2026-08-01T15:00:00Z", "Cairo (CAI)", "2026-08-01T19:00:00Z", "Marrakech (RAK)", 240, 680, 170, 102],
    ["AT-402", "Royal Air Maroc", "Boeing 737-800", "2026-08-05T16:00:00Z", "Marrakech (RAK)", "2026-08-05T20:30:00Z", "Paris (CDG)", 215, 620, 162, 90],

    // ── ICELAND (KEF) ──
    ["FI-451", "Icelandair", "Boeing 757-200", "2026-08-02T13:00:00Z", "London (LHR)", "2026-08-02T15:30:00Z", "Reykjavík (KEF)", 270, 760, 183, 96],
    ["FI-615", "Icelandair", "Boeing 737 MAX 9", "2026-08-03T09:30:00Z", "New York (JFK)", "2026-08-03T19:00:00Z", "Reykjavík (KEF)", 410, 1180, 178, 88],
    ["FI-547", "Icelandair", "Boeing 757-200", "2026-08-04T14:30:00Z", "Reykjavík (KEF)", "2026-08-04T20:00:00Z", "Paris (CDG)", 280, 790, 183, 95],
    ["DL-218", "Delta Air Lines", "Boeing 757-200", "2026-08-05T22:00:00Z", "New York (JFK)", "2026-08-06T08:00:00Z", "Reykjavík (KEF)", 430, 1240, 199, 122],

    // ── KYOTO (via OSAKA KIX) ──
    ["TK-46", "Turkish Airlines", "Boeing 787-9", "2026-08-06T01:30:00Z", "Istanbul (IST)", "2026-08-06T18:30:00Z", "Osaka (KIX)", 920, 2700, 280, 140],
    ["EK-316", "Emirates", "Boeing 777-300ER", "2026-08-07T03:00:00Z", "Dubai (DXB)", "2026-08-07T17:30:00Z", "Osaka (KIX)", 850, 2500, 320, 160],
    ["JL-225", "Japan Airlines", "Boeing 787-8", "2026-08-08T09:00:00Z", "Tokyo (HND)", "2026-08-08T10:15:00Z", "Osaka (KIX)", 180, 530, 290, 195],
    ["NH-973", "All Nippon Airways", "Boeing 787-9", "2026-08-15T11:00:00Z", "Osaka (KIX)", "2026-08-15T22:00:00Z", "Frankfurt (FRA)", 880, 2620, 290, 175],

    // ── QUEENSTOWN (ZQN) ──
    ["QF-121", "Qantas", "Airbus A320", "2026-08-09T07:00:00Z", "Sydney (SYD)", "2026-08-09T11:50:00Z", "Queenstown (ZQN)", 380, 1100, 174, 80],
    ["NZ-602", "Air New Zealand", "Airbus A320neo", "2026-08-10T13:00:00Z", "Auckland (AKL)", "2026-08-10T15:00:00Z", "Queenstown (ZQN)", 220, 620, 168, 95],
    ["EK-449", "Emirates", "Airbus A380", "2026-08-11T10:00:00Z", "Dubai (DXB)", "2026-08-12T06:30:00Z", "Auckland (AKL)", 1280, 3700, 500, 220],
    ["NZ-603", "Air New Zealand", "Airbus A320neo", "2026-08-18T16:30:00Z", "Queenstown (ZQN)", "2026-08-18T18:30:00Z", "Auckland (AKL)", 215, 610, 168, 90],

    // ── IBIZA (IBZ) ──
    ["IB-3812", "Iberia", "Airbus A320", "2026-08-12T08:30:00Z", "Madrid (MAD)", "2026-08-12T10:00:00Z", "Ibiza (IBZ)", 145, 410, 180, 88],
    ["FR-8473", "Ryanair", "Boeing 737-800", "2026-08-13T11:15:00Z", "London (STN)", "2026-08-13T14:50:00Z", "Ibiza (IBZ)", 105, null, 189, 142],
    ["BA-2640", "British Airways", "Airbus A319", "2026-08-14T15:00:00Z", "London (LGW)", "2026-08-14T18:30:00Z", "Ibiza (IBZ)", 180, 510, 170, 80],
    ["U2-7831", "easyJet", "Airbus A320neo", "2026-08-19T20:30:00Z", "Ibiza (IBZ)", "2026-08-20T00:10:00Z", "London (LGW)", 95, null, 186, 122],

    // ── ROME (more options) ──
    ["BA-549", "British Airways", "Airbus A320neo", "2026-08-15T08:00:00Z", "London (LHR)", "2026-08-15T11:30:00Z", "Rome (FCO)", 165, 460, 180, 102],
    ["MEA-237", "Middle East Airlines", "Airbus A320", "2026-08-16T10:00:00Z", "Beirut (BEY)", "2026-08-16T13:00:00Z", "Rome (FCO)", 220, 590, 180, 88],
    ["EK-097", "Emirates", "Boeing 777-300ER", "2026-08-17T13:30:00Z", "Dubai (DXB)", "2026-08-17T18:00:00Z", "Rome (FCO)", 380, 1080, 320, 145],

    // ── LISBON (LIS) ──
    ["TP-441", "TAP Air Portugal", "Airbus A321neo", "2026-08-18T09:00:00Z", "London (LHR)", "2026-08-18T11:30:00Z", "Lisbon (LIS)", 165, 470, 195, 105],
    ["MEA-227", "Middle East Airlines", "Airbus A321", "2026-08-19T11:00:00Z", "Beirut (BEY)", "2026-08-19T14:30:00Z", "Lisbon (LIS)", 290, 780, 200, 92],
    ["EK-191", "Emirates", "Boeing 777-300ER", "2026-08-20T15:00:00Z", "Dubai (DXB)", "2026-08-20T20:30:00Z", "Lisbon (LIS)", 410, 1180, 320, 140],
    ["AF-1124", "Air France", "Airbus A320", "2026-08-21T07:30:00Z", "Paris (CDG)", "2026-08-21T09:30:00Z", "Lisbon (LIS)", 145, 410, 180, 88],
    ["TP-442", "TAP Air Portugal", "Airbus A321neo", "2026-08-25T17:00:00Z", "Lisbon (LIS)", "2026-08-25T19:30:00Z", "London (LHR)", 170, 480, 195, 100],

    // ── SANTORINI (more options) ──
    ["TK-1879", "Turkish Airlines", "Airbus A321", "2026-08-22T11:00:00Z", "Istanbul (IST)", "2026-08-22T12:30:00Z", "Santorini (JTR)", 170, 480, 180, 95],
    ["A3-655", "Aegean Airlines", "Airbus A320", "2026-08-23T16:00:00Z", "Santorini (JTR)", "2026-08-23T17:45:00Z", "Athens (ATH)", 90, null, 170, 110],

    // ── EXTRA ROUTES (popular hubs) ──
    ["BA-105", "British Airways", "Boeing 777-300ER", "2026-08-24T20:30:00Z", "London (LHR)", "2026-08-25T07:30:00Z", "Dubai (DXB)", 460, 1320, 290, 140],
    ["SQ-635", "Singapore Airlines", "Airbus A350", "2026-08-25T14:00:00Z", "Tokyo (NRT)", "2026-08-25T20:30:00Z", "Singapore (SIN)", 540, 1580, 290, 160],
    ["NH-105", "All Nippon Airways", "Boeing 787-9", "2026-08-26T17:30:00Z", "Los Angeles (LAX)", "2026-08-27T22:00:00Z", "Tokyo (NRT)", 980, 2900, 290, 180],
    ["MEA-203", "Middle East Airlines", "Airbus A320", "2026-08-28T16:00:00Z", "Beirut (BEY)", "2026-08-28T20:00:00Z", "Dubai (DXB)", 360, 920, 180, 50],
    ["EK-959", "Emirates", "Boeing 777-300ER", "2026-08-29T14:00:00Z", "Dubai (DXB)", "2026-08-29T18:00:00Z", "Beirut (BEY)", 390, 970, 300, 125],
    ["TG-643", "Thai Airways", "Boeing 777-300ER", "2026-08-30T22:30:00Z", "Bangkok (BKK)", "2026-08-31T06:00:00Z", "Tokyo (NRT)", 580, 1700, 300, 140],
    ["EK-508", "Emirates", "Boeing 777-300ER", "2026-09-01T03:30:00Z", "Dubai (DXB)", "2026-09-01T08:00:00Z", "Mumbai (BOM)", 320, 920, 320, 175],
    ["MS-783", "EgyptAir", "Airbus A330", "2026-09-02T22:00:00Z", "Cairo (CAI)", "2026-09-03T03:30:00Z", "Dubai (DXB)", 290, 810, 290, 160],
    ["EK-927", "Emirates", "Boeing 777-300ER", "2026-09-03T13:00:00Z", "Dubai (DXB)", "2026-09-03T15:30:00Z", "Cairo (CAI)", 280, 790, 320, 165],
    ["MEA-301", "Middle East Airlines", "Airbus A320", "2026-09-04T09:00:00Z", "Beirut (BEY)", "2026-09-04T10:30:00Z", "Cairo (CAI)", 220, 580, 180, 92],
    ["SQ-211", "Singapore Airlines", "Airbus A350", "2026-09-05T20:30:00Z", "Singapore (SIN)", "2026-09-06T08:00:00Z", "Sydney (SYD)", 720, 2100, 290, 165],
  ];

  const flights = await Promise.all(
    flightSeeds.map(([flightNumber, airlineName, aircraftType, dep, depPort, arr, arrPort, eco, biz, total, avail]) =>
      prisma.flight.create({
        data: {
          flightNumber,
          airlineName,
          aircraftType,
          departureDate: new Date(dep),
          departurePort: depPort,
          arrivalDate: new Date(arr),
          arrivalPort: arrPort,
          economyPrice: eco,
          businessPrice: biz ?? undefined,
          totalSeats: total,
          availableSeats: avail,
        },
      })
    )
  );

  // ---- HOTELS ----

  const hotelSeeds = [
    // Existing 4
    ["Marriott Downtown Dubai", "Dubai", "UAE", "Sheikh Zayed Road", 5, "Luxury 5-star hotel in the heart of Dubai with pool, spa, and city views.", 250, 200, 35],
    ["Istanbul Grand Bazaar Hotel", "Istanbul", "Turkey", "Fatih, Sultanahmet", 4, "Charming 4-star hotel steps from the Grand Bazaar and Blue Mosque.", 120, 80, 22],
    ["Le Petit Paris Hotel", "Paris", "France", "5 Rue de Rivoli", 4, "Boutique hotel near the Louvre with classic Parisian charm.", 180, 50, 12],
    ["Santorini Breeze Resort", "Santorini", "Greece", "Oia Village", 5, "Stunning cliffside resort with caldera views and infinity pool.", 320, 30, 8],

    // ── DUBAI extras ──
    ["Burj View Boutique", "Dubai", "UAE", "Downtown Burj Khalifa", 4, "Floor-to-ceiling Burj Khalifa views with rooftop pool.", 195, 120, 40],
    ["Dubai Marina Suites", "Dubai", "UAE", "Marina Walk", 5, "Designer suites overlooking the Dubai Marina yacht harbor.", 420, 90, 25],

    // ── PARIS extras ──
    ["Champs-Élysées Suite", "Paris", "France", "Avenue des Champs-Élysées", 5, "Iconic suites on the Champs-Élysées with Arc de Triomphe view.", 430, 60, 14],
    ["Marais District Inn", "Paris", "France", "Rue des Rosiers", 3, "Cozy 3-star in the historic Marais district, near galleries and cafés.", 130, 40, 18],

    // ── ISTANBUL extras ──
    ["Bosphorus Palace Hotel", "Istanbul", "Turkey", "Beşiktaş Waterfront", 5, "Restored Ottoman palace with Bosphorus terraces and a hammam.", 280, 60, 19],

    // ── SANTORINI extras ──
    ["Caldera Sunset Suites", "Santorini", "Greece", "Imerovigli", 5, "Honeymoon-favorite suites carved into the cliff with private plunge pools.", 480, 22, 6],
    ["Fira Town Studios", "Santorini", "Greece", "Fira Old Port Road", 3, "Affordable studios a short walk from Fira's nightlife and shops.", 140, 35, 14],

    // ── BALI ──
    ["Bali Beachfront Villas", "Bali", "Indonesia", "Seminyak Beach", 4, "Private beachfront villas with daily breakfast and sunset views.", 180, 40, 16],
    ["Ubud Jungle Resort", "Bali", "Indonesia", "Sayan, Ubud", 5, "Treetop suites overlooking the Ayung River, with daily yoga and spa.", 290, 50, 18],
    ["Seminyak Boutique Hotel", "Bali", "Indonesia", "Jalan Kayu Aya", 3, "Walkable boutique stay close to Seminyak's beach clubs and restaurants.", 95, 70, 32],
    ["Nusa Dua Beach Resort", "Bali", "Indonesia", "Nusa Dua", 5, "Family-friendly beach resort with pools, kids club, and full-service spa.", 340, 110, 41],

    // ── MALDIVES ──
    ["Maldives Overwater Villa", "Maldives", "Maldives", "Baa Atoll", 5, "Iconic overwater villas with glass floors above turquoise lagoon.", 850, 30, 6],
    ["Maldives Reef Beach Resort", "Maldives", "Maldives", "South Malé Atoll", 5, "Beach villas with direct reef access, dive school, and sunset sandbar dinners.", 620, 45, 12],
    ["Maldives Sunset Sands", "Maldives", "Maldives", "North Malé Atoll", 4, "Quieter island resort with affordable beach bungalows and snorkel trips.", 380, 60, 22],

    // ── MARRAKECH ──
    ["La Mamounia Riad", "Marrakech", "Morocco", "Avenue Bab Jdid", 5, "Legendary palace hotel with lush gardens, three pools, and Moroccan spa.", 410, 45, 11],
    ["Marrakech Medina Riad", "Marrakech", "Morocco", "Derb Sidi Bouloukat", 4, "Traditional riad with central courtyard, rooftop terrace, and minutes to Jemaa el-Fnaa.", 130, 30, 12],
    ["Atlas Mountain Lodge", "Marrakech", "Morocco", "Imlil Valley", 3, "Cozy mountain lodge for hiking trips into the High Atlas.", 80, 25, 14],

    // ── REYKJAVÍK / ICELAND ──
    ["Reykjavík Northern Lights Hotel", "Reykjavík", "Iceland", "Hverfisgata", 4, "Modern downtown hotel with northern-lights wake-up service in winter.", 240, 80, 30],
    ["Iceland Aurora Lodge", "Reykjavík", "Iceland", "Þingvellir Outskirts", 5, "Glass-roofed countryside lodge for aurora viewing from bed.", 390, 35, 8],
    ["Reykjavík Harbour Inn", "Reykjavík", "Iceland", "Old Harbour", 3, "Friendly 3-star steps from whale-watching boats and the Sun Voyager.", 160, 50, 22],

    // ── KYOTO ──
    ["Kyoto Ryokan Kinosuke", "Kyoto", "Japan", "Higashiyama", 5, "Traditional ryokan with tatami rooms, kaiseki dinners, and onsen baths.", 380, 25, 7],
    ["Kyoto Garden Hotel", "Kyoto", "Japan", "Kawaramachi-dori", 4, "Sleek modern hotel with a Japanese garden and quick subway access.", 190, 80, 24],
    ["Kyoto Modern Stay", "Kyoto", "Japan", "Shijo Karasuma", 3, "Compact, design-forward rooms in the city's main shopping district.", 110, 90, 38],

    // ── QUEENSTOWN ──
    ["Queenstown Lakefront Hotel", "Queenstown", "New Zealand", "Marine Parade", 5, "Lakefront five-star with mountain views, fine dining, and concierge.", 410, 40, 11],
    ["Queenstown Alpine Lodge", "Queenstown", "New Zealand", "Sunshine Bay Road", 4, "Mid-range lodge close to the gondola and adventure outfitters.", 230, 55, 22],

    // ── IBIZA ──
    ["Ibiza Beach Resort", "Ibiza", "Spain", "Playa d'en Bossa", 5, "Beach club resort with infinity pool and walk to the legendary clubs.", 360, 70, 18],
    ["Ibiza Sunset Hotel", "Ibiza", "Spain", "Sant Antoni de Portmany", 4, "Steps from Café del Mar, perfect for sunset chasers.", 190, 60, 20],

    // ── ROME ──
    ["Rome Forum Boutique", "Rome", "Italy", "Via dei Fori Imperiali", 5, "Steps from the Colosseum, with rooftop bar and Forum views.", 290, 60, 16],
    ["Rome Trastevere Inn", "Rome", "Italy", "Via della Lungaretta", 3, "Lively neighborhood stay surrounded by trattorias and wine bars.", 110, 40, 18],
    ["Rome Vatican View", "Rome", "Italy", "Borgo Pio", 4, "Quiet boutique near St. Peter's with rooftop dome views.", 180, 55, 21],

    // ── LISBON ──
    ["Lisbon Tagus Hotel", "Lisbon", "Portugal", "Cais do Sodré", 4, "Modern waterfront hotel with rooftop pool and sunset bar.", 150, 90, 38],
    ["Lisbon Hilltop Boutique", "Lisbon", "Portugal", "Príncipe Real", 5, "Design hotel in Lisbon's hippest hilltop neighborhood.", 280, 35, 12],
    ["Alfama Stay", "Lisbon", "Portugal", "Alfama District", 3, "Family-run guesthouse in the historic fado quarter.", 90, 25, 14],

    // ── TOKYO ──
    ["Tokyo Park Hotel", "Tokyo", "Japan", "Shiodome", 5, "Skyline rooms above Hama-rikyu Gardens with Tokyo Tower views.", 340, 100, 32],
    ["Tokyo Shibuya Stay", "Tokyo", "Japan", "Dogenzaka", 3, "Compact hotel in the heart of Shibuya, walking distance to all the noise.", 130, 80, 30],

    // ── BANGKOK ──
    ["Bangkok Riverside Hotel", "Bangkok", "Thailand", "Charoen Krung Road", 4, "Riverfront hotel with pool, free shuttle boat to BTS Saphan Taksin.", 110, 150, 60],
    ["Bangkok Royal Palace", "Bangkok", "Thailand", "Sukhumvit Soi 21", 5, "Five-star tower with sky bar overlooking the city skyline.", 260, 200, 80],

    // ── SINGAPORE ──
    ["Marina Bay Suites", "Singapore", "Singapore", "Marina Bay", 5, "Skyline suites overlooking the Marina Bay Sands and the harbor.", 480, 90, 24],
    ["Singapore Garden Hotel", "Singapore", "Singapore", "Orchard Road", 4, "Smart 4-star on Orchard with proximity to Botanical Gardens and shopping.", 230, 110, 38],

    // ── LONDON ──
    ["London Bridge Hotel", "London", "United Kingdom", "Tooley Street", 5, "Five-star hotel by the Thames with rooftop afternoon tea.", 390, 100, 28],
    ["London Soho Boutique", "London", "United Kingdom", "Dean Street", 4, "Stylish 4-star in Soho's theatre district.", 230, 60, 20],

    // ── NEW YORK ──
    ["NYC Times Square Hotel", "New York", "United States", "West 44th Street", 4, "Bright 4-star steps from Broadway theatres.", 310, 200, 70],
    ["NYC Brooklyn Loft", "New York", "United States", "Williamsburg", 3, "Loft-style boutique in Williamsburg with rooftop bar.", 180, 50, 16],
  ];

  const hotels = await Promise.all(
    hotelSeeds.map(([name, city, country, address, starRating, description, pricePerNight, totalRooms, availableRooms]) =>
      prisma.hotel.create({
        data: { name, city, country, address, starRating, description, pricePerNight, totalRooms, availableRooms },
      })
    )
  );

  // ---- PACKAGES ----

  const packageSeeds = [
    // ── DUBAI ──
    {
      packageName: "Dubai Explorer 5-Day",
      description:
        "Complete Dubai experience including flights, 5-star hotel, airport transfer, desert safari, and city tour.",
      services: ["Round-trip flight", "5-night hotel", "Airport transfer", "Desert safari", "City tour", "Breakfast included"],
      price: 1800,
      discount: 10,
      isPublished: true,
      startDate: "2026-06-01",
      endDate: "2026-09-30",
    },
    {
      packageName: "Dubai Skyscrapers & Dunes 4-Day",
      description: "Quick Dubai immersion — Burj Khalifa observation, dune drive, and a yacht hour at Marina.",
      services: ["Round-trip flight", "4-night 4-star hotel", "Burj Khalifa entry", "Sunset desert safari", "Marina yacht hour"],
      price: 1500,
      discount: 8,
      isPublished: true,
      startDate: "2026-06-01",
      endDate: "2026-12-15",
    },

    // ── ISTANBUL ──
    {
      packageName: "Istanbul Heritage Tour",
      description: "4-day cultural tour of Istanbul covering historical sites, local cuisine, and a Bosphorus cruise.",
      services: ["Round-trip flight", "3-night hotel", "Guided heritage tour", "Bosphorus cruise", "Local cuisine tasting"],
      price: 1200,
      discount: 5,
      isPublished: true,
      startDate: "2026-05-01",
      endDate: "2026-10-31",
    },

    // ── GREEK ISLANDS / SANTORINI ──
    {
      packageName: "Greek Island Hopper",
      description: "7-day adventure through Santorini, Mykonos, and Athens with guided activities.",
      services: ["Round-trip flight", "Hotel accommodation", "Island ferry transfers", "Guided tours", "Beach activities", "Wine tasting"],
      price: 2500,
      discount: 0,
      isPublished: true,
      startDate: "2026-06-15",
      endDate: "2026-08-31",
    },
    {
      packageName: "Santorini Sunset Honeymoon",
      description: "5-day cliffside escape in Santorini with caldera dinners, wine tour, and a private catamaran sunset.",
      services: ["Round-trip flight", "5-night caldera suite", "Catamaran sunset cruise", "Wine tour", "Couples spa", "Daily breakfast"],
      price: 2950,
      discount: 12,
      isPublished: true,
      startDate: "2026-05-15",
      endDate: "2026-10-15",
    },

    // ── PARIS ──
    {
      packageName: "Paris Romantic Getaway",
      description: "3-day Paris trip for couples with Eiffel Tower dinner and Seine cruise.",
      services: ["Round-trip flight", "2-night boutique hotel", "Eiffel Tower dinner", "Seine river cruise", "Airport transfer"],
      price: 2000,
      discount: 15,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    },
    {
      packageName: "Paris Art & Cuisine 5-Day",
      description: "Louvre, Musée d'Orsay, a Marais food walk, and a half-day at Versailles. Slow Paris done right.",
      services: ["Round-trip flight", "5-night hotel", "Louvre + Orsay skip-the-line", "Marais food walk", "Versailles half-day", "Daily breakfast"],
      price: 2400,
      discount: 0,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-11-30",
    },

    // ── BALI ──
    {
      packageName: "Bali Wellness Retreat",
      description: "7-day Bali wellness immersion — daily yoga in Ubud, Balinese spa, rice-terrace hike, and a beach day in Seminyak.",
      services: ["Round-trip flight", "4 nights Ubud + 3 nights Seminyak", "Daily yoga", "Two spa treatments", "Rice-terrace hike", "Cooking class"],
      price: 2200,
      discount: 10,
      isPublished: true,
      startDate: "2026-05-01",
      endDate: "2026-12-31",
    },
    {
      packageName: "Bali Family Adventure 6-Day",
      description: "Family-friendly Bali — beach resort, monkey forest, water park, and a sunset temple visit.",
      services: ["Round-trip flight", "6-night beach resort", "Waterbom park tickets", "Monkey forest tour", "Tanah Lot sunset", "Family breakfast"],
      price: 2600,
      discount: 7,
      isPublished: true,
      startDate: "2026-06-01",
      endDate: "2026-09-30",
    },

    // ── MALDIVES ──
    {
      packageName: "Maldives Honeymoon Escape",
      description: "6-day overwater-villa stay with seaplane transfers, sunset cruise, and a private sandbank dinner.",
      services: ["Round-trip flight", "6-night overwater villa", "Seaplane transfers", "Sunset cruise", "Private sandbank dinner", "Snorkel kit"],
      price: 4500,
      discount: 8,
      isPublished: true,
      startDate: "2026-05-01",
      endDate: "2026-11-30",
    },
    {
      packageName: "Maldives Dive Week",
      description: "7-day reef-diving adventure with daily two-tank dives and a manta point trip.",
      services: ["Round-trip flight", "7-night beach villa", "10 reef dives", "Manta point trip", "All meals", "Equipment rental"],
      price: 3800,
      discount: 5,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-12-15",
    },

    // ── MARRAKECH ──
    {
      packageName: "Marrakech Souks & Sahara",
      description: "5-day Morocco classic — riad nights in Marrakech and a 2-day camel trek into the Sahara.",
      services: ["Round-trip flight", "3 nights Marrakech riad", "2-day Sahara camel trek", "Berber tent camp", "Tagine dinners", "Atlas day trip"],
      price: 1400,
      discount: 12,
      isPublished: true,
      startDate: "2026-03-01",
      endDate: "2026-11-30",
    },

    // ── ICELAND ──
    {
      packageName: "Iceland Aurora Adventure",
      description: "5-day winter Iceland — northern lights chase, Blue Lagoon, Golden Circle, and an ice-cave tour.",
      services: ["Round-trip flight", "5-night hotel", "Northern lights night tour", "Blue Lagoon entry", "Golden Circle day", "Glacier ice cave"],
      price: 2600,
      discount: 0,
      isPublished: true,
      startDate: "2026-10-15",
      endDate: "2027-03-15",
    },
    {
      packageName: "Iceland Ring Road 8-Day",
      description: "Self-drive loop around Iceland — black-sand beaches, glaciers, fjords, and waterfalls.",
      services: ["Round-trip flight", "Rental car (8 days)", "8 nights mixed lodging", "Suggested itinerary", "Breakfast", "24/7 road support"],
      price: 3400,
      discount: 5,
      isPublished: true,
      startDate: "2026-05-15",
      endDate: "2026-09-30",
    },

    // ── KYOTO ──
    {
      packageName: "Kyoto Cultural Immersion",
      description: "6-day Kyoto experience — ryokan stay, tea ceremony, Arashiyama bamboo, and a Nara day trip.",
      services: ["Round-trip flight", "3 nights ryokan + 3 nights modern hotel", "Tea ceremony", "Arashiyama bamboo tour", "Nara day trip", "Onsen access"],
      price: 2800,
      discount: 8,
      isPublished: true,
      startDate: "2026-03-15",
      endDate: "2026-11-15",
    },

    // ── QUEENSTOWN ──
    {
      packageName: "Queenstown Adventure Pack",
      description: "7-day adrenaline trip — bungee, jet boat, Milford Sound cruise, and gondola dinner.",
      services: ["Round-trip flight", "7-night hotel", "Bungee jump", "Shotover jet boat", "Milford Sound day cruise", "Skyline gondola dinner"],
      price: 3200,
      discount: 0,
      isPublished: true,
      startDate: "2026-09-01",
      endDate: "2027-03-31",
    },

    // ── IBIZA ──
    {
      packageName: "Ibiza Beach & Nightlife",
      description: "4-day Ibiza essentials — beach club days, sunset at Café del Mar, and two club night entries.",
      services: ["Round-trip flight", "4-night hotel", "Beach club passes", "Café del Mar sunset", "Two club entries", "Welcome drink"],
      price: 1500,
      discount: 10,
      isPublished: true,
      startDate: "2026-06-01",
      endDate: "2026-09-15",
    },

    // ── ROME ──
    {
      packageName: "Rome & Vatican Heritage",
      description: "4-day Rome essentials — Colosseum, Vatican, Forum, and a Trastevere food walk.",
      services: ["Round-trip flight", "4-night hotel", "Colosseum + Forum tour", "Vatican Museums skip-the-line", "Trastevere food walk", "Daily breakfast"],
      price: 1300,
      discount: 7,
      isPublished: true,
      startDate: "2026-03-01",
      endDate: "2026-12-15",
    },

    // ── LISBON ──
    {
      packageName: "Lisbon & Algarve Coast",
      description: "5-day Portugal sampler — 3 nights Lisbon, 2 nights Algarve beaches, with a fado evening.",
      services: ["Round-trip flight", "3 nights Lisbon + 2 nights Algarve", "Train transfers", "Fado dinner", "Sintra day trip", "Beach time"],
      price: 1100,
      discount: 5,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-10-31",
    },

    // ── TOKYO ──
    {
      packageName: "Tokyo Modern Marvels",
      description: "6-day Tokyo dive — Shibuya nights, robot shows, Tsukiji breakfast, and a day trip to Mt. Fuji.",
      services: ["Round-trip flight", "6-night hotel", "Tsukiji food tour", "Mt. Fuji day trip", "TeamLab tickets", "Pocket Wi-Fi"],
      price: 2700,
      discount: 0,
      isPublished: true,
      startDate: "2026-03-15",
      endDate: "2026-11-30",
    },

    // ── BANGKOK ──
    {
      packageName: "Bangkok Street Food Tour",
      description: "5-day Bangkok essentials — temples, river cruise, Chinatown food tour, and floating market.",
      services: ["Round-trip flight", "5-night hotel", "Grand Palace tour", "Chao Phraya cruise", "Chinatown food tour", "Floating market"],
      price: 1400,
      discount: 12,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    },

    // ── SINGAPORE ──
    {
      packageName: "Singapore Family Adventure",
      description: "5-day Singapore family pack — Universal Studios, Gardens by the Bay, Night Safari, and a hawker food tour.",
      services: ["Round-trip flight", "5-night hotel", "Universal Studios entry", "Gardens by the Bay", "Night Safari", "Hawker food tour"],
      price: 1900,
      discount: 8,
      isPublished: true,
      startDate: "2026-06-01",
      endDate: "2026-09-30",
    },

    // ── LONDON ──
    {
      packageName: "London Theatre Weekend",
      description: "3-day London weekend — West End show, afternoon tea, and a Tower of London visit.",
      services: ["Round-trip flight", "3-night hotel", "West End musical ticket", "Afternoon tea", "Tower of London entry", "Oyster card"],
      price: 890,
      discount: 5,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-12-15",
    },

    // ── NEW YORK ──
    {
      packageName: "New York Skyline Experience",
      description: "4-day NYC essentials — Statue of Liberty, Empire State, Central Park bike, and a Broadway show.",
      services: ["Round-trip flight", "4-night hotel", "Statue of Liberty cruise", "Empire State entry", "Central Park bike rental", "Broadway ticket"],
      price: 1700,
      discount: 0,
      isPublished: true,
      startDate: "2026-05-01",
      endDate: "2026-11-30",
    },

    // ── CAIRO ──
    {
      packageName: "Cairo & Pyramids 4-Day",
      description: "4-day Egypt essentials — Pyramids of Giza, Sphinx, Egyptian Museum, and a Nile dinner cruise.",
      services: ["Round-trip flight", "4-night hotel", "Pyramids + Sphinx tour", "Egyptian Museum", "Nile dinner cruise", "Khan el-Khalili bazaar"],
      price: 1100,
      discount: 10,
      isPublished: true,
      startDate: "2026-03-01",
      endDate: "2026-12-15",
    },

    // ── ATHENS ──
    {
      packageName: "Athens Classical Tour",
      description: "4-day Athens — Acropolis, Plaka neighborhood, Cape Sounion sunset, and a Greek cooking class.",
      services: ["Round-trip flight", "4-night hotel", "Acropolis + museum", "Cape Sounion sunset", "Greek cooking class", "Walking tour"],
      price: 1200,
      discount: 6,
      isPublished: true,
      startDate: "2026-04-01",
      endDate: "2026-10-31",
    },
  ];

  await Promise.all(
    packageSeeds.map((p) =>
      prisma.package.create({
        data: {
          packageName: p.packageName,
          description: p.description,
          services: p.services,
          price: p.price,
          discount: p.discount,
          isPublished: p.isPublished,
          startDate: p.startDate ? new Date(p.startDate) : undefined,
          endDate: p.endDate ? new Date(p.endDate) : undefined,
        },
      })
    )
  );

  console.log("Seed complete!");
  console.log("Test accounts (password: Test@1234 for all):");
  console.log("  Admin:    admin@atlas.com");
  console.log("  Agent:    agent@atlas.com");
  console.log("  Customer: john@example.com");
  console.log("  Customer: alice@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
