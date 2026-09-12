"""Rebuild pinned browser Java binaries; run from any directory with Python 3."""
from pathlib import Path
import hashlib
import io
import json
import urllib.request
import zipfile

root = Path(__file__).resolve().parents[1]
target = root / "public" / "java"
manifest = json.loads((target / "asset-sources.json").read_text())
base = "https://raw.githubusercontent.com/plasma-umass/doppio-demo/" + manifest["revision"] + "/"


def download(name):
    with urllib.request.urlopen(base + name, timeout=120) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != manifest["sha256"][name]:
        raise RuntimeError("Upstream checksum mismatch: " + name)
    return data


for source, output in [("js/browserfs.min.js", "browserfs.min.js"),
                       ("js/doppio.js", "doppio.js"),
                       ("programs/ecj-4.5.jar", "ecj.jar")]:
    data = download(source)
    if output == "doppio.js":
        script = data.decode()
        old = 'return new Function("f","t","u",r)'
        new = 'try{return new Function("f","t","u",r)}catch(error){if(error instanceof SyntaxError)return null;throw error}'
        if script.count(old) != 1:
            raise RuntimeError("Unexpected JIT compiler version")
        # A rejected optimization must fall back to the bytecode interpreter.
        data = script.replace(old, new).encode()
    (target / output).write_bytes(data)

with zipfile.ZipFile(io.BytesIO(download("doppio_home.zip"))) as src:
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as dst:
        for info in src.infolist():
            if info.filename.endswith(("lib/tools.jar", "lib/ext/nashorn.jar")):
                continue
            data = src.read(info.filename)
            if info.filename.endswith("jdk.json"):
                config = json.loads(data)
                config["classpath"] = [p for p in config["classpath"] if p != "lib/tools.jar"]
                data = json.dumps(config).encode()
            if info.filename == "natives/doppio.js":
                script = data.decode()
                start = script.index("try{var rv=eval(to_eval.toString());")
                end = script.index("},doppio_JavaScript", start)
                script = script[:start] + 'thread.throwNewException("Ljava/lang/SecurityException;","JavaScript access is disabled in the lab compiler.")' + script[end:]
                data = script.encode()
            dst.writestr(info.filename, data)
    (target / "java8-runtime.zip").write_bytes(result.getvalue())
print("Browser Java binaries verified and rebuilt. Keep public/java/licenses in deployments.")
