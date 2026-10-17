/* Pure processing layer, shared by the Web Worker and the Node/OpenCV tests. */
(function (scope) {
  function validate(p) {
    if (!['gray', 'yuv'].includes(p.mode)) throw new Error('Choose grayscale or Y-channel color mode.');
    if (!Number.isFinite(p.clip) || p.clip < 0.5 || p.clip > 10) throw new Error('CLAHE clip limit must be between 0.5 and 10.');
    if (!Number.isInteger(p.tiles) || p.tiles < 2 || p.tiles > 16) throw new Error('Choose 2 to 16 tiles per axis.');
    if (!Number.isFinite(p.percent) || p.percent < 0 || p.percent > 10) throw new Error('Tail clipping must be between 0 and 10 percent.');
  }
  function histogram(plane) {
    const counts = new Uint32Array(256);
    for (const value of plane) counts[value]++;
    return counts;
  }
  function percentile(counts, count, percent) {
    // NumPy's default linear percentile interpolation, evaluated from a histogram.
    const rank = (count - 1) * percent / 100;
    const lower = Math.floor(rank), upper = Math.ceil(rank);
    let total = 0, a, b;
    for (let v = 0; v < 256; v++) {
      total += counts[v];
      if (a === undefined && total > lower) a = v;
      if (total > upper) { b = v; break; }
    }
    return a + (b - a) * (rank - lower);
  }
  function roundEven(value) {
    const floor = Math.floor(value), fraction = value - floor;
    return fraction === 0.5 ? floor + (floor % 2) : Math.round(value);
  }
  function stretch(plane, percent) {
    const counts = histogram(plane);
    const low = percentile(counts, plane.length, percent);
    const high = percentile(counts, plane.length, 100 - percent);
    const pixels = new Uint8Array(plane.length);
    if (high <= low) pixels.set(plane);
    else {
      for (let i = 0; i < plane.length; i++) {
        pixels[i] = roundEven(Math.max(0, Math.min(255, (plane[i] - low) * 255 / (high - low))));
      }
    }
    return { pixels, low, high, constant: high <= low };
  }
  function statistics(plane) {
    const counts = histogram(plane);
    let mean = 0, squared = 0, min = 255, max = 0, entropy = 0;
    for (let v = 0; v < 256; v++) {
      const n = counts[v];
      if (!n) continue;
      min = Math.min(min, v); max = Math.max(max, v);
      mean += v * n; squared += v * v * n;
      const p = n / plane.length; entropy -= p * Math.log2(p);
    }
    mean /= plane.length;
    return { histogram: counts, mean, std: Math.sqrt(Math.max(0, squared / plane.length - mean * mean)), min, max, entropy };
  }
  function processImage(cv, rgba, width, height, p, job = 'comparison') {
    validate(p);
    if (!['global', 'comparison'].includes(job)) throw new Error('Unknown experiment.');
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 4000000) throw new Error('Image must contain 1 to 4 million pixels.');
    if (rgba.length !== width * height * 4) throw new Error('Invalid image buffer.');
    const owned = [], own = object => { owned.push(object); return object; };
    const mat = () => own(new cv.Mat());
    const start = performance.now();
    try {
      const source = own(new cv.Mat(height, width, cv.CV_8UC4)); source.data.set(rgba);
      const plane = mat(); let yuv, channels;
      if (p.mode === 'gray') cv.cvtColor(source, plane, cv.COLOR_RGBA2GRAY);
      else {
        const rgb = mat(); yuv = mat(); channels = own(new cv.MatVector());
        cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB);
        cv.cvtColor(rgb, yuv, cv.COLOR_RGB2YUV);
        cv.split(yuv, channels);
        const y = own(channels.get(0)); y.copyTo(plane);
      }
      const equalized = mat(); cv.equalizeHist(plane, equalized);
      const planes = { input: plane, global: equalized };
      let bounds = null;
      if (job === 'comparison') {
        const stretched = mat(); plane.copyTo(stretched);
        const scaled = stretch(plane.data, p.percent); stretched.data.set(scaled.pixels);
        bounds = { low: scaled.low, high: scaled.high, constant: scaled.constant };
        const adaptive = mat();
        const clahe = own(new cv.CLAHE(p.clip, new cv.Size(p.tiles, p.tiles)));
        clahe.apply(plane, adaptive);
        planes.stretch = stretched; planes.clahe = adaptive;
      }
      const images = {};
      for (const [key, channel] of Object.entries(planes)) {
        const display = mat();
        if (p.mode === 'gray') cv.cvtColor(channel, display, cv.COLOR_GRAY2RGBA);
        else if (key === 'input') source.copyTo(display);
        else {
          channels.set(0, channel);
          const merged = mat(), rgb = mat(); cv.merge(channels, merged);
          cv.cvtColor(merged, rgb, cv.COLOR_YUV2RGB);
          cv.cvtColor(rgb, display, cv.COLOR_RGB2RGBA);
        }
        images[key] = { rgba: new Uint8ClampedArray(display.data), ...statistics(channel.data) };
      }
      return { width, height, job, parameters: { ...p }, images, bounds, processingMs: performance.now() - start };
    } finally {
      for (let i = owned.length - 1; i >= 0; i--) owned[i].delete();
    }
  }
  scope.HistogramLab = { validate, histogram, percentile, roundEven, stretch, statistics, processImage };
})(typeof self !== 'undefined' ? self : globalThis);
