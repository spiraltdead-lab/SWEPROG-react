const { AuditLog } = require('../models');

const auditLogger = (action, entityType = null) => {
  return async (req, res, next) => {
    // Spara original res.json för att kunna fånga response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Logga efter att request är klar
      setImmediate(async () => {
        try {
          await AuditLog.create({
            userId: req.user?.id,
            action,
            entityType,
            entityId: req.params.id || data?.id,
            oldValues: req.oldData || null,
            newValues: req.method === 'DELETE' ? null : req.body,
            ipAddress: req.ip
          });
        } catch (error) {
          console.error('Audit log failed:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = auditLogger;