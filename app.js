const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const labels = { input: 'Original', global: 'Global equalization', stretch: 'Contrast stretching', clahe: 'CLAHE' };
const state = { source: null, ready: false, busy: false, id: 0, loading: 0, global: null, comparison: null, worker: null, timer: null };
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000); }
function showError(id, message = '') { const el = $(`#${id}`); el.hidden = !message; el.textContent = message; }
function parameters() { return { mode: $('#color-mode').value, clip: Number($('#clip-limit').value), tiles: Number($('#tile-size').value), percent: Number($('#tail-percent').value) }; }
function syncControls() {
  for (const el of $$('.run-button')) el.disabled = !state.source || !state.ready || state.busy;
  for (const el of $$('#color-mode, #clip-limit, #tile-size, #tail-percent, #choose-image, #use-sample, #image-upload, [data-preset]')) el.disabled = state.busy;
  for (const el of $$('#part1-panels [data-download]')) el.disabled = !state.global || state.busy;
  for (const el of $$('#part2-panels [data-download], .result-action')) el.disabled = !state.comparison || state.busy;
}
function panel(group, key) {
  const figure = document.createElement('figure'); figure.className = 'canvas-panel';
  figure.innerHTML = `<figcaption><span>${labels[key].toUpperCase()}</span><code>8-bit</code></figcaption><div class="canvas-stage"><canvas id="${group}-${key}" width="1" height="1" aria-label="${labels[key]} image for ${group === 'p1' ? 'Part 1' : 'Part 2'}" hidden></canvas><div class="canvas-empty">Your result appears here.</div></div><div class="canvas-bottom"><span class="channel-label">Grayscale intensity</span><button data-download="${group}-${key}" class="download-output" disabled aria-label="Download ${labels[key]} PNG for ${group === 'p1' ? 'Part 1' : 'Part 2'}"><svg class="icon"><use href="#download"/></svg> PNG</button></div><canvas id="hist-${group}-${key}" class="histogram-canvas" width="640" height="235" role="img" aria-label="${labels[key]} intensity histogram for ${group === 'p1' ? 'Part 1' : 'Part 2'}"></canvas><p class="hist-caption">Histogram appears after processing.</p>`;
  return figure;
}
for (const key of ['input', 'global']) $('#part1-panels').append(panel('p1', key));
for (const key of ['input', 'stretch', 'global', 'clahe']) $('#part2-panels').append(panel('p2', key));
function invalidate(group = 'all') {
  if (group === 'all') { state.global = null; clearGroup('p1', 'Input changed. Run equalization.'); $('#status-global').textContent = 'Input changed · run equalization.'; $('#cdf-chart').getContext('2d').clearRect(0, 0, 720, 220); }
  state.comparison = null; clearGroup('p2', 'Input or settings changed. Run comparison.');
  $('#status-comparison').textContent = 'Input or settings changed · run comparison.';
  $('#output-settings').textContent = 'Waiting for an updated comparison';
  for (const id of ['original', 'global', 'clahe', 'time']) $(`#metric-${id}`).textContent = '—';
  $('#metrics-caption').textContent = 'Run Part 2 to calculate statistics for the current input and settings.';
  $('#metrics-body').innerHTML = '<tr><td colspan="5">Results need to be updated.</td></tr>';
  $('#live-observation').textContent = 'Run Part 2 to compare this input with the current settings.';
  syncControls();
}
function clearGroup(group, message) {
  const container = group === 'p1' ? $('#part1-panels') : $('#part2-panels');
  for (const el of container.querySelectorAll('.canvas-stage canvas')) el.hidden = true;
  for (const el of container.querySelectorAll('.canvas-empty')) { el.hidden = false; el.textContent = message; }
  for (const el of container.querySelectorAll('.histogram-canvas')) el.getContext('2d').clearRect(0, 0, el.width, el.height);
  for (const el of container.querySelectorAll('.hist-caption')) el.textContent = 'Histogram needs an updated run.';
}
function drawImage(canvas, rgba, width, height) { canvas.width = width; canvas.height = height; canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0); }
function histogram(canvas, counts, max, color = '#c15b15') {
  const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  const x = 65, y = 25, plotW = w - 85, plotH = h - 82;
  ctx.strokeStyle = '#e6e7de'; ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) { const yy = y + plotH * i / 2; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + plotW, yy); ctx.stroke(); }
  ctx.fillStyle = color;
  for (let i = 0; i < 256; i++) { const height = counts[i] / (max || 1) * plotH; ctx.fillRect(x + i * plotW / 256, y + plotH - height, Math.max(1, plotW / 256), height); }
  ctx.strokeStyle = '#a4ad98'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + plotH); ctx.lineTo(x + plotW, y + plotH); ctx.stroke();
  ctx.font = '18px Segoe UI, sans-serif'; ctx.fillStyle = '#5e6754';
  ctx.textAlign = 'right'; ctx.fillText(max >= 1000 ? `${(max / 1000).toFixed(1)}k` : String(max), x - 9, y + 6); ctx.fillText('0', x - 9, y + plotH + 6);
  ctx.textAlign = 'center'; for (const value of [0, 128, 255]) ctx.fillText(String(value), x + value / 255 * plotW, y + plotH + 26);
  ctx.fillText('Pixel intensity', x + plotW / 2, h - 7);
  ctx.save(); ctx.translate(18, y + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Pixels', 0, 0); ctx.restore();
}
function cdf(result) {
  const canvas = $('#cdf-chart'), ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#dfe3d5'; ctx.strokeRect(50, 20, 635, 155);
  for (const [key, color] of [['input', '#737e69'], ['global', '#b9500c']]) {
    let total = 0; ctx.beginPath(); ctx.moveTo(50, 175);
    result.images[key].histogram.forEach((n, i) => { total += n; ctx.lineTo(50 + i * 635 / 255, 175 - total / (result.width * result.height) * 155); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = '#5b654e'; ctx.font = '16px Segoe UI'; ctx.fillText('1.0', 15, 27); ctx.fillText('0', 29, 178); ctx.fillText('0', 46, 202); ctx.fillText('255', 670, 202); ctx.fillText('Pixel intensity', 320, 207);
}
function renderGroup(result, group) {
  const keys = group === 'p1' ? ['input', 'global'] : ['input', 'stretch', 'global', 'clahe'];
  let max = 1; for (const key of keys) for (const n of result.images[key].histogram) max = Math.max(max, n);
  for (const key of keys) {
    const image = result.images[key], canvas = $(`#${group}-${key}`), figure = canvas.closest('figure');
    drawImage(canvas, image.rgba, result.width, result.height); canvas.hidden = false; figure.querySelector('.canvas-empty').hidden = true;
    const channel = result.parameters.mode === 'gray' ? 'Grayscale intensity' : 'Y working channel';
    figure.querySelector('.channel-label').textContent = channel;
    histogram($(`#hist-${group}-${key}`), image.histogram, max, key === 'input' ? '#7b856f' : '#c15b15');
    figure.querySelector('.hist-caption').textContent = `${channel} · mean ${image.mean.toFixed(2)} · σ ${image.std.toFixed(2)}`;
  }
}
function render(result) {
  state.global = result; renderGroup(result, 'p1'); cdf(result);
  $('#status-global').textContent = 'Complete · original and equalized images are ready.';
  showError('error-global');
  if (result.job === 'comparison') {
    state.comparison = result; renderGroup(result, 'p2');
    const { clip, tiles, percent, mode } = result.parameters;
    $('#output-settings').textContent = `${mode === 'gray' ? 'Grayscale' : 'Y color'} · CLAHE ${clip} / ${tiles} × ${tiles} · stretch ${percent}–${100 - percent}%`;
    $('#status-comparison').textContent = 'Complete · all four versions are ready.';
    const { input, global, clahe } = result.images;
    $('#metric-original').textContent = input.std.toFixed(2); $('#metric-global').textContent = global.std.toFixed(2); $('#metric-clahe').textContent = clahe.std.toFixed(2); $('#metric-time').textContent = `${result.processingMs.toFixed(0)} ms`;
    $('#metrics-caption').textContent = `${state.source.name} · ${result.width} × ${result.height} · ${mode === 'gray' ? 'grayscale' : 'Y working-channel'} measurements · latest completed Part 2 run`;
    const body = $('#metrics-body'); body.replaceChildren();
    for (const key of ['input', 'stretch', 'global', 'clahe']) { const m = result.images[key], row = body.insertRow(); for (const value of [labels[key], m.mean.toFixed(2), m.std.toFixed(2), `${m.min} / ${m.max}`, m.entropy.toFixed(3)]) row.insertCell().textContent = value; }
    const b = result.bounds;
    $('#comparison-note').textContent = b.constant ? 'The selected stretch bounds coincide, so stretching preserves this input. CLAHE can change a constant image’s brightness; that does not reveal new detail.' : `Stretch bounds: ${b.low.toFixed(2)} → 0 and ${b.high.toFixed(2)} → 255. Values outside these bounds are clipped. Each histogram uses the same vertical scale.`;
    $('#live-observation').textContent = `For ${state.source.name}, intensity standard deviation is ${input.std.toFixed(2)} originally, ${result.images.stretch.std.toFixed(2)} after stretching, ${global.std.toFixed(2)} after global equalization, and ${clahe.std.toFixed(2)} after CLAHE. Compare the images to decide whether the increased spread improves useful detail or exaggerates noise.`;
    showError('error-comparison');
  }
  syncControls();
}
function initializeWorker() {
  if (state.worker) state.worker.terminate(); clearTimeout(state.timer);
  state.ready = false; state.busy = false; syncControls(); $('#retry-engine').hidden = true;
  $('#engine-status').innerHTML = '<i></i> Loading vision engine…';
  try {
    state.worker = new Worker(new URL('./worker.js', import.meta.url));
    state.timer = setTimeout(() => engineError('The vision engine took too long to load. Retry or refresh the page.'), 45000);
    state.worker.onmessage = ({ data }) => {
      if (data.type === 'ready') { clearTimeout(state.timer); state.ready = true; $('#engine-status').innerHTML = '<i></i> OpenCV ready · local processing'; $('#engine-status').title = data.version; syncControls(); if (state.source) run('comparison'); }
      else if (data.type === 'engine-error') engineError(data.message);
      else if (data.id === state.id && ['result', 'error'].includes(data.type)) {
        clearTimeout(state.timer); state.busy = false;
        if (data.type === 'result') render(data.result);
        else { showError(`error-${state.job}`, data.message); $(`#status-${state.job}`).textContent = 'Processing failed. Adjust the input and try again.'; }
        syncControls();
      }
    };
    state.worker.onerror = event => { event.preventDefault(); engineError('The worker could not load. Serve the project over HTTP and check that all assets were uploaded.'); };
  } catch { engineError('This browser could not start the processing worker. Use an up-to-date browser over HTTP or HTTPS.'); }
}
function engineError(message) {
  clearTimeout(state.timer); state.worker?.terminate(); state.ready = false; state.busy = false;
  $('#engine-status').textContent = 'Vision engine unavailable'; $('#retry-engine').hidden = false;
  showError('error-comparison', message); $('#status-comparison').textContent = 'Retry the engine to process images.'; $('#status-global').textContent = 'Vision engine unavailable.'; syncControls();
}
function run(job) {
  if (!state.ready || !state.source || state.busy) return;
  showError(`error-${job}`); state.job = job; state.busy = true; state.id++;
  if (job === 'comparison') invalidate('comparison');
  else { state.global = null; clearGroup('p1', 'Processing…'); }
  $(`#status-${job}`).textContent = 'Processing actual image pixels…'; syncControls();
  const rgba = state.source.rgba.slice();
  state.timer = setTimeout(() => engineError('Processing timed out. Retry the engine and choose a smaller image.'), 45000);
  state.worker.postMessage({ type: 'process', id: state.id, job, rgba: rgba.buffer, width: state.source.width, height: state.source.height, parameters: parameters() }, [rgba.buffer]);
}
$('#run-global').addEventListener('click', () => run('global'));
$('#comparison-form').addEventListener('submit', event => { event.preventDefault(); run('comparison'); });
$('#retry-engine').addEventListener('click', initializeWorker);
async function loadImage(blob, name) {
  if (state.busy) return;
  const token = ++state.loading; state.source = null; invalidate(); showError('source-error');
  $('#source-name').textContent = `Loading ${name}…`; $('#source-info').textContent = 'Decoding image…';
  try {
    if (blob.size > 15 * 1024 * 1024) throw new Error('Choose an image no larger than 15 MiB.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    if (token !== state.loading) { bitmap.close(); return; }
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 50000000) { bitmap.close(); throw new Error('Choose an image below 50 million source pixels.'); }
    const scale = Math.min(1, Math.sqrt(4000000 / (bitmap.width * bitmap.height)));
    const width = Math.max(1, Math.floor(bitmap.width * scale)), height = Math.max(1, Math.floor(bitmap.height * scale));
    const originalSize = `${bitmap.width} × ${bitmap.height}`;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    state.source = { name, width, height, rgba: ctx.getImageData(0, 0, width, height).data };
    $('#source-name').textContent = name; $('#source-info').textContent = `${width} × ${height} pixels${scale < 1 ? ` · resized from ${originalSize}` : ''} · processed locally`;
    $('#status-global').textContent = 'Ready · run equalization.'; $('#status-comparison').textContent = 'Ready · run comparison.'; syncControls();
    if (state.ready) run('comparison');
  } catch (error) {
    if (token !== state.loading) return;
    state.source = null; $('#source-name').textContent = 'No valid image loaded'; $('#source-info').textContent = 'Choose another image or use the Moon sample.';
    showError('source-error', error.message || 'This image could not be decoded.'); syncControls();
  }
}
async function sample() {
  try { const response = await fetch(new URL('./assets/moon.png', import.meta.url)); if (!response.ok) throw new Error('The included sample could not be loaded. Choose an image instead.'); await loadImage(await response.blob(), 'moon.png'); }
  catch (error) { showError('source-error', error.message); }
}
$('#choose-image').addEventListener('click', () => $('#image-upload').click());
$('#image-upload').addEventListener('change', event => { const file = event.target.files[0]; if (file) loadImage(file, file.name); event.target.value = ''; });
$('#use-sample').addEventListener('click', sample);
for (const name of ['dragenter', 'dragover']) $('#drop-zone').addEventListener(name, event => { event.preventDefault(); if (!state.busy) $('#drop-zone').classList.add('dragging'); });
$('#drop-zone').addEventListener('dragleave', () => $('#drop-zone').classList.remove('dragging'));
$('#drop-zone').addEventListener('drop', event => { event.preventDefault(); $('#drop-zone').classList.remove('dragging'); if (!state.busy && event.dataTransfer.files[0]) loadImage(event.dataTransfer.files[0], event.dataTransfer.files[0].name); });
function updateParameters() {
  $('#clip-value').textContent = Number($('#clip-limit').value).toFixed(1); $('#tail-value').textContent = `${$('#tail-percent').value}%`;
  const p = parameters(); for (const button of $$('[data-preset]')) button.setAttribute('aria-pressed', String(button.dataset.preset === `${p.clip},${p.tiles},${p.percent}`));
  invalidate('comparison');
}
for (const id of ['clip-limit', 'tail-percent', 'tile-size']) $(`#${id}`).addEventListener('input', updateParameters);
$('#color-mode').addEventListener('change', () => invalidate());
for (const button of $$('[data-preset]')) button.addEventListener('click', () => {
  const [clip, tiles, percent] = button.dataset.preset.split(','); $('#clip-limit').value = clip; $('#tile-size').value = tiles; $('#tail-percent').value = percent; updateParameters();
});
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
function downloadCanvas(canvas, name) { canvas.toBlob(blob => { if (blob) downloadBlob(blob, name); else toast('PNG encoding failed. Try a smaller input.'); }, 'image/png'); }
const safeName = () => (state.source?.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '_').slice(0, 60) || 'image';
for (const button of $$('[data-download]')) button.addEventListener('click', () => downloadCanvas($(`#${button.dataset.download}`), `${safeName()}-${button.dataset.download}.png`));
$('#download-comparison').addEventListener('click', () => {
  if (!state.comparison) return;
  const result = state.comparison, canvas = document.createElement('canvas'); canvas.width = 2240; canvas.height = 990;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#283024'; ctx.font = '600 28px Segoe UI'; ctx.fillText('CSST106 · Laboratory 3 · Histogram Equalization and Contrast Adjustment', 30, 45);
  ctx.font = '19px Segoe UI'; ctx.fillText(`${state.source.name.slice(0, 70)} · ${$('#output-settings').textContent}`, 30, 82);
  for (const [i, key] of ['input', 'stretch', 'global', 'clahe'].entries()) {
    const x = 30 + i * 555, image = $(`#p2-${key}`), ratio = Math.min(520 / image.width, 520 / image.height);
    ctx.font = '600 22px Segoe UI'; ctx.fillStyle = '#283024'; ctx.fillText(labels[key], x, 125); ctx.fillStyle = '#f5f4ee'; ctx.fillRect(x, 145, 520, 520);
    ctx.drawImage(image, x + (520 - image.width * ratio) / 2, 145 + (520 - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
    ctx.drawImage($(`#hist-p2-${key}`), x, 685, 520, 192);
    ctx.font = '17px Segoe UI'; ctx.fillStyle = '#59634d'; ctx.fillText(`Mean ${result.images[key].mean.toFixed(2)} · σ ${result.images[key].std.toFixed(2)}`, x + 12, 915);
  }
  ctx.font = '17px Segoe UI'; ctx.fillStyle = '#59634d'; ctx.fillText('Actual OpenCV.js outputs · Color-mode histograms describe the working Y channel · Individual PNGs preserve processing dimensions.', 30, 965);
  downloadCanvas(canvas, `${safeName()}-lab3-comparison.png`);
});
function record() {
  const r = state.comparison;
  return r ? { source: state.source.name, width: r.width, height: r.height, parameters: r.parameters, stretchBounds: r.bounds, processingMs: r.processingMs, measurements: Object.fromEntries(Object.entries(r.images).map(([key, { rgba, histogram, ...metrics }]) => [key, { ...metrics, histogram: Array.from(histogram) }])) } : null;
}
$('#export-results').addEventListener('click', () => downloadBlob(new Blob([JSON.stringify({ laboratory: 'CSST106 Lab 3', engine: 'OpenCV.js 4.12.0', result: record(), notes: 'Color measurements are working Y values before RGB reconstruction. Contrast spread is not a quality score.' }, null, 2)], { type: 'application/json' }), `${safeName()}-measurements.json`));
try { $('#observation-notes').value = localStorage.getItem('csst106-lab03-notes') || ''; } catch { /* Optional browser persistence. */ }
$('#observation-notes').addEventListener('input', () => {
  try { localStorage.setItem('csst106-lab03-notes', $('#observation-notes').value); $('#notes-status').textContent = 'Saved in this browser.'; }
  catch { $('#notes-status').textContent = 'Storage unavailable. Download your notes to keep them.'; }
});
$('#download-notes').addEventListener('click', () => {
  const content = `# CSST106 Laboratory 3 — Observations\n\n${$('#observation-notes').value || 'No personal observations entered.'}\n\n## Latest completed Part 2 run\n\n${state.comparison ? $('#live-observation').textContent : 'No current completed comparison.'}\n\n${state.comparison ? '```json\n' + JSON.stringify(record(), null, 2) + '\n```' : ''}\n`;
  downloadBlob(new Blob([content], { type: 'text/markdown' }), 'lab-03-observations.md');
});
// Public navigation exposes the compilation destination only.
document.querySelectorAll('[data-destination="compilation"]').forEach(button => button.addEventListener('click', () => {
  try {
    const url = new URL(window.LAB_CONFIG?.compilationUrl || '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid compilation address.');
    window.location.assign(url.href);
  } catch { toast('The compilation link is not configured.'); }
}));

$('#menu-toggle').addEventListener('click', () => { const open = $('#menu-toggle').getAttribute('aria-expanded') !== 'true'; $('#menu-toggle').setAttribute('aria-expanded', String(open)); $('#menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); $('#main-nav').classList.toggle('open', open); });
function closeMenu() { $('#main-nav').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); $('#menu-toggle').setAttribute('aria-label', 'Open navigation'); }
for (const link of $$('#main-nav a')) link.addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
if ('IntersectionObserver' in window) {
  const reveals = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); reveals.unobserve(entry.target); } }, { threshold: .08 });
  for (const el of $$('.reveal')) { el.classList.add('will-reveal'); reveals.observe(el); }
  const navigation = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) for (const link of $$('#main-nav a')) { const active = link.hash === `#${entry.target.id}`; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); } }, { rootMargin: '-15% 0px -65% 0px' });
  for (const id of ['home', 'overview', 'objectives', 'experiments', 'results', 'conclusion']) navigation.observe($(`#${id}`));
}
initializeWorker(); sample();
