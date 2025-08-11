# Configuración de Estados de Clientes

## Tabla Estado_Cliente en Airtable

Para que los estados de clientes funcionen correctamente, necesitas tener una tabla llamada `Estado_Cliente` en tu base de Airtable con la siguiente estructura:

### Campos requeridos:
- **Cliente_Nombre** (Single line text) - Nombre del cliente
- **Estado_Cliente** (Single select) - Estado del cliente
- **Fecha_Actualizacion** (Date) - Fecha de última actualización

### Opciones para Estado_Cliente:
- Pendiente
- En proceso
- Ya tiene vendedor
- Ya tiene proveedor
- Cerrado

## Configuración en .env.local

Asegúrate de que tu archivo `.env.local` tenga esta línea:

```
AIRTABLE_CLIENT_STATES_TABLE_NAME=tblEstadoCliente
```

Donde `tblEstadoCliente` es el ID de tu tabla Estado_Cliente en Airtable.

## Cómo encontrar el ID de la tabla:

1. Ve a tu base de Airtable
2. Abre la tabla Estado_Cliente
3. En la URL verás algo como: `https://airtable.com/appXXXXX/tblYYYYY/...`
4. El `tblYYYYY` es el ID de la tabla

## Funcionalidad:

- Los estados se cargan automáticamente desde Airtable
- Los cambios se guardan en tiempo real
- Los estados se muestran en la tabla de clientes
- Solo los clientes en estado "En proceso" pueden buscar CUITs
