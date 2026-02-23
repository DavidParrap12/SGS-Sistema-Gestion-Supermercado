import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 
      'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE', 'CONFIG_CHANGE'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'USER', 'PRODUCT', 'SALE', 'INVENTORY', 'REPORT', 'CONFIG',
      'BACKUP', 'CLIENT', 'SUPPLIER', 'CATEGORY', 'PAYMENT', 'AUDIT', 'AUTH', 'GENERAL'
    ]
  },
  resourceId: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  details: {
    previousData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'DENIED'],
    default: 'SUCCESS'
  },
  errorMessage: {
    type: String,
    required: false
  },
  duration: {
    type: Number,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
auditSchema.index({ userId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.index({ resource: 1, resourceId: 1 });
auditSchema.index({ createdAt: -1 });

// Método para formatear la entrada de auditoría
auditSchema.methods.formatForDisplay = function() {
  return {
    id: this._id,
    user: this.username,
    action: this.action,
    resource: this.resource,
    description: this.description,
    timestamp: this.createdAt,
    status: this.status,
    ip: this.ipAddress
  };
};

export default mongoose.model('Audit', auditSchema);
