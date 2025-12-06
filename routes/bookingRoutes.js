import express from "express";
import {
  bookRide,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  getRideBookings,
  respondToBooking,
  updateBookingStatus,
  getDriverBookings,
  getPassengerHistory,
  getDriverHistory,
  getActiveBookings,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==================== PASSENGER ROUTES ====================
router.post("/", protect, requireRole("passenger"), bookRide);                    // Book a ride
router.get("/my-bookings", protect, requireRole("passenger"), getMyBookings);     // Get passenger's bookings
router.patch("/:id/cancel", protect, requireRole("passenger"), cancelBooking);    // Cancel booking
router.get("/passenger/history", protect, requireRole("passenger"), getPassengerHistory); // Passenger history & stats

// ==================== DRIVER ROUTES ====================
router.get("/ride/:rideId", protect, requireRole("driver"), getRideBookings);     // Get bookings for a ride
router.get("/driver/all", protect, requireRole("driver"), getDriverBookings);     // Get all driver's bookings
router.patch("/:id/respond", protect, requireRole("driver"), respondToBooking);   // Confirm/Reject booking
router.patch("/:id/status", protect, requireRole("driver"), updateBookingStatus); // Update booking status
router.get("/driver/history", protect, requireRole("driver"), getDriverHistory);  // Driver history & stats

// ==================== COMMON ROUTES ====================
router.get("/active", protect, getActiveBookings);                                // Get active/ongoing bookings
router.get("/:id", protect, getBookingDetails);                                   // Get booking details

export default router;
