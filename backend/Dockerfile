FROM python:3.12-slim
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
COPY backend/src ./src
COPY backend/data ./data
COPY backend/knowledge ./knowledge
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev --no-editable
ENV PATH="/app/.venv/bin:$PATH" \
    CATALOG_PATH=/app/data/vehicles.json \
    KNOWLEDGE_PATH=/app/knowledge \
    VECTOR_CACHE_PATH=/app/var/vectors.json
EXPOSE 8000
CMD ["sh", "-c", "alembic -c alembic.ini upgrade head && uvicorn autonex.api.app:create_app --app-dir src --factory --host 0.0.0.0 --port 8000"]
