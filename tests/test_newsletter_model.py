"""Exercise real model selection/extraction without importing IMAP or external SDKs."""
import ast
import json
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


SOURCE = ast.parse((Path(__file__).resolve().parents[1] / "api/cron-bloomberg.py").read_text())
NAMES = {"MODEL_NAME", "MAX_RETRIES", "TRANSIENT_BACKOFF", "TRANSIENT_MARKERS"}
FUNCTIONS = {"_is_transient", "_extract_with_retry"}
SUBSET = ast.Module(body=[
    node for node in SOURCE.body
    if (isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in NAMES for t in node.targets))
    or (isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS)
], type_ignores=[])


def load(env):
    namespace = {"os": os, "json": json, "time": SimpleNamespace(sleep=Mock()),
                 "types": SimpleNamespace(GenerateContentConfig=SimpleNamespace, ThinkingConfig=SimpleNamespace)}
    with patch.dict(os.environ, env, clear=True):
        exec(compile(SUBSET, "api/cron-bloomberg.py", "exec"), namespace)
    return namespace


class NewsletterModelTests(unittest.TestCase):
    def test_shared_model_default_and_override(self):
        self.assertEqual(load({})["MODEL_NAME"], "gemini-3.5-flash-lite")
        self.assertEqual(load({"GEMINI_MODEL": " compatible-test-model "})["MODEL_NAME"], "compatible-test-model")
        self.assertEqual(load({"GEMINI_MODEL": "  "})["MODEL_NAME"], "gemini-3.5-flash-lite")

    def test_extraction_request_and_json(self):
        namespace = load({})
        generate = Mock(return_value=SimpleNamespace(text='{"stories":[]}'))
        client = SimpleNamespace(models=SimpleNamespace(generate_content=generate))
        result = namespace["_extract_with_retry"](client, "Extract only supplied text", "Newsletter")
        self.assertEqual(result, {"stories": []})
        request = generate.call_args.kwargs
        self.assertEqual(request["model"], "gemini-3.5-flash-lite")
        self.assertEqual(request["contents"], "Newsletter")
        config = request["config"]
        self.assertEqual(config.system_instruction, "Extract only supplied text")
        self.assertEqual(config.response_mime_type, "application/json")
        self.assertEqual(config.thinking_config.thinking_level, "minimal")
        self.assertFalse(hasattr(config, "temperature"))

    def test_transient_failure_keeps_anthropic_fallback(self):
        namespace = load({})
        generate = Mock(side_effect=RuntimeError("503 unavailable"))
        namespace["_extract_with_anthropic"] = Mock(return_value={"stories": []})
        client = SimpleNamespace(models=SimpleNamespace(generate_content=generate))
        backup = object()
        self.assertEqual(namespace["_extract_with_retry"](client, "System", "Newsletter", backup), {"stories": []})
        self.assertEqual(generate.call_count, 3)
        namespace["_extract_with_anthropic"].assert_called_once_with(backup, "System", "Newsletter")


if __name__ == "__main__":
    unittest.main()
