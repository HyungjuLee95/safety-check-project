from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1] / "app"

BAD_PREFIXES = ("<<<<<<<", "=======", ">>>>>>>")


def main() -> int:
    bad = []
    for path in ROOT.rglob("*.py"):
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith(BAD_PREFIXES) or stripped == "---":
                bad.append((path, i, line))

    if not bad:
        print("OK: no merge/conflict markers found in backend/app Python files")
        return 0

    print("ERROR: invalid marker lines found:")
    for path, line_no, line in bad:
        print(f"- {path.relative_to(ROOT.parent)}:{line_no}: {line}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
