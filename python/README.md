# Laboratory 3 Python kit

Open a terminal in this extracted folder (where `histogram_lab.py` is located).

```powershell
python -m pip install -r requirements.txt
python histogram_lab.py
```

The Moon image is included, so the default program does not download anything.
Close the Matplotlib windows to finish the program. Outputs appear in `results/`.

```powershell
# Save images and histograms without opening windows:
python histogram_lab.py --save-only

# Process a color image's luminance channel:
python histogram_lab.py --image "C:\path\photo.jpg" --mode yuv --clip 2 --tiles 8 --percent 2

# Standard min–max stretching (no percentile clipping):
python histogram_lab.py --percent 0
```

The default stretch clips 2% in each tail and scales the central range linearly.
Histograms in YUV mode describe the working Y plane before RGB reconstruction.
OpenCV/browser decoder differences can affect uploaded JPEGs; compare decoded
pixels when checking numerical parity. Transparent images in the browser are
composited on white; OpenCV's default file reader discards alpha instead.

`prior_histogram_lab.py` preserves the earlier code from the conversation. It
uses a separate `results` folder, slightly different floating-point stretching,
and can download the sample if `moon.png` is missing. The newer script adds the
handout's Y-channel color option, CLI controls, measurements, and save-only mode.

If Python says it cannot open the file, check `Get-Location` and `Get-ChildItem`.
Change into this folder or pass the script's full path. A missing Python file
is different from a missing library.

See the website's `assets/NOTICE.md` for sample provenance. No Python code is
printed in the handout; these programs implement its requested procedures.
