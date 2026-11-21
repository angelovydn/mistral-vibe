from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory

ASSETS = Path(__file__).with_name("assets")


@dataclass(frozen=True)
class Template:
    id: str
    name: str
    description: str


TEMPLATES = (
    Template("chat", "Chat", "Threaded conversations with a shared team inbox."),
    Template(
        "crm", "CRM", "A contact directory with searchable records and deal stages."
    ),
    Template("kanban", "Kanban", "A project board for moving work from idea to done."),
    Template(
        "analytics", "Analytics", "An interactive view of revenue and performance."
    ),
)
_IDS = frozenset(template.id for template in TEMPLATES)
_NAME = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9 _-]{0,62}[A-Za-z0-9_-])?")
_DEVICE = re.compile(r"(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", re.IGNORECASE)


def create_project(workspace: Path, template_id: str, name: str) -> Path:
    if template_id not in _IDS:
        raise ValueError("Choose a template from the gallery.")
    if not _NAME.fullmatch(name) or _DEVICE.fullmatch(name):
        raise ValueError(
            "Choose a valid folder name of 1–64 letters, numbers, spaces, underscores, or hyphens."
        )
    destination = workspace / name
    if os.path.lexists(destination):
        raise FileExistsError(name)

    with TemporaryDirectory(prefix=".vibe-template-", dir=workspace) as staging:
        project = Path(staging) / "project"
        shutil.copytree(ASSETS / "shared", project)
        shutil.copytree(ASSETS / "starters" / template_id, project, dirs_exist_ok=True)
        if os.name == "nt":
            # On Windows rename exclusively creates the destination.
            project.rename(destination)
        else:
            # POSIX rename can replace an existing empty folder. Reserve our own first.
            destination.mkdir()
            try:
                project.replace(destination)
            except OSError:
                destination.rmdir()
                raise
    return destination
