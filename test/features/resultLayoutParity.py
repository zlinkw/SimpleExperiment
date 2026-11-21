import hashlib
import json
import re
import sys

request = json.load(sys.stdin)
namespace = {"re": re, "hashlib": hashlib}
exec(request["functions"], namespace)
print(json.dumps({
    "keys": [namespace["dataset_path_key"](name) for name in request["names"]],
    "legacy": namespace["legacy_dataset_path_key"]("肺"),
}, ensure_ascii=False))
