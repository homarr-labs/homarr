import bcrypt from "bcrypt";

export const createSaltAsync = async () => {
  return bcrypt.genSalt(10);
};

export const hashPasswordAsync = async (password: string, salt: string) => {
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plaintext password with a hashed password and returns whether they match.
 * @param password plaintext password
 * @param hash hashed password
 * @returns wheter it is the same
 */
export const comparePasswordsAsync = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
