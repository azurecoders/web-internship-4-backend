import express from "express";
import {
  submitContact,
  getAllContacts,
  getContactDetails,
  updateContactStatus,
  deleteContact,
} from "../controllers/contactController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/", submitContact);   // Submit contact form (public)

// ==================== ADMIN ROUTES ====================
router.get("/", protect, requireRole("admin"), getAllContacts);           // Get all contacts
router.get("/:id", protect, requireRole("admin"), getContactDetails);     // Get contact details
router.patch("/:id", protect, requireRole("admin"), updateContactStatus); // Update contact
router.delete("/:id", protect, requireRole("admin"), deleteContact);      // Delete contact

export default router;
