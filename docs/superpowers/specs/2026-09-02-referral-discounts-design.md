# Diseño: Descuentos por Referido (Campo Personalizado en Perfil Cliente)

## Contexto

Implementar descuentos personalizados por cliente para clases de
Academia (Ballet), segun `docs/business-rules.md`:

- Admin asigna `discount_percent` (0-100) en perfil de cliente.
- Aplicable **solo a colegiaturas de Academia/Ballet**.
- Se aplica al calcular el monto de la colegiatura mensual.

## Alcance

**Incluye:**
1. **Migracion:** agregar `discount_percent` (integer, default 0, check 0-100) en tabla `profiles` o tabla relacionada.
2. **Admin (`apps/admin`):**
   - En `CustomerDetailPage`: campo "Descuento referido (%)" al final del perfil.
   - Validacion: 0-100, entero.
   - Tooltip: "Aplicable solo a colegiaturas de Academia/Ballet".
3. **Servicio de colegiaturas (`academyTuitionService.ts`):**
   - Al calcular monto de pago: `amount_final = amount_base * (100 - discount_percent) / 100`.
   - Guardar `discount_applied` en `academy_payments` para auditoria.
4. **Frontend `AcademyGroupDetailPage` / `MarkPaymentModal`:**
   - Mostrar monto original vs monto con descuento.
   - Badge "Descuento X%" si aplica.
5. **Web (`apps/web`):** no aplica (cliente no ve descuentos de otros).

**No incluye:**
- Descuentos por paquete o volumen (solo referido individual).
- Descuentos en Studio/Pilates (solo Academia/Ballet).
- Sistema de referidos automatizado (quien referio a quien) — solo campo manual admin.

## Modelo de datos (Migracion)

```sql
-- Agregar columna en profiles (o tabla customers si se prefiere separar)
alter table public.profiles
  add column discount_percent integer not null default 0
  check (discount_percent >= 0 and discount_percent <= 100);

-- Comentario para documentacion
comment on column public.profiles.discount_percent is
  'Descuento porcentual por referido, aplicable solo a colegiaturas de Academia/Ballet (0-100)';

-- En academy_payments, guardar descuento aplicado para auditoria
alter table public.academy_payments
  add column discount_applied integer not null default 0
  check (discount_applied >= 0 and discount_applied <= 100);
```

## Servicio (`academyTuitionService.ts`)

```typescript
// Al crear/actualizar pago
function calculateFinalAmount(baseAmount: number, discountPercent: number): number {
  if (discountPercent <= 0) return baseAmount;
  if (discountPercent >= 100) return 0;
  return Math.round(baseAmount * (100 - discountPercent) / 100);
}

// En upsertPayment
const finalAmount = calculateFinalAmount(input.amountCents, discountPercent);
const payload = {
  ...input,
  amount_cents: finalAmount,
  discount_applied: discountPercent, // para auditoria
};
```

## Frontend

### `apps/admin` — CustomerDetailPage

```tsx
// En seccion de perfil, al final
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700">
    Descuento por referido (%)
  </label>
  <input
    type="number"
    min={0}
    max={100}
    value={discountPercent}
    onChange={...}
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
  />
  <p className="mt-1 text-xs text-gray-500">
    Solo aplica a colegiaturas de Academia/Ballet. 0 = sin descuento.
  </p>
</div>
```

### `apps/admin` — MarkPaymentModal / AcademyGroupDetailPage

- Input `amountCents` -> mostrar calculo: `Monto original: $X | Descuento Y% = $Z`.
- Si `discountPercent > 0`: badge "Descuento Y% aplicado".

## Testing

Checklist manual:
1. Cliente sin descuento (0%) -> colegiatura $1000 -> pago $1000.
2. Cliente con 10% -> colegiatura $1000 -> pago $900, `discount_applied=10`.
3. Cliente con 100% -> pago $0 (gratis).
4. Cliente con 50% en Studio -> **no aplica**, pago monto completo (solo Academia).
4. Editar descuento en CustomerDetail -> siguiente pago usa nuevo valor.
5. Historial de pagos muestra `discount_applied` por cada pago.

## Fuera de alcance

- Sistema de referidos automatizado (tracking quien referio a quien).
- Descuentos por volumen/familia (hermanos).
- Descuentos en Studio/Pilates.
- Notificaciones de "tienes descuento disponible".