"""Regenerate genuine reference images and independent Python/OpenCV fixtures."""
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lab", ROOT / "python/histogram_lab.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)
image = cv2.imread(str(ROOT / "assets/moon.png"))
images, planes, _ = lab.process(image)
keys = {"original": "original", "stretched": "stretch", "equalized": "global", "clahe": "clahe"}
for name, output in images.items():
    cv2.imwrite(str(ROOT / f"assets/results/{keys[name]}.webp"), output, [cv2.IMWRITE_WEBP_QUALITY, 93])
metrics = {
    "source": "scikit-image v0.21.0 moon.png",
    "engine": f"Python OpenCV {cv2.__version__}",
    "parameters": {"mode": "gray", "clip": 2, "tiles": 8, "percent": 2},
    "stretchBounds": np.percentile(planes["original"], [2, 98]).tolist(),
    "measurements": {keys[name]: lab.statistics(plane) for name, plane in planes.items()},
}
(ROOT / "assets/results/reference-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
paths = []
peak = max(max(metrics["measurements"][key]["histogram"]) for key in ["original", "clahe"])
for key, color in [("original", "#a4aa9b"), ("clahe", "#c15b15")]:
    counts = metrics["measurements"][key]["histogram"]
    points = " ".join(f"{i * 278 / 255 + 1:.2f},{68 - n / peak * 61:.2f}" for i, n in enumerate(counts))
    paths.append(f'<polyline points="{points}" stroke="{color}" stroke-width="1.5" fill="none"/>')
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 70"><path d="M0 69h280" stroke="#e5e5da"/>' + ''.join(paths) + '</svg>'
(ROOT / "assets/results/hero-histogram.svg").write_text(svg, encoding="utf-8")

rng = np.random.default_rng(106)
cases = []
for name, rgb, mode, tiles in [
    ("constant", np.full((16, 16, 3), 112, np.uint8), "gray", 8),
    ("narrow", np.repeat(rng.integers(85, 130, (24, 32, 1), dtype=np.uint8), 3, axis=2), "gray", 4),
    ("gradient", np.repeat(np.tile(np.arange(32, dtype=np.uint8) * 8, (24, 1))[:, :, None], 3, axis=2), "gray", 8),
    ("small", rng.integers(0, 256, (3, 5, 3), dtype=np.uint8), "gray", 8),
    ("color", rng.integers(0, 256, (24, 32, 3), dtype=np.uint8), "yuv", 8),
]:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    for percent in [0, 2]:
        outputs, channels, _ = lab.process(bgr, mode=mode, clip=2, tiles=tiles, percent=percent)
        rgba = cv2.cvtColor(rgb, cv2.COLOR_RGB2RGBA)
        cases.append({
            "name": f"{name}-{percent}", "width": rgb.shape[1], "height": rgb.shape[0],
            "rgba": rgba.ravel().tolist(),
            "parameters": {"mode": mode, "clip": 2, "tiles": tiles, "percent": percent},
            "expected": {keys[k] if k != "original" else "input": {
                "rgba": cv2.cvtColor(v, cv2.COLOR_GRAY2RGBA if mode == "gray" else cv2.COLOR_BGR2RGBA).ravel().tolist(),
                **lab.statistics(channels[k])
            } for k, v in outputs.items()},
        })
(ROOT / "tests/opencv-fixtures.json").write_text(json.dumps({"opencv": cv2.__version__, "cases": cases}), encoding="utf-8")
print(f"Generated reference results and {len(cases)} OpenCV fixtures.")
