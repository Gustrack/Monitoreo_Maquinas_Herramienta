# Simulador de Monitoreo de Máquinas Herramientas

## Descripción
Simulador web que monitorea 4 máquinas herramientas, leyendo corrientes trifásicas, tensión y calculando potencia. Implementado con HTML5, CSS3 y JavaScript puro.

## Características principales
- Monitoreo en tiempo real de 4 máquinas
- Sistema de alarmas por sobrecarga de corriente
- Interfaz web responsiva
- Muestreo automático cada 30 segundos
- Persistencia de datos en LocalStorage
- Historial de operaciones
- Exportación de datos en JSON

## Estructura del proyecto
proyecto/
├── index.html # Archivo principal HTML
├── css/
│ └── styles.css # Estilos CSS separados
├── js/
│ └── simulador.js # Lógica JavaScript
└── README.md # Documentación

## Cómo usar
1. Abrir `index.html` en un navegador web moderno
2. Hacer clic en "Iniciar Simulador"
3. Interactuar con los botones para:
   - Ver todas las máquinas
   - Consultar una máquina específica
   - Configurar valores nominales
   - Exportar datos
4. Los datos se guardan automáticamente en LocalStorage

## Características técnicas
- Sin dependencias externas
- Compatible con todos los navegadores modernos
- Diseño responsivo
- Código modular y comentado
- Manejo de eventos con DOM
- Persistencia de datos con LocalStorage

## Tecnologías utilizadas
- HTML5
- CSS3 (Flexbox, Grid, Animaciones)
- JavaScript ES6+
- LocalStorage API
- DOM Manipulation

## Criterios implementados (Entrega 2)
- ✓ Integración completa JS con HTML/CSS mediante DOM
- ✓ Eliminación de prompt() y alert()
- ✓ Uso de LocalStorage para persistencia
- ✓ Eventos capturados desde HTML
- ✓ Formularios para entrada de datos
- ✓ Estructura en subcarpetas
- ✓ Código limpio y documentado