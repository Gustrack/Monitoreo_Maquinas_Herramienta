// Variables globales
const NUMERO_MAQUINAS = 4;
const FACTOR_POTENCIA = 0.85;
const LOCALSTORAGE_KEY = 'simuladorMaquinasHerramientas';
const HISTORIAL_KEY = 'historialSimulador';

let datosMaquinas = [];
let valoresNominales = {
    corrienteNominal: 40,
    tensionNominal: 380
};
let intervaloMuestreo = null;
let simuladorActivo = false;
let tiempoInicio = null;

// Cargar datos del LocalStorage al iniciar
function cargarDatosLocalStorage() {
    const datosGuardados = localStorage.getItem(LOCALSTORAGE_KEY);
    const historialGuardado = localStorage.getItem(HISTORIAL_KEY);
    const configGuardada = localStorage.getItem('configSimulador');
    
    if (datosGuardados) {
        datosMaquinas = JSON.parse(datosGuardados);
        console.log('Datos de máquinas cargados desde LocalStorage');
    }
    
    if (historialGuardado) {
        mostrarHistorial(JSON.parse(historialGuardado));
    }
    
    if (configGuardada) {
        valoresNominales = JSON.parse(configGuardada);
        actualizarDisplayValoresNominales();
    }
}

// Guardar datos en LocalStorage
function guardarDatosLocalStorage() {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(datosMaquinas));
    localStorage.setItem('configSimulador', JSON.stringify(valoresNominales));
}

// Guardar evento en historial
function guardarEnHistorial(tipo, mensaje, detalles = '') {
    const historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
    const evento = {
        fecha: new Date().toISOString(),
        tipo: tipo,
        mensaje: mensaje,
        detalles: detalles
    };
    
    historial.unshift(evento); // Agregar al inicio
    
    // Mantener solo los últimos 50 eventos
    if (historial.length > 50) {
        historial.pop();
    }
    
    localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));
    mostrarHistorial(historial);
}

// Mostrar historial en el DOM
function mostrarHistorial(historial) {
    const historialLista = document.getElementById('historial-lista');
    historialLista.innerHTML = '';
    
    historial.forEach(evento => {
        const item = document.createElement('div');
        item.className = `historial-item ${evento.tipo}`;
        
        const fecha = new Date(evento.fecha).toLocaleString();
        item.innerHTML = `
            <div><strong>${fecha}</strong></div>
            <div>${evento.mensaje}</div>
            ${evento.detalles ? `<div class="detalles">${evento.detalles}</div>` : ''}
        `;
        
        historialLista.appendChild(item);
    });
}

// Limpiar historial
function limpiarHistorial() {
    if (confirm('¿Está seguro de que desea limpiar el historial? Esta acción no se puede deshacer.')) {
        localStorage.removeItem(HISTORIAL_KEY);
        document.getElementById('historial-lista').innerHTML = '';
        guardarEnHistorial('configuracion', 'Historial limpiado');
    }
}

// Exportar datos
function exportarDatos() {
    const datos = {
        fechaExportacion: new Date().toISOString(),
        valoresNominales: valoresNominales,
        datosMaquinas: datosMaquinas,
        historial: JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]')
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datos-simulador-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    guardarEnHistorial('configuracion', 'Datos exportados');
}

// Función para generar un valor aleatorio dentro de un rango
function generarValorAleatorio(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Función para actualizar el estado del simulador en la interfaz
function actualizarEstadoSimulador() {
    const estadoTexto = document.getElementById('estado-texto');
    const ultimaActualizacion = document.getElementById('ultima-actualizacion');
    
    if (simuladorActivo) {
        estadoTexto.textContent = 'En ejecución';
        estadoTexto.style.color = 'green';
    } else {
        estadoTexto.textContent = 'Apagado';
        estadoTexto.style.color = 'red';
    }
    
    ultimaActualizacion.textContent = new Date().toLocaleTimeString();
    document.getElementById('valor-nominal-actual').textContent = valoresNominales.corrienteNominal;
}

// Función para verificar alarmas de corriente
function verificarAlarmas(maquina) {
    const alarmas = [];
    
    if (maquina.corriente1 > valoresNominales.corrienteNominal) {
        alarmas.push(`Fase 1: ${maquina.corriente1}A > ${valoresNominales.corrienteNominal}A`);
    }
    if (maquina.corriente2 > valoresNominales.corrienteNominal) {
        alarmas.push(`Fase 2: ${maquina.corriente2}A > ${valoresNominales.corrienteNominal}A`);
    }
    if (maquina.corriente3 > valoresNominales.corrienteNominal) {
        alarmas.push(`Fase 3: ${maquina.corriente3}A > ${valoresNominales.corrienteNominal}A`);
    }
    
    return alarmas;
}

// Función para mostrar alarmas múltiples máquinas
function mostrarAlarma(maquinaId, alarmas) {
    const alarmContainer = document.getElementById('alarm-container');
    const alarmMessage = document.getElementById('alarm-message');
    
    // Obtiene el mensaje actual (si existe)
    let mensajeActual = alarmMessage.innerHTML;
    
    // Si ya hay alarmas, se añade una separación
    if (mensajeActual && !mensajeActual.includes('NO HAY ALARMAS ACTIVAS')) {
        mensajeActual += '<hr style="margin: 15px 0; border-color: #ff4444;">';
    }
    
    let nuevoMensaje = `<strong>🚨 MÁQUINA ${maquinaId} - CORRIENTE SOBRECARGA 🚨</strong><br><br>`;
    nuevoMensaje += "<strong>Valores nominales superados:</strong><br>";
    
    // Crea array de fases en alarma para usar en el ESTADO
    const fasesEnAlarma = [];
    alarmas.forEach(alarma => {
        // Extrae la fase del mensaje de alarma
        if (alarma.includes('Fase 1')) fasesEnAlarma.push('Fase 1');
        else if (alarma.includes('Fase 2')) fasesEnAlarma.push('Fase 2');
        else if (alarma.includes('Fase 3')) fasesEnAlarma.push('Fase 3');
        
        nuevoMensaje += `• ${alarma}<br>`;
    });
    
    // Si hay mensaje actual, concatena; si no, empieza nuevo mensaje
    const mensajeCompleto = mensajeActual ? mensajeActual + nuevoMensaje : nuevoMensaje;
    
    alarmMessage.innerHTML = mensajeCompleto + 
        `<br><strong>Valor nominal configurado:</strong> ${valoresNominales.corrienteNominal}A`;
    
    alarmContainer.style.display = 'block';
    
    // Guardar en historial
    guardarEnHistorial('alarma', `Alarma activada - Máquina ${maquinaId}`, 
        `Fases: ${fasesEnAlarma.join(', ')}`);
}

// Función para limpiar alarmas previas
function limpiarAlarmasPrevias() {
    const alarmContainer = document.getElementById('alarm-container');
    const alarmMessage = document.getElementById('alarm-message');
    
    // Solo limpiar si el mensaje no es el de "NO HAY ALARMAS"
    if (!alarmMessage.innerHTML.includes('TODAS LAS MÁQUINAS EN ESTADO NORMAL')) {
        alarmMessage.innerHTML = '';
    }
}


// Función inicializarDatosMaquinas para manejar múltiples alarmas
function inicializarDatosMaquinas() {
    
    // Limpiar alarmas previas al inicio
    limpiarAlarmasPrevias();
    
    datosMaquinas = [];
    let hayAlarmas = false;
    let alarmasActivas = [];
    
    for (let i = 0; i < NUMERO_MAQUINAS; i++) {
        const corriente1 = generarValorAleatorio(10, 60);
        const corriente2 = generarValorAleatorio(10, 60);
        const corriente3 = generarValorAleatorio(10, 60);
        const tension = generarValorAleatorio(380, 480);
        
        const corrientePromedio = (corriente1 + corriente2 + corriente3) / 3;
        const potencia = parseFloat((Math.sqrt(3) * tension * corrientePromedio * FACTOR_POTENCIA / 1000).toFixed(2));
        
        const maquina = {
            id: i + 1,
            corriente1: corriente1,
            corriente2: corriente2,
            corriente3: corriente3,
            tension: tension,
            potencia: potencia,
            alarmas: [],
            fasesEnAlarma: [], // propiedad donde estan las fases en alarma
            timestamp: new Date().toISOString()
        };
        
        maquina.alarmas = verificarAlarmas(maquina);
        
        // Detectar qué fases están en alarma
        if (maquina.corriente1 > valoresNominales.corrienteNominal) {
            maquina.fasesEnAlarma.push('Fase 1');
        }
        if (maquina.corriente2 > valoresNominales.corrienteNominal) {
            maquina.fasesEnAlarma.push('Fase 2');
        }
        if (maquina.corriente3 > valoresNominales.corrienteNominal) {
            maquina.fasesEnAlarma.push('Fase 3');
        }
        
        if (maquina.alarmas.length > 0) {
            hayAlarmas = true;
            alarmasActivas.push(maquina.id);
            mostrarAlarma(maquina.id, maquina.alarmas);
        }
        
        datosMaquinas.push(maquina);
    }
    
    if (!hayAlarmas) {
        // Mostrar mensaje de que no hay alarmas
        const alarmContainer = document.getElementById('alarm-container');
        const alarmMessage = document.getElementById('alarm-message');
        alarmMessage.innerHTML = '<strong>✅ TODAS LAS MÁQUINAS EN ESTADO NORMAL ✅</strong><br><br>' +
                                `<strong>Valor nominal configurado:</strong> ${valoresNominales.corrienteNominal}A<br>` +
                                'No se detectaron sobrecorrientes en ninguna fase.';
        alarmContainer.style.display = 'block';
    }
    
    guardarDatosLocalStorage();
    
    // Guardar en historial el resumen de alarmas
    if (alarmasActivas.length > 0) {
        guardarEnHistorial('muestreo', 'Muestreo automático realizado', 
            `${datosMaquinas.length} máquinas - Alarmas en: ${alarmasActivas.join(', ')}`);
    } else {
        guardarEnHistorial('muestreo', 'Muestreo automático realizado', 
            `${datosMaquinas.length} máquinas - Sin alarmas`);
    }
}

// Función para mostrar los datos de una máquina específica
function mostrarDatosMaquina(idMaquina) {
    if (!simuladorActivo) {
        mostrarMensaje("El simulador está apagado. Inícielo primero.", "error");
        return;
    }
    
    if (idMaquina < 1 || idMaquina > NUMERO_MAQUINAS) {
        mostrarMensaje(`Número de máquina inválido. Debe ser entre 1 y ${NUMERO_MAQUINAS}`, "error");
        return;
    }
    
    const maquina = datosMaquinas[idMaquina - 1];
    const estado = maquina.alarmas.length > 0 ? 
        `🚨 ALARMA (${maquina.alarmas.length} fases)` : '✅ NORMAL';
    
    const detalles = `
        Corriente Fase 1: ${maquina.corriente1} A ${maquina.corriente1 > valoresNominales.corrienteNominal ? '🚨' : ''}<br>
        Corriente Fase 2: ${maquina.corriente2} A ${maquina.corriente2 > valoresNominales.corrienteNominal ? '🚨' : ''}<br>
        Corriente Fase 3: ${maquina.corriente3} A ${maquina.corriente3 > valoresNominales.corrienteNominal ? '🚨' : ''}<br>
        Tensión: ${maquina.tension} V<br>
        Potencia Activa: ${maquina.potencia} kW<br>
        Estado: ${estado}
    `;
    
    mostrarResultadosEnTabla([maquina], `Máquina ${idMaquina} - Detalle`);
    guardarEnHistorial('consulta', `Consulta máquina ${idMaquina}`, detalles);
    ocultarFormularioConsulta();
}

// Función para mostrar los datos de todas las máquinas
function mostrarTodasLasMaquinas() {
    if (!simuladorActivo) {
        mostrarMensaje("El simulador está apagado. Inícielo primero.", "error");
        return;
    }
    
    if (datosMaquinas.length === 0) {
        mostrarMensaje("Primero debe inicializar el simulador.", "error");
        return;
    }
    
    mostrarResultadosEnTabla(datosMaquinas, "Todas las Máquinas");
    guardarEnHistorial('consulta', 'Consulta todas las máquinas');
}

// Mostrar formulario para consultar máquina específica
function mostrarFormularioConsulta() {
    document.getElementById('consulta-form-container').style.display = 'block';
}

// Ocultar formulario de consulta
function ocultarFormularioConsulta() {
    document.getElementById('consulta-form-container').style.display = 'none';
    document.getElementById('consulta-form').reset();
}

// Mostrar formulario para configuración
function mostrarFormularioConfig() {
    const form = document.getElementById('config-form');
    form['corriente-nominal'].value = valoresNominales.corrienteNominal;
    form['tension-nominal'].value = valoresNominales.tensionNominal;
    document.getElementById('config-form-container').style.display = 'block';
}

// Ocultar formulario de configuración
function ocultarFormularioConfig() {
    document.getElementById('config-form-container').style.display = 'none';
    document.getElementById('config-form').reset();
}

// Actualizar display de valores nominales
function actualizarDisplayValoresNominales() {
    document.getElementById('valor-nominal-actual').textContent = valoresNominales.corrienteNominal;
}

/// Función para mostrar resultados en la tabla HTML - corrientes en alarma color rojo
function mostrarResultadosEnTabla(maquinas, titulo = "Resultados del Monitoreo") {
    const cuerpoTabla = document.getElementById('cuerpo-tabla');
    const resultadosDiv = document.getElementById('resultados');
    const tituloResultados = resultadosDiv.querySelector('h3');
    
    tituloResultados.textContent = titulo;
    cuerpoTabla.innerHTML = '';
    
    maquinas.forEach(maquina => {
        const fila = document.createElement('tr');
        
        // Determinar clases y contenido para cada columna de corriente
        const esI1Alarma = maquina.corriente1 > valoresNominales.corrienteNominal;
        const esI2Alarma = maquina.corriente2 > valoresNominales.corrienteNominal;
        const esI3Alarma = maquina.corriente3 > valoresNominales.corrienteNominal;
        
        const claseI1 = esI1Alarma ? 'alarm-cell' : '';
        const claseI2 = esI2Alarma ? 'alarm-cell' : '';
        const claseI3 = esI3Alarma ? 'alarm-cell' : '';
        
        // Formatear valores de corriente con rojo/bold si están en alarma
        const formatoValor = (valor, esAlarma) => {
            if (esAlarma) {
                return `<strong style="color: #c0392b;">${valor}</strong>`;
            }
            return valor;
        };
        
        // Determinar las fases en alarma para el ESTADO
        let fasesAlarma = [];
        if (esI1Alarma) fasesAlarma.push('Fase 1');
        if (esI2Alarma) fasesAlarma.push('Fase 2');
        if (esI3Alarma) fasesAlarma.push('Fase 3');
        
        // Crear texto de estado
        let estado;
        if (fasesAlarma.length > 0) {
            estado = `🚨 ALARMA (${fasesAlarma.join(', ')})`;
        } else {
            estado = '✅ NORMAL';
        }
        
        fila.innerHTML = `
            <td>${maquina.id}</td>
            <td class="${claseI1}">${formatoValor(maquina.corriente1, esI1Alarma)}</td>
            <td class="${claseI2}">${formatoValor(maquina.corriente2, esI2Alarma)}</td>
            <td class="${claseI3}">${formatoValor(maquina.corriente3, esI3Alarma)}</td>
            <td>${maquina.tension}</td>
            <td>${maquina.potencia}</td>
            <td>${estado}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });
    
    resultadosDiv.style.display = 'block';
    resultadosDiv.scrollIntoView({ behavior: 'smooth' });
}

// FUNCIÓN PARA FINALIZAR EL SIMULADOR
function finalizarSimulador() {
    if (!simuladorActivo) {
        mostrarMensaje("El simulador ya está apagado.", "info");
        return;
    }
    
    // Detener el intervalo de muestreo
    if (intervaloMuestreo) {
        clearInterval(intervaloMuestreo);
        intervaloMuestreo = null;
    }
    
    simuladorActivo = false;
    
    const tiempoEjecucion = tiempoInicio ? 
        Math.round((new Date() - tiempoInicio) / 1000) : 0;
    
    const shutdownContainer = document.getElementById('shutdown-container');
    const shutdownMessage = document.getElementById('shutdown-message');
    
    shutdownMessage.innerHTML = `
        <strong>Tiempo de ejecución:</strong> ${tiempoEjecucion} segundos<br>
        <strong>Muestreos realizados:</strong> ${datosMaquinas.length > 0 ? 'Sí' : 'Ninguno'}<br>
        <strong>Valor nominal configurado:</strong> ${valoresNominales.corrienteNominal}A<br><br>
        <em>Para reiniciar, haga clic en "Iniciar Simulador"</em>
    `;
    
    shutdownContainer.style.display = 'block';
    document.getElementById('resultados').style.display = 'none';
    document.getElementById('alarm-container').style.display = 'none';
    
    mostrarEstadoApagado();
    
    guardarEnHistorial('apagado', 'Simulador finalizado', `Tiempo ejecución: ${tiempoEjecucion} segundos`);
    actualizarEstadoSimulador();
}

// Función para mostrar estado de apagado en la tabla
function mostrarEstadoApagado() {
    const cuerpoTabla = document.getElementById('cuerpo-tabla');
    const resultadosDiv = document.getElementById('resultados');
    const tituloResultados = resultadosDiv.querySelector('h3');
    
    tituloResultados.textContent = "Estado del Simulador - APAGADO";
    resultadosDiv.style.display = 'block';
    cuerpoTabla.innerHTML = '';
    
    for (let i = 1; i <= NUMERO_MAQUINAS; i++) {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${i}</td>
            <td class="shutdown-cell">-</td>
            <td class="shutdown-cell">-</td>
            <td class="shutdown-cell">-</td>
            <td class="shutdown-cell">-</td>
            <td class="shutdown-cell">-</td>
            <td>🔴 APAGADO</td>
        `;
        cuerpoTabla.appendChild(fila);
    }
}

// Función principal que inicia el simulador
function iniciarSimulador() {
    if (simuladorActivo) {
        mostrarMensaje("El simulador ya está en ejecución.", "info");
        return;
    }
    
    document.getElementById('shutdown-container').style.display = 'none';
    simuladorActivo = true;
    tiempoInicio = new Date();
    
    inicializarDatosMaquinas();
    mostrarTodasLasMaquinas();
    
    intervaloMuestreo = setInterval(() => {
        if (simuladorActivo) {
            inicializarDatosMaquinas();
            mostrarTodasLasMaquinas();
            actualizarEstadoSimulador();
        }
    }, 30000);
    
    actualizarEstadoSimulador();
    guardarEnHistorial('inicio', 'Simulador iniciado');
    mostrarMensaje("Simulador iniciado correctamente.", "success");
}

// Mostrar mensajes en la interfaz (sin alert())
function mostrarMensaje(mensaje, tipo = 'info') {
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje mensaje-${tipo}`;
    mensajeDiv.innerHTML = `
        <div class="mensaje-contenido">
            <span class="mensaje-texto">${mensaje}</span>
            <button class="mensaje-cerrar" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Estilos para el mensaje
    const estilos = document.createElement('style');
    estilos.textContent = `
        .mensaje {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        }
        .mensaje-contenido {
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .mensaje-success .mensaje-contenido {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .mensaje-error .mensaje-contenido {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .mensaje-info .mensaje-contenido {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .mensaje-cerrar {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: inherit;
            padding: 0 0 0 15px;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    
    document.head.appendChild(estilos);
    document.body.appendChild(mensajeDiv);
    
    setTimeout(() => {
        if (mensajeDiv.parentElement) {
            mensajeDiv.remove();
        }
    }, 5000);
}

// Inicializar al cargar la página
window.onload = function() {
    cargarDatosLocalStorage();
    actualizarEstadoSimulador();
    
    // Configurar evento del formulario de consulta
    document.getElementById('consulta-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const numeroMaquina = parseInt(document.getElementById('numero-maquina').value);
        mostrarDatosMaquina(numeroMaquina);
    });
    
    // Configurar evento del formulario de configuración
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const corrienteNominal = parseFloat(document.getElementById('corriente-nominal').value);
        const tensionNominal = parseFloat(document.getElementById('tension-nominal').value);
        
        if (isNaN(corrienteNominal) || corrienteNominal <= 0) {
            mostrarMensaje("La corriente nominal debe ser un número positivo.", "error");
            return;
        }
        
        if (isNaN(tensionNominal) || tensionNominal <= 0) {
            mostrarMensaje("La tensión nominal debe ser un número positivo.", "error");
            return;
        }
        
        valoresNominales.corrienteNominal = corrienteNominal;
        valoresNominales.tensionNominal = tensionNominal;
        
        guardarDatosLocalStorage();
        actualizarDisplayValoresNominales();
        
        if (datosMaquinas.length > 0 && simuladorActivo) {
            datosMaquinas.forEach(maquina => {
                maquina.alarmas = verificarAlarmas(maquina);
            });
            mostrarTodasLasMaquinas();
        }
        
        guardarEnHistorial('configuracion', 
            'Valores nominales actualizados', 
            `Corriente: ${corrienteNominal}A, Tensión: ${tensionNominal}V`
        );
        
        mostrarMensaje("Valores nominales actualizados correctamente.", "success");
        ocultarFormularioConfig();
    });
    
    // Cargar historial inicial
    const historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
    mostrarHistorial(historial);
};