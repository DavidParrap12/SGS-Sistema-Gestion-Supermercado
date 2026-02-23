import AuditService from '../services/audit.service.js';

/**
 * Middleware para registrar acciones de auditoría
 */
export const auditMiddleware = (options = {}) => {
  const {
    action,
    resource,
    description,
    ignoreFailed = false
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Guardar la respuesta original
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData = null;
    let hasError = false;
    let errorMessage = null;

    // Interceptar la respuesta
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Interceptar errores
    res.on('error', (error) => {
      hasError = true;
      errorMessage = error.message;
    });

    // Continuar con el siguiente middleware
    next();

    // Registrar después de que la respuesta se complete
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        // Determinar el estado de la operación
        let auditStatus = 'SUCCESS';
        if (status >= 400 && status < 500) {
          auditStatus = 'DENIED';
        } else if (status >= 500) {
          auditStatus = 'FAILED';
        }

        // No registrar si está configurado para ignorar fallos y hay error
        if (ignoreFailed && auditStatus !== 'SUCCESS') {
          return;
        }

        // Obtener información del usuario
        const userId = req.user?.id || req.user?._id;
        const username = req.user?.username || req.user?.email || 'Anonymous';
        
        // Construir la descripción si no se proporciona
        let finalDescription = description;
        if (!finalDescription) {
          finalDescription = `${req.method} ${req.originalUrl}`;
        }

        // Obtener detalles de la operación
        const details = {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          body: sanitizeBody(req.body),
          response: sanitizeResponse(responseData),
          statusCode: status
        };

        // Registrar en auditoría
        await AuditService.logAction({
          userId,
          username,
          action: action || getActionFromMethod(req.method),
          resource: resource || getResourceFromUrl(req.originalUrl),
          resourceId: getResourceId(req),
          description: finalDescription,
          details,
          ipAddress: getClientIP(req),
          userAgent: req.get('User-Agent'),
          status: auditStatus,
          errorMessage: hasError ? errorMessage : null,
          duration,
          metadata: {
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            statusCode: status
          }
        });

      } catch (error) {
        console.error('Error en middleware de auditoría:', error);
      }
    });
  };
};

/**
 * Función auxiliar para sanitizar el body (eliminar contraseñas)
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'pin', 'cvv'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Función auxiliar para sanitizar la respuesta
 */
function sanitizeResponse(responseData) {
  if (!responseData) return null;
  
  try {
    // Si es JSON, parsearlo y sanitizar
    if (typeof responseData === 'string') {
      const parsed = JSON.parse(responseData);
      return sanitizeBody(parsed);
    }
    
    return sanitizeBody(responseData);
  } catch (error) {
    // Si no se puede parsear, devolver null
    return null;
  }
}

/**
 * Determinar acción desde el método HTTP
 */
function getActionFromMethod(method) {
  const methodToAction = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  return methodToAction[method] || 'VIEW';
}

/**
 * Determinar recurso desde la URL
 */
function getResourceFromUrl(url) {
  const segments = url.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'GENERAL';
  
  const resourceMap = {
    'users': 'USER',
    'products': 'PRODUCT',
    'sales': 'SALE',
    'inventory': 'INVENTORY',
    'reports': 'REPORT',
    'auth': 'AUTH',
    'backup': 'BACKUP',
    'clients': 'CLIENT',
    'suppliers': 'SUPPLIER',
    'categories': 'CATEGORY',
    'payments': 'PAYMENT'
  };
  
  const firstSegment = segments[0].toLowerCase();
  return resourceMap[firstSegment] || 'GENERAL';
}

/**
 * Obtener ID del recurso desde la URL o body
 */
function getResourceId(req) {
  // Buscar en params
  if (req.params.id) return req.params.id;
  if (req.params.userId) return req.params.userId;
  if (req.params.productId) return req.params.productId;
  
  // Buscar en body para operaciones de creación
  if (req.body && req.body._id) return req.body._id;
  if (req.body && req.body.id) return req.body.id;
  
  return null;
}

/**
 * Obtener IP del cliente
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.connection.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * Middleware específico para acciones críticas
 */
export const auditCriticalAction = (action, resource, description) => {
  return auditMiddleware({
    action,
    resource,
    description,
    ignoreFailed: false
  });
};

/**
 * Helper para registrar acciones manuales
 */
export const logManualAction = async (req, action, resource, description, details = {}) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const username = req.user?.username || req.user?.email || 'Anonymous';
    
    await AuditService.logAction({
      userId,
      username,
      action,
      resource,
      description,
      details,
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: details
    });
  } catch (error) {
    console.error('Error al registrar acción manual:', error);
  }
};