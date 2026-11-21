"""The template gallery RPC is bound to the attached session's workspace."""

from __future__ import annotations

import asyncio
from http.client import HTTPConnection
import json
from pathlib import Path
from urllib.parse import urlsplit

import pytest

from tests.app_server.backend_contract.conftest import BackendContractConnection
from vibe.app_server._templates import TemplatesOpenParams, TemplatesOpenResponse
from vibe.app_server.protocol import (
    AppServerResponseError,
    ProtocolErrorCode,
    SessionOptions,
)
from vibe.app_server.session import AppServerSession


@pytest.fixture
def backend_contract_session_options(tmp_path: Path) -> SessionOptions:
    return SessionOptions(cwd=str(tmp_path))


def _catalog_workspace(port: int, token: str) -> str:
    connection = HTTPConnection("127.0.0.1", port, timeout=3)
    try:
        connection.request(
            "GET", "/api/catalog", headers={"Authorization": f"Bearer {token}"}
        )
        response = connection.getresponse()
        assert response.status == 200
        return json.loads(response.read())["workspace"]
    finally:
        connection.close()


@pytest.mark.asyncio
async def test_templates_open_for_attached_workspace(
    backend_contract_connection: BackendContractConnection,
    backend_contract_session: AppServerSession,
) -> None:
    client = backend_contract_connection.client
    session_id = backend_contract_session.session_id
    gallery = TemplatesOpenResponse.model_validate(
        await client.request(
            "templates/open", TemplatesOpenParams(session_id=session_id)
        )
    )
    location = urlsplit(gallery.url)
    assert location.scheme == "http"
    assert location.hostname == "127.0.0.1"
    assert location.port is not None
    workspace = await asyncio.to_thread(
        _catalog_workspace, location.port, location.fragment
    )
    assert Path(workspace) == Path(backend_contract_session.cwd).resolve()

    with pytest.raises(AppServerResponseError) as wrong_session:
        await client.request("templates/open", TemplatesOpenParams(session_id="other"))
    assert wrong_session.value.error.code is ProtocolErrorCode.NOT_FOUND

    with pytest.raises(AppServerResponseError) as override:
        await client.request(
            "templates/open", {"sessionId": session_id, "cwd": "other"}
        )
    assert override.value.error.code is ProtocolErrorCode.INVALID_PARAMS
