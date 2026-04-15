# Árbol Genealógico Schuster

Árbol genealógico interactivo de las familias Schuster de Chile, basado en datos de [Historia de Valdivia](https://historiadevaldivia-chile.blogspot.com/2014/03/familia-schuster.html).

## Familias incluidas

| Sección | Descripción | Personas |
|---|---|---|
| **Familia Schuster (Valdivia)** | Descendientes de Johann Martin Schuster | ~425 |
| **Reimann Schuster** | Descendientes de Catharine Schuster & Johann Reimann | ~6 |
| **Heinrich Schuster** | Descendientes de María Schuster & Ernst Heinrich | ~42 |
| **Schuster Bohling** | Descendientes de Franz Schuster Henkel | ~45 |

## Ver el árbol

Abre `index.html` directamente en tu navegador (doble clic en el archivo), o sírvelo localmente:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Archivos

| Archivo | Descripción |
|---|---|
| `data.txt` | Datos originales en formato de texto jerárquico |
| `data.json` | Datos originales parseados en formato JSON |
| `data-enhanced.json` | Datos mejorados con formato GEDCOM-style (v2.0) |
| `migrate-data.js` | Script para migrar datos al formato mejorado |
| `index.html` | Visor interactivo del árbol genealógico |

## Formato de Datos Mejorado (v2.0)

El archivo `data-enhanced.json` utiliza un modelo de datos inspirado en GEDCOM con las siguientes mejoras:

### Estructura de Persona

```json
{
  "id": "I.1.1",
  "name": "AUGUSTO SCHUSTER SCHÖNEWOLF",
  "gender": "M",
  "birth": {
    "date": "1853",
    "date_precision": "year",
    "place": "VALDIVIA",
    "original": "VALDIVIA 1853"
  },
  "death": {
    "date": "1923",
    "date_precision": "year",
    "place": "LA UNIÓN",
    "original": "LA UNIÓN 1923"
  },
  "notes": [],
  "spouses": ["CATALINA KERSTE"],
  "spouse_ids": ["S3"],
  "children": [...]
}
```

### Registros de Cónyuges

Los cónyuges ahora tienen sus propios registros con identificadores únicos:

```json
{
  "id": "S10",
  "name": "ENRIQUE KRÜGER",
  "gender": "M",
  "birth": { "date": "1871", "date_precision": "year" },
  "death": { "date": "1935", "date_precision": "year" },
  "notes": [],
  "is_spouse_record": true
}
```

### Estadísticas de Cobertura

El archivo incluye metadatos con estadísticas:
- Total de personas en el árbol
- Porcentaje con fechas de nacimiento
- Porcentaje con fechas de defunción
- Cónyuges con información de fechas

## Funcionalidades del visor

- **Árbol colapsable**: haz clic en cualquier nombre para expandir o colapsar su rama
- **Búsqueda**: encuentra cualquier persona por nombre, fechas o cónyuge
- **Secciones por familia**: navega entre las distintas ramas familiares mediante pestañas
- **Expandir / Colapsar todo**: botones para controlar la vista completa
- **Fechas en nodos**: los años de vida se muestran debajo del nombre
- **Información detallada**: el tooltip muestra fechas estructuradas y datos del cónyuge

## Migración de Datos

Para regenerar `data-enhanced.json` desde `data.json`:

```bash
node migrate-data.js
```

El script analiza y extrae:
- Fechas de nacimiento/defunción separadas de los lugares
- Información de cónyuges desde el texto completo
- Género inferido del contexto
