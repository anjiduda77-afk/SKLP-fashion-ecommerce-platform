import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Capture response data
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
      ...(req.body && Object.keys(req.body).length > 0 && { body: sanitizeBody(req.body) })
    };

    // Write to file
    if (process.env.LOG_LEVEL !== 'silent') {
      const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }

    return originalJson.call(this, data);
  };

  next();
};

// Sanitize sensitive data from logs
const sanitizeBody = (body) => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

export default requestLogger;
