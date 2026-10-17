"""CSST106 Lab 3: histogram equalization, contrast stretching, and CLAHE."""
import argparse
import json
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np


def contrast_stretch(channel, percent=2.0):
    low, high = np.percentile(channel, (percent, 100 - percent))
    if high <= low:
        return channel.copy()
    scaled = (channel.astype(np.float64) - low) * 255.0 / (high - low)
    return np.rint(np.clip(scaled, 0, 255)).astype(np.uint8)


def process(image, mode="gray", clip=2.0, tiles=8, percent=2.0):
    if mode == "gray":
        channel = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        yuv = None
    else:
        yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        channel = yuv[:, :, 0].copy()

    # PART 1: Compute the histogram and apply global equalization.
    original_histogram = cv2.calcHist([channel], [0], None, [256], [0, 256])
    equalized = cv2.equalizeHist(channel)

    # PART 2: Linear contrast stretching and adaptive equalization.
    stretched = contrast_stretch(channel, percent)
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(tiles, tiles))
    adaptive = clahe.apply(channel)
    planes = {
        "original": channel,
        "stretched": stretched,
        "equalized": equalized,
        "clahe": adaptive,
    }

    images = {}
    for name, plane in planes.items():
        if mode == "gray":
            images[name] = plane.copy()
        elif name == "original":
            images[name] = image.copy()
        else:
            result_yuv = yuv.copy()
            result_yuv[:, :, 0] = plane
            images[name] = cv2.cvtColor(result_yuv, cv2.COLOR_YUV2BGR)
    return images, planes, original_histogram


def statistics(plane):
    counts = np.bincount(plane.ravel(), minlength=256)
    probabilities = counts[counts > 0] / plane.size
    return {
        "mean": float(plane.mean()),
        "std": float(plane.std()),
        "min": int(plane.min()),
        "max": int(plane.max()),
        "entropy": float(-(probabilities * np.log2(probabilities)).sum()),
        "histogram": counts.tolist(),
    }


def main():
    folder = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, default=folder / "moon.png")
    parser.add_argument("--mode", choices=["gray", "yuv"], default="gray")
    parser.add_argument("--clip", type=float, default=2.0)
    parser.add_argument("--tiles", type=int, default=8)
    parser.add_argument("--percent", type=float, default=2.0)
    parser.add_argument("--save-only", action="store_true")
    parser.add_argument("--output", type=Path, default=folder / "results")
    args = parser.parse_args()
    if not 0.5 <= args.clip <= 10:
        parser.error("--clip must be between 0.5 and 10")
    if not 2 <= args.tiles <= 16:
        parser.error("--tiles must be between 2 and 16")
    if not 0 <= args.percent <= 10:
        parser.error("--percent must be between 0 and 10")
    image = cv2.imread(str(args.image), cv2.IMREAD_COLOR)
    if image is None:
        parser.error(f"Cannot open image: {args.image}")
    args.output.mkdir(parents=True, exist_ok=True)
    images, planes, _ = process(
        image, args.mode, args.clip, args.tiles, args.percent
    )
    channel_name = "Grayscale" if args.mode == "gray" else "Working Y channel"

    # PART 3: This complete program implements the laboratory procedures.
    for keys, filename in [
        (["original", "equalized"], "part1_equalization.png"),
        (list(images), "part2_comparison.png"),
    ]:
        fig, axes = plt.subplots(2, len(keys), figsize=(4 * len(keys), 7))
        peak = max(np.bincount(planes[key].ravel(), minlength=256).max() for key in keys)
        for column, key in enumerate(keys):
            if args.mode == "gray":
                axes[0, column].imshow(images[key], cmap="gray", vmin=0, vmax=255)
            else:
                axes[0, column].imshow(cv2.cvtColor(images[key], cv2.COLOR_BGR2RGB))
            axes[0, column].set_title(key.title())
            axes[0, column].axis("off")
            counts = cv2.calcHist([planes[key]], [0], None, [256], [0, 256])
            axes[1, column].plot(np.arange(256), counts.ravel(), color="#b9510e")
            axes[1, column].set_xlim(0, 255)
            axes[1, column].set_ylim(0, peak * 1.05)
            axes[1, column].set_xlabel(f"{channel_name} intensity")
            axes[1, column].set_ylabel("Number of pixels")
        fig.tight_layout()
        fig.savefig(args.output / filename, dpi=150)

    for name, result in images.items():
        cv2.imwrite(str(args.output / f"{name}.png"), result)
    measurements = {
        "input": args.image.name,
        "mode": args.mode,
        "clip": args.clip,
        "tiles": args.tiles,
        "percent": args.percent,
        "measurements": {key: statistics(value) for key, value in planes.items()},
        "note": "Y-mode measurements precede RGB reconstruction and possible clipping.",
    }
    (args.output / "measurements.json").write_text(
        json.dumps(measurements, indent=2), encoding="utf-8"
    )
    print(f"Results saved in: {args.output.resolve()}")
    if args.save_only:
        plt.close("all")
    else:
        plt.show()


if __name__ == "__main__":
    main()
