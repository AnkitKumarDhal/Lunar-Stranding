"""
Compatibility helper:
Uses FastAPI and Pydantic if installed.
Otherwise falls back to lightweight classes so core algorithms can be tested standalone.
"""

try:
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel, Field
    FASTAPI_INSTALLED = True
except ImportError:
    FASTAPI_INSTALLED = False

    class APIRouter:
        def __init__(self, *args, **kwargs):
            pass
        def post(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator
        def get(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__

    def Field(default=None, **kwargs):
        return default
