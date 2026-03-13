from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "VK-LLM Benchmark"
    APP_VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite+aiosqlite:///./vk_benchmark.db"


settings = Settings()
