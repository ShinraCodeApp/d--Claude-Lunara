# Iconos de Lunara

Coloca aquí los archivos de imagen de la app. Todos deben ser **PNG**.

## Archivos requeridos

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `icon.png` | **1024 × 1024 px** | Icono principal (iOS + Android) |
| `adaptive-icon.png` | **1024 × 1024 px** | Icono adaptativo Android (foreground, sin padding) |
| `splash.png` | **1284 × 2778 px** | Pantalla de carga |
| `favicon.png` | **48 × 48 px** | Favicon web |
| `notification-icon.png` | **96 × 96 px** | Icono de notificación push (Android, fondo transparente, blanco) |

## Diseño recomendado

- **Fondo:** gradiente violeta oscuro `#1a0533` → `#2d0145`
- **Símbolo central:** luna 🌙 o flor de luna 🌸 en blanco/dorado suave
- **Sin bordes ni esquinas redondeadas** — Expo/Android los aplica automáticamente
- **Margen de seguridad:** deja ~15% de espacio en los bordes del `adaptive-icon.png`

## Herramientas recomendadas

- **Figma** — diseña y exporta en los tamaños exactos
- **Canva** — templates de app icons
- **[appicon.co](https://appicon.co)** — sube 1 PNG 1024×1024, descarga todos los tamaños automáticamente

## Generador de placeholder (mientras diseñas)

Ejecuta para crear iconos placeholder temporales:

```bash
cd d:\Claude\Lunara\apps\mobile
node scripts/generate-placeholder-icons.js
```
