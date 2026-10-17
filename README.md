# VisionLab — CSST106 Laboratory 3

A complete, independent GitHub Pages website for **Histogram Equalization and
Contrast Adjustment in Computer Vision**. It follows the supplied Lab 3 Word
handout and the white/orange VisionLab style used by Lab 1 and Lab 2 in this
workspace. No other laboratory is included.

## What works

- Part 1: original/global equalization comparison, actual histograms and CDFs.
- Part 2: original/stretch/global/CLAHE comparison with adjustable clip limit,
  tile grid and percentile tails. A 0% setting gives ordinary min–max stretching.
- Grayscale or color processing: YUV mode transforms only Y before RGB recovery.
- JPEG, PNG and WebP uploads, drag/drop, the included Moon sample, input validation,
  worker loading/error states, engine retry and protection against stale results.
- Individual full-processing-resolution PNGs, a comparison sheet with histograms,
  JSON measurements including histogram counts, and downloadable observation notes.
- Part 3: downloadable/copyable Python source, sample image, requirements and guide.
- Part 4: measured observations, note-taking with optional browser-local storage.
- All five questions, written answers, genuine precomputed references and conclusion.
- Configurable compilation/repository links, mobile navigation, reduced motion and
  accessible labels, status updates, keyboard focus and responsive layouts.

Everything needed by visitors is bundled. There are no CDN calls, accounts, API
keys, upload services or paid servers. Images are processed on the visitor's
device. The site makes only same-origin requests for its static files.

## Local preview

Requires Node.js 18+ for the local server (Node 22 is used by the deploy workflow).
From this `lab-03` directory:

```powershell
node scripts/serve.mjs
```

Open http://127.0.0.1:4175/ or http://127.0.0.1:4175/lab-03/.
The second mount tests a repository subpath, as used by GitHub Pages.
Stop the server with Ctrl+C. No `npm install` or build is needed to view the site.
Do not double-click `index.html`: modules, fetch and workers need HTTP(S).

## Configure the compilation and repository links

Edit `site-config.js`, using your actual addresses:

```javascript
window.LAB_CONFIG = {
  compilationUrl: "", // Your full Laboratory Compilation URL
  repositoryUrl: "",  // Your full GitHub repository URL
};
```

Empty links open a working configuration dialog instead of navigating to a fake
address. "Save links" only affects that browser. "Download config" generates a
replacement `site-config.js` to commit for all visitors. Browser-saved overrides
take priority; use the dialog to update them after changing the file.

No username, repository or compilation address has been invented. The site is
fully navigable without setting external links.

## Deploy to your own GitHub Pages repository

1. Create a new **public** GitHub repository for Lab 3 (for example a repository
   name of your own choosing). Do not upload the other lab folders.
2. Upload or commit **the contents of this directory** to the repository root.
   `index.html` must be at the root, not inside an extra `lab-03` folder. Include
   `assets/`, `downloads/`, `python/`, `.github/`, `.nojekyll` and the other source
   files. Exclude `node_modules`, test artifacts and generated Python results.
   The delivered ZIP already excludes these. Extract it before uploading.
3. Edit `site-config.js` with the actual compilation and repository addresses.
4. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
5. In **Actions**, run **Deploy Lab 3 to GitHub Pages** (or push a commit to `main`).
   If the first push ran before Pages was enabled, rerun its failed workflow.
6. Wait for the successful deployment. Use the URL shown by GitHub Pages:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

7. Paste that exact URL into the Lab 3 button on your separate compilation site.

Deployment follows GitHub's official guidance for
[custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The included workflow runs syntax/path checks and Node/OpenCV numerical tests,
then publishes only the static website files. It does not need an npm install
or a framework build. If your default branch differs from `main`, edit the
workflow's branch filter.

Alternative: deploy from a branch using `main / (root)`. Remove/disable the
included custom deployment workflow before choosing this alternative, so there
is one publishing mechanism. All URLs are relative and work with either method.

The project repository is [v-Exor/cedar](https://github.com/v-Exor/cedar).
GitHub Pages is configured to publish through the included Actions workflow.
See `DEPLOYMENT.md` for the website address and compilation integration.

## Tests and development

```powershell
# No dependencies required for structural and numerical validation:
npm run check
npm test

# Optional browser test tooling:
npm ci
npm run test:e2e
```

Browser tests use installed Google Chrome (`channel: 'chrome'`). If Chrome is
unavailable, install Playwright Chromium with `npx playwright install chromium`
and remove `channel: 'chrome'` from `playwright.config.js`. Browser tests cover
default outputs, color upload, independent module execution, stale state,
failed input/recovery, downloads, configuration, notes, responsive widths and
automated accessibility checks. Automated checks do not replace all human
assistive-technology testing.

The Node tests compare every output pixel and histogram with independent
Python/OpenCV fixtures for ten cases, including constant, low-range, gradient,
tiny, grayscale and color images. Fixtures are checked in, so CI does not need
Python or internet downloads to run them.

```powershell
# Regenerate reference results/fixtures, if algorithms or defaults change:
python -m pip install -r python/requirements.txt
python scripts/generate-reference.py

# Verify the Python implementation without opening plot windows:
python python/histogram_lab.py --save-only

# Rebuild the Python kit and website ZIP after changes:
python scripts/package-delivery.py
```

## Project layout

```text
index.html                 All handout sections and accessible interface
styles.css                 Shared VisionLab style, responsive/reduced-motion rules
app.js                     Input, charts, interface state, downloads and configuration
processing.js              OpenCV pipeline, percentile scaling, histograms and statistics
worker.js                  Bundled OpenCV loading and off-main-thread execution
site-config.js             Compilation and GitHub URL configuration
assets/moon.png            Lossless sample used by live experiments
assets/vendor/             Pinned self-contained OpenCV runtime and license
assets/results/            Genuine reference images, chart and measurements
assets/NOTICE.md           Image and runtime provenance
python/                    Runnable Python source and sample
downloads/                 Python kit and written answers
tests/                     Numerical fixtures and browser tests
scripts/                   Preview, checks, reference generation and packaging
.github/workflows/pages.yml  GitHub Pages deployment
SOURCE_MAP.md              Each handout requirement mapped to the site
VALIDATION.md              Checks performed and practical limits
```

## Technical details and limitations

- GitHub Pages serves static files and does not execute Python. The browser runs
  actual OpenCV 4.12.0 WebAssembly, not decorative simulations. The runtime's
  roughly 10.9 MB JavaScript bundle contains its WASM and is loaded once by the
  worker. It may take longer on slower connections.
- OpenCV performs grayscale conversion, global equalization and CLAHE. Linear
  stretching uses JavaScript float64 arithmetic, NumPy-style interpolated
  percentiles and rounding to even. Constant percentile ranges preserve the input.
- YUV processing keeps U and V before reconstruction; RGB gamut clipping can
  change color appearance. Color histograms and statistics describe the working Y
  channel, not a remeasurement of the reconstructed RGB image.
- Inputs are limited to 15 MiB. Images above 4 million pixels are resized and
  labeled; images above 50 million decoded pixels are rejected. Browser decoding
  still uses memory before dimensions can be checked. Large images can be demanding
  on phones. Transparent pixels are composited on white.
- Decoding of JPEGs, embedded color profiles and orientation can differ from
  desktop OpenCV. Exact algorithm tests use identical decoded pixel buffers.
- Histogram equalization does not guarantee a flat histogram or better quality.
  CLAHE can change a constant region's brightness and can amplify noise. Contrast
  and entropy metrics are descriptive; they are not quality rankings.
- Notes and optional link overrides use local storage only. Nothing is stored in
  GitHub or synchronized across devices. Exports save files through the browser.
- Precomputed WebP presentation copies are labeled. The live processor uses the
  original PNG; the reference measurements use the original PNG as well.

## Troubleshooting

- Blank experiments: serve over HTTP(S), enable JavaScript/WebAssembly, and check
  that `worker.js`, `processing.js`, and `assets/vendor/opencv.js` are present.
- Engine unavailable: use the Retry engine button or refresh; check the Network
  panel for missing files. No CDN permission or backend URL is required.
- GitHub 404: confirm Pages is enabled and `index.html` is at the published root.
  Use the exact repository spelling and trailing slash in the URL.
- Wrong links: edit `site-config.js` and update/clear browser overrides in the dialog.
- A file changed but results did not: hard refresh after deployment; this project
  intentionally does not install a service worker that could retain stale assets.
- Python cannot find its script: extract the Python kit and run from its folder,
  or provide the full path. See `python/README.md`.
