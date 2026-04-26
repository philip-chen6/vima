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

    if normalized == "auto":
        if (home / ".codex").exists():
            targets.append(SkillTarget("codex", home / ".codex" / "skills" / "vima"))
        if (home / ".claude").exists():
            targets.append(SkillTarget("claude", home / ".claude" / "skills" / "vima"))
        gstack_root = home / ".claude" / "skills" / "gstack" / ".agents" / "skills"
        if gstack_root.exists():
            targets.append(SkillTarget("gstack", gstack_root / "vima"))
        return targets

    if normalized == "codex":
        targets.append(SkillTarget("codex", home / ".codex" / "skills" / "vima"))
    if normalized == "claude":
        targets.append(SkillTarget("claude", home / ".claude" / "skills" / "vima"))
    if normalized == "gstack":
        gstack_root = home / ".claude" / "skills" / "gstack" / ".agents" / "skills"
        targets.append(SkillTarget("gstack", gstack_root / "vima"))

    if normalized not in {"auto", "codex", "claude", "gstack"}:
        targets.append(SkillTarget(normalized, pathlib.Path(normalized).expanduser()))

    return targets


def install_skill(agent: str = "auto", force: bool = False) -> list[SkillTarget]:
    targets = detect_targets(agent)
    if not targets:
        return []

    installed: list[SkillTarget] = []
    template_root = importlib.resources.files("vima_agent.skill_template")

    for target in targets:
        if target.path.exists():
            if not force:
                continue
            shutil.rmtree(target.path)
        target.path.mkdir(parents=True, exist_ok=True)
        os.chmod(target.path, 0o755)

        # SKILL.md gets the {{AGENT}} substitution.
        target.path.joinpath("SKILL.md").write_text(skill_text(target.agent))

        # Reference docs and golden samples ship as-is. Walk each directory
        # and copy every file, preserving the subdir structure. Using
        # importlib.resources keeps this working when the skill is installed
        # from a wheel (where files live inside a zip).
        for subdir in ("references", "golden_samples"):
            src_dir = template_root.joinpath(subdir)
            if not src_dir.is_dir():
                continue
            dst_dir = target.path / subdir
            dst_dir.mkdir(parents=True, exist_ok=True)
            for item in src_dir.iterdir():
                if item.is_file():
                    dst_dir.joinpath(item.name).write_bytes(item.read_bytes())

        installed.append(target)
    return installed
