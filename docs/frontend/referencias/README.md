# Referencias visuales del front

Material de apoyo para el diseno: mockups, capturas, inspiracion, logos
originales, paletas. **No se importa desde el codigo** (no entra al bundle).

- `web/`   -> referencias de la app de cliente (`apps/web`).
- `admin/` -> referencias del panel administrativo (`apps/admin`).

Nombra los archivos por lo que muestran, no `img1.png`:
`landing-hero-referencia.png`, `calendario-clases-mockup.png`,
`logo-mba-original.svg`.

Cuando una imagen se vaya a usar de verdad en la app, se copia a:

- `apps/<app>/src/assets/` si se importa desde un componente
  (Vite la optimiza y le pone hash).
- `apps/<app>/public/` si se referencia por URL fija (favicon, og-image).

## Logos

Los logos oficiales estan en `docs/frontend/logos/`:
`logo-mba-rosa-0N.svg` (`#e5bac2`, para fondos claros) y
`logo-mba-crema-0N.svg` (`#efeee9`, para fondos oscuros). El PDF fuente
(`logos MBA.pdf`) se queda solo local: esta en `.gitignore`.
