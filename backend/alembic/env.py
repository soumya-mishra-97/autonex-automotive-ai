"""Migration environment reads the same DATABASE_URL as the application."""

from sqlalchemy import create_engine

from alembic import context
from autonex.infrastructure.database import metadata
from autonex.infrastructure.settings import Settings

config = context.config
url = Settings().database_url or config.get_main_option("sqlalchemy.url")
if context.is_offline_mode():
    context.configure(url=url, target_metadata=metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
