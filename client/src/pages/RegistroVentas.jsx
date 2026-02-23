import React, { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import Navbar from "../components/Navbar";
import axios from "axios";
import "../styles/styleRegistroVentas.css";

const RegistroVentas = () => {
    const [formData, setFormData] = useState({
        cliente: "",
        producto: "",
        cantidad: 1
    });
    const [productos, setProductos] = useState([]);
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [total, setTotal] = useState(0);
    const [codigoBusqueda, setCodigoBusqueda] = useState("");
    const [productoEncontrado, setProductoEncontrado] = useState(null);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [errors, setErrors] = useState({});
    const [showHelp, setShowHelp] = useState(false);
    const { user, hasPermission } = useAuth();

    // Verificar permisos para ventas
    const puedeCrear = hasPermission('SALE', 'CREATE');
    const puedeLeer = hasPermission('SALE', 'READ');

    useEffect(() => {
        if (!puedeLeer) {
            console.error("No tienes permisos para ver ventas");
            return;
        }
        const fetchProductos = async () => {
            try {
                const response = await axios.get('http://localhost:3005/api/productos');
                setProductosDisponibles(response.data);
            } catch (error) {
                console.error("Error al cargar productos:", error);
            }
        };
        fetchProductos();
    }, [puedeLeer]);

    // Actualizar producto seleccionado cuando cambie la selección
    useEffect(() => {
        if (formData.producto) {
            const producto = productosDisponibles.find(p => p._id === formData.producto);
            setProductoSeleccionado(producto);
        } else {
            setProductoSeleccionado(null);
        }
    }, [formData.producto, productosDisponibles]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Validaciones en tiempo real
        if (name === 'cantidad') {
            const cantidad = parseInt(value);
            if (cantidad <= 0) {
                setErrors(prev => ({ ...prev, cantidad: 'La cantidad debe ser mayor a 0' }));
            } else {
                setErrors(prev => ({ ...prev, cantidad: '' }));
            }
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validarFormulario = () => {
        const newErrors = {};
        
        if (!formData.producto) {
            newErrors.producto = 'Debes seleccionar un producto';
        }
        
        if (!formData.cantidad || formData.cantidad <= 0) {
            newErrors.cantidad = 'La cantidad debe ser mayor a 0';
        }
        
        const producto = productosDisponibles.find(p => p._id === formData.producto);
        if (producto && formData.cantidad > producto.cantidad) {
            newErrors.cantidad = `Stock insuficiente. Disponible: ${producto.cantidad}`;
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const agregarProducto = () => {
        if (!validarFormulario()) {
            return;
        }

        const productoSeleccionado = productosDisponibles.find(
            ({ _id }) => _id === formData.producto
        );

        const { _id, nombre, precio } = productoSeleccionado;
        const cantidad = parseInt(formData.cantidad);

        setProductos(prevProductos => [
            ...prevProductos,
            {
                id: Date.now(),
                _id,
                nombre,
                cantidad,
                precio,
                subtotal: precio * cantidad
            }
        ]);
        setTotal(prevTotal => prevTotal + (precio * cantidad));
        setFormData(prev => ({ ...prev, producto: "", cantidad: 1 }));
        setErrors({});
        
        // Mostrar notificación de éxito
        showNotification('Producto agregado al carrito', 'success');
    };

    const registrarVenta = async () => {
        if (!puedeCrear) {
            showNotification('No tienes permisos para crear ventas', 'error');
            return;
        }
        if (!productos.length) {
            showNotification("Debes agregar al menos un producto.", 'error');
            return;
        }

        if (!user || !(user._id || user.id)) {
            showNotification("No hay usuario autenticado. Por favor, inicia sesión nuevamente.", 'error');
            return;
        }

        const vendedorId = user._id || user.id;

        const ventaData = {
            productos: productos.map(({ _id, cantidad, precio }) => ({
                producto: _id,
                cantidad,
                precioUnitario: precio
            })),
            total,
            vendedor: vendedorId,
            fecha: new Date()
        };

        try {
            await axios.post('http://localhost:3005/api/ventas', ventaData, {
                withCredentials: true
            });

            setFormData({ producto: "", cantidad: 1 });
            setProductos([]);
            setTotal(0);
            showNotification("Venta registrada exitosamente", 'success');
        } catch (error) {
            console.error("Error al registrar la venta:", error.response?.data || error);
            showNotification("Error al registrar la venta: " + (error.response?.data?.message || "Error desconocido"), 'error');
        }
    };

    const eliminarProducto = (id) => {
        const producto = productos.find(p => p.id === id);
        setTotal(prevTotal => prevTotal - producto.subtotal);
        setProductos(prevProductos => prevProductos.filter(p => p.id !== id));
        showNotification('Producto eliminado del carrito', 'info');
    };

    const buscarPorCodigo = async () => {
        if (!codigoBusqueda.trim()) {
            showNotification("Ingresa un código para buscar", 'warning');
            return;
        }

        try {
            const response = await axios.get(`http://localhost:3005/api/productos/codigo/${codigoBusqueda}`);
            setProductoEncontrado(response.data);
            setFormData(prev => ({
                ...prev,
                producto: response.data._id
            }));
            showNotification('Producto encontrado', 'success');
        } catch (error) {
            showNotification("Producto no encontrado", 'error');
            setProductoEncontrado(null);
        }
    };

    const agregarProductoEncontrado = () => {
        if (!productoEncontrado) return;
        
        const cantidad = parseInt(formData.cantidad);
        
        if (cantidad <= 0 || cantidad > productoEncontrado.cantidad) {
            showNotification('Cantidad inválida', 'error');
            return;
        }
        
        const { _id, codigo, nombre, precio } = productoEncontrado;
    
        setProductos(prevProductos => [
            ...prevProductos,
            {
                id: Date.now(),
                _id,
                nombre,
                cantidad,
                precio,
                subtotal: precio * cantidad
            }
        ]);
        setTotal(prevTotal => prevTotal + (precio * cantidad));
        
        setCodigoBusqueda("");
        setProductoEncontrado(null);
        setFormData(prev => ({ ...prev, producto: "", cantidad: 1 }));
        showNotification('Producto agregado al carrito', 'success');
    };

    const showNotification = (message, type) => {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };

    return (
        <div className="ventas-container">
            <Navbar />
            {!puedeLeer ? (
                <div className="registro-ventas">
                    <div className="error-message">
                        <h2>Acceso Denegado</h2>
                        <p>No tienes permisos para acceder al módulo de ventas.</p>
                    </div>
                </div>
            ) : (
            <div className="registro-ventas">
                <div className="header-section">
                    <h2>Registro de Ventas</h2>
                    <button 
                        className="help-button"
                        onClick={() => setShowHelp(!showHelp)}
                        title="Ayuda"
                    >
                        ❓
                    </button>
                </div>

                {showHelp && (
                    <div className="help-section">
                        <h4>💡 ¿Cómo registrar una venta?</h4>
                        <ol>
                            <li>Busca el producto por código o selecciónalo de la lista</li>
                            <li>Ingresa la cantidad deseada</li>
                            <li>Haz clic en "Agregar al carrito"</li>
                            <li>Repite para más productos</li>
                            <li>Revisa el total y confirma la venta</li>
                        </ol>
                    </div>
                )}

                {/* Buscador por código mejorado */}
                <div className="search-card">
                    <div className="card-header">
                        <h3>🔍 Búsqueda Rápida por Código</h3>
                    </div>
                    <div className="card-body">
                        <div className="search-input-group">
                            <input
                                type="text"
                                placeholder="Escanea o ingresa el código del producto"
                                value={codigoBusqueda}
                                onChange={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && buscarPorCodigo()}
                                className="search-input"
                            />
                            <button onClick={buscarPorCodigo} className="btn-search">
                                🔍 Buscar
                            </button>
                        </div>
                        
                        {productoEncontrado && (
                            <div className="product-found">
                                <div className="product-info">
                                    <h4>✅ Producto Encontrado</h4>
                                    <div className="product-details">
                                        <span className="detail-item">
                                            <strong>Código:</strong> {productoEncontrado.codigo}
                                        </span>
                                        <span className="detail-item">
                                            <strong>Nombre:</strong> {productoEncontrado.nombre}
                                        </span>
                                        <span className="detail-item price">
                                            <strong>Precio:</strong> ${productoEncontrado.precio.toLocaleString()}
                                        </span>
                                        <span className="detail-item stock">
                                            <strong>Stock:</strong> {productoEncontrado.cantidad} unidades
                                        </span>
                                    </div>
                                </div>
                                <div className="product-actions">
                                    <div className="quantity-input">
                                        <label>Cantidad:</label>
                                        <input
                                            type="number"
                                            name="cantidad"
                                            min="1"
                                            max={productoEncontrado.cantidad}
                                            value={formData.cantidad}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <button 
                                        onClick={agregarProductoEncontrado}
                                        className="btn-add-found"
                                        disabled={formData.cantidad < 1 || formData.cantidad > productoEncontrado.cantidad}
                                    >
                                        🛒 Agregar al Carrito
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selector tradicional mejorado */}
                <div className="selection-card">
                    <div className="card-header">
                        <h3>📋 Selección Manual de Productos</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="producto">Selecciona un producto:</label>
                                <select 
                                    id="producto"
                                    name="producto"
                                    value={formData.producto}
                                    onChange={handleInputChange}
                                    className={errors.producto ? 'error' : ''}
                                >
                                    <option value="">-- Seleccionar producto --</option>
                                    {productosDisponibles.length > 0 ? (
                                        productosDisponibles.map(prod => (
                                            <option key={prod._id} value={prod._id}>
                                                {prod.codigo} - {prod.nombre} - ${prod.precio.toLocaleString()}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>Cargando productos...</option>
                                    )}
                                </select>
                                {errors.producto && <span className="error-message">{errors.producto}</span>}
                            </div>
                            
                            <div className="form-field">
                                <label htmlFor="cantidad">Cantidad:</label>
                                <input
                                    id="cantidad"
                                    type="number"
                                    name="cantidad"
                                    min="1"
                                    max={productoSeleccionado?.cantidad || 999}
                                    value={formData.cantidad}
                                    onChange={handleInputChange}
                                    className={errors.cantidad ? 'error' : ''}
                                />
                                {errors.cantidad && <span className="error-message">{errors.cantidad}</span>}
                            </div>
                            
                            <div className="form-field">
                                <label>&nbsp;</label>
                                <button 
                                    onClick={agregarProducto}
                                    disabled={!formData.producto || formData.cantidad < 1 || Object.keys(errors).some(key => errors[key])}
                                    className="btn-add-cart"
                                >
                                    🛒 Agregar al Carrito
                                </button>
                            </div>
                        </div>
                        
                        {productoSeleccionado && (
                            <div className="selected-product-preview">
                                <span className="preview-label">Producto seleccionado:</span>
                                <span className="preview-name">{productoSeleccionado.nombre}</span>
                                <span className="preview-price">${productoSeleccionado.precio.toLocaleString()}</span>
                                <span className="preview-cantidad">Cantidad: {productoSeleccionado.cantidad}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabla del carrito */}
                <div className="cart-section">
                    <h3>🛒 Carrito de Compras</h3>
                    {productos.length > 0 ? (
                        <div className="cart-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Subtotal</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.map((prod) => (
                                        <tr key={prod.id}>
                                            <td>{prod.nombre}</td>
                                            <td>{prod.cantidad}</td>
                                            <td>${prod.precio.toLocaleString()}</td>
                                            <td>${prod.subtotal.toLocaleString()}</td>
                                            <td>
                                                <button 
                                                    onClick={() => eliminarProducto(prod.id)}
                                                    className="btn-remove"
                                                    title="Eliminar producto"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-cart">
                            <p>🛒 El carrito está vacío</p>
                            <small>Agrega productos para comenzar</small>
                        </div>
                    )}
                </div>

                {/* Sección de total y registro */}
                <div className="total-section">
                    <div className="total-display">
                        <span className="total-label">Total a pagar:</span>
                        <span className="total-amount">${total.toLocaleString()}</span>
                    </div>
                    <button 
                        className="btn-register-sale"
                        onClick={registrarVenta}
                        disabled={productos.length === 0 || !puedeCrear}
                    >
                        💾 Registrar Venta
                    </button>
                </div>
            </div>
            )}
        </div>
    );
};

export default RegistroVentas;
