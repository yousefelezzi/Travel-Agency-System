import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Flights from "./pages/Flights";
import Hotels from "./pages/Hotels";
import Packages from "./pages/Packages";
import Book from "./pages/Book";
import Payment from "./pages/Payment";
import Dashboard from "./pages/Dashboard";
import BookingDetails from "./pages/BookingDetails";
import Planner from "./pages/Planner";
import Quiz from "./pages/Quiz";
import QuizResults from "./pages/QuizResults";
import Build from "./pages/Build";
import Destination from "./pages/Destination";
import Support from "./pages/Support";
import AgentDashboard from "./pages/AgentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Careers from "./pages/Careers";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/results" element={<QuizResults />} />
            <Route path="/build" element={<Build />} />
            <Route path="/destination/:slug" element={<Destination />} />
            <Route path="/support" element={<Support />} />
            <Route
              path="/agent"
              element={
                <ProtectedRoute roles={["TRAVEL_AGENT", "ADMIN"]}>
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/careers" element={<Careers />} />
            <Route
              path="/book"
              element={
                <ProtectedRoute roles={["CUSTOMER", "TRAVEL_AGENT", "ADMIN"]}>
                  <Book />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:bookingId"
              element={
                <ProtectedRoute roles={["CUSTOMER"]}>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <ProtectedRoute roles={["CUSTOMER"]}>
                  <Planner />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
