# Handout to website map

Primary source: `CSST106_Lab_Experiment_03_Histogram.docx`, supplied in this
conversation and read directly from the user's Downloads folder. The document
is not redistributed in the website. It identifies Laboratory Exercise 3,
CSST106 Perception and Computer Vision, weeks 4–5, semester 1, AY 2026–2027.

| Handout requirement | Implementation |
| --- | --- |
| Understand and implement histogram equalization | Overview, objectives, Part 1, cumulative distribution chart, Q&A |
| Perform global and adaptive equalization | Parts 1 and 2, OpenCV WebAssembly `equalizeHist` and `CLAHE` |
| Apply contrast adjustment and analyze visualization | Part 2 linear scaling, parameter controls, measurements, Part 4 |
| Part 1: read grayscale or color image | Shared upload/drop input, Moon sample, grayscale and color modes |
| Convert color image to grayscale if needed | OpenCV RGBA-to-grayscale conversion in grayscale mode |
| Calculate input histogram | Actual 256-bin counts, charts and JSON export |
| Equalize grayscale with `cv2.equalizeHist()` | OpenCV `equalizeHist()` in browser and `cv2.equalizeHist()` in Python |
| For color, equalize luminance in YUV or HSV | Y channel in YUV; U and V unchanged before RGB reconstruction |
| Original and equalized side by side | Part 1 two-panel comparison, with per-image PNG downloads |
| Plot histograms before and after | Part 1 charts, shared vertical scale; expandable CDF explanation |
| Part 2: linear contrast stretching | Percentile-based linear scaling; set 0% for exact min–max scaling |
| CLAHE with OpenCV | Real `cv.CLAHE` / `cv2.createCLAHE`, adjustable clip limit and grid |
| Display original, global, CLAHE and histograms | Part 2 four-panel comparison also includes stretched output |
| Part 3: create Python code | Complete runnable Python kit, expandable/copyable source, earlier conversation version preserved |
| Part 4: detail visibility and overall contrast | Measured spread, observations, downloadable personal notes |
| Differences between standard equalization and CLAHE | Overview, controls explanation, Part 4, Q&A and conclusion |
| Note noise/artifacts | Notes on grain amplification, clipped extremes, color clipping, CLAHE limitations |
| All five questions | Five expanded answers under Laboratory Questions; `downloads/ANSWERS.md` |
| Conclusion | Dedicated conclusion section and written answers download |

The handout supplies no Python listing, numeric parameter defaults, experiment
photo, or measured results. These are chosen implementations, not quotations
from it. Clip limit 2.0, 8×8 grid and 2% stretch tails follow the earlier solution
in this conversation. The browser adds real color processing, upload controls,
CDF visualization, metrics and export tools to explore the specified procedures.

The reference image is the Moon sample selected in the earlier solution.
Precomputed reference results are labeled separately from live results. No
segmentation, detection, PCA, SURF, edge-detection experiment or other laboratory
activity is included.
