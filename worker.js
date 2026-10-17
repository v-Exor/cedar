importScripts('./processing.js');
const ready = new Promise((resolve, reject) => {
  try {
    importScripts('./assets/vendor/opencv.js');
    const module = self.cv;
    if (module?.Mat) resolve({ cv: module });
    else if (typeof module?.then === 'function') module.then(cv => resolve({ cv }), reject);
    else if (module) module.onRuntimeInitialized = () => resolve({ cv: module });
    else reject(new Error('OpenCV did not initialize.'));
  } catch (error) { reject(error); }
});
ready.then(({ cv }) => self.postMessage({ type: 'ready', version: 'OpenCV 4.12.0 · WebAssembly' }))
  .catch(error => self.postMessage({ type: 'engine-error', message: String(error.message || error) }));
self.onmessage = async ({ data }) => {
  if (data.type !== 'process') return;
  try {
    const { cv } = await ready;
    const result = self.HistogramLab.processImage(cv, new Uint8ClampedArray(data.rgba), data.width, data.height, data.parameters, data.job);
    const transfers = Object.values(result.images).flatMap(image => [image.rgba.buffer, image.histogram.buffer]);
    self.postMessage({ type: 'result', id: data.id, result }, transfers);
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: typeof error === 'number' ? 'OpenCV could not process this input. Try a smaller image.' : String(error.message || error) });
  }
};
