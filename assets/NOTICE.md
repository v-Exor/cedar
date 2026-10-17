# Asset and runtime sources

## Moon sample

- File: `assets/moon.png` (also included in the Python kit).
- Source: scikit-image's sample-data collection, tag `v0.21.0`.
- Original download: https://raw.githubusercontent.com/scikit-image/scikit-image/v0.21.0/skimage/data/moon.png
- Description: https://scikit-image.org/docs/0.21.x/api/skimage.data.html#skimage.data.moon
- Retrieved for the earlier Python activity in this conversation; reused locally.
- The handout contains school logos, not an experimental photograph. The Moon
  image was selected to demonstrate the specified contrast techniques; it is
  not described as an image supplied by the handout.
- scikit-image describes this as a low-contrast image of the Moon suitable for
  histogram equalization and contrast stretching. Its data collection's terms
  remain applicable; no original photographer or new ownership is asserted here.

`assets/results/*.webp`, `hero-histogram.svg`, and `reference-metrics.json` were
generated from that sample by `scripts/generate-reference.py`. They are genuine
Python/OpenCV outputs. The WebP images are compressed presentation copies; the
live experiments process the original lossless PNG. WebP previews are not used
as numerical reference data.

The color image in `tests/color-fixture.png` is a deterministic synthetic RGB
ramp used for software validation, not an experimental photograph.

## OpenCV WebAssembly

- Runtime: OpenCV 4.12.0 from `@techstark/opencv-js@4.12.0-release.1`.
- Original distribution: https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.12.0-release.1/dist/opencv.js
- Upstream distribution: https://github.com/TechStark/opencv-js
- OpenCV source: https://github.com/opencv/opencv/tree/4.12.0
- SHA-256: `bd0c3e6448043de04f6a64a12cb7b759f78c3ab8f7c35c9f2e0f71c88bb17103`
- Size: 10,872,779 bytes. WebAssembly is embedded in the JavaScript file.
- License: Apache License 2.0, retained in `vendor/OPENCV-LICENSE.txt`.

The runtime is bundled and served from the same origin; no CDN requests, API
keys, backend, or cross-origin isolation headers are needed. It is a substantial
initial download and can be slower on a limited connection.

The favicon and the VisionLab visual identity follow the existing Lab 2 project
in this workspace. No school logos are republished in this site.
