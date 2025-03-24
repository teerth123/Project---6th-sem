import User from '../models/User.js';
import crypto from 'crypto';

/**
 * Generates a random alphanumeric code of specified length
 * @param {number} length - Length of the code to generate
 * @returns {string} - Random alphanumeric code
 */
const generateRandomCode = (length = 8) => {
  // Define characters to use (alphanumeric without ambiguous characters)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert random bytes to characters from our set
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    result += chars.charAt(randomIndex);
  }
  
  // Format the code with hyphens for readability (e.g., ABCD-1234)
  if (length >= 8) {
    return `${result.slice(0, 4)}-${result.slice(4)}`;
  }
  
  return result;
};

/**
 * Generates a unique code that doesn't exist in the database
 * @returns {Promise<string>} - A unique code
 */
export const generateUniqueCode = async () => {
  let isUnique = false;
  let code;
  
  // Keep generating codes until we find a unique one
  while (!isUnique) {
    code = generateRandomCode();
    
    // Check if code already exists in database
    const existingUser = await User.findOne({ uniqueCode: code });
    
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return code;
}; 