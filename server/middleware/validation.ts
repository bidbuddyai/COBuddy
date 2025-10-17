import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware to validate user has required role
 */
export function requireRole(allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
}

/**
 * Middleware to validate user belongs to a company
 */
export function requireCompany(req: any, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!user.companyId) {
    return res.status(403).json({ 
      message: 'You must belong to a company to access this resource' 
    });
  }
  
  next();
}

/**
 * Middleware to validate request body against schema
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      return res.status(400).json({
        message: 'Invalid request body'
      });
    }
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      return res.status(400).json({
        message: 'Invalid query parameters'
      });
    }
  };
}

/**
 * Middleware to validate numeric IDs in params
 */
export function validateNumericId(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        message: `Missing ${paramName} parameter`
      });
    }
    
    const numId = parseInt(id);
    
    if (isNaN(numId) || numId <= 0) {
      return res.status(400).json({
        message: `Invalid ${paramName}: must be a positive number`
      });
    }
    
    req.params[paramName] = numId.toString();
    next();
  };
}

/**
 * Validate CO Log permissions
 */
export function validateCOLogAccess(req: any, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Admin and manager can access all CO Log features
  if (user.role === 'admin' || user.role === 'manager') {
    return next();
  }
  
  // Field users have read-only access
  if (req.method === 'GET') {
    return next();
  }
  
  return res.status(403).json({
    message: 'You do not have permission to modify CO Log data'
  });
}

/**
 * Validate Excel import file
 */
export function validateExcelFile(req: any, res: Response, next: NextFunction) {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({ 
      message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' 
    });
  }
  
  // Max file size: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 10MB' 
    });
  }
  
  next();
}

/**
 * Validation schemas for CO Log operations
 */
export const coLogSchemas = {
  subcontractor: z.object({
    name: z.string().min(1).max(100),
    contactName: z.string().min(1).max(100),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    licenseNumber: z.string().optional(),
    insuranceInfo: z.string().optional(),
    notes: z.string().optional()
  }),
  
  subcontractorChangeOrder: z.object({
    projectId: z.number().positive(),
    subcontractorId: z.number().positive(),
    gcChangeOrderId: z.number().positive().optional(),
    scoNumber: z.string().optional(),
    ccoNumber: z.string().optional(),
    amountSubmitted: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    amountApproved: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    submittedDate: z.string().datetime().optional(),
    approvedDate: z.string().datetime().optional(),
    status: z.enum(['pending', 'submitted', 'approved', 'rejected']),
    notes: z.string().optional()
  }),
  
  queryProjectId: z.object({
    projectId: z.string().regex(/^\d+$/).transform(Number)
  })
};