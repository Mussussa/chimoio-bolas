import type { User } from "../models/index.js";

declare global {
  namespace Express {
    interface Request {
      appUser?: User;
    }
  }
}

export {};
