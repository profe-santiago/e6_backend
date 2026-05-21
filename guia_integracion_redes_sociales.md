# Integración de Redes Sociales al Sistema de Reportes
## Guía técnica — Equipo 6

---

## Lo primero: webscraping en redes sociales

Antes de hablar de tecnología, hay un problema que deben entender antes de implementar cualquier cosa.

**La mayoría de las redes sociales prohíben explícitamente el scraping en sus términos de servicio.**

| Red social | ¿Permite scraping? | Situación actual |
|---|---|---|
| Twitter/X | ❌ No | Bloqueó el acceso gratuito a su API en 2023. El scraping viola sus ToS activamente. |
| Facebook / Instagram | ❌ No | Meta persigue legalmente el scraping. Caso *Meta vs. Bright Data* (2024). |
| TikTok | ❌ No | Misma situación que Meta. |
| Reddit | ⚠️ Con límites | Permite acceso a su API oficial de forma gratuita con restricciones de uso. |
| Bluesky | ✅ Sí | API gratuita, abierta y sin restricciones severas. |
| Mastodon | ✅ Sí | API REST pública por instancia, completamente abierta. |
| YouTube | ✅ Con cuota | API oficial gratuita con cuota diaria de requests. |

Para un proyecto académico no existe riesgo legal real, pero deben entender que el scraping directo **no es una opción viable en producción**. Si presentan esta funcionalidad, deben poder explicar por qué eligieron APIs oficiales en lugar de scraping.

---

## La alternativa correcta: APIs oficiales

En lugar de scraping, la solución es consumir las **APIs públicas oficiales** de cada plataforma. Para un sistema de reportes ciudadanos en México, las opciones más viables son:

### Reddit — API gratuita
Reddit permite buscar posts por palabras clave y filtrar por subreddit. Existen comunidades activas de ciudades mexicanas (`r/mexico`, `r/Guadalajara`, `r/tijuana`, etc.) donde los usuarios reportan problemas urbanos.

- Registro: [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
- Librería Python: `praw`
- Límite gratuito: 100 requests por minuto

### Bluesky — API gratuita y abierta
Red social descentralizada basada en el protocolo AT. Su API es completamente abierta, no requiere aprobación y permite búsqueda por keywords.

- Librería Python: `atproto`
- Sin límites de acceso para uso razonable

---

## ¿Express o FastAPI?

La recomendación es **no reemplazar Express** — mantenerlo como backend principal y agregar el componente de integración como un **microservicio separado en FastAPI/Python**.

### ¿Por qué Python para esta parte específica?

El ecosistema de procesamiento de texto y NLP en Python es significativamente más maduro que en Node.js:

| Necesidad | Node.js / Express | Python / FastAPI |
|---|---|---|
| Consumir APIs REST | ✅ `axios`, `node-fetch` | ✅ `httpx` |
| Scraping HTML | ✅ `playwright`, `cheerio` | ✅ `playwright`, `BeautifulSoup` |
| NLP en español | ⚠️ `compromise` (limitado) | ✅ `spaCy` con modelo en español |
| Clasificación de texto | ⚠️ muy limitado | ✅ `transformers` (HuggingFace) |
| Geocodificación de texto | ⚠️ sin librerías especializadas | ✅ `geopy` |
| Tareas programadas | ✅ `node-cron` | ✅ `apscheduler` |

Para detectar si un post de Reddit habla de un bache en su ciudad vs. una queja genérica, y para extraer la ubicación mencionada en texto libre ("frente al mercado Benito Juárez"), se necesita NLP — y ahí Python gana por mucho.

---

## Arquitectura sugerida

No se reemplaza nada del stack actual. Se agrega un microservicio pequeño que vive junto al resto del sistema:

```
┌──────────────────────────────────────────────────────────┐
│                   Stack actual (sin cambios)             │
│                                                          │
│   React Native Expo  ←→  Express API  ←→  PostgreSQL    │
│                               ↑                          │
│                        (misma BD compartida)             │
└───────────────────────────────┬──────────────────────────┘
                                │ INSERT reportes externos
                                ▼
┌──────────────────────────────────────────────────────────┐
│              Microservicio de integración                │
│                   FastAPI + Python                       │
│                                                          │
│  GET /fetch?keywords=bache&city=oaxaca                   │
│                                                          │
│  1. Llama APIs oficiales (Reddit, Bluesky)               │
│  2. Filtra posts relevantes con NLP                      │
│  3. Extrae ubicación del texto                           │
│  4. Normaliza al formato de Reporte                      │
│  5. Inserta en PostgreSQL con fuente = 'REDDIT'          │
└──────────────────────────────────────────────────────────┘
```

El microservicio puede correr en un puerto diferente (por ejemplo `:8000`) y compartir la misma base de datos PostgreSQL. Express no necesita saber cómo funciona la integración.

---

## Librerías recomendadas

### Microservicio Python / FastAPI

```bash
pip install fastapi uvicorn          # framework y servidor
pip install httpx                    # cliente HTTP async
pip install praw                     # Reddit API oficial
pip install atproto                  # Bluesky API oficial
pip install spacy                    # NLP en español
pip install geopy                    # geocodificación de texto → lat/lng
pip install apscheduler              # tareas programadas (correr cada N horas)
pip install asyncpg                  # conexión a PostgreSQL async
pip install sqlalchemy               # ORM (opcional, para reutilizar modelos)

# Modelo de español para spaCy
python -m spacy download es_core_news_sm
```

### Estructura mínima del microservicio

```
social-integration/
  ├── main.py                  → app FastAPI, endpoints
  ├── services/
  │   ├── reddit_service.py    → consume API de Reddit
  │   ├── bluesky_service.py   → consume API de Bluesky
  │   └── nlp_service.py       → filtra y extrae ubicaciones
  ├── models/
  │   └── reporte.py           → modelo de reporte normalizado
  ├── db.py                    → conexión a PostgreSQL
  ├── scheduler.py             → tarea programada cada N horas
  ├── requirements.txt
  └── .env                     → REDDIT_CLIENT_ID, REDDIT_SECRET, etc.
```

---

## Ejemplo de código

### Consumir Reddit con `praw`

```python
import praw
import os

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_SECRET"),
    user_agent="reportes-ciudadanos/1.0"
)

def buscar_reportes_reddit(keywords: str, ciudad: str, limite: int = 25):
    query = f"{keywords} {ciudad}"
    resultados = []

    for submission in reddit.subreddit("mexico+oaxaca").search(query, limit=limite):
        resultados.append({
            "titulo":    submission.title,
            "contenido": submission.selftext,
            "url":       submission.url,
            "fecha":     submission.created_utc,
            "fuente":    "REDDIT",
            "autor":     submission.author.name if submission.author else "anónimo"
        })

    return resultados
```

### Extraer ubicación de texto con `spaCy`

```python
import spacy

nlp = spacy.load("es_core_news_sm")

def extraer_ubicacion(texto: str) -> str | None:
    doc = nlp(texto)
    lugares = [ent.text for ent in doc.ents if ent.label_ in ("LOC", "GPE")]
    return lugares[0] if lugares else None

# Ejemplo:
# extraer_ubicacion("Hay un bache enorme frente al mercado Benito Juárez en el centro")
# → "mercado Benito Juárez"
```

### Geocodificar texto a coordenadas con `geopy`

```python
from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="reportes-ciudadanos")

def texto_a_coordenadas(lugar: str, ciudad: str = "Oaxaca, México"):
    resultado = geolocator.geocode(f"{lugar}, {ciudad}")
    if resultado:
        return resultado.latitude, resultado.longitude
    return None, None

# Ejemplo:
# texto_a_coordenadas("Mercado Benito Juárez")
# → (17.0635, -96.7233)
```

### Endpoint FastAPI que orquesta todo

```python
from fastapi import FastAPI
from services.reddit_service import buscar_reportes_reddit
from services.nlp_service import extraer_ubicacion, texto_a_coordenadas
from db import insertar_reporte

app = FastAPI()

@app.post("/fetch")
async def fetch_reportes(keywords: str, city: str = "Oaxaca"):
    posts = buscar_reportes_reddit(keywords, city)
    insertados = 0

    for post in posts:
        texto    = f"{post['titulo']} {post['contenido']}"
        lugar    = extraer_ubicacion(texto)
        lat, lng = texto_a_coordenadas(lugar, city) if lugar else (None, None)

        if lat and lng:
            await insertar_reporte({
                "titulo":      post["titulo"],
                "descripcion": post["contenido"],
                "fuente":      "REDDIT",
                "latitud":     lat,
                "longitud":    lng,
                "url_origen":  post["url"],
                "estado":      "PENDIENTE"
            })
            insertados += 1

    return { "procesados": len(posts), "insertados": insertados }
```

---

## Integración con Docker Compose

Agregar el microservicio al `docker-compose.yml` existente:

```yaml
services:
  # ... servicios existentes (express, postgres) ...

  social-integration:
    build: ./social-integration
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDDIT_CLIENT_ID=${REDDIT_CLIENT_ID}
      - REDDIT_SECRET=${REDDIT_SECRET}
    depends_on:
      - postgres
```

---

## Campo `fuente` en la base de datos

Para distinguir los reportes importados de los creados por usuarios, agregar el campo `fuente` al modelo de Prisma si no existe:

```prisma
model Reporte {
  // ... campos existentes ...

  fuente     String  @default("CIUDADANO")
  // Valores posibles: CIUDADANO | REDDIT | BLUESKY | MASTODON
  
  urlOrigen  String? 
  // URL del post original en la red social
}
```

---

## Alcance mínimo viable para la presentación

Con el tiempo disponible (~1 mes), el objetivo realista es:

- [ ] Microservicio FastAPI con un endpoint `/fetch` funcional.
- [ ] Integración con al menos **una** API (Reddit es la más sencilla de configurar).
- [ ] Filtrado básico por keywords y ciudad.
- [ ] Geocodificación de al menos algunos posts (no todos tendrán ubicación).
- [ ] Los reportes importados aparecen en la app con `fuente = 'REDDIT'` visible.
- [ ] El microservicio corre junto al resto del sistema con Docker Compose.

No es necesario implementar NLP complejo ni conectar todas las redes sociales. Un flujo end-to-end funcional con una sola fuente demuestra el concepto perfectamente.

---

## Lo que esto aporta al proyecto

Desde el punto de vista del curso, esta integración demuestra:

- **Arquitectura de microservicios** — un servicio separado con responsabilidad única.
- **Integración de servicios externos** — consumo de APIs de terceros (Tema 4 del curso).
- **Comunicación entre servicios** — el microservicio y Express comparten la misma BD.
- **Decisión arquitectónica justificada** — eligieron Python para esta parte por su ecosistema de NLP, no porque sí.

Esa última parte es importante: en la presentación deben poder explicar **por qué** usaron dos lenguajes en lugar de quedarse solo con Node.js.
