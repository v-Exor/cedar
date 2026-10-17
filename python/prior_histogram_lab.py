from pathlib import Path
from urllib.request import urlopen

import cv2
import matplotlib.pyplot as plt
import numpy as np


FOLDER = Path(__file__).resolve().parent
IMAGE_PATH = FOLDER / "moon.png"
OUTPUT = FOLDER / "results"
SAMPLE_URL = (
    "https://raw.githubusercontent.com/scikit-image/"
    "scikit-image/v0.21.0/skimage/data/moon.png"
)


def load_image():
    # Download the sample only when it is missing.
    if not IMAGE_PATH.exists():
        try:
            with urlopen(SAMPLE_URL, timeout=30) as response:
                IMAGE_PATH.write_bytes(response.read())
        except Exception as error:
            raise RuntimeError(
                "Download failed. Save moon.png beside this Python file "
                "and run the program again."
            ) from error

    image = cv2.imread(str(IMAGE_PATH), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Cannot read image: {IMAGE_PATH}")
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def plot_results(images, titles, filename):
    fig, axes = plt.subplots(2, len(images), figsize=(4 * len(images), 7))
    for column, (image, title) in enumerate(zip(images, titles)):
        axes[0, column].imshow(image, cmap="gray", vmin=0, vmax=255)
        axes[0, column].set_title(title)
        axes[0, column].axis("off")

        histogram = cv2.calcHist([image], [0], None, [256], [0, 256])
        axes[1, column].plot(np.arange(256), histogram.ravel())
        axes[1, column].set_xlim(0, 255)
        axes[1, column].set_xlabel("Pixel intensity")
        axes[1, column].set_ylabel("Number of pixels")
        axes[1, column].set_title(f"{title} histogram")

    fig.tight_layout()
    fig.savefig(OUTPUT / filename, dpi=150)


def contrast_stretch(image):
    # Clip the lowest/highest 2% and scale the remaining range linearly.
    low, high = np.percentile(image, (2, 98))
    if high <= low:
        return image.copy()
    scaled = (image.astype(np.float32) - low) * 255.0 / (high - low)
    return np.rint(np.clip(scaled, 0, 255)).astype(np.uint8)


def main():
    OUTPUT.mkdir(exist_ok=True)

    # PART 1: Grayscale histogram equalization and before/after histograms.
    original = load_image()
    equalized = cv2.equalizeHist(original)
    plot_results(
        [original, equalized],
        ["Original", "Global equalization"],
        "part1_histogram_equalization.png",
    )

    # PART 2: Linear contrast stretching and CLAHE comparison.
    stretched = contrast_stretch(original)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    adaptive = clahe.apply(original)
    images = [original, stretched, equalized, adaptive]
    titles = ["Original", "Contrast stretching", "Global equalization", "CLAHE"]
    plot_results(images, titles, "part2_contrast_comparison.png")

    for name, image in zip(
        ["original", "stretched", "equalized", "clahe"], images
    ):
        cv2.imwrite(str(OUTPUT / f"{name}.png"), image)

    print(f"Results saved in: {OUTPUT}")
    plt.show()


# PART 3: Complete runnable Python program for histogram equalization.
if __name__ == "__main__":
    main()
