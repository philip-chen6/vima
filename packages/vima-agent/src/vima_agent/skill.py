from __future__ import annotations

import importlib.resources
import os
import pathlib
import shutil
from dataclasses import dataclass


@dataclass(frozen=True)
class SkillTarget:
    agent: str
    path: pathlib.Path


def skill_text(agent: str = "generic") -> str:
    text = importlib.resources.files("vima_agent.skill_template").joinpath("SKILL.md").read_text()
    return text.replace("{{AGENT}}", agent)


def detect_targets(agent: str) -> list[SkillTarget]:
    home = pathlib.Path.home()
    normalized = agent.lower()
    targets: list[SkillTarget] = []

    if normalized in {"auto", "codex"}:
        targets.append(SkillTarget("codex", home / ".codex" / "skills" / "vima"))
    if normalized in {"auto", "claude"}:
        targets.append(SkillTarget("claude", home / ".claude" / "skills" / "vima"))
    if normalized in {"auto", "gstack"}:
        gstack_root = home / ".claude" / "skills" / "gstack" / ".agents" / "skills"
        if gstack_root.exists():
            targets.append(SkillTarget("gstack", gstack_root / "vima"))

    if normalized not in {"auto", "codex", "claude", "gstack"}:
        targets.append(SkillTarget(normalized, pathlib.Path(normalized).expanduser()))

    return targets


def install_skill(agent: str = "auto", force: bool = False) -> list[SkillTarget]:
    targets = detect_targets(agent)
    if not targets:
        return []

    installed: list[SkillTarget] = []
    for target in targets:
        if target.path.exists():
            if not force:
                continue
            shutil.rmtree(target.path)
        target.path.mkdir(parents=True, exist_ok=True)
        os.chmod(target.path, 0o755)
        target.path.joinpath("SKILL.md").write_text(skill_text(target.agent))
        installed.append(target)
    return installed
