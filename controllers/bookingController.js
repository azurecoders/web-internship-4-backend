import Booking from "../models/Booking.js";
import Ride from "../models/Ride.js";
import DriverProfile from "../models/DriverProfile.js";

// ==================== PASSENGER FUNCTIONS ====================

/**
 * @desc    Book a ride (Passenger)
 * @route   POST /api/bookings
 * @access  Private (Passenger only)
 */
export const bookRide = async (req, res) => {
  try {
    const {
      rideId,
      seatsBooked,
      pickupLocation,
      dropoffLocation,
      passengerNote,
      paymentMethod,
    } = req.body;

    // Validate required fields
    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }
    if (!seatsBooked || seatsBooked < 1) {
      return res.status(400).json({ message: "At least 1 seat must be booked" });
    }
    if (!pickupLocation?.address) {
      return res.status(400).json({ message: "Pickup location is required" });
    }
    if (!dropoffLocation?.address) {
      return res.status(400).json({ message: "Dropoff location is required" });
    }

    // Find the ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check ride status
    if (ride.status !== "scheduled") {
      return res.status(400).json({ message: "This ride is no longer available for booking" });
    }

    // Check available seats
    if (ride.availableSeats < seatsBooked) {
      return res.status(400).json({
        message: `Only ${ride.availableSeats} seats available`,
      });
    }

    // Check if passenger already booked this ride
    const existingBooking = await Booking.findOne({
      ride: rideId,
      passenger: req.user._id,
      status: { $nin: ["cancelled", "rejected"] },
    });
    if (existingBooking) {
      return res.status(400).json({ message: "You have already booked this ride" });
    }

    // Can't book your own ride
    if (ride.driver.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot book your own ride" });
    }

    // Create booking
    const booking = await Booking.create({
      ride: rideId,
      passenger: req.user._id,
      seatsBooked,
      pickupLocation,
      dropoffLocation,
      farePerSeat: ride.farePerSeat,
      totalFare: seatsBooked * ride.farePerSeat,
      passengerNote,
      paymentMethod: paymentMethod || "cash",
    });

    // Update available seats in ride
    ride.availableSeats -= seatsBooked;
    ride.passengers.push(booking._id);
    await ride.save();

    // Populate booking details
    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: "ride",
        select: "origin destination departureDate departureTime farePerSeat",
        populate: {
          path: "driver",
          select: "name phone profilePicture",
        },
      });

    res.status(201).json({
      message: "Booking request submitted successfully",
      booking: populatedBooking,
    });
  } catch (error) {
    console.error("Book ride error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get passenger's bookings (Passenger)
 * @route   GET /api/bookings/my-bookings
 * @access  Private (Passenger only)
 */
export const getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { passenger: req.user._id };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "ride",
        select: "origin destination departureDate departureTime status",
        populate: [
          { path: "driver", select: "name phone profilePicture" },
          { path: "driverProfile", select: "vehicleInfo rating" },
        ],
      });

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
      },
    });
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get booking details (Passenger)
 * @route   GET /api/bookings/:id
 * @access  Private
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate({
        path: "ride",
        populate: [
          { path: "driver", select: "name phone profilePicture" },
          { path: "driverProfile", select: "vehicleInfo rating gender" },
        ],
      })
      .populate({
        path: "passenger",
        select: "name phone profilePicture",
      });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user is the passenger or driver
    const isPassenger = booking.passenger._id.toString() === req.user._id.toString();
    const isDriver = booking.ride.driver._id.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error("Get booking details error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Cancel booking (Passenger)
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private (Passenger only)
 */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({
      _id: id,
      passenger: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Can only cancel pending or confirmed bookings
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        message: "Cannot cancel booking in current status",
      });
    }

    // Update booking
    booking.status = "cancelled";
    booking.cancelledBy = "passenger";
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    // Restore seats to ride
    await Ride.findByIdAndUpdate(booking.ride, {
      $inc: { availableSeats: booking.seatsBooked },
      $pull: { passengers: booking._id },
    });

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================== DRIVER FUNCTIONS ====================

/**
 * @desc    Get ride bookings (Driver)
 * @route   GET /api/bookings/ride/:rideId
 * @access  Private (Driver only)
 */
export const getRideBookings = async (req, res) => {
  try {
    const { rideId } = req.params;

    // Verify ride belongs to driver
    const ride = await Ride.findOne({ _id: rideId, driver: req.user._id });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const bookings = await Booking.find({ ride: rideId })
      .populate({
        path: "passenger",
        select: "name phone profilePicture",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Get ride bookings error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Confirm/Reject booking (Driver)
 * @route   PATCH /api/bookings/:id/respond
 * @access  Private (Driver only)
 */
export const respondToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, driverNote } = req.body; // action: 'confirm' or 'reject'

    if (!["confirm", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'confirm' or 'reject'" });
    }

    const booking = await Booking.findById(id).populate("ride");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify driver owns the ride
    if (booking.ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Can only respond to pending bookings
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Can only respond to pending bookings" });
    }

    if (action === "confirm") {
      booking.status = "confirmed";
      booking.confirmedAt = new Date();
    } else {
      booking.status = "rejected";
      // Restore seats
      await Ride.findByIdAndUpdate(booking.ride._id, {
        $inc: { availableSeats: booking.seatsBooked },
        $pull: { passengers: booking._id },
      });
    }

    if (driverNote) {
      booking.driverNote = driverNote;
    }

    await booking.save();

    res.status(200).json({
      message: `Booking ${action}ed successfully`,
      booking,
    });
  } catch (error) {
    console.error("Respond to booking error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update booking status (Driver) - For ride progress tracking
 * @route   PATCH /api/bookings/:id/status
 * @access  Private (Driver only)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "coming-for-pickup",
      "picked-up",
      "in-transit",
      "dropped-off",
      "completed",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Valid options: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await Booking.findById(id).populate("ride");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify driver owns the ride
    if (booking.ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Status flow validation
    const statusFlow = {
      "confirmed": ["coming-for-pickup"],
      "coming-for-pickup": ["picked-up"],
      "picked-up": ["in-transit"],
      "in-transit": ["dropped-off"],
      "dropped-off": ["completed"],
    };

    const allowedNextStatuses = statusFlow[booking.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from '${booking.status}' to '${status}'`,
        currentStatus: booking.status,
        allowedStatuses: allowedNextStatuses || [],
      });
    }

    // Update status and timestamp
    booking.status = status;
    
    // Set appropriate timestamp
    switch (status) {
      case "coming-for-pickup":
        booking.comingForPickupAt = new Date();
        break;
      case "picked-up":
        booking.pickedUpAt = new Date();
        break;
      case "dropped-off":
        booking.droppedOffAt = new Date();
        break;
      case "completed":
        booking.completedAt = new Date();
        booking.paymentStatus = "paid"; // Mark as paid on completion
        
        // Update driver stats
        await DriverProfile.findOneAndUpdate(
          { user: req.user._id },
          {
            $inc: {
              totalRides: 1,
              totalEarnings: booking.totalFare,
            },
          }
        );
        break;
    }

    await booking.save();

    res.status(200).json({
      message: `Booking status updated to '${status}'`,
      booking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get all bookings for driver's rides (Driver)
 * @route   GET /api/bookings/driver/all
 * @access  Private (Driver only)
 */
export const getDriverBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Get all rides by this driver
    const driverRides = await Ride.find({ driver: req.user._id }).select("_id");
    const rideIds = driverRides.map((ride) => ride._id);

    const query = { ride: { $in: rideIds } };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "ride",
        select: "origin destination departureDate departureTime",
      })
      .populate({
        path: "passenger",
        select: "name phone profilePicture",
      });

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
      },
    });
  } catch (error) {
    console.error("Get driver bookings error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==================== PROFILE/HISTORY FUNCTIONS ====================

/**
 * @desc    Get passenger ride history with stats
 * @route   GET /api/bookings/passenger/history
 * @access  Private (Passenger only)
 */
export const getPassengerHistory = async (req, res) => {
  try {
    // Get booking stats
    const stats = await Booking.aggregate([
      { $match: { passenger: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalSpent: { $sum: "$totalFare" },
        },
      },
    ]);

    // Calculate totals
    const completedStats = stats.find((s) => s._id === "completed") || { count: 0, totalSpent: 0 };
    const totalBookings = stats.reduce((acc, s) => acc + s.count, 0);

    // Get recent bookings
    const recentBookings = await Booking.find({ passenger: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "ride",
        select: "origin destination departureDate",
        populate: { path: "driver", select: "name profilePicture" },
      });

    res.status(200).json({
      stats: {
        totalBookings,
        completedRides: completedStats.count,
        totalSpent: completedStats.totalSpent,
        statusBreakdown: stats,
      },
      recentBookings,
    });
  } catch (error) {
    console.error("Get passenger history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get driver ride history with stats
 * @route   GET /api/bookings/driver/history
 * @access  Private (Driver only)
 */
export const getDriverHistory = async (req, res) => {
  try {
    // Get driver profile
    const driverProfile = await DriverProfile.findOne({ user: req.user._id });
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    // Get all rides by driver
    const rides = await Ride.find({ driver: req.user._id });
    const rideIds = rides.map((r) => r._id);

    // Get booking stats
    const stats = await Booking.aggregate([
      { $match: { ride: { $in: rideIds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalEarnings: { $sum: "$totalFare" },
        },
      },
    ]);

    const completedStats = stats.find((s) => s._id === "completed") || { count: 0, totalEarnings: 0 };

    // Get recent bookings
    const recentBookings = await Booking.find({ ride: { $in: rideIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "ride",
        select: "origin destination departureDate",
      })
      .populate({
        path: "passenger",
        select: "name profilePicture",
      });

    // Ride stats
    const rideStats = await Ride.aggregate([
      { $match: { driver: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      driverProfile: {
        rating: driverProfile.rating,
        totalRides: driverProfile.totalRides,
        totalEarnings: driverProfile.totalEarnings,
        isApproved: driverProfile.isApproved,
        isAvailable: driverProfile.isAvailable,
      },
      bookingStats: {
        completedBookings: completedStats.count,
        totalEarnings: completedStats.totalEarnings,
        statusBreakdown: stats,
      },
      rideStats,
      recentBookings,
    });
  } catch (error) {
    console.error("Get driver history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get active/ongoing bookings (for tracking)
 * @route   GET /api/bookings/active
 * @access  Private
 */
export const getActiveBookings = async (req, res) => {
  try {
    const activeStatuses = ["confirmed", "coming-for-pickup", "picked-up", "in-transit"];
    
    // For passenger
    const passengerBookings = await Booking.find({
      passenger: req.user._id,
      status: { $in: activeStatuses },
    })
      .populate({
        path: "ride",
        populate: [
          { path: "driver", select: "name phone profilePicture" },
          { path: "driverProfile", select: "vehicleInfo currentLocation" },
        ],
      });

    // For driver (if applicable)
    let driverBookings = [];
    if (req.user.roles.includes("driver")) {
      const driverRides = await Ride.find({ driver: req.user._id }).select("_id");
      const rideIds = driverRides.map((r) => r._id);
      
      driverBookings = await Booking.find({
        ride: { $in: rideIds },
        status: { $in: activeStatuses },
      })
        .populate({
          path: "ride",
          select: "origin destination departureDate departureTime",
        })
        .populate({
          path: "passenger",
          select: "name phone profilePicture",
        });
    }

    res.status(200).json({
      asPassenger: passengerBookings,
      asDriver: driverBookings,
    });
  } catch (error) {
    console.error("Get active bookings error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
