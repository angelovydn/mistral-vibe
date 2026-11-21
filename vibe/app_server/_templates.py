"""Open a workspace-bound template gallery for the attached session."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Any

from vibe.app_server._dispatch import DispatchResult, RequestFailure
from vibe.app_server._model import ProtocolModel, validate_wire
from vibe.app_server.protocol import ProtocolErrorCode, SessionReadParams

if TYPE_CHECKING:
    from vibe.app_server._session_backend_port import SessionBackend
    from vibe.app_server.templates_gallery import TemplateGallery


class TemplatesOpenParams(ProtocolModel):
    session_id: str


class TemplatesOpenResponse(ProtocolModel):
    url: str


class Templates:
    def __init__(self) -> None:
        self._gallery: TemplateGallery | None = None

    async def open(
        self, raw_params: dict[str, Any], session: SessionBackend | None
    ) -> DispatchResult:
        params = validate_wire(TemplatesOpenParams, raw_params)
        if session is None or session.session_id != params.session_id:
            raise RequestFailure(ProtocolErrorCode.NOT_FOUND, "Session is not attached")
        session.guard_request()
        snapshot = await session.read(
            SessionReadParams(session_id=params.session_id, history=None, turns=None)
        )
        cwd = snapshot.state.session.cwd
        if not cwd or not Path(cwd).is_absolute():
            raise RequestFailure(
                ProtocolErrorCode.CONFLICT, "Session has no local workspace"
            )
        if self._gallery is None:
            from vibe.app_server.templates_gallery import TemplateGallery

            self._gallery = TemplateGallery()
        opening = asyncio.create_task(asyncio.to_thread(self._gallery.open, Path(cwd)))
        try:
            url = await asyncio.shield(opening)
        except asyncio.CancelledError:
            # Shutdown closes the gallery after outstanding RPCs finish.
            await asyncio.gather(opening, return_exceptions=True)
            raise
        except OSError as exc:
            raise RequestFailure(
                ProtocolErrorCode.CONFLICT,
                f"Could not open the template gallery: {exc}",
            ) from exc
        return DispatchResult(TemplatesOpenResponse(url=url))

    async def close(self) -> None:
        if self._gallery is not None:
            await asyncio.to_thread(self._gallery.close)
