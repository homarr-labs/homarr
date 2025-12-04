import { createDb } from "../../db";
import { schema } from "./db/schema";

const db = createDb(schema);

export const getTrustedCertificateHostnamesAsync = async () => {
  return await db.query.trustedCertificateHostnames.findMany();
};
