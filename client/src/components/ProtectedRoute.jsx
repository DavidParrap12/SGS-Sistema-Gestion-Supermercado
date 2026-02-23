import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

export const ProtectedRoute = ({ allowedRoles, allowedPermissions }) => {
    const { user, isAuthenticated, loading, hasAnyPermission } = useAuth();

    // Si la aplicación sigue leyendo el token/sesión, mostramos un pequeño loader para evitar que parpadee
    if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>Cargando sesión...</p></div>;

    // Si no está autenticado, lo echamos al login
    if (!isAuthenticated || !user) {
        return <Navigate to="/ingreso" replace />;
    }

    // Opcional: Proteger las Vistas basada en ROLES si se pasaron por Props
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/principal" replace />;
    }

    // Opcional: Proteger Vistas basado en Permisos. Ej: ['CREATE', 'READ'] 
    if (allowedPermissions && allowedPermissions.resource && !hasAnyPermission(allowedPermissions.resource, allowedPermissions.actions)) {
        return <Navigate to="/principal" replace />;
    }

    // Si pasó todas las validaciones de identidad y permisos, renderiza la UI de los hijos (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
