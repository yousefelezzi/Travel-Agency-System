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
      email: "admin@tas.com",
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
      email: "agent@tas.com",
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

  const hotels = await Promise.all([
    prisma.hotel.create({
      data: {
        name: "Marriott Downtown Dubai",
        city: "Dubai",
        country: "UAE",
        address: "Sheikh Zayed Road",
        starRating: 5,
        description: "Luxury 5-star hotel in the heart of Dubai with pool, spa, and city views.",
        pricePerNight: 250,
        totalRooms: 200,
        availableRooms: 35,
      },
    }),
    prisma.hotel.create({
      data: {
        name: "Istanbul Grand Bazaar Hotel",
        city: "Istanbul",
        country: "Turkey",
        address: "Fatih, Sultanahmet",
        starRating: 4,
        description: "Charming 4-star hotel steps from the Grand Bazaar and Blue Mosque.",
        pricePerNight: 120,
        totalRooms: 80,
        availableRooms: 22,
      },
    }),
    prisma.hotel.create({
      data: {
        name: "Le Petit Paris Hotel",
        city: "Paris",
        country: "France",
        address: "5 Rue de Rivoli",
        starRating: 4,
        description: "Boutique hotel near the Louvre with classic Parisian charm.",
        pricePerNight: 180,
        totalRooms: 50,
        availableRooms: 12,
      },
    }),
    prisma.hotel.create({
      data: {
        name: "Santorini Breeze Resort",
        city: "Santorini",
        country: "Greece",
        address: "Oia Village",
        starRating: 5,
        description: "Stunning cliffside resort with caldera views and infinity pool.",
        pricePerNight: 320,
        totalRooms: 30,
        availableRooms: 8,
      },
    }),
  ]);

  // ---- PACKAGES ----

  await Promise.all([
    prisma.package.create({
      data: {
        packageName: "Dubai Explorer 5-Day",
        description:
          "Complete Dubai experience including flights, 5-star hotel, airport transfer, desert safari, and city tour.",
        services: [
          "Round-trip flight",
          "5-night hotel",
          "Airport transfer",
          "Desert safari",
          "City tour",
          "Breakfast included",
        ],
        price: 1800,
        discount: 10,
        isPublished: true,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-09-30"),
      },
    }),
    prisma.package.create({
      data: {
        packageName: "Istanbul Heritage Tour",
        description:
          "4-day cultural tour of Istanbul covering historical sites, local cuisine, and a Bosphorus cruise.",
        services: [
          "Round-trip flight",
          "3-night hotel",
          "Guided heritage tour",
          "Bosphorus cruise",
          "Local cuisine tasting",
        ],
        price: 1200,
        discount: 5,
        isPublished: true,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-10-31"),
      },
    }),
    prisma.package.create({
      data: {
        packageName: "Greek Island Hopper",
        description:
          "7-day adventure through Santorini, Mykonos, and Athens with guided activities.",
        services: [
          "Round-trip flight",
          "Hotel accommodation",
          "Island ferry transfers",
          "Guided tours",
          "Beach activities",
          "Wine tasting",
        ],
        price: 2500,
        discount: 0,
        isPublished: true,
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-08-31"),
      },
    }),
    prisma.package.create({
      data: {
        packageName: "Paris Romantic Getaway",
        description: "3-day Paris trip for couples with Eiffel Tower dinner and Seine cruise.",
        services: [
          "Round-trip flight",
          "2-night boutique hotel",
          "Eiffel Tower dinner",
          "Seine river cruise",
          "Airport transfer",
        ],
        price: 2000,
        discount: 15,
        isPublished: false,
      },
    }),
  ]);

  console.log("Seed complete!");
  console.log("Test accounts (password: Test@1234 for all):");
  console.log("  Admin:    admin@tas.com");
  console.log("  Agent:    agent@tas.com");
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
