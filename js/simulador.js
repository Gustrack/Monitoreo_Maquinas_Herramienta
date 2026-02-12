/**
 * SmartMonitor Pro - Sistema de Gestión Industrial
 * Versión 2.3 - Proyecto Final JavaScript
 * @author TuNombre
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando SmartMonitor Pro...');
    
    // Verificar que Luxon esté disponible
    if (typeof luxon === 'undefined') {
        console.error('❌ Luxon no está cargado. Verifica la conexión a Internet.');
        return;
    }
    
    // Inicializar el simulador
    window.simulador = new SimuladorIndustrial();
    console.log('✅ SmartMonitor Pro inicializado correctamente');
});

// Utilizando Luxon para manejo profesional de fechas
const DateTime = luxon.DateTime;

class SimuladorIndustrial {
    // Constantes de configuración
    static NUMERO_MAQUINAS = 4;
    static FACTOR_POTENCIA = 0.85;
    static INTERVALO_MUESTREO_DEFAULT = 30;
    static MAX_HISTORIAL = 100;
    static MAX_PUNTOS_GRAFICO = 20;

    constructor() {
        console.log('🏭 Creando instancia del SimuladorIndustrial');
        
        // Estado del simulador
        this.datosMaquinas = [];
        this.historialCorrientes = [];
        this.valoresNominales = {
            corrienteNominal: 40,
            tensionNominal: 380,
            intervaloMuestreo: 30
        };
        this.intervaloMuestreo = null;
        this.simuladorActivo = false;
        this.tiempoInicio = null;
        this.chart = null;
        this.historialDatos = [];
        this.contadorMuestreos = 0;
        
        // Estado de visualización
        this.modoVisualizacion = 'todas'; // 'todas' o 'individual'
        this.maquinaSeleccionada = null;
        
        // Almacenar todas las alarmas activas
        this.alarmasActivas = [];

        // Bind de métodos
        this.iniciar = this.iniciar.bind(this);
        this.finalizar = this.finalizar.bind(this);
        this.actualizarDatos = this.actualizarDatos.bind(this);
        this.mostrarTodasLasMaquinas = this.mostrarTodasLasMaquinas.bind(this);
        this.mostrarFormularioConsulta = this.mostrarFormularioConsulta.bind(this);
        this.ocultarFormularioConsulta = this.ocultarFormularioConsulta.bind(this);
        this.mostrarFormularioConfig = this.mostrarFormularioConfig.bind(this);
        this.ocultarFormularioConfig = this.ocultarFormularioConfig.bind(this);
        this.limpiarHistorial = this.limpiarHistorial.bind(this);
        this.exportarDatos = this.exportarDatos.bind(this);
        
        // Inicializar componentes
        this.inicializarComponentes();
    }

    // ============= MÉTODOS DE INICIALIZACIÓN =============
    
    async inicializarComponentes() {
        console.log('⚙️ Inicializando componentes...');
        
        // Cargar datos primero
        this.cargarDatosLocalStorage();
        
        // Inicializar UI
        this.inicializarReloj();
        this.actualizarDisplayValoresNominales();
        this.actualizarEstadoSimulador();
        this.mostrarEstadoInicial();
        
        // CORREGIDO: Limpiar título del panel de resultados
        this.limpiarTituloPanelResultados();
        
        // Inicializar gráfico
        setTimeout(() => {
            this.inicializarGrafico();
        }, 100);
        
        // Cargar JSON
        this.cargarDatosJSON();
        
        // Inicializar event listeners
        this.inicializarEventListeners();
        
        console.log('✅ Componentes inicializados');
    }

    // NUEVO: Método para limpiar el título del panel de resultados
    limpiarTituloPanelResultados() {
        const panelHeader = document.querySelector('.results-panel .panel-header h3');
        if (panelHeader) {
            // Remover cualquier icono existente y dejar solo el texto
            panelHeader.innerHTML = 'Monitoreo en Tiempo Real';
        }
    }

    // NUEVO: Método para actualizar el título del panel de resultados
    actualizarTituloPanelResultados() {
        const panelHeader = document.querySelector('.results-panel .panel-header h3');
        if (!panelHeader) return;
        
        if (this.modoVisualizacion === 'individual' && this.maquinaSeleccionada) {
            panelHeader.innerHTML = `Monitoreo Máquina ${this.maquinaSeleccionada} <span style="font-size: 0.8rem; background: rgba(0,255,157,0.2); padding: 3px 10px; border-radius: 15px; margin-left: 10px;">Monitoreo Exclusivo</span>`;
        } else {
            panelHeader.innerHTML = `Monitoreo en Tiempo Real <span style="font-size: 0.8rem; background: rgba(0,255,157,0.2); padding: 3px 10px; border-radius: 15px; margin-left: 10px;">Todas las Máquinas</span>`;
        }
    }

    mostrarEstadoInicial() {
        const cuerpoTabla = document.getElementById('cuerpo-tabla');
        if (cuerpoTabla) {
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-play-circle" style="font-size: 48px; margin-bottom: 15px; color: #00ff9d;"></i>
                        <br>
                        <span style="font-size: 1.2rem;">Sistema listo para iniciar</span>
                        <br>
                        <span style="font-size: 0.9rem;">Haga clic en "Iniciar Sistema" para comenzar el monitoreo</span>
                    </td>
                </tr>
            `;
        }
    }

    inicializarReloj() {
        const actualizarFechaHora = () => {
            try {
                const ahora = DateTime.now();
                const fechaEl = document.getElementById('fecha-actual');
                const horaEl = document.getElementById('hora-actual');
                
                if (fechaEl) fechaEl.textContent = ahora.toFormat('dd/MM/yyyy');
                if (horaEl) horaEl.textContent = ahora.toFormat('HH:mm:ss');
            } catch (e) {
                console.error('Error actualizando reloj:', e);
            }
        };
        actualizarFechaHora();
        setInterval(actualizarFechaHora, 1000);
    }

    inicializarGrafico() {
        try {
            const canvas = document.getElementById('tendencias-chart');
            if (!canvas) {
                console.error('Canvas no encontrado');
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // Colores para cada máquina
            const coloresMaquinas = [
                '#00ff9d', // Verde neón - Máquina 1
                '#00b8ff', // Azul - Máquina 2
                '#ffbb33', // Amarillo - Máquina 3
                '#ff4444'  // Rojo - Máquina 4
            ];
            
            // Crear datasets para cada máquina
            const datasets = [];
            for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
                datasets.push({
                    label: `Máquina ${i + 1}`,
                    data: [],
                    borderColor: coloresMaquinas[i],
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    pointBackgroundColor: coloresMaquinas[i],
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    fill: false,
                    spanGaps: true,
                    // NUEVO: Propiedad para controlar visibilidad
                    hidden: false
                });
            }

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 800
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            min: 0,
                            max: 80,
                            grid: {
                                color: 'rgba(0, 255, 157, 0.1)',
                                drawBorder: false
                            },
                            title: {
                                display: true,
                                text: 'Corriente (A)',
                                color: '#e0e0e0',
                                font: {
                                    family: 'Share Tech Mono',
                                    size: 12
                                }
                            },
                            ticks: {
                                color: '#e0e0e0',
                                stepSize: 20
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#e0e0e0',
                                maxRotation: 45,
                                minRotation: 45
                            },
                            title: {
                                display: true,
                                text: 'Tiempo de muestreo',
                                color: '#e0e0e0',
                                font: {
                                    family: 'Share Tech Mono',
                                    size: 12
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#e0e0e0',
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10, 15, 30, 0.95)',
                            titleColor: '#00ff9d',
                            bodyColor: '#e0e0e0',
                            borderColor: '#00ff9d',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: true
                        }
                    }
                }
            });
            
            console.log('✅ Gráfico inicializado');
        } catch (e) {
            console.error('Error inicializando gráfico:', e);
        }
    }

    // NUEVO: Método para actualizar la visibilidad de las líneas en el gráfico
    actualizarVisibilidadGrafico() {
        if (!this.chart) return;
        
        if (this.modoVisualizacion === 'individual' && this.maquinaSeleccionada) {
            // Mostrar solo la máquina seleccionada
            for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
                this.chart.data.datasets[i].hidden = (i + 1 !== this.maquinaSeleccionada);
            }
        } else {
            // Mostrar todas las máquinas
            for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
                this.chart.data.datasets[i].hidden = false;
            }
        }
        
        this.chart.update();
    }

    // ============= CARGA DE DATOS ASÍNCRONA =============
    
    async cargarDatosJSON() {
        try {
            // Simulando carga de datos remotos
            const response = await new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        configuraciones: [
                            { id: 1, nombre: "Modo Normal", corriente: 40, tension: 380, intervalo: 30 },
                            { id: 2, nombre: "Modo Alta Demanda", corriente: 60, tension: 400, intervalo: 20 },
                            { id: 3, nombre: "Modo Eficiencia", corriente: 35, tension: 360, intervalo: 45 },
                            { id: 4, nombre: "Modo Monitoreo Intensivo", corriente: 40, tension: 380, intervalo: 15 }
                        ]
                    });
                }, 500);
            });
            
            console.log('✅ Datos JSON cargados exitosamente');
            this.guardarEnHistorial('sistema', 'Configuración inicial cargada', 
                `${response.configuraciones.length} modos disponibles`);
        } catch (error) {
            console.error('Error cargando JSON:', error);
        }
    }

    // ============= MÉTODOS DE PERSISTENCIA =============
    
    cargarDatosLocalStorage() {
        try {
            const configGuardada = localStorage.getItem('smartMonitorConfig');
            const historialGuardado = localStorage.getItem('smartMonitorHistorial');
            
            if (configGuardada) {
                this.valoresNominales = JSON.parse(configGuardada);
                console.log('✅ Configuración cargada:', this.valoresNominales);
            }
            
            if (historialGuardado) {
                this.historialDatos = JSON.parse(historialGuardado);
                this.mostrarHistorial();
            }
            
            this.actualizarDisplayValoresNominales();
        } catch (e) {
            console.error('Error cargando localStorage:', e);
        }
    }

    guardarDatosLocalStorage() {
        try {
            localStorage.setItem('smartMonitorConfig', JSON.stringify(this.valoresNominales));
            console.log('✅ Configuración guardada');
        } catch (e) {
            console.error('Error guardando localStorage:', e);
        }
    }

    // ============= GESTIÓN DE HISTORIAL =============
    
    guardarEnHistorial(tipo, mensaje, detalles = '') {
        try {
            const evento = {
                id: DateTime.now().toMillis(),
                fecha: DateTime.now().toISO(),
                fechaFormateada: DateTime.now().toFormat('dd/MM/yyyy HH:mm:ss'),
                tipo: tipo,
                mensaje: mensaje,
                detalles: detalles
            };
            
            this.historialDatos.unshift(evento);
            
            if (this.historialDatos.length > SimuladorIndustrial.MAX_HISTORIAL) {
                this.historialDatos.pop();
            }
            
            localStorage.setItem('smartMonitorHistorial', JSON.stringify(this.historialDatos));
            this.mostrarHistorial();
        } catch (e) {
            console.error('Error guardando en historial:', e);
        }
    }

    mostrarHistorial() {
        const historialLista = document.getElementById('historial-lista');
        if (!historialLista) return;
        
        if (this.historialDatos.length === 0) {
            historialLista.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No hay eventos en el historial</div>';
            return;
        }
        
        historialLista.innerHTML = '';
        
        this.historialDatos.slice(0, 20).forEach(evento => {
            const item = document.createElement('div');
            item.className = `history-item ${evento.tipo}`;
            item.innerHTML = `
                <div class="history-time">
                    <i class="far fa-clock"></i> ${evento.fechaFormateada}
                </div>
                <div class="history-message">
                    <strong>${evento.mensaje}</strong>
                </div>
                ${evento.detalles ? `<div class="history-details">${evento.detalles}</div>` : ''}
            `;
            historialLista.appendChild(item);
        });
    }

    limpiarHistorial() {
        Swal.fire({
            title: '¿Limpiar historial?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            background: '#0a0f1e',
            color: '#e0e0e0',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.historialDatos = [];
                localStorage.removeItem('smartMonitorHistorial');
                this.mostrarHistorial();
                this.guardarEnHistorial('configuracion', 'Historial limpiado');
                this.mostrarNotificacion('Historial eliminado', 'success');
            }
        });
    }

    exportarDatos() {
        const datos = {
            version: '2.3',
            fechaExportacion: DateTime.now().toISO(),
            valoresNominales: this.valoresNominales,
            datosMaquinas: this.datosMaquinas,
            historial: this.historialDatos,
            historialCorrientes: this.historialCorrientes,
            estadisticas: this.calcularEstadisticas(),
            modoVisualizacion: this.modoVisualizacion,
            maquinaSeleccionada: this.maquinaSeleccionada
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartmonitor-export-${DateTime.now().toFormat('yyyy-MM-dd-HHmm')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.guardarEnHistorial('configuracion', 'Datos exportados');
        this.mostrarNotificacion('Datos exportados exitosamente', 'success');
    }

    // ============= MÉTODOS DE SIMULACIÓN =============
    
    generarValorAleatorio(min, max) {
        return parseFloat((Math.random() * (max - min) + min).toFixed(2));
    }

    calcularPotencia(tension, corrientes) {
        const corrientePromedio = corrientes.reduce((a, b) => a + b, 0) / corrientes.length;
        return parseFloat((Math.sqrt(3) * tension * corrientePromedio * 
                          SimuladorIndustrial.FACTOR_POTENCIA / 1000).toFixed(2));
    }

    actualizarDatos() {
        if (!this.simuladorActivo) return;
        
        this.contadorMuestreos++;
        const timestamp = DateTime.now().toFormat('HH:mm:ss');
        const timestampCompleto = DateTime.now().toFormat('dd/MM/yyyy HH:mm:ss');
        
        this.datosMaquinas = [];
        this.alarmasActivas = [];
        
        const corrientesPromedio = [];
        
        for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
            const corrientes = [
                this.generarValorAleatorio(10, 60),
                this.generarValorAleatorio(10, 60),
                this.generarValorAleatorio(10, 60)
            ];
            
            const tension = this.generarValorAleatorio(
                this.valoresNominales.tensionNominal * 0.9,
                this.valoresNominales.tensionNominal * 1.2
            );
            
            const maquina = {
                id: i + 1,
                corriente1: corrientes[0],
                corriente2: corrientes[1],
                corriente3: corrientes[2],
                tension: tension,
                potencia: this.calcularPotencia(tension, corrientes),
                fasesEnAlarma: [],
                timestamp: DateTime.now().toISO(),
                timestampFormateado: timestampCompleto
            };
            
            // Detectar alarmas
            if (corrientes[0] > this.valoresNominales.corrienteNominal) {
                maquina.fasesEnAlarma.push('F1');
            }
            if (corrientes[1] > this.valoresNominales.corrienteNominal) {
                maquina.fasesEnAlarma.push('F2');
            }
            if (corrientes[2] > this.valoresNominales.corrienteNominal) {
                maquina.fasesEnAlarma.push('F3');
            }
            
            if (maquina.fasesEnAlarma.length > 0) {
                this.alarmasActivas.push(maquina);
            }
            
            this.datosMaquinas.push(maquina);
            corrientesPromedio.push((corrientes[0] + corrientes[1] + corrientes[2]) / 3);
        }
        
        // Actualizar UI según el modo de visualización
        if (this.alarmasActivas.length > 0) {
            this.mostrarTodasLasAlarmas();
        } else {
            this.ocultarPanelAlarmas();
        }
        
        // Actualizar historial de corrientes para el gráfico
        this.actualizarHistorialGrafico(timestamp, corrientesPromedio);
        
        this.actualizarMetricas(this.alarmasActivas.length);
        this.actualizarGrafico();
        this.actualizarVisibilidadGrafico(); // NUEVO: Actualizar visibilidad del gráfico
        this.guardarDatosLocalStorage();
        
        if (this.alarmasActivas.length > 0) {
            this.guardarEnHistorial('alarma', `${this.alarmasActivas.length} máquina(s) con sobrecarga`,
                `Máquinas: ${this.alarmasActivas.map(m => m.id).join(', ')}`);
        }
        
        // Mostrar datos según el modo de visualización
        if (this.modoVisualizacion === 'todas') {
            this.mostrarResultadosEnTabla(this.datosMaquinas);
        } else if (this.modoVisualizacion === 'individual' && this.maquinaSeleccionada) {
            const maquinaFiltrada = this.datosMaquinas.filter(m => m.id === this.maquinaSeleccionada);
            if (maquinaFiltrada.length > 0) {
                this.mostrarResultadosEnTabla(maquinaFiltrada);
            }
        }
        
        this.actualizarEstadoSimulador();
    }

    mostrarTodasLasAlarmas() {
        const alarmContainer = document.getElementById('alarm-container');
        const alarmMessage = document.getElementById('alarm-message');
        
        if (!alarmContainer || !alarmMessage) return;
        
        let mensajeCompleto = '';
        
        this.alarmasActivas.forEach(maquina => {
            const formatearValor = (valor) => {
                if (valor > this.valoresNominales.corrienteNominal) {
                    return `<span style="color: #ff4444; font-weight: bold;">${valor} A ⚠️</span>`;
                }
                return `${valor} A`;
            };
            
            const fasesTexto = maquina.fasesEnAlarma.join(', ');
            mensajeCompleto += `
                <div class="alarma-item">
                    <div class="alarma-header">
                        <i class="fas fa-exclamation-circle" style="color: #ff4444;"></i>
                        <strong>MÁQUINA ${maquina.id}</strong>
                        <span class="badge-danger">URGENTE</span>
                    </div>
                    <div class="alarma-body">
                        <p><i class="far fa-calendar-alt"></i> <strong>Fecha/Hora:</strong> ${maquina.timestampFormateado}</p>
                        <p><i class="fas fa-bolt"></i> <strong>Fases en sobrecarga:</strong> ${fasesTexto}</p>
                        <p><strong>Valores:</strong> F1=${formatearValor(maquina.corriente1)}, 
                                                    F2=${formatearValor(maquina.corriente2)}, 
                                                    F3=${formatearValor(maquina.corriente3)}</p>
                        <p><strong>Límite nominal:</strong> ${this.valoresNominales.corrienteNominal} A</p>
                    </div>
                </div>
                ${this.alarmasActivas.indexOf(maquina) < this.alarmasActivas.length - 1 ? '<hr style="border-color: rgba(255, 68, 68, 0.3); margin: 15px 0;">' : ''}
            `;
        });
        
        alarmMessage.innerHTML = mensajeCompleto;
        alarmContainer.style.display = 'block';
    }

    ocultarPanelAlarmas() {
        const alarmContainer = document.getElementById('alarm-container');
        if (alarmContainer) {
            alarmContainer.style.display = 'none';
        }
    }

    actualizarHistorialGrafico(timestamp, corrientesPromedio) {
        this.historialCorrientes.push({
            timestamp: timestamp,
            maquinas: corrientesPromedio
        });
        
        if (this.historialCorrientes.length > SimuladorIndustrial.MAX_PUNTOS_GRAFICO) {
            this.historialCorrientes.shift();
        }
    }

    // ============= MÉTODOS DE INTERFAZ =============
    
    actualizarMetricas(alarmasActivas) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        setText('valor-nominal-header', this.valoresNominales.corrienteNominal);
        setText('maquinas-activas', this.simuladorActivo ? this.datosMaquinas.length : 0);
        setText('alarmas-activas', alarmasActivas);
        setText('valor-nominal-actual', this.valoresNominales.corrienteNominal);
        setText('intervalo-actual', this.valoresNominales.intervaloMuestreo || 30);
    }

    actualizarGrafico() {
        if (!this.chart || this.historialCorrientes.length === 0) return;
        
        this.chart.data.labels = this.historialCorrientes.map(item => item.timestamp);
        
        for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
            this.chart.data.datasets[i].data = this.historialCorrientes.map(item => 
                item.maquinas[i] || null
            );
        }
        
        this.chart.update();
    }

    mostrarResultadosEnTabla(maquinas) {
        const cuerpoTabla = document.getElementById('cuerpo-tabla');
        if (!cuerpoTabla) return;
        
        cuerpoTabla.innerHTML = '';
        
        maquinas.forEach(maquina => {
            const fila = document.createElement('tr');
            
            const formatearCorriente = (valor, fase) => {
                const enAlarma = maquina.fasesEnAlarma.includes(fase);
                return enAlarma 
                    ? `<span style="color: #ff4444; font-weight: bold;">${valor} ⚠️</span>`
                    : `<span style="color: #ffffff;">${valor}</span>`;
            };
            
            const estadoHTML = maquina.fasesEnAlarma.length > 0 
                ? `<span class="status-badge status-alarm">
                     <i class="fas fa-exclamation-triangle"></i> ALARMA (${maquina.fasesEnAlarma.join(', ')})
                   </span>`
                : `<span class="status-badge status-normal">
                     <i class="fas fa-check-circle"></i> NORMAL
                   </span>`;
            
            fila.innerHTML = `
                <td>M-${maquina.id}</td>
                <td>${formatearCorriente(maquina.corriente1, 'F1')}</td>
                <td>${formatearCorriente(maquina.corriente2, 'F2')}</td>
                <td>${formatearCorriente(maquina.corriente3, 'F3')}</td>
                <td>${maquina.tension}</td>
                <td>${maquina.potencia}</td>
                <td>${estadoHTML}</td>
            `;
            
            cuerpoTabla.appendChild(fila);
        });
        
        // CORREGIDO: Actualizar título sin duplicar iconos
        this.actualizarTituloPanelResultados();
        
        document.getElementById('resultados').style.display = 'block';
        const ultimaActEl = document.getElementById('ultima-actualizacion');
        if (ultimaActEl) ultimaActEl.textContent = DateTime.now().toFormat('HH:mm:ss');
    }

    mostrarEstadoApagado() {
        const cuerpoTabla = document.getElementById('cuerpo-tabla');
        if (!cuerpoTabla) return;
        
        cuerpoTabla.innerHTML = '';
        
        for (let i = 1; i <= SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>M-${i}</td>
                <td><span style="color: #6c757d;">-</span></td>
                <td><span style="color: #6c757d;">-</span></td>
                <td><span style="color: #6c757d;">-</span></td>
                <td><span style="color: #6c757d;">-</span></td>
                <td><span style="color: #6c757d;">-</span></td>
                <td><span class="status-badge status-off"><i class="fas fa-power-off"></i> APAGADO</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        }
        
        // Resetear modo de visualización al apagar
        this.modoVisualizacion = 'todas';
        this.maquinaSeleccionada = null;
        
        // CORREGIDO: Actualizar título y visibilidad del gráfico
        this.actualizarTituloPanelResultados();
        this.actualizarVisibilidadGrafico();
    }

    // ============= MÉTODOS DE ACCIÓN =============
    
    iniciar() {
        console.log('▶️ Iniciando sistema...');
        
        if (this.simuladorActivo) {
            this.mostrarNotificacion('El sistema ya está en ejecución', 'info');
            return;
        }
        
        document.getElementById('shutdown-container').style.display = 'none';
        this.ocultarPanelAlarmas();
        
        this.simuladorActivo = true;
        this.tiempoInicio = DateTime.now();
        this.contadorMuestreos = 0;
        this.historialCorrientes = [];
        
        // Resetear modo de visualización al iniciar
        this.modoVisualizacion = 'todas';
        this.maquinaSeleccionada = null;
        
        if (this.chart) {
            this.chart.data.labels = [];
            for (let i = 0; i < SimuladorIndustrial.NUMERO_MAQUINAS; i++) {
                this.chart.data.datasets[i].data = [];
                this.chart.data.datasets[i].hidden = false;
            }
            this.chart.update();
        }
        
        // CORREGIDO: Actualizar título
        this.actualizarTituloPanelResultados();
        
        this.actualizarDatos();
        
        const intervaloMs = (this.valoresNominales.intervaloMuestreo || 30) * 1000;
        this.intervaloMuestreo = setInterval(() => {
            if (this.simuladorActivo) {
                this.actualizarDatos();
            }
        }, intervaloMs);
        
        this.actualizarEstadoSimulador();
        this.guardarEnHistorial('inicio', 'Sistema iniciado', 
            `Intervalo: ${this.valoresNominales.intervaloMuestreo || 30}s`);
        
        this.mostrarNotificacion('✅ Sistema iniciado correctamente', 'success');
    }

    finalizar() {
        console.log('⏹️ Finalizando sistema...');
        
        if (!this.simuladorActivo) {
            this.mostrarNotificacion('El sistema ya está apagado', 'info');
            return;
        }
        
        Swal.fire({
            title: '¿Finalizar sistema?',
            text: "Se detendrá el monitoreo de todas las máquinas",
            icon: 'question',
            background: '#0a0f1e',
            color: '#e0e0e0',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, apagar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (this.intervaloMuestreo) {
                    clearInterval(this.intervaloMuestreo);
                    this.intervaloMuestreo = null;
                }
                
                this.simuladorActivo = false;
                this.modoVisualizacion = 'todas';
                this.maquinaSeleccionada = null;
                
                const tiempoEjecucion = this.tiempoInicio 
                    ? Math.round(DateTime.now().diff(this.tiempoInicio, 'seconds').seconds)
                    : 0;
                
                const shutdownContainer = document.getElementById('shutdown-container');
                const shutdownMessage = document.getElementById('shutdown-message');
                
                if (shutdownContainer && shutdownMessage) {
                    shutdownMessage.innerHTML = `
                        <div class="shutdown-stats">
                            <p><i class="fas fa-clock"></i> Tiempo: ${tiempoEjecucion} segundos</p>
                            <p><i class="fas fa-database"></i> Muestreos: ${this.contadorMuestreos}</p>
                            <p><i class="fas fa-tachometer-alt"></i> Corriente nominal: ${this.valoresNominales.corrienteNominal}A</p>
                            <p><i class="fas fa-sync-alt"></i> Intervalo: ${this.valoresNominales.intervaloMuestreo || 30}s</p>
                        </div>
                        <p class="shutdown-footer"><i class="fas fa-redo-alt"></i> Use "Iniciar Sistema" para reactivar</p>
                    `;
                    shutdownContainer.style.display = 'block';
                }
                
                this.ocultarPanelAlarmas();
                this.mostrarEstadoApagado();
                this.actualizarMetricas(0);
                
                // CORREGIDO: Actualizar visibilidad del gráfico
                this.actualizarVisibilidadGrafico();
                
                this.guardarEnHistorial('apagado', 'Sistema finalizado', 
                    `Tiempo: ${tiempoEjecucion}s, Muestreos: ${this.contadorMuestreos}`);
                this.actualizarEstadoSimulador();
                this.mostrarNotificacion('🛑 Sistema apagado', 'info');
            }
        });
    }

    mostrarDatosMaquina(idMaquina) {
        if (!this.simuladorActivo) {
            this.mostrarNotificacion('El sistema está apagado. Inícielo primero.', 'warning');
            return;
        }
        
        if (idMaquina < 1 || idMaquina > SimuladorIndustrial.NUMERO_MAQUINAS) {
            this.mostrarNotificacion('Número de máquina inválido', 'error');
            return;
        }
        
        const maquina = this.datosMaquinas.find(m => m.id === idMaquina);
        if (!maquina) {
            this.mostrarNotificacion('No hay datos para esta máquina', 'error');
            return;
        }
        
        // Cambiar modo de visualización a individual
        this.modoVisualizacion = 'individual';
        this.maquinaSeleccionada = idMaquina;
        
        // NUEVO: Actualizar visibilidad del gráfico para mostrar solo la máquina seleccionada
        this.actualizarVisibilidadGrafico();
        
        this.mostrarResultadosEnTabla([maquina]);
        
        const fases = maquina.fasesEnAlarma.length > 0 
            ? `Alarmas: ${maquina.fasesEnAlarma.join(', ')}` 
            : 'Sin alarmas';
        
        this.guardarEnHistorial('consulta', `Monitoreo exclusivo máquina ${idMaquina} activado`, fases);
        this.ocultarFormularioConsulta();
        this.mostrarNotificacion(`🔍 Monitoreando exclusivamente Máquina ${idMaquina}`, 'info');
    }

    mostrarTodasLasMaquinas() {
        if (!this.simuladorActivo) {
            this.mostrarNotificacion('El sistema está apagado. Inícielo primero.', 'warning');
            return;
        }
        
        if (this.datosMaquinas.length === 0) {
            this.mostrarNotificacion('No hay datos disponibles', 'info');
            return;
        }
        
        // Cambiar modo de visualización a todas
        this.modoVisualizacion = 'todas';
        this.maquinaSeleccionada = null;
        
        // NUEVO: Actualizar visibilidad del gráfico para mostrar todas las máquinas
        this.actualizarVisibilidadGrafico();
        
        this.mostrarResultadosEnTabla(this.datosMaquinas);
        this.guardarEnHistorial('consulta', 'Monitoreo general activado');
        this.mostrarNotificacion('📊 Mostrando todas las máquinas', 'info');
    }

    // ============= MÉTODOS DE FORMULARIOS =============
    
    mostrarFormularioConsulta() {
        const container = document.getElementById('consulta-form-container');
        if (container) {
            container.style.display = 'flex';
        }
    }

    ocultarFormularioConsulta() {
        const container = document.getElementById('consulta-form-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    mostrarFormularioConfig() {
        const container = document.getElementById('config-form-container');
        if (!container) return;
        
        const form = document.getElementById('config-form');
        if (form) {
            form['corriente-nominal'].value = this.valoresNominales.corrienteNominal;
            form['tension-nominal'].value = this.valoresNominales.tensionNominal;
            form['intervalo-muestreo'].value = this.valoresNominales.intervaloMuestreo || 30;
        }
        
        container.style.display = 'flex';
    }

    ocultarFormularioConfig() {
        const container = document.getElementById('config-form-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    // ============= MÉTODOS DE UTILIDAD =============
    
    actualizarEstadoSimulador() {
        const estadoTexto = document.getElementById('estado-texto-header');
        const estadoIndicator = document.querySelector('#sistema-estado i');
        
        if (this.simuladorActivo) {
            if (estadoTexto) {
                estadoTexto.textContent = 'Sistema Activo';
                estadoTexto.style.color = '#00ff9d';
            }
            if (estadoIndicator) {
                estadoIndicator.style.color = '#00ff9d';
            }
        } else {
            if (estadoTexto) {
                estadoTexto.textContent = 'Sistema Inactivo';
                estadoTexto.style.color = '#ff4444';
            }
            if (estadoIndicator) {
                estadoIndicator.style.color = '#ff4444';
            }
        }
    }

    actualizarDisplayValoresNominales() {
        const valorEl = document.getElementById('valor-nominal-actual');
        if (valorEl) {
            valorEl.textContent = this.valoresNominales.corrienteNominal;
        }
    }

    calcularEstadisticas() {
        if (this.datosMaquinas.length === 0) {
            return {
                promedioCorriente: 0,
                maxCorriente: 0,
                minCorriente: 0,
                maquinasAlarma: 0,
                totalMuestreos: this.contadorMuestreos,
                intervaloActual: this.valoresNominales.intervaloMuestreo || 30,
                modoVisualizacion: this.modoVisualizacion,
                maquinaSeleccionada: this.maquinaSeleccionada
            };
        }
        
        const corrientes = this.datosMaquinas.flatMap(m => [
            m.corriente1, m.corriente2, m.corriente3
        ]);
        
        return {
            promedioCorriente: (corrientes.reduce((a, b) => a + b, 0) / corrientes.length).toFixed(2),
            maxCorriente: Math.max(...corrientes).toFixed(2),
            minCorriente: Math.min(...corrientes).toFixed(2),
            maquinasAlarma: this.datosMaquinas.filter(m => m.fasesEnAlarma.length > 0).length,
            totalMuestreos: this.contadorMuestreos,
            intervaloActual: this.valoresNominales.intervaloMuestreo || 30,
            modoVisualizacion: this.modoVisualizacion,
            maquinaSeleccionada: this.maquinaSeleccionada
        };
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: mensaje,
                icon: tipo,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#0a0f1e',
                color: '#e0e0e0'
            });
        } else {
            console.log('Notificación:', mensaje);
        }
    }

    // ============= EVENT LISTENERS =============
    
    inicializarEventListeners() {
        console.log('🎯 Inicializando event listeners...');
        
        // Formulario de consulta
        const consultaForm = document.getElementById('consulta-form');
        if (consultaForm) {
            consultaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const numeroMaquina = parseInt(document.getElementById('numero-maquina').value);
                this.mostrarDatosMaquina(numeroMaquina);
            });
        }
        
        // Formulario de configuración
        const configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const corrienteNominal = parseFloat(document.getElementById('corriente-nominal').value);
                const tensionNominal = parseFloat(document.getElementById('tension-nominal').value);
                const intervaloMuestreo = parseInt(document.getElementById('intervalo-muestreo').value);
                
                if (corrienteNominal <= 0 || tensionNominal <= 0 || intervaloMuestreo <= 0) {
                    this.mostrarNotificacion('Los valores deben ser positivos', 'error');
                    return;
                }
                
                if (intervaloMuestreo < 5 || intervaloMuestreo > 120) {
                    this.mostrarNotificacion('El intervalo debe estar entre 5 y 120 segundos', 'error');
                    return;
                }
                
                this.valoresNominales.corrienteNominal = corrienteNominal;
                this.valoresNominales.tensionNominal = tensionNominal;
                this.valoresNominales.intervaloMuestreo = intervaloMuestreo;
                
                this.guardarDatosLocalStorage();
                this.actualizarDisplayValoresNominales();
                this.actualizarMetricas(this.alarmasActivas.length);
                
                if (this.simuladorActivo) {
                    if (this.intervaloMuestreo) {
                        clearInterval(this.intervaloMuestreo);
                    }
                    this.intervaloMuestreo = setInterval(() => {
                        if (this.simuladorActivo) {
                            this.actualizarDatos();
                        }
                    }, intervaloMuestreo * 1000);
                }
                
                this.guardarEnHistorial('configuracion', 
                    'Parámetros actualizados',
                    `Corriente: ${corrienteNominal}A, Tensión: ${tensionNominal}V, Intervalo: ${intervaloMuestreo}s`
                );
                
                this.mostrarNotificacion('Configuración guardada', 'success');
                this.ocultarFormularioConfig();
            });
        }
        
        console.log('✅ Event listeners inicializados');
    }
}