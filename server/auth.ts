import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const pgStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByEmail(username);
        if (!user) {
          return done(null, false);
        }
        
        // For initial setup, accept any password if user has no password set
        if (!user.password) {
          // Set the password for first login
          const hashedPassword = await hashPassword(password);
          await storage.updateUser(user.id, { password: hashedPassword });
          return done(null, user);
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Determine company and role based on email domain
      const emailDomain = email.split('@')[1];
      let companyId = null;
      let role = "field";

      if (emailDomain === "resource-env.com") {
        // Get Resource Environmental company
        const company = await storage.getCompanyByDomain("resource-env.com");
        if (company) {
          companyId = company.id;
          // First user from chase@resource-env.com gets admin role
          if (email.toLowerCase() === "chase@resource-env.com") {
            role = "admin";
          } else {
            role = "pm"; // Other Resource Environmental users get PM role
          }
        }
      } else {
        // Check if company exists for this domain
        let company = await storage.getCompanyByDomain(emailDomain);
        if (!company) {
          // Create new company
          company = await storage.createCompany({
            name: emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1),
            domain: emailDomain,
            hasCustomRates: false,
          });
          role = "admin"; // First user from new company gets admin role
        }
        companyId = company.id;
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: randomBytes(16).toString("hex"),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyId,
        role,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// Middleware for protecting routes
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};