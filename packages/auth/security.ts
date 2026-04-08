import bcrypt from "bcrypt";

export const hashPasswordAsync = async (password: string) => {
  return bcrypt.hash(password, 10);
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
