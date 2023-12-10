import bcrypt from "bcrypt";

export const createSalt = async () => {
  return bcrypt.genSalt(10);
};

export const hashPassword = async (password: string, salt: string) => {
  return bcrypt.hash(password, salt);
};
