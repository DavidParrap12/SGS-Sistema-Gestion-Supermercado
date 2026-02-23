import { createContext, useState, useContext, useEffect } from "react";
import { loginRequest, verifyTokenRequest } from "../api/auth";
import Cookies from "js-cookie";
import axios from 'axios';

// Update the API base URL
const API = 'http://localhost:3005/api';

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState('');

    // Función de registro (solo para admins)
    const signup = async (registerData) => {
        try {
            const response = await axios.post('http://localhost:3005/api/auth/admin/register', registerData, {
                withCredentials: true
            });
            
            // No actualizar el estado del usuario actual, ya que es un admin creando otro usuario
            return response.data;
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    };

    // Función de inicio de sesión
    const signin = async (loginData) => {
        try {
            const response = await axios.post('http://localhost:3005/api/auth/login', loginData, {
                withCredentials: true
            });
            
            // El token se maneja por cookies, no necesitamos extraerlo de la respuesta
            setUser(response.data);
            setIsAuthenticated(true);
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Función de cierre de sesión
    const logout = async () => {
        try {
            await axios.post('http://localhost:3005/api/auth/logout', null, {
                withCredentials: true
            });
            setUser(null);
            setIsAuthenticated(false);
            setToken('');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    // Función para verificar permisos
    const hasPermission = (resource, action) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.permissions && Array.isArray(user.permissions)) {
            const permission = user.permissions.find(p => p.resource === resource);
            if (!permission) return false;
            if (permission.actions.includes('*')) return true;
            return permission.actions.includes(action);
        }
        return false;
    };

    // Función para verificar cualquier permiso de una lista
    const hasAnyPermission = (resource, actions) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.permissions && Array.isArray(user.permissions)) {
            const permission = user.permissions.find(p => p.resource === resource);
            if (!permission) return false;
            if (permission.actions.includes('*')) return true;
            return actions.some(action => permission.actions.includes(action));
        }
        return false;
    };

    // Función para verificar acceso a sucursal
    const hasBranchAccess = (branch) => {
        if (!user) return false;
        
        // Los administradores tienen acceso a todas las sucursales
        if (user.role === 'admin') return true;
        
        // Los usuarios normales solo tienen acceso a su sucursal
        return user.branch === branch;
    };
    
    useEffect(() => {
        const checkLogin = async () => {
            const cookies = Cookies.get();
            if (!cookies.token) {
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }
            
            try {
                const res = await verifyTokenRequest();
                if (!res.data) {
                    setIsAuthenticated(false);
                    setLoading(false);
                    return;
                }

                setUser(res.data);
                setIsAuthenticated(true);
                setLoading(false);
            } catch (error) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
            }
        };
        checkLogin();
    }, []);

    // Agregar el token al contexto
    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            loading,
            token,
            signin,
            signup,
            logout,
            setUser,
            setIsAuthenticated,
            hasPermission,
            hasAnyPermission,
            hasBranchAccess
        }}>
            {children}
        </AuthContext.Provider>
    );
};
