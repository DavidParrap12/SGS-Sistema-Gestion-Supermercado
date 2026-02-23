import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import '../styles/stylePrincipal.css';

function Principal() {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        ingresos: 0,
        cantidadProductos: 0,
        productosVendidos: [],
        ventasRecientes: [],
        cantidadBaja: [],
        promociones: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const token = document.cookie.split('token=')[1];
                const response = await axios.get('http://localhost:3005/api/auth/principal', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                });
                setDashboardData(response.data);
                setError(null);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setError('Error al cargar los datos del dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container">
                <Navbar />
                <div className="loading">Cargando datos del dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <Navbar />
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Navbar />
            <main className="dashboard-content">
                <div className="dashboard-header">
                    <h2>Panel de Control</h2>
                    <p className="welcome-message">
                        {user?.role === 'admin' && `Bienvenido administrador, ${user?.username || 'Usuario'}`}
                        {user?.role === 'cajero' && `Bienvenido cajero, ${user?.username || 'Usuario'}`}
                        {!user?.role && `Bienvenido, ${user?.username || 'Usuario'}`}
                    </p>
                </div>
                
                <div className="dashboard-grid">
                    <div className="dashboard-card ingresos">
                        <div className="card-icon">💰</div>
                        <div className="card-content">
                            <h3>Ingresos Totales</h3>
                            <p className="card-value">${dashboardData.ingresos?.toLocaleString() || 0}</p>
                        </div>
                    </div>

                    <div className="dashboard-card productos">
                        <div className="card-icon">📦</div>
                        <div className="card-content">
                            <h3>Total Productos</h3>
                            <p className="card-value">{dashboardData.cantidadProductos || 0}</p>
                        </div>
                    </div>

                    <div className="dashboard-card vendidos">
                        <div className="card-icon">🏆</div>
                        <div className="card-content">
                            <h3>Productos más Vendidos</h3>
                            <ul className="card-list">
                                {dashboardData.productosVendidos?.length > 0 ? (
                                    dashboardData.productosVendidos.map(producto => (
                                        <li key={producto._id}>
                                            <span className="product-name">{producto.nombre}</span>
                                            <span className="product-quantity">{producto.cantidadVendida} unidades</span>
                                        </li>
                                    ))
                                ) : (
                                    <li>No hay datos de ventas</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="dashboard-card cantidad-baja">
                        <div className="card-icon">⚠️</div>
                        <div className="card-content">
                            <h3>Cantidad Baja</h3>
                            <ul className="card-list">
                                {dashboardData.cantidadBaja?.length > 0 ? (
                                    dashboardData.cantidadBaja.map(producto => (
                                        <li key={producto._id}>
                                            <span className="product-name">{producto.nombre}</span>
                                            <span className="cantidad-warning">{producto.cantidad} unidades</span>
                                        </li>
                                    ))
                                ) : (
                                    <li>No hay productos con cantidad baja</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="dashboard-card ventas-recientes">
                        <div className="card-icon">📊</div>
                        <div className="card-content">
                            <h3>Ventas Recientes</h3>
                            <ul className="card-list">
                                {dashboardData.ventasRecientes?.length > 0 ? (
                                    dashboardData.ventasRecientes.map(venta => (
                                        <li key={venta._id}>
                                            <span className="sale-client">{venta.cliente}</span>
                                            <span className="sale-amount">${venta.total}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li>No hay ventas recientes</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="dashboard-card promociones">
                        <div className="card-icon">🔖</div>
                        <div className="card-content">
                            <h3>Promociones Activas</h3>
                            <ul className="card-list">
                                {dashboardData.promociones?.length > 0 ? (
                                    dashboardData.promociones.map(promocion => (
                                        <li key={promocion._id}>
                                            <span className="promo-name">{promocion.nombre}</span>
                                            <span className="promo-discount">{promocion.descuento}% OFF</span>
                                        </li>
                                    ))
                                ) : (
                                    <li>No hay promociones activas</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Principal;