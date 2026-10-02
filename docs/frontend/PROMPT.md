# Prompt para rediseñar la plataforma

Copia todo el bloque de abajo y pégalo en tu herramienta de IA para código (Claude Code, Cursor, v0, Lovable…) dentro del proyecto de la plataforma. Antes, copia la carpeta `brand/` del kit a `public/brand/`.

```text
Rediseña la interfaz de mi plataforma web de Merida Ballet Academy (MBA), una academia de ballet y barre en Mérida, Yucatán. NO cambies la lógica, rutas, datos ni llamadas a la API: solo estilos, estructura visual y textos de interfaz. La app ya tiene: encabezado con logo, navegación inferior con 5 tabs (Inicio, Paquetes, Horarios, Academia, Usuario), pantalla Inicio (placeholder de logo, nombre, placeholder de mapa, accesos rápidos), Paquetes (tarjetas con nombre, descripción, créditos, días de vigencia, precio) y Horarios (selector de semana y lista de clases).

## Sensación
Estudio de danza a media luz: fondos crema, rosas empolvados, toques café de madera, una bailarina difuminada al fondo. Sereno, ligero, preciso, editorial. Nada de emojis, nada de degradados azul-morado, nada de tarjetas con borde de color a la izquierda.

## Assets (ya están en /public/brand/)
- logo-horizontal-rosa.svg, logo-horizontal-malva.svg, logo-horizontal-cloud.svg, logo-horizontal-grafito.svg
- logo-vertical-rosa.svg, logo-sello-rosa.svg, logo-lineal-rosa.svg
- monograma-rosa.svg, monograma-malva.svg, monograma-cloud.svg, monograma-grafito.svg
- monograma-linea.svg (contorno para fondos), corner-motif-rosa.svg (motivo de esquina)
- fotos: bailarina-difuminada.jpg, piernas-barra.jpg, siluetas-barra.jpg, estudio-arco.jpg, escaparate.jpg, degradado-rosa.jpg
Nunca redibujes, recolorees fuera de la paleta, deformes ni cambies el acomodo del logo.

## Tokens (crea variables CSS en :root y un tema oscuro con [data-theme="dark"] / prefers-color-scheme)
Marca (exactos del manual):
--rosa-502 #E5BAC1 · --rosa-503 #D09A9A · --nude-7604 #E4D5D3 · --arena-9226 #EBE3D7 · --cloud-dancer #F0EEE9 · --grafito #616160 · --tinta #1D1D1B
Derivados de fotografía: --malva #9B7575 · --vino #984B5B · --cacao #72573E · --caramelo #C49378
Semánticos (claro / oscuro):
--superficie #F0EEE9 / #1F1917 (fondo de página)
--superficie-tarjeta #FBFAF7 / #2B2320 (tarjetas, header, nav)
--superficie-suave #EBE3D7 / #261E1B (chips, zonas hundidas, estados vacíos)
--texto #33251F / #F0EEE9
--texto-suave #72573E / #C9B9AE
--acento #984B5B / #E5BAC1 (botón primario, enlaces, activo)
--sobre-acento #FFFFFF / #2A1F1C
--acento-suave #F4DFE2 / #3A2F2B (pastilla del tab activo)
--borde #E4D5D3 / #3D322E
--exito #4E6B55 / #A9C6AE · --alerta #9A4A1F / #F0B48F (siempre con texto, nunca solo color)
Regla: los rosas (502, 503, nude) NUNCA como color de texto sobre fondo claro; son para logo, bloques y fondos.
Espaciado: 4, 8, 12, 16, 24, 32, 48, 64 px. Radios: 8 (chips), 14 (botones), 22 (tarjetas/banner), 999 (pastillas y arcos).
Sombras: tarjeta = 0 1px 2px rgba(51,37,31,.05), 0 8px 24px rgba(114,87,62,.08). Nav inferior = 0 -8px 24px rgba(114,87,62,.06).

## Tipografía
Carga de Google Fonts: Fraunces (títulos, sustituto de Recoleta) y Jost (texto, sustituto de Gotham Pro). Pilas: display = "Fraunces","Recoleta",Georgia,serif · sans = "Jost","Gotham Pro",system-ui,sans-serif.
Escala: display-xl 56/60 · display-l 40/44 (título de pantalla) · titulo 28/34 · precio 34/38 peso 500 (serif) · subtitulo 20/26 peso 500 · cuerpo-l 17/26 · cuerpo 15/22 · pequeno 13/18 · etiqueta 12/16 MAYÚSCULAS letter-spacing .22em color texto-suave.

## Layout general
- body fondo --superficie. Contenido centrado máx. 980px, padding 32px (16px en móvil).
- Header: 76px, fondo --superficie-tarjeta, borde inferior 1px --borde, logo-horizontal-malva.svg a 44px de alto, alineado a la izquierda.
- Fondo decorativo en cada pantalla: monograma-linea.svg muy grande (≈760px) en la esquina inferior izquierda al 35% de opacidad, detrás del contenido; corner-motif-rosa.svg (≈84px) pegado a la esquina superior derecha bajo el header al 55%. pointer-events:none.
- Navegación inferior fija: fondo --superficie-tarjeta, borde superior, sombra de nav. 5 ítems con icono de línea (Lucide: Home, Ticket, CalendarDays, Music, User; 22px, trazo 1.6) y etiqueta de 13px. Activo: color --acento, peso 500, icono dentro de una pastilla 64×34 radio 999 fondo --acento-suave.
- Botones: radio 14, padding 12×22, Jost 500 15px. Primario fondo --acento texto --sobre-acento; secundario transparente borde y texto --acento; suave fondo --acento-suave texto --acento. Foco visible: outline 2px --acento con offset 2px.

## Pantalla Inicio
1. Reemplaza el placeholder de logo y el título "MBA MID" por un banner (radio 22, alto ≥300px): foto bailarina-difuminada.jpg ocupando el 62% derecho (cover, posición 50% 28%), con un velo a la izquierda linear-gradient(90deg, #F0EEE9 0%, #F0EEE9 38%, transparent 60%). Encima, a la izquierda: etiqueta "BALLET · BARRE", título serif 44px "La danza es armonía y ritmo", texto "Reserva tu próxima clase en Merida Ballet Academy." y botón primario "Ver horarios". Motivo de esquina arriba a la derecha.
2. "Accesos rápidos": grid de 2 tarjetas (Paquetes – "Opciones y precios", Horarios – "Clases disponibles"). Tarjeta: fondo --superficie-tarjeta, borde, radio 22, padding 24, sombra; icono de línea dentro de círculo 44px --acento-suave; flecha → arriba a la derecha; hover sube 2px. Quita los emojis actuales.
3. "Tu próxima clase": la siguiente reserva del usuario con el componente de clase (ver Horarios) y enlace "Ver todas".
4. "Dónde estamos": tarjeta dividida: a la izquierda el mapa de Google embebido (radio y borde de tarjeta), a la derecha etiqueta "VISÍTANOS", dirección "C.19 #237 x 21 y 23, Col. Maya, Mérida", "Lunes a viernes · 10:00 a 7:00 pm", "WhatsApp 999 297 76 91 · @MB.academy" y botón suave "Cómo llegar".

## Pantalla Paquetes
- Enlace "‹ Inicio", etiqueta "BALLET · BARRE", título serif display-l "Nuestros paquetes", entradilla "Elige el paquete que mejor se adapte a tu práctica. Todos los precios en MXN." en --texto-suave.
- Grid de 3 columnas (1 en móvil). Tarjeta de paquete: nombre (20/26, 500), descripción (texto-suave 14px), chips en --superficie-suave "N créditos" y "Vigencia N días", divisor 1px, precio serif 34px con "MXN · pago único" pequeño, botón bloque "Elegir paquete" (secundario; primario en el destacado).
- El paquete destacado lleva borde 1.5px --rosa-503 y un sello superior "MÁS ELEGIDO" (fondo --rosa-503, texto --tinta, 11px mayúsculas, radio 999).

## Pantalla Horarios
- Enlace "‹ Inicio", título "Horario de clases", entradilla "Próximas clases de ballet y barre. Navega por semanas." (corrige "Pilates").
- Selector de semana: tarjeta con flechas circulares 40px y rango "20 sep — 26 sep". Debajo, fila de 7 días (DOM 20 … SÁB 26): abreviatura en etiqueta, número en serif 20px; el día seleccionado con fondo --acento y texto --sobre-acento, radio 14.
- Etiqueta del día ("JUEVES 24 DE SEPTIEMBRE") y lista de clases. Clase: grid [72px | 1fr | auto], tarjeta radio 22: hora serif 22px con am/pm debajo; nombre (16px 500), "Maestra · 55 min", indicador de cupo (punto 6px --exito + "6 lugares disponibles", o --alerta + "Cupo lleno"); botón "Reservar" primario o "Lista de espera" secundario deshabilitado.
- Estado vacío: bloque --superficie-suave radio 22 centrado con monograma-malva.svg 72px, título serif "Aún no hay clases esta semana" y "Prueba la semana siguiente o escríbenos por WhatsApp."

## Pantalla Academia
- Dos columnas: texto (etiqueta "LA ACADEMIA", título serif "Un espacio para la danza en Mérida", párrafo, botón "Escríbenos" a WhatsApp) y foto estudio-arco.jpg con remate en arco (border-radius 999px 999px 22px 22px, aspect-ratio 4/5).
- "Disciplinas": 2 tarjetas con foto arriba (piernas-barra.jpg para Ballet, siluetas-barra.jpg para Barre), etiqueta y título.

## Pantalla Usuario
Mismo lenguaje: tarjeta de perfil, créditos restantes como número serif grande, vigencia con chip, historial de reservas con el componente de clase.

## Tema oscuro ("Función")
Aplica los valores oscuros de los tokens semánticos. El banner conserva sus colores claros (la foto es clara). Logos en versión rosa o cloud.

## Calidad
Responsive (móvil primero, 390px), contraste AA, navegación por teclado, alt en imágenes, transiciones de 200ms, sin librerías de UI que impongan su propio estilo.
```
