import CryptoJS from 'crypto-js';

// Get encryption key from user session
// In production, consider using a more secure key derivation method
const getEncryptionKey = (userId) => {
  // Derive a key from user ID and a secret
  // In production, you might want to use the user's session token or a separate key stored securely
  const secret = process.env.REACT_APP_ENCRYPTION_SECRET || 'default-secret-change-in-production';
  return CryptoJS.SHA256(userId + secret).toString();
};

// Encrypt a numeric value
export const encryptValue = (value, userId) => {
  if (!value && value !== 0) return null;
  
  const key = getEncryptionKey(userId);
  const encrypted = CryptoJS.AES.encrypt(value.toString(), key).toString();
  return encrypted;
};

// Decrypt a value
export const decryptValue = (encryptedValue, userId) => {
  if (!encryptedValue) return 0;
  
  try {
    const key = getEncryptionKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encryptedValue, key);
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return parseFloat(decryptedStr) || 0;
  } catch (error) {
    console.error('Decryption error:', error);
    return 0;
  }
};

// Encrypt account object
export const encryptAccountData = (account, userId) => {
  return {
    ...account,
    value: encryptValue(account.value, userId),
    // Don't encrypt interest_rate and montly_contribution as they're not sensitive
    // But you can if needed:
    // interest_rate: encryptValue(account.interest_rate, userId),
    // montly_contribution: encryptValue(account.montly_contribution, userId),
  };
};

// Decrypt account object
export const decryptAccountData = (account, userId) => {
  return {
    ...account,
    value: decryptValue(account.value, userId),
    // If you encrypted these, decrypt them too:
    // interest_rate: decryptValue(account.interest_rate, userId),
    // montly_contribution: decryptValue(account.montly_contribution, userId),
  };
};

