import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user exists first
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (existingUser) {
    // Update existing user
    await storage.updateUser(claims["sub"], {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  } else {
    // Create new user with company assignment
    const email = claims["email"];
    let companyId = null;
    let role = "field";
    
    if (email) {
      const domain = email.split('@')[1];
      
      // Check if this is Resource Environmental domain
      if (domain === "resource-env.com") {
        let resourceEnvCompany = await storage.getCompanyByDomain("resource-env.com");
        
        if (!resourceEnvCompany) {
          // Create Resource Environmental company with pre-loaded rates
          resourceEnvCompany = await storage.createCompany({
            name: "Resource Environmental",
            domain: "resource-env.com",
            hasCustomRates: true,
            isActive: true,
          });
        }
        
        companyId = resourceEnvCompany.id;
        // Set role based on email - chase@resource-env.com gets admin
        if (email === "chase@resource-env.com") {
          role = "admin";
        } else {
          role = "field"; // Default role for Resource Environmental users
        }
      } else {
        // Check if company exists for this domain
        let company = await storage.getCompanyByDomain(domain);
        
        if (!company) {
          // Create new company for this domain
          company = await storage.createCompany({
            name: domain.split('.')[0], // Use domain prefix as company name
            domain: domain,
            hasCustomRates: false,
            isActive: true,
          });
        }
        
        companyId = company.id;
        // First user from a new company becomes admin
        role = "admin";
      }
    }
    
    await storage.createUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      companyId: companyId,
      role: role,
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Get all possible domains
  const replitDomains = process.env.REPLIT_DOMAINS!.split(",");
  const customDomains = ["cobuddy.app"]; // Add custom domains here
  const allDomains = [...replitDomains, ...customDomains];

  // Register strategies for all domains
  for (const domain of allDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Try to authenticate with the current hostname
    const strategyName = `replitauth:${req.hostname}`;
    
    // Check if strategy exists, otherwise use the default Replit domain
    const passportAny = passport as any;
    if (!passportAny._strategies || !passportAny._strategies[strategyName]) {
      const defaultDomain = replitDomains[0];
      res.redirect(`https://${defaultDomain}/api/login`);
      return;
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    
    // Check if strategy exists
    const passportAny = passport as any;
    if (!passportAny._strategies || !passportAny._strategies[strategyName]) {
      res.redirect("/api/login");
      return;
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};