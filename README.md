# ✈️ Travel Agency System (TAS)

> A full-stack web application that centralizes booking, customer management, payment processing, and provider communication into a single digital platform for modern travel agencies.

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Team Members](#team-members)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Project Management](#project-management)

---

## About the Project

The **Travel Agency System (TAS)** is developed as part of **CSC 490 – Software Engineering** at the Lebanese American University, under the supervision of **Dr. Ramzi Haraty**.

TAS is designed to close the gap between what modern travelers expect and what legacy systems can deliver. It eliminates booking conflicts, delayed confirmations, and poor inventory visibility by offering an integrated digital ecosystem with purpose-built interfaces for customers, travel agents, administrators, and external service providers.

---

## 👥 Team Members

| Name | Student ID |
|------|------------|
| Hadi Hussein | 202400516 |
| Youssef El Ezzi | 202401482 |
| Nijad Dheiny | 202401496 |
| Karim Hammoud | 202401593 |
| Rayan Madi | 202401943 |

**Team Name:** N/A  
**Course:** CSC 490 – Software Engineering  
**Institution:** Lebanese American University  
**Submitted to:** Dr. Ramzi Haraty

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript (React.js / Vue.js) |
| Backend | ASP.NET Core / Node.js (MVC Framework) |
| Database | PostgreSQL / Microsoft SQL Server |
| Authentication | JWT (JSON Web Tokens) |
| Payment Gateway | Stripe, PayPal |
| Notifications | Email & SMS Gateway |
| Security | HTTPS/TLS 1.3, AES-256 Encryption, RBAC |
| Version Control | GitHub |
| Project Management | OpenProject |

---

## 🏗️ System Architecture

TAS is built on four integrated architectural models:

- **Repository Architecture** – Centralized PostgreSQL/SQL Server database with ORM integration and AES-256 encryption for sensitive fields.
- **Layered Architecture** – Six-layer design separating Roles & Access Control, Interface, Business Logic, Service, Repository, and Security concerns.
- **Client-Server Architecture** – Stateless RESTful API design supporting desktops, tablets, and mobile browsers with secure HTTPS/TLS communication.
- **Web-Based Architecture** – MVC framework enabling broad accessibility, seamless third-party integrations, and lower maintenance costs.

---

## ✨ Features

### For Customers
- 🔍 Real-time flight, hotel, and tour package search with filters (destination, date, budget)
- 🤖 AI-powered trip planner using natural language input
- 🧠 Travel Personality Profile quiz for personalized recommendations
- 📋 Full booking history with invoice download
- ✏️ Self-service booking modification and cancellation with fee calculation
- 📧 Automated email & SMS notifications at every booking touchpoint

### For Travel Agents
- 👤 Full customer profile and reservation management
- 📦 Tour package creation, editing, and publishing
- 🎫 Booking on behalf of customers
- 🎫 Support ticket resolution from within the TAS dashboard

### For Administrators
- 🔐 Full user and role management (RBAC)
- 📊 Real-time sales and performance analytics dashboard
- ⚙️ System configuration: cancellation policies, pricing rules, notification templates
- 🔗 Third-party API credential management
- 💼 Job listing and applicant management via careers portal

### For External Service Providers
- 📡 Real-time inventory submission via API
- 📬 Automated booking notifications with passenger and service details

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (or .NET SDK if using ASP.NET Core)
- PostgreSQL or Microsoft SQL Server
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-org>/travel-agency-system.git
   cd travel-agency-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tas_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1h

   STRIPE_API_KEY=your_stripe_key
   PAYPAL_CLIENT_ID=your_paypal_id

   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_email_password

   SMS_API_KEY=your_sms_gateway_key
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

---

## 💻 Usage

### User Roles

| Role | Access |
|------|--------|
| Customer | Register, search, book, manage reservations, AI planner |
| Travel Agent | Manage packages, customer profiles, process bookings |
| Administrator | Full system access, reporting, configuration |
| Service Provider | Submit inventory via API, receive booking notifications |

### Default URLs
- Customer Portal: `http://localhost:3000/`
- Agent/Admin Dashboard: `http://localhost:3000/dashboard`
- Provider API: `http://localhost:3000/api/v1/provider`

---

## 🧪 Testing

This project includes **65 test cases** (TC_001–TC_065) covering:

| Module | Test Cases |
|--------|-----------|
| User Registration & Login | TC_001 – TC_007 |
| Browsing & Searching | TC_008 – TC_013 |
| Booking & Invoicing | TC_014 – TC_020 |
| AI Travel Planner | TC_021 – TC_023 |
| Booking History & Self-Service | TC_024 – TC_028 |
| Notifications | TC_029 – TC_032 |
| Security & Data Storage | TC_033 – TC_038 |
| Travel Personality Profile | TC_039 – TC_041 |
| Travel Agent – Package Management | TC_042 – TC_045 |
| Administrator Management | TC_046 – TC_051 |
| Customer Support | TC_052 – TC_054 |
| External Service Provider | TC_055 – TC_058 |
| Performance & Scalability | TC_059 – TC_061 |
| Compatibility | TC_062 – TC_065 |

To run the test suite:
```bash
npm test
```

---

## 📁 Project Management

- **GitHub Repository:** not yet adddd
- **OpenProject Board:** not yet added

### Task Ownership

| Team Member | Responsibilities |
|-------------|-----------------|
| Hadi Hussein | User Registration & Login modules, Customer Support, External Provider integration, test cases TC_001–TC_013, TC_052–TC_058 |
| Youssef El Ezzi | Travel Personality Profile, Agent Package Management, Compatibility testing, test cases TC_039–TC_041, TC_042–TC_045 (partial), TC_062–TC_065 |
| Nijad Dheiny | Booking & Invoicing, Booking History, Performance testing, test cases TC_014–TC_020, TC_024–TC_028, TC_059–TC_061 |
| Karim Hammoud | Administrator Management module, test cases TC_046–TC_051 |
| Rayan Madi | AI Travel Planner, Notifications, Security & Data Storage, test cases TC_021–TC_023, TC_029–TC_032, TC_033–TC_038 |

> Full task breakdown and progress tracking are documented in OpenProject. See the exported task report in the `docs/openproject/` folder of this repository.

---

## 📄 License

© 2026 Team N/A — Department of Computer Science & Mathematics, Lebanese American University.  
This project is for educational purposes only. Unauthorized reproduction or commercial use is prohibited.
