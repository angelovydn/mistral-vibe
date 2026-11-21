from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from http.client import HTTPConnection
import json
from pathlib import Path
import shutil
from urllib.parse import urlsplit

import pytest

from vibe.app_server.templates_gallery import TemplateGallery
from vibe.app_server.templates_gallery._projects import TEMPLATES, create_project


@pytest.fixture
def gallery(tmp_path: Path) -> Iterator[str]:
    with closing(TemplateGallery()) as service:
        url = service.open(tmp_path)
        assert service.open(tmp_path) == url
        yield url


def request(
    url: str, route: str, *, data: object = None, headers: dict[str, str] | None = None
) -> tuple[int, bytes]:
    parsed = urlsplit(url)
    extra = {
        "Authorization": f"Bearer {parsed.fragment}",
        "Content-Type": "application/json",
    }
    extra.update(headers or {})
    with closing(HTTPConnection(parsed.netloc, timeout=5)) as conn:
        body = json.dumps(data) if data is not None else None
        conn.request("POST" if body else "GET", route, body, extra)
        response = conn.getresponse()
        return response.status, response.read()


def test_packaged_gallery_and_working_starters(gallery: str, tmp_path: Path) -> None:
    status, body = request(gallery, "/api/catalog")
    assert status == 200
    catalog = json.loads(body)
    assert Path(catalog["workspace"]) == tmp_path
    assert [entry["id"] for entry in catalog["templates"]] == [
        "chat",
        "crm",
        "kanban",
        "analytics",
    ]
    assert request(gallery, "/")[0] == 200
    for template in TEMPLATES:
        assert request(gallery, f"/previews/{template.id}/index.html")[0] == 200
        name = f"my {template.id}"
        project = {"template": template.id, "name": name}
        status, response = request(gallery, "/api/projects", data=project)
        assert status == 201
        path = Path(json.loads(response)["path"])
        assert path == tmp_path / name
        assert (path / "package-lock.json").is_file()
        assert (path / "src" / "App.tsx").is_file()
        assert request(gallery, "/api/projects", data=project)[0] == 409


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": ""},
        {"Host": "example.invalid"},
        {"Origin": "https://example.invalid"},
    ],
)
def test_workspace_requires_gallery_access(
    gallery: str, headers: dict[str, str], tmp_path: Path
) -> None:
    assert request(gallery, "/api/catalog", headers=headers)[0] == 403
    assert (
        request(
            gallery,
            "/api/projects",
            data={"template": "crm", "name": "demo"},
            headers=headers,
        )[0]
        == 403
    )
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize(
    "name",
    [
        "",
        ".",
        "..",
        "../escape",
        "C:escape",
        "a/b",
        "a\\b",
        "LPT1",
        "con",
        "hello.",
        "trailing ",
        "a" * 65,
    ],
)
def test_invalid_folder(tmp_path: Path, name: str) -> None:
    with pytest.raises(ValueError):
        create_project(tmp_path, "chat", name)
    assert list(tmp_path.iterdir()) == []


def test_rejects_unknown_template_and_static_traversal(gallery: str) -> None:
    assert (
        request(gallery, "/api/projects", data={"template": "unknown", "name": "app"})[
            0
        ]
        == 400
    )
    assert request(gallery, "/previews/%2e%2e/shared/package.json")[0] == 404


def test_existing_folder_and_concurrent_creation(tmp_path: Path) -> None:
    (tmp_path / "existing").mkdir()
    with pytest.raises(FileExistsError):
        create_project(tmp_path, "crm", "existing")
    with ThreadPoolExecutor(max_workers=2) as pool:
        attempts = [
            pool.submit(create_project, tmp_path, "chat", "new") for _ in range(2)
        ]
    assert sum(job.exception() is None for job in attempts) == 1
    assert sum(isinstance(job.exception(), FileExistsError) for job in attempts) == 1
    assert (tmp_path / "new" / "package-lock.json").is_file()


def test_interrupted_copy(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*args: object, **kwargs: object) -> None:
        raise OSError("interrupted")

    monkeypatch.setattr(shutil, "copytree", fail)
    with pytest.raises(OSError, match="interrupted"):
        create_project(tmp_path, "chat", "new")
    assert list(tmp_path.iterdir()) == []
