import express from "express";
import {
  postRide,
  getMyRides,
  updateRideStatus,
  updateRide,
  deleteRide,
  searchRides,
  getRideDetails,
  getAllRides,
} from "../controllers/rideController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// These routes are accessible without authentication

router.get("/", getAllRides);                    // Get all available rides
router.get("/search", searchRides);              // Search rides with filters
router.get("/:id", getRideDetails);              // Get ride details by ID

// ==================== DRIVER ROUTES ====================
// These routes require driver role

router.post("/", protect, requireRole("driver"), postRide);                    // Post a new ride
router.get("/driver/my-rides", protect, requireRole("driver"), getMyRides);    // Get driver's rides
router.put("/:id", protect, requireRole("driver"), updateRide);                // Update ride details
router.patch("/:id/status", protect, requireRole("driver"), updateRideStatus); // Update ride status
router.delete("/:id", protect, requireRole("driver"), deleteRide);             // Delete ride

export default router;
