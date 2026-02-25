from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Application
    app_name: str = "mercado-luna-fraud-detector"
    debug: bool = False

    # Groq (fast inference for agentic chat)
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3-32b"
    groq_chat_model: str = "llama-3.3-70b-versatile"


settings = Settings()
