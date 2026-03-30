---
trigger: always_on
description: Reglas principales y directrices de diseño UI/UX para Proyecto Pinar
---

# Contexto del Proyecto
Desarrolla una aplicación web interactiva basada en un plano residencial para la gestión de participación de viviendas. La aplicación debe permitir el registro de usuarios, visualización de viviendas en un mapa (SVG/HTML Canvas), y generación de rutas óptimas (Ruta más corta) entre un Punto A y un Punto B, pasando por las viviendas registradas.

# Tecnologías a usar
- **Frontend:** HTML5, CSS3 (con efectos Hover), JavaScript Vanilla o Framework moderno.
- **Backend/Base de Datos:** Supabase (para Auth, tablas de usuarios y estado de viviendas).
- **Datos:** Archivos JSON locales (`map-data.json` y `graph-data.json`).
- **Assets:** Imagen de cabecera `disignimpo/AtardecerPinar.jpg` y plano base en `assets/plano.html`.

# Requerimientos Funcionales Detallados

## 1. Sistema de Autenticación (Supabase)
- Implementar un sistema de OTP (One-Time Password) por correo electrónico. El usuario ingresa su email y recibe un código de 6 dígitos para loguearse.
- Acceso Público: La web es visible para todos (plano, casas marcadas y ruta), pero solo los logueados pueden registrar datos.
- Rol de Administrador: Si el email es `netopalma54@aol.com`, habilitar un menú especial "Administrador".

## 2. Registro y Formulario
- Crear un menú con el texto: "Registrar su vivienda para participar, hacer click aquí".
- Interactividad: Aplicar efecto `:hover` (cambio de color) y abrir un Modal al hacer clic.
- Campos: 
  1. Email (validado).
  2. Identificador (Formato `PXX-VXX`). Validar contra `map-data.json`.
- Al registrar, el campo estado en la base de datos pasa a `true` y se vincula el email.

## 3. Lógica del Plano y Visualización
- El plano está en `assets/plano.html`. Al registrar una casa, el ID del texto (ej. `P14-V4`) debe cambiar a color rojo permanentemente.
- Actualización en Tiempo Real: La página debe refrescar la vista del plano cada vez que haya un nuevo registro en Supabase.

## 4. Algoritmo de Enrutamiento (Graph Theory)
- Utilizar `graph-data.json` para calcular la ruta más corta entre el Punto A y el Punto B usando el algoritmo de Dijkstra o A*.
- Restricción de Ruta: La ruta principal debe desviarse para "tocar" las casas registradas mediante una línea perpendicular o cercano a perpendicular (máximo 12 unidades de distancia), la ruta principal debe toma el punto más corto para "tocar" las casas.
- La lógica debe decidir dinámicamente si es más corto seguir hacia adelante o retroceder para alcanzar el Punto B tras visitar una vivienda.
- La ruta base tiene una opacidad inicial del 12%. La ruta activa debe ser sólida.

## 5. Panel de Administración
- Botón para hacer la ruta visible/invisible.
- Herramienta para editar la ubicación de los Puntos A y B.
- Funciones CRUD: Restaurar viviendas registradas a su estado original (color original), resetear usuarios y limpiar rutas para reiniciar el evento.

## Instrucciones de Análisis de Archivos
- Analizar la estructura de `assets/plano.html` para identificar cómo manipular los elementos del DOM (IDs de las casas).
- Utilizar las coordenadas de `map-data.json` y `graph-data.json` para el trazado de líneas en el canvas o capa SVG superior.

# Reglas de Diseño (Estilo Orgánico/Animalista y Premium)
Para cumplir con el requerimiento de diseño animalista y al mismo tiempo mantener una alta calidad estética, se seguirán estas normativas de diseño moderno:
- **Temática Visual:** Integrar una estética premium inspirada en la naturaleza, el pinar local y la vida silvestre. Usar formas orgánicas, redondeadas, evitando interfaces rígidas o aburridas.
- **Paleta de Colores:** Utilizar tonos cálidos y vibrantes orientados a la naturaleza que combinen con la foto del atardecer (`AtardecerPinar.jpg`): rojos/naranjas de atardecer cálido, verdes bosque, marrones terrosos sutiles o tonos ambar, sobre un fondo oscuro, o un modo claro iluminado. Evitar los clásicos e insípidos azul/rojo de web genérica.
- **Tipografía:** Implementar fuentes modernas de Google Fonts legibles pero con personalidad amigable/orgánica (por ejemplo, `Outfit`, `Nunito`, `Quicksand` o `Inter`). Nunca fuentes predeterminadas del navegador.
- **Elementos Animalistas/Naturaleza:** Los componentes interactivos o marcadores del mapa pueden evocar sutilmente la temática, por ejemplo, utilizando pequeños trazos o estilos inspirados en huellas o vegetación forestal si procede.
- **Interactividad y Animaciones (Vitalidad):** La página debe sentirse "viva". Añadir micro-animaciones en los hovers de las viviendas, transiciones fluidas de las rutas, fade-ins suaves para modales, y dar una sensación interactiva dinámica general. Uso de Glassmorphism ligero es recomendado para superponer modales/registros encima del plano o foto.
- **Experiencia de Usuario:** Jerarquía visual destacada. El Call to Action de Registro debe tener prominencia y la interacción sobre el mapa debe ser directa y sencilla de lograr.