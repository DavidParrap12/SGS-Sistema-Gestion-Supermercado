import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    resource: {
        type: String,
        required: true,
        enum: [
            'PRODUCT', 'SALE', 'INVENTORY', 'REPORT', 'USER', 'CONFIG',
            'BACKUP', 'CLIENT', 'SUPPLIER', 'CATEGORY', 'PAYMENT', 'AUDIT', 'AUTH'
        ]
    },
    actions: [{
        type: String,
        enum: ['*', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'RESTORE', 'CLEAN'],
        required: true
    }],
    conditions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'cashier', 'inventory_staff', 'user'],
        default: 'cashier'
    },
    permissions: [permissionSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    branch: {
        type: String,
        default: 'main'
    }
}, {
    timestamps: true
});

// Métodos de bloqueo de cuenta
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Métodos de permisos
userSchema.methods.hasPermission = function (resource, action) {
    // Admin tiene todos los permisos
    if (this.role === 'admin') return true;

    // Verificar permisos específicos
    const permission = this.permissions.find(p => p.resource === resource);
    if (!permission) return false;

    return permission.actions.includes(action) || permission.actions.includes('*');
};

userSchema.methods.hasAnyPermission = function (resource, actions) {
    return actions.some(action => this.hasPermission(resource, action));
};

userSchema.methods.addPermission = function (resource, actions, conditions = {}) {
    const existingPermission = this.permissions.find(p => p.resource === resource);

    if (existingPermission) {
        // Agregar nuevas acciones sin duplicar
        const newActions = [...new Set([...existingPermission.actions, ...actions])];
        existingPermission.actions = newActions;
        existingPermission.conditions = { ...existingPermission.conditions, ...conditions };
    } else {
        this.permissions.push({ resource, actions, conditions });
    }
};

userSchema.methods.removePermission = function (resource, actions = null) {
    const permission = this.permissions.find(p => p.resource === resource);

    if (!permission) return;

    if (!actions) {
        // Eliminar todo el permiso
        this.permissions = this.permissions.filter(p => p.resource !== resource);
    } else {
        // Eliminar acciones específicas
        permission.actions = permission.actions.filter(action => !actions.includes(action));

        // Si no quedan acciones, eliminar el permiso completo
        if (permission.actions.length === 0) {
            this.permissions = this.permissions.filter(p => p.resource !== resource);
        }
    }
};

userSchema.methods.resetLoginAttempts = function () {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
};

userSchema.methods.incrementLoginAttempts = function () {
    // Si ya está bloqueado, no incrementar más
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.resetLoginAttempts();
    }

    this.loginAttempts += 1;

    // Bloquear después de 5 intentos fallidos
    if (this.loginAttempts >= 5 && !this.isLocked) {
        this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
    }

    return this.save();
};

// Método para obtener permisos por defecto según el rol
userSchema.statics.getDefaultPermissions = function (role) {
    const defaultPermissions = {
        admin: [
            { resource: 'PRODUCT', actions: ['*'] },
            { resource: 'SALE', actions: ['*'] },
            { resource: 'INVENTORY', actions: ['*'] },
            { resource: 'REPORT', actions: ['*'] },
            { resource: 'USER', actions: ['*'] },
            { resource: 'CONFIG', actions: ['*'] },
            { resource: 'BACKUP', actions: ['*'] },
            { resource: 'CLIENT', actions: ['*'] },
            { resource: 'SUPPLIER', actions: ['*'] },
            { resource: 'CATEGORY', actions: ['*'] },
            { resource: 'PAYMENT', actions: ['*'] },
            { resource: 'AUDIT', actions: ['*'] }
        ],
        manager: [
            { resource: 'PRODUCT', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'SALE', actions: ['*'] },
            { resource: 'INVENTORY', actions: ['*'] },
            { resource: 'REPORT', actions: ['*'] },
            { resource: 'CLIENT', actions: ['*'] },
            { resource: 'CATEGORY', actions: ['*'] },
            { resource: 'PAYMENT', actions: ['*'] }
        ],
        cashier: [
            { resource: 'PRODUCT', actions: ['READ'] },
            { resource: 'INVENTORY', actions: ['READ'] },
            { resource: 'SALE', actions: ['CREATE', 'READ'] },
            { resource: 'CLIENT', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'PAYMENT', actions: ['CREATE', 'READ'] }
        ],
        inventory_staff: [
            { resource: 'PRODUCT', actions: ['READ', 'UPDATE'] },
            { resource: 'INVENTORY', actions: ['*'] },
            { resource: 'SUPPLIER', actions: ['*'] },
            { resource: 'CATEGORY', actions: ['*'] }
        ]
    };

    return defaultPermissions[role] || defaultPermissions.cashier;
};

export default mongoose.model('User', userSchema);
