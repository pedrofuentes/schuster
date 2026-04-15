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
| `data.json` | Datos parseados en formato JSON estructurado |
| `index.html` | Visor interactivo del árbol genealógico |

## Funcionalidades del visor

- **Árbol colapsable**: haz clic en cualquier nombre para expandir o colapsar su rama
- **Búsqueda**: encuentra cualquier persona por nombre, fechas o cónyuge
- **Secciones por familia**: navega entre las distintas ramas familiares mediante pestañas
- **Expandir / Colapsar todo**: botones para controlar la vista completa
