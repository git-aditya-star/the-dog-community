from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    db_schema: str = "dog"
    jwt_secret: str
    jwt_expire_minutes: int = 10080
    cors_origins: str = "http://localhost:5173"

    # vision: gemini when a key is present, ollama otherwise
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash-lite"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4:cloud"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
