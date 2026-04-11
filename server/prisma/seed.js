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

  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        flightNumber: "MEA-201",
        airlineName: "Middle East Airlines",
        aircraftType: "Airbus A320",
        departureDate: new Date("2026-06-15T08:00:00Z"),
        departurePort: "Beirut (BEY)",
        arrivalDate: new Date("2026-06-15T12:00:00Z"),
        arrivalPort: "Dubai (DXB)",
        economyPrice: 350,
        businessPrice: 900,
        totalSeats: 180,
        availableSeats: 45,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "TK-742",
        airlineName: "Turkish Airlines",
        aircraftType: "Boeing 737-800",
        departureDate: new Date("2026-06-15T14:30:00Z"),
        departurePort: "Beirut (BEY)",
        arrivalDate: new Date("2026-06-15T16:30:00Z"),
        arrivalPort: "Istanbul (IST)",
        economyPrice: 200,
        businessPrice: 550,
        totalSeats: 160,
        availableSeats: 72,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AF-562",
        airlineName: "Air France",
        aircraftType: "Airbus A330",
        departureDate: new Date("2026-07-01T06:00:00Z"),
        departurePort: "Beirut (BEY)",
        arrivalDate: new Date("2026-07-01T10:30:00Z"),
        arrivalPort: "Paris (CDG)",
        economyPrice: 450,
        businessPrice: 1200,
        totalSeats: 250,
        availableSeats: 98,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "EK-958",
        airlineName: "Emirates",
        aircraftType: "Boeing 777-300ER",
        departureDate: new Date("2026-06-20T22:00:00Z"),
        departurePort: "Dubai (DXB)",
        arrivalDate: new Date("2026-06-21T02:00:00Z"),
        arrivalPort: "Beirut (BEY)",
        economyPrice: 380,
        businessPrice: 950,
        totalSeats: 300,
        availableSeats: 120,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "PC-315",
        airlineName: "Pegasus Airlines",
        aircraftType: "Airbus A320neo",
        departureDate: new Date("2026-06-15T10:00:00Z"),
        departurePort: "Beirut (BEY)",
        arrivalDate: new Date("2026-06-15T12:30:00Z"),
        arrivalPort: "Istanbul (SAW)",
        economyPrice: 120,
        totalSeats: 186,
        availableSeats: 55,
      },
    }),
  ]);

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
