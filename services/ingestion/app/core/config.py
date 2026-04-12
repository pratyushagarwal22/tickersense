from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SEC_USER_AGENT: str = "TickerSense demo@example.com"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
