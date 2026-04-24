# Jarama · Etapa 5

Esta etapa suma tres bloques fuertes:

1. **UX pública mejorada**
   - header y navegación con más presencia en desktop
   - menú lateral mobile con botón hamburguesa
   - carrito flotante mobile para acceso rápido
   - textos, iconos y espacios más cómodos en pantallas grandes

2. **Admin más usable**
   - panel con tipografía y espaciados más grandes
   - formulario de productos más completo
   - stock como selector claro `Con stock / Sin stock`
   - nuevos atributos: `Destacado`, `Nuevo`, `Más vendido`, `Oferta`, `Edición limitada`
   - colores disponibles por producto

3. **Dashboard con analítica base**
   - comparación del mes actual vs mes anterior
   - gráfico simple de ventas
   - producto más vendido y menos vendido del período
   - bloque informativo para cierre diario como siguiente fase

## Importante
Antes de usar los nuevos atributos en productos, corré este archivo SQL en Supabase:

```txt
supabase/etapa5_productos_y_metricas.sql
```

## Qué superponer
Copiá este paquete arriba de tu proyecto actual.

## Qué probar
1. Corré el SQL de etapa 5.
2. Abrí `admin/productos.html`.
3. Editá un producto y probá badges / colores / stock.
4. Abrí `index.html` y `producto.html` para ver reflejados los cambios.
5. Mirá el dashboard en `admin/index.html`.

## Nota
El **cierre de caja diario** no quedó operativo todavía para no mezclar demasiada lógica financiera en esta etapa. Dejé la base visual y el espacio listo para encararlo después sin romper lo ya estable.
