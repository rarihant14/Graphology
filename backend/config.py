

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

# Retrieve and validate the Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# Model constants — update these to swap models project-wide
VISION_MODEL = "gemini-3.1-flash-lite"   # Model used for image/vision tasks
TEXT_MODEL   = "gemini-3.1-flash-lite"   # Model used for text-only tasks


# Client initialisation
def get_gemini_client() -> genai.Client:
    """
    Create and return a configured google.genai Client instance.

    Returns:
        genai.Client: Authenticated Gemini client.
    """
    return genai.Client(api_key=GEMINI_API_KEY)


# ---------------------------------------------------------------------------
# Thin compatibility wrapper — keeps tools.py / agent.py call signatures
# identical to the old SDK: .generate_content(contents) -> response.text
# ---------------------------------------------------------------------------

class _ModelWrapper:
    """
    Wraps google.genai.Client to expose a .generate_content() method
    matching the old google.generativeai.GenerativeModel interface so no
    other files need to change.
    """

    def __init__(self, client: genai.Client, model_name: str, config):
        self._client = client
        self._model_name = model_name
        self._config = config

    def generate_content(self, contents):
        """
        Call the Gemini API and return a response object with a .text property.

        Args:
            contents: A string, a list of strings, or a list of Part dicts.
        """
        kwargs = {"model": self._model_name, "contents": contents}
        if self._config is not None:
            kwargs["config"] = self._config

        return self._client.models.generate_content(**kwargs)


# ---------------------------------------------------------------------------
# Model helpers
# ---------------------------------------------------------------------------

def get_vision_model() -> _ModelWrapper:
    """
    Return a wrapper for vision (image + text) requests to Gemini.
    """
    client = get_gemini_client()
    return _ModelWrapper(client, VISION_MODEL, config=None)


def get_text_model() -> _ModelWrapper:
    """
    Return a wrapper for text generation requests with temperature=0.7.
    """
    client = get_gemini_client()
    config = types.GenerateContentConfig(temperature=0.7)
    return _ModelWrapper(client, TEXT_MODEL, config=config)