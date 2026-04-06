import React, { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import axios from "axios";
import { API } from '../api/auth';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import "../styles/styleReportes.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const Reportes = () => {
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();

    // Verificar permisos de reportes
    const puedeVerReportes = hasPermission('REPORT', 'READ');

    // Redirigir si no tiene permisos
    useEffect(() => {
        if (!puedeVerReportes) {
            navigate('/principal');
        }
    }, [puedeVerReportes, navigate]);

    const [reportData, setReportData] = useState({
        ventas: [],
        ingresos: 0,
        inventario: []
    });
    const [loading, setLoading] = useState(true);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [vistaGrafico, setVistaGrafico] = useState('dia');
    const [tipoGrafico, setTipoGrafico] = useState('bar');

    // Verificar permisos de exportación
    const puedeExportar = hasPermission('REPORT', 'EXPORT');

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const response = await axios.get(`${API}/reportes`, {
                    withCredentials: true
                });
                setReportData({
                    ventas: response.data.ventas || [],
                    ingresos: response.data.ingresos || 0,
                    inventario: response.data.inventario || []
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching report data:', error);
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    // Función para generar código de factura
    const generarCodigoFactura = (fecha, index) => {
        const year = new Date(fecha).getFullYear();
        const month = String(new Date(fecha).getMonth() + 1).padStart(2, '0');
        const day = String(new Date(fecha).getDate()).padStart(2, '0');
        const numero = String(index + 1).padStart(3, '0');
        return `FAC-${year}${month}${day}-${numero}`;
    };

    // Función para formatear fechas
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Agrupar ventas por día
    const agruparVentasPorDia = (ventas) => {
        const ventasAgrupadas = {};
        ventas.forEach(venta => {
            const fecha = venta.fecha.substring(0, 10);
            if (!ventasAgrupadas[fecha]) {
                ventasAgrupadas[fecha] = {
                    fecha,
                    total: 0,
                    cantidadVentas: 0,
                    productos: venta.productos || 1
                };
            }
            ventasAgrupadas[fecha].total += venta.total;
            ventasAgrupadas[fecha].cantidadVentas += 1;
            ventasAgrupadas[fecha].productos += (venta.productos || 1);
        });
        return Object.values(ventasAgrupadas).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    };

    // Filtrar datos por rango de fechas
    const filtrarPorFechas = (datos) => {
        if (!fechaInicio && !fechaFin) return datos;

        return datos.filter(item => {
            const fechaItem = item.fecha.substring(0, 10);
            const cumpleInicio = !fechaInicio || fechaItem >= fechaInicio;
            const cumpleFin = !fechaFin || fechaItem <= fechaFin;
            return cumpleInicio && cumpleFin;
        });
    };

    const ventasAgrupadasOriginales = agruparVentasPorDia(reportData.ventas);
    const datosFiltrados = filtrarPorFechas(ventasAgrupadasOriginales);

    // Calcular métricas avanzadas
    const ingresosTotales = datosFiltrados.reduce((acc, d) => acc + d.total, 0);
    const totalVentas = datosFiltrados.reduce((acc, d) => acc + d.cantidadVentas, 0);
    const promedioVenta = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

    const ventaMasAlta = reportData.ventas.length > 0
        ? Math.max(...reportData.ventas.map(v => v.total))
        : 0;
    const ventaMasBaja = reportData.ventas.length > 0
        ? Math.min(...reportData.ventas.map(v => v.total))
        : 0;

    // Calcular crecimiento (comparar con datos anteriores si existen)
    const calcularCrecimiento = () => {
        if (datosFiltrados.length < 2) return 0;
        const mitad = Math.floor(datosFiltrados.length / 2);
        const primeraMitad = datosFiltrados.slice(0, mitad).reduce((acc, d) => acc + d.total, 0);
        const segundaMitad = datosFiltrados.slice(mitad).reduce((acc, d) => acc + d.total, 0);
        if (primeraMitad === 0) return 0;
        return ((segundaMitad - primeraMitad) / primeraMitad * 100).toFixed(1);
    };

    const crecimiento = calcularCrecimiento();

    // Configuración del gráfico
    const ventasChartData = {
        labels: datosFiltrados.map(venta => formatearFecha(venta.fecha)),
        datasets: [{
            label: 'Ingresos por día',
            data: datosFiltrados.map(venta => venta.total),
            backgroundColor: datosFiltrados.map(venta =>
                venta.total > promedioVenta ? 'rgba(108, 117, 125, 0.8)' : 'rgba(108, 117, 125, 0.4)'
            ),
            borderColor: '#6c757d',
            borderWidth: 2,
            borderRadius: 4,
            tension: 0.4
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#495057',
                    font: { size: 12 }
                }
            },
            tooltip: {
                callbacks: {
                    afterLabel: function (context) {
                        const dataIndex = context.dataIndex;
                        const ventasCount = datosFiltrados[dataIndex]?.cantidadVentas || 0;
                        const productos = datosFiltrados[dataIndex]?.productos || 0;
                        return [
                            `Cantidad de ventas: ${ventasCount}`,
                            `Productos vendidos: ${productos}`
                        ];
                    }
                },
                backgroundColor: 'rgba(52, 58, 64, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return '$' + value.toLocaleString();
                    },
                    color: '#6c757d'
                },
                grid: {
                    color: 'rgba(108, 117, 125, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#6c757d'
                },
                grid: {
                    color: 'rgba(108, 117, 125, 0.1)'
                }
            }
        }
    };

    const limpiarFiltros = () => {
        setFechaInicio('');
        setFechaFin('');
    };

    const generarPDF = () => {
        if (!puedeExportar) {
            mostrarToast('No tienes permisos para exportar reportes', 'error');
            return;
        }
        const doc = new jsPDF();

        // Título y fecha
        doc.setFontSize(20);
        doc.text("Reporte Detallado de Ventas", 14, 20);

        doc.setFontSize(12);
        doc.text(`Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`, 14, 35);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 45);

        // Métricas principales
        doc.setFontSize(14);
        doc.text("Métricas Principales:", 14, 60);
        doc.setFontSize(11);
        doc.text(`• Ingresos Totales: $${ingresosTotales.toLocaleString()}`, 20, 70);
        doc.text(`• Total de Ventas: ${totalVentas}`, 20, 80);
        doc.text(`• Promedio por Venta: $${Math.round(promedioVenta).toLocaleString()}`, 20, 90);
        doc.text(`• Venta Más Alta: $${ventaMasAlta.toLocaleString()}`, 20, 100);
        doc.text(`• Venta Más Baja: $${ventaMasBaja.toLocaleString()}`, 20, 110);

        // Tabla detallada con códigos de factura
        autoTable(doc, {
            startY: 125,
            head: [['Fecha', 'Ingresos', 'Cantidad Ventas', 'Código Factura', 'Promedio/Venta']],
            body: datosFiltrados.map((item, index) => [
                formatearFecha(item.fecha),
                `$${item.total.toLocaleString()}`,
                item.cantidadVentas,
                generarCodigoFactura(item.fecha, index),
                `$${Math.round(item.total / item.cantidadVentas).toLocaleString()}`
            ]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [108, 117, 125] }
        });

        doc.save(`reporte_ventas_${new Date().toISOString().substring(0, 10)}.pdf`);
    };

    const exportarExcel = () => {
        if (!puedeExportar) {
            mostrarToast('No tienes permisos para exportar reportes', 'error');
            return;
        }
        const datosExcel = datosFiltrados.map((item, index) => ({
            'Fecha': formatearFecha(item.fecha),
            'Ingresos': item.total,
            'Cantidad de Ventas': item.cantidadVentas,
            'Código de Factura': generarCodigoFactura(item.fecha, index),
            'Promedio por Venta': Math.round(item.total / item.cantidadVentas)
        }));

        // Agregar hoja de resumen
        const resumen = {
            'Métrica': ['Ingresos Totales', 'Total Ventas', 'Promedio por Venta', 'Venta Más Alta', 'Venta Más Baja'],
            'Valor': [
                `$${ingresosTotales.toLocaleString()}`,
                totalVentas,
                `$${Math.round(promedioVenta).toLocaleString()}`,
                `$${ventaMasAlta.toLocaleString()}`,
                `$${ventaMasBaja.toLocaleString()}`
            ]
        };

        const wb = XLSX.utils.book_new();
        const wsDetalle = XLSX.utils.json_to_sheet(datosExcel);
        const wsResumen = XLSX.utils.json_to_sheet([resumen].reduce((acc, obj) => {
            obj['Métrica'].forEach((metric, index) => {
                acc.push({ 'Métrica': metric, 'Valor': obj['Valor'][index] });
            });
            return acc;
        }, []));

        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
        XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

        XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().substring(0, 10)}.xlsx`);
    };

    if (loading) {
        return (
            <div className="reportes-container">
                <Navbar />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Cargando reportes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reportes-container">
            <Navbar />
            <div className="reportes-content">
                <div className="reportes-header">
                    <h2>Reportes y Análisis</h2>
                    <p className="reportes-subtitle">Interfaz graficas de ventas</p>
                </div>

                {/* Métricas principales mejoradas */}
                <div className="metrics-grid">
                    <div className="metric-card primary">
                        <div className="metric-icon">
                            <i className="fas fa-dollar-sign"></i>
                        </div>
                        <div className="metric-content">
                            <h3>Ingresos Totales</h3>
                            <p className="metric-value">${ingresosTotales.toLocaleString()}</p>
                            {crecimiento !== 0 && (
                                <span className={`metric-trend ${crecimiento > 0 ? 'positive' : 'negative'}`}>
                                    {crecimiento > 0 ? '+' : ''}{crecimiento}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="metric-content">
                            <h3>Total Ventas</h3>
                            <p className="metric-value">{totalVentas}</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="metric-content">
                            <h3>Promedio por Venta</h3>
                            <p className="metric-value">${Math.round(promedioVenta).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-boxes"></i>
                        </div>
                        <div className="metric-content">
                            <h3>Productos en Inventario</h3>
                            <p className="metric-value">{reportData.inventario.length}</p>
                        </div>
                    </div>
                </div>

                {/* Métricas adicionales */}
                <div className="secondary-metrics">
                    <div className="secondary-metric">
                        <i className="fas fa-arrow-up metric-icon-small success"></i>
                        <div>
                            <span className="metric-label">Venta Más Alta</span>
                            <span className="metric-value-small">${ventaMasAlta.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="secondary-metric">
                        <i className="fas fa-arrow-down metric-icon-small warning"></i>
                        <div>
                            <span className="metric-label">Venta Más Baja</span>
                            <span className="metric-value-small">${ventaMasBaja.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="secondary-metric">
                        <i className="fas fa-calendar-day metric-icon-small info"></i>
                        <div>
                            <span className="metric-label">Días con Ventas</span>
                            <span className="metric-value-small">{datosFiltrados.length}</span>
                        </div>
                    </div>
                </div>

                {/* Controles mejorados */}
                <div className="report-controls-enhanced">
                    <div className="filters-section">
                        <h4>Filtros de Fecha</h4>
                        <div className="date-filters">
                            <div className="date-input-group">
                                <label>Fecha Inicio:</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={e => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div className="date-input-group">
                                <label>Fecha Fin:</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={e => setFechaFin(e.target.value)}
                                />
                            </div>
                            <button className="clear-filters-btn" onClick={limpiarFiltros}>
                                <i className="fas fa-times"></i> Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="chart-controls">
                        <h4>Vista del Gráfico</h4>
                        <div className="chart-toggles">
                            <button
                                className={`toggle-btn ${tipoGrafico === 'bar' ? 'active' : ''}`}
                                onClick={() => setTipoGrafico('bar')}
                            >
                                <i className="fas fa-chart-bar"></i> Barras
                            </button>
                            <button
                                className={`toggle-btn ${tipoGrafico === 'line' ? 'active' : ''}`}
                                onClick={() => setTipoGrafico('line')}
                            >
                                <i className="fas fa-chart-line"></i> Líneas
                            </button>
                        </div>
                    </div>
                </div>

                {/* Gráfico mejorado */}
                <div className="chart-section">
                    <div className="chart-container-enhanced">
                        <div className="chart-header">
                            <h3>Análisis de Ventas por Período</h3>
                            <div className="chart-info">
                                <span className="chart-info-item">
                                    <i className="fas fa-circle" style={{ color: 'rgba(108, 117, 125, 0.8)' }}></i>
                                    Ventas sobre promedio
                                </span>
                                <span className="chart-info-item">
                                    <i className="fas fa-circle" style={{ color: 'rgba(108, 117, 125, 0.4)' }}></i>
                                    Ventas bajo promedio
                                </span>
                            </div>
                        </div>
                        {tipoGrafico === 'bar' ? (
                            <Bar data={ventasChartData} options={chartOptions} />
                        ) : (
                            <Line data={ventasChartData} options={chartOptions} />
                        )}
                    </div>
                </div>

                {/* Tabla mejorada con códigos de factura */}
                <div className="report-tables-enhanced">
                    <div className="table-header">
                        <h3>Detalle de Ventas Agrupadas</h3>
                        <div className="export-buttons">
                            {puedeExportar && (
                                <>
                                    <button className="export-btn pdf-btn" onClick={generarPDF}>
                                        <i className="fas fa-file-pdf"></i> Exportar PDF
                                    </button>
                                    <button className="export-btn excel-btn" onClick={exportarExcel}>
                                        <i className="fas fa-file-excel"></i> Exportar Excel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="enhanced-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Ingresos</th>
                                    <th>Cantidad de Ventas</th>
                                    <th>Código de Factura</th>
                                    <th>Promedio por Venta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosFiltrados.map((item, index) => (
                                    <tr key={index} className={item.total > promedioVenta ? 'row-highlight' : ''}>
                                        <td>{formatearFecha(item.fecha)}</td>
                                        <td className="currency">${item.total.toLocaleString()}</td>
                                        <td className="center">{item.cantidadVentas}</td>
                                        <td className="invoice-code">{generarCodigoFactura(item.fecha, index)}</td>
                                        <td className="currency">
                                            ${Math.round(item.total / item.cantidadVentas).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {datosFiltrados.length === 0 && (
                        <div className="no-data">
                            <i className="fas fa-chart-line"></i>
                            <p>No hay datos para el rango de fechas seleccionado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reportes;