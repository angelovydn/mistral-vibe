"""The Templates command opens the workspace gallery and shows its URL for headless use."""

from __future__ import annotations

from e2e.app_server.scenario import Action, Timeline, take_snapshot

_URL = "http://127.0.0.1:41987/#demo-session"
handshake = {"templates/open": {"url": _URL}}
request_methods = {"templates/open"}
expected_actions = [Action("open_url", _URL)]
screen_contains = ("Templates", _URL)
timeline: Timeline = ["/templates\r", take_snapshot("templates")]
