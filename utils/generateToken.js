import jwt from "jsonwebtoken";

/**
 * Generate JWT token for authenticated user
 * @param {string} userId - User's MongoDB ObjectId
 * @param {string[]} roles - User's roles array
 * @returns {string} JWT token
 */
export const generateToken = (userId, roles) => {
  return jwt.sign(
    { id: userId, roles },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
