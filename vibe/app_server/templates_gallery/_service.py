from __future__ import annotations

from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import secrets
from threading import Lock, Thread
from typing import cast
from urllib.parse import unquote

from vibe.app_server.templates_gallery._projects import (
    ASSETS,
    TEMPLATES,
    create_project,
)

_WEB = Path(__file__).with_name("web")
_MAX_BODY = 2048


class _Server(ThreadingHTTPServer):
    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace
        self.token = secrets.token_urlsafe(32)
        super().__init__(("127.0.0.1", 0), _Handler)
        self.authority = f"127.0.0.1:{self.server_port}"


class _Handler(BaseHTTPRequestHandler):
    @property
    def gallery(self) -> _Server:
        return cast("_Server", self.server)

    timeout = 8

    def log_message(self, format: str, *args: object) -> None:
        # The app server's stdio is reserved for its client transport.
        pass

    def _send(self, status: HTTPStatus, mime: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
        )
        try:
            self.end_headers()
            self.wfile.write(body)
        except ConnectionError:
            # Browsers cancel in-flight thumbnails when the tab reloads.
            return

    def _json(self, status: HTTPStatus, data: object) -> None:
        self._send(status, "application/json", json.dumps(data).encode())

    def _error(self, status: HTTPStatus, message: str) -> None:
        self._json(status, {"error": message})

    def _allowed(self, *, api: bool) -> bool:
        if self.headers.get("Host") != self.gallery.authority:
            self._error(HTTPStatus.FORBIDDEN, "Unexpected host.")
            return False
        if api:
            origin = self.headers.get("Origin")
            bearer = self.headers.get("Authorization", "").encode("latin-1")
            if (
                origin and origin != f"http://{self.gallery.authority}"
            ) or not secrets.compare_digest(
                bearer, f"Bearer {self.gallery.token}".encode()
            ):
                self._error(
                    HTTPStatus.FORBIDDEN, "Open the gallery from Vibe with /templates."
                )
                return False
        return True

    def do_GET(self) -> None:
        path = unquote(self.path.partition("?")[0])
        if not self._allowed(api=path.startswith("/api/")):
            return
        if path == "/api/catalog":
            self._json(
                HTTPStatus.OK,
                {
                    "workspace": str(self.gallery.workspace),
                    "templates": [asdict(item) for item in TEMPLATES],
                },
            )
            return
        if path.startswith("/previews/"):
            root, relative = ASSETS / "previews", path.removeprefix("/previews/")
        else:
            root, relative = _WEB, path.removeprefix("/") or "index.html"
        if any(
            part in {"", ".", ".."} or "\\" in part or ":" in part or "\x00" in part
            for part in relative.split("/")
        ):
            self._error(HTTPStatus.NOT_FOUND, "Page not found.")
            return
        file = root / relative
        if not file.is_file():
            self._error(HTTPStatus.NOT_FOUND, "Page not found.")
            return
        try:
            content = file.read_bytes()
        except (OSError, ValueError):
            self._error(HTTPStatus.NOT_FOUND, "Page not found.")
            return
        mime = (
            {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml"}.get(
                file.suffix
            )
            or mimetypes.guess_type(file.name)[0]
            or "application/octet-stream"
        )
        self._send(HTTPStatus.OK, mime, content)

    def do_POST(self) -> None:
        if not self._allowed(api=True):
            return
        if self.path != "/api/projects":
            self._error(HTTPStatus.NOT_FOUND, "Page not found.")
            return
        if self.headers.get_content_type() != "application/json":
            self._error(
                HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Send a JSON project request."
            )
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= _MAX_BODY:
                raise ValueError
            data: object = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError
            fields = cast("dict[str, object]", data)
            template, name = fields.get("template"), fields.get("name")
            if not isinstance(template, str) or not isinstance(name, str):
                raise ValueError
        except (ValueError, RecursionError):
            self._error(
                HTTPStatus.BAD_REQUEST, "Enter a template and project folder name."
            )
            return
        try:
            path = create_project(self.gallery.workspace, template, name)
        except ValueError as exc:
            self._error(HTTPStatus.BAD_REQUEST, str(exc))
        except FileExistsError:
            self._error(
                HTTPStatus.CONFLICT, "That folder already exists. Choose another name."
            )
        except OSError:
            self._error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "Couldn't create the project. Check the workspace and try again.",
            )
        else:
            self._json(HTTPStatus.CREATED, {"path": str(path)})


class TemplateGallery:
    def __init__(self) -> None:
        self._server: _Server | None = None
        self._lock = Lock()

    def open(self, workspace: Path) -> str:
        workspace = workspace.resolve(strict=True)
        if not workspace.is_dir():
            raise NotADirectoryError(workspace)
        with self._lock:
            if self._server is None or self._server.workspace != workspace:
                self._stop()
                server = _Server(workspace)
                Thread(
                    target=server.serve_forever,
                    kwargs={"poll_interval": 0.1},
                    daemon=True,
                ).start()
                self._server = server
            return f"http://{self._server.authority}/#{self._server.token}"

    def _stop(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            self._server = None

    def close(self) -> None:
        with self._lock:
            self._stop()
