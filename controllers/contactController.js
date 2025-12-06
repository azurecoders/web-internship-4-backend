import Contact from "../models/Contact.js";

/**
 * @desc    Submit contact form
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "Name, email, subject, and message are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    // Create contact submission
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({
      message: "Thank you for contacting us! We will get back to you soon.",
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
      },
    });
  } catch (error) {
    console.error("Submit contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * @desc    Get all contact submissions (Admin)
 * @route   GET /api/contact
 * @access  Private (Admin only)
 */
export const getAllContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("handledBy", "name email");

    const total = await Contact.countDocuments(query);

    // Get status counts
    const statusCounts = await Contact.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      contacts,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalContacts: total,
      },
    });
  } catch (error) {
    console.error("Get all contacts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get single contact details (Admin)
 * @route   GET /api/contact/:id
 * @access  Private (Admin only)
 */
export const getContactDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id).populate("handledBy", "name email");

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json({ contact });
  } catch (error) {
    console.error("Get contact details error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update contact status (Admin)
 * @route   PATCH /api/contact/:id
 * @access  Private (Admin only)
 */
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ["new", "in-progress", "resolved", "closed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    if (status) {
      contact.status = status;
      if (status === "resolved" || status === "closed") {
        contact.resolvedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      contact.adminNotes = adminNotes;
    }

    contact.handledBy = req.user._id;
    await contact.save();

    res.status(200).json({
      message: "Contact updated successfully",
      contact,
    });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Delete contact (Admin)
 * @route   DELETE /api/contact/:id
 * @access  Private (Admin only)
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    await Contact.deleteOne({ _id: id });

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
