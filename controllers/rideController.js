import Ride from "../models/Ride.js";
import Booking from "../models/Booking.js";
import DriverProfile from "../models/DriverProfile.js";

// ==================== DRIVER FUNCTIONS ====================

/**
 * @desc    Post a new ride (Driver)
 * @route   POST /api/rides
 * @access  Private (Driver only)
 */
export const postRide = async (req, res) => {
  try {
    const {
      origin,
      destination,
      stops,
      departureDate,
      departureTime,
      totalSeats,
      farePerSeat,
      preferences,
      description,
    } = req.body;

    // Validate required fields
    if (!origin?.address || !origin?.city) {
      return res.status(400).json({ message: "Origin address and city are required" });
    }
    if (!destination?.address || !destination?.city) {
      return res.status(400).json({ message: "Destination address and city are required" });
    }
    if (!departureDate || !departureTime) {
      return res.status(400).json({ message: "Departure date and time are required" });
    }
    if (!totalSeats || totalSeats < 1) {
      return res.status(400).json({ message: "At least 1 seat is required" });
    }
    if (!farePerSeat || farePerSeat < 0) {
      return res.status(400).json({ message: "Valid fare per seat is required" });
    }

    // Check if departure date is in the future
    const departure = new Date(departureDate);
    if (departure < new Date()) {
      return res.status(400).json({ message: "Departure date must be in the future" });
    }

    // Get driver profile
    const driverProfile = await DriverProfile.findOne({ user: req.user._id });
    if (!driverProfile) {
      return res.status(400).json({ message: "Driver profile not found" });
    }

    // Check if driver is approved
    if (!driverProfile.isApproved) {
      return res.status(403).json({ message: "Your driver account is pending approval" });
    }

    // Create ride
    const ride = await Ride.create({
      driver: req.user._id,
      driverProfile: driverProfile._id,
      origin,
      destination,
      stops: stops || [],
      departureDate,
      departureTime,
      totalSeats,
      availableSeats: totalSeats,
      farePerSeat,
      preferences: preferences || {},
      description,
    });

    res.status(201).json({
      message: "Ride posted successfully",
      ride,
    });
  } catch (error) {
    console.error("Post ride error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get driver's rides (Driver)
 * @route   GET /api/rides/my-rides
 * @access  Private (Driver only)
 */
export const getMyRides = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { driver: req.user._id };
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .sort({ departureDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("passengers");

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      rides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
      },
    });
  } catch (error) {
    console.error("Get my rides error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update ride status (Driver)
 * @route   PATCH /api/rides/:id/status
 * @access  Private (Driver only)
 */
export const updateRideStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["scheduled", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ride = await Ride.findOne({ _id: id, driver: req.user._id });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    ride.status = status;
    await ride.save();

    // If cancelled, update all pending bookings
    if (status === "cancelled") {
      await Booking.updateMany(
        { ride: id, status: { $in: ["pending", "confirmed"] } },
        { status: "cancelled", cancelledBy: "driver", cancelledAt: new Date() }
      );
    }

    res.status(200).json({
      message: "Ride status updated",
      ride,
    });
  } catch (error) {
    console.error("Update ride status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update ride details (Driver)
 * @route   PUT /api/rides/:id
 * @access  Private (Driver only)
 */
export const updateRide = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ride = await Ride.findOne({ _id: id, driver: req.user._id });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Can't update if ride has confirmed bookings
    const hasBookings = await Booking.exists({
      ride: id,
      status: { $in: ["confirmed", "completed"] },
    });
    if (hasBookings) {
      return res.status(400).json({
        message: "Cannot update ride with confirmed bookings",
      });
    }

    // Allowed fields to update
    const allowedUpdates = [
      "departureDate",
      "departureTime",
      "totalSeats",
      "farePerSeat",
      "preferences",
      "description",
      "stops",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        ride[field] = updates[field];
      }
    });

    // Update available seats if totalSeats changed
    if (updates.totalSeats) {
      ride.availableSeats = updates.totalSeats;
    }

    await ride.save();

    res.status(200).json({
      message: "Ride updated successfully",
      ride,
    });
  } catch (error) {
    console.error("Update ride error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Delete ride (Driver)
 * @route   DELETE /api/rides/:id
 * @access  Private (Driver only)
 */
export const deleteRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findOne({ _id: id, driver: req.user._id });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Can't delete if ride has any bookings
    const hasBookings = await Booking.exists({ ride: id });
    if (hasBookings) {
      return res.status(400).json({
        message: "Cannot delete ride with bookings. Cancel it instead.",
      });
    }

    await Ride.deleteOne({ _id: id });

    res.status(200).json({ message: "Ride deleted successfully" });
  } catch (error) {
    console.error("Delete ride error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================== PASSENGER FUNCTIONS ====================

/**
 * @desc    Search for rides (Passenger)
 * @route   GET /api/rides/search
 * @access  Public
 */
export const searchRides = async (req, res) => {
  try {
    const {
      originCity,
      destinationCity,
      date,
      seats = 1,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = "departureDate",
      sortOrder = "asc",
    } = req.query;

    // Build query
    const query = {
      status: "scheduled",
      availableSeats: { $gte: parseInt(seats) },
      departureDate: { $gte: new Date() }, // Only future rides
    };

    // Filter by origin city (case-insensitive)
    if (originCity) {
      query["origin.city"] = { $regex: new RegExp(originCity, "i") };
    }

    // Filter by destination city (case-insensitive)
    if (destinationCity) {
      query["destination.city"] = { $regex: new RegExp(destinationCity, "i") };
    }

    // Filter by specific date
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.departureDate = {
        $gte: searchDate,
        $lt: nextDay,
      };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.farePerSeat = {};
      if (minPrice) query.farePerSeat.$gte = parseInt(minPrice);
      if (maxPrice) query.farePerSeat.$lte = parseInt(maxPrice);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const rides = await Ride.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "driver",
        select: "name profilePicture",
      })
      .populate({
        path: "driverProfile",
        select: "rating totalRides vehicleInfo",
      });

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      rides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
      },
    });
  } catch (error) {
    console.error("Search rides error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get ride details (Public)
 * @route   GET /api/rides/:id
 * @access  Public
 */
export const getRideDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findById(id)
      .populate({
        path: "driver",
        select: "name profilePicture phone",
      })
      .populate({
        path: "driverProfile",
        select: "rating totalRides vehicleInfo gender isAvailable",
      })
      .populate({
        path: "passengers",
        populate: {
          path: "passenger",
          select: "name profilePicture",
        },
      });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    res.status(200).json({ ride });
  } catch (error) {
    console.error("Get ride details error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all available rides (Public)
 * @route   GET /api/rides
 * @access  Public
 */
export const getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = {
      status: "scheduled",
      availableSeats: { $gte: 1 },
      departureDate: { $gte: new Date() },
    };

    const rides = await Ride.find(query)
      .sort({ departureDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "driver",
        select: "name profilePicture",
      })
      .populate({
        path: "driverProfile",
        select: "rating totalRides vehicleInfo",
      });

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      rides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
      },
    });
  } catch (error) {
    console.error("Get all rides error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
