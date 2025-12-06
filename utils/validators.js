/**
 * Validation utility functions for auth inputs
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (supports various formats)
const phoneRegex = /^[\+]?[0-9]{10,14}$/;

// CNIC validation regex (Pakistani format: 00000-0000000-0)
const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;

/**
 * Validate passenger registration input
 */
export const validatePassengerRegister = (data) => {
  const errors = {};

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  // Email validation
  if (!data.email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(data.email)) {
    errors.email = "Please enter a valid email";
  }

  // Password validation
  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  // Phone validation
  if (!data.phone) {
    errors.phone = "Phone number is required";
  } else if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Please enter a valid phone number";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate driver registration input
 */
export const validateDriverRegister = (data) => {
  const errors = {};

  // First validate common fields (same as passenger)
  const passengerValidation = validatePassengerRegister(data);
  Object.assign(errors, passengerValidation.errors);

  // CNIC validation
  if (!data.cnic) {
    errors.cnic = "CNIC is required";
  } else if (!cnicRegex.test(data.cnic)) {
    errors.cnic = "Please enter a valid CNIC (format: 00000-0000000-0)";
  }

  // Driving license validation
  if (!data.drivingLicense || data.drivingLicense.trim().length < 5) {
    errors.drivingLicense = "Valid driving license is required";
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = "Gender is required";
  } else if (!["male", "female", "other"].includes(data.gender.toLowerCase())) {
    errors.gender = "Gender must be male, female, or other";
  }

  // Vehicle info validation
  if (!data.vehicleInfo) {
    errors.vehicleInfo = "Vehicle information is required";
  } else {
    if (!data.vehicleInfo.vehicleType) {
      errors.vehicleType = "Vehicle type is required";
    } else if (!["car", "bike", "van"].includes(data.vehicleInfo.vehicleType)) {
      errors.vehicleType = "Vehicle type must be car, bike, or van";
    }

    if (!data.vehicleInfo.vehicleModel || data.vehicleInfo.vehicleModel.trim().length < 2) {
      errors.vehicleModel = "Vehicle model is required";
    }

    if (!data.vehicleInfo.vehicleColor) {
      errors.vehicleColor = "Vehicle color is required";
    }

    if (!data.vehicleInfo.vehiclePlate || data.vehicleInfo.vehiclePlate.trim().length < 3) {
      errors.vehiclePlate = "Vehicle plate number is required";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate login input
 */
export const validateLogin = (data) => {
  const errors = {};

  if (!data.email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(data.email)) {
    errors.email = "Please enter a valid email";
  }

  if (!data.password) {
    errors.password = "Password is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
