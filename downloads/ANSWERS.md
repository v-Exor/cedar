# CSST106 Laboratory 3

Histogram Equalization and Contrast Adjustment in Computer Vision

## Part 1 Histogram equalization

Load an image in grayscale, or convert a color image to YUV and transform only
Y. Calculate its 256-bin histogram and apply histogram equalization. Compare
the original and equalized images and their histograms. The interactive website
and downloadable Python program implement both grayscale and YUV modes.

## Part 2 Contrast adjustment

Apply linear contrast stretching and CLAHE to the same input. The default
stretch maps the 2nd and 98th percentiles to 0 and 255 and clips the tails.
Choose 0% clipping for ordinary min–max scaling. Default CLAHE settings are a
clip limit of 2.0 and an 8×8 tile grid. Compare all versions and histograms.

## Part 3 Python code

The complete implementation is in `python/histogram_lab.py` and the downloadable
Python kit. The earlier conversation program is preserved as
`python/prior_histogram_lab.py`. The Word handout does not supply a code listing.

## Part 4 Observations

For the included Moon sample and default grayscale settings:

1. The original image has weak contrast and subtle surface differences. Linear
   stretching and global equalization make crater boundaries and texture more
   visible. CLAHE gives a more moderate enhancement of local detail.
2. Global equalization uses one mapping for the whole image and creates a
   stronger overall change. CLAHE adapts enhancement locally and limits the
   amplification of histogram peaks.
3. Global equalization makes grain-like texture more prominent, which can
   include noise. CLAHE limits amplification but is not a denoising method.
   Percentile stretching clips some shadow and highlight detail.
4. Standard deviation is 13.33 for the original, 74.01 after global equalization,
   and 18.53 after CLAHE. These values describe spread, not image quality.
5. The sample already contains a few 0 and 255 pixels, so min–max stretching
   leaves it unchanged. Its 2nd/98th percentile values are 78 and 129.

Observations will differ for other images or parameters. Inspect actual results
before writing your own observations.

## Questions to answer

### 1. What is histogram equalization?

It is a contrast enhancement technique that remaps pixel intensities using their
cumulative distribution to spread frequently occurring tones over a wider range.

### 2. Why do we need histogram equalization?

It can reveal weak tonal differences in low-contrast images, making details
easier to inspect or use in further computer vision processing. It does not
recover missing information or improve every image.

### 3. How does histogram equalization work?

Count pixels at each intensity, calculate a cumulative histogram, and use a
normalized cumulative mapping to assign output intensities. For 8-bit images,
OpenCV subtracts the first nonzero cumulative value and maps to 0–255. Constant
images remain unchanged. The resulting discrete histogram need not be flat.

### 4. How does CLAHE work?

Contrast Limited Adaptive Histogram Equalization partitions the image into
tiles, clips large histogram bins, redistributes the excess counts, and equalizes
locally. Interpolation blends neighboring mappings and reduces tile boundaries.
Clipping limits contrast amplification but does not remove noise.

### 5. What is the possible real-world application for histogram equalization?

Enhancing low-contrast surveillance footage to make objects and scene details
easier to distinguish. Other applications include scanned documents and satellite
imagery before inspection or further processing.

## Conclusion

Histogram equalization, linear stretching, and CLAHE change how existing
intensities are displayed. Global equalization offers strong overall contrast,
stretching rescales a chosen range, and CLAHE adapts enhancement locally. The
Moon example shows that using the full 0–255 range does not guarantee strong
contrast. Choose a method by comparing visible detail, noise, clipping, and color
appearance alongside histograms and statistics.
