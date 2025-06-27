import os
from dotenv import load_dotenv

load_dotenv()


class LogHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.should_log = os.getenv("LOG_HEADERS", "False") == "True"

    def __call__(self, request):
        if self.should_log:
            print(f"Headers: {request.headers}")
        response = self.get_response(request)
        return response
