import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { useAuth } from '../context/authContext';

const Navbar = () => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { user, logout, hasPermission, hasAnyPermission } = useAuth(); // Add permission functions

    const toggleMenu = () => setMenuOpen(!isMenuOpen);

    const handleLogout = async () => {
        try {
            await logout();  // Use the logout function from auth context
            navigate('/');
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/principal" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <h1>SGS</h1>
                    <img src="/imagenes/carro_compras.png" alt="Carro de compras" className="carro-logo" style={{ width: '5rem', height: '5rem' }} />
                </Link>
            </div>

            <ul className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
                <li><Link to="/principal">Principal</Link></li>
                {hasPermission('PRODUCT', 'READ') && (
                    <li><Link to="/inventario">Inventario</Link></li>
                )}
                {hasPermission('SALE', 'READ') && (
                    <li><Link to="/ventas">Ventas</Link></li>
                )}
                {hasPermission('REPORT', 'READ') && (
                    <li><Link to="/reportes">Reportes</Link></li>
                )}
                {hasPermission('USER', 'CREATE') && (
                    <li><Link to="/registro">Nuevo Usuario</Link></li>
                )}
                {hasPermission('USER', 'READ') && (
                    <li><Link to="/administracion">Administración</Link></li>
                )}
                {hasPermission('AUDIT', 'READ') && (
                    <li><Link to="/auditoria">Auditoría</Link></li>
                )}
            </ul>

            <div className="navbar-user">
                <span>Hola, {user?.username || 'Usuario'}</span>
                <button className="logout-btn" onClick={handleLogout}>
                    Salir
                </button>
            </div>

            <button 
                className="navbar-toggle" 
                onClick={toggleMenu} 
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
            >
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
            </button>
        </nav>
    );
};

export default Navbar;
