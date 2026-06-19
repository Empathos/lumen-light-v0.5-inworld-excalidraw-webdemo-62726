import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = REPO_ROOT / "scripts" / "validate_artifact.py"
EXAMPLES = [
    REPO_ROOT / "examples" / "conversation-artifact.example.json",
    REPO_ROOT / "examples" / "highlight-artifact.example.json",
    REPO_ROOT / "examples" / "staged-card-artifact.example.json",
]


def run_validator(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATOR), str(path)],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


class ValidateArtifactTest(unittest.TestCase):
    def test_shipped_artifact_examples_match_schema(self) -> None:
        for example in EXAMPLES:
            with self.subTest(example=example.name):
                result = run_validator(example)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("LUMEN_LIGHT_ARTIFACT_OK", result.stdout)

    def test_validator_rejects_unknown_surface_properties(self) -> None:
        data = json.loads(EXAMPLES[0].read_text(encoding="utf-8"))
        data["surface"]["unsupported_property"] = "must be rejected"

        with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as handle:
            json.dump(data, handle)
            temp_path = Path(handle.name)

        try:
            result = run_validator(temp_path)
        finally:
            temp_path.unlink(missing_ok=True)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LUMEN_LIGHT_ARTIFACT_INVALID", result.stderr)
        self.assertIn("Additional properties are not allowed", result.stderr)


if __name__ == "__main__":
    unittest.main()
