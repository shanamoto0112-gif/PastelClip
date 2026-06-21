import { FFmpeg } from './vendor/ffmpeg/index.js';
import { fetchFile, toBlobURL } from './vendor/ffmpeg-util/index.js';

const FFMPEG_CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const TRANSITION_SEC = 0.5;
const MAX_DURATION_SEC = 60;
const MAX_FILE_SIZE_MB = 500;

const videoInput = document.getElementById('video-input');
const fileInfo = document.getElementById('file-info');
const introSlider = document.getElementById('intro-slider');
const outroSlider = document.getElementById('outro-slider');
const introValue = document.getElementById('intro-value');
const outroValue = document.getElementById('outro-value');
const applyBtn = document.getElementById('apply-btn');
const processingSection = document.getElementById('processing-section');
const processingStatus = document.getElementById('processing-status');
const processingHint = document.getElementById('processing-hint');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultSection = document.getElementById('result-section');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const errorMessage = document.getElementById('error-message');

let selectedFile = null;
let outputBlob = null;
let ffmpegInstance = null;

function hideError() {
  errorMessage.hidden = true;
  errorMessage.textContent = '';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function updateSliderLabels() {
  introValue.textContent = `${introSlider.value}秒`;
  outroValue.textContent = `${outroSlider.value}秒`;
}

function setProgress(percent, statusText) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  progressFill.style.width = `${clamped}%`;
  progressText.textContent = `${clamped}%`;
  progressBar.setAttribute('aria-valuenow', String(clamped));
  if (statusText) {
    processingStatus.textContent = statusText;
  }
}

function showFirstLoadHint() {
  processingHint.textContent =
    '初回だけ30秒〜1分ほどかかります。動画エンジンをダウンロードしています。そのままお待ちください。';
  processingHint.hidden = false;
}

function hideFirstLoadHint() {
  processingHint.hidden = true;
  processingHint.textContent = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('動画の読み込みに失敗しました。'));
    };
  });
}

function getInputExtension(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.mov')) return 'mov';
  return 'mp4';
}

function buildFilterComplex(introSec, outroSec, duration) {
  const midStart = introSec - TRANSITION_SEC;
  const midEnd = duration - outroSec;
  const outroStart = duration - outroSec - TRANSITION_SEC;
  const minDuration = introSec + outroSec + TRANSITION_SEC * 2;

  if (duration > MAX_DURATION_SEC) {
    throw new Error(`動画は${MAX_DURATION_SEC}秒以内にしてください。`);
  }
  if (duration < minDuration) {
    throw new Error(
      `動画が短すぎます（${formatDuration(duration)}）。冒頭・末尾の設定を短くするか、長い動画を選んでください。`
    );
  }

  return [
    '[0:v]split=3[vintro][voutro][vfxsrc]',
    '[vfxsrc]hue=s=0.6,eq=brightness=0.2:contrast=0.9:gamma=1.1[pastelv]',
    `[vintro]trim=0:${introSec},setpts=PTS-STARTPTS[v0]`,
    `[pastelv]trim=start=${midStart}:end=${midEnd},setpts=PTS-STARTPTS[v1]`,
    `[voutro]trim=start=${outroStart}:end=${duration},setpts=PTS-STARTPTS[v2]`,
    `[v0][v1]xfade=transition=fade:duration=${TRANSITION_SEC}:offset=${introSec - TRANSITION_SEC}[x01]`,
    `[x01][v2]xfade=transition=fade:duration=${TRANSITION_SEC}:offset=${duration - outroSec - TRANSITION_SEC}[out]`,
  ].join(';');
}

async function loadFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (progress >= 0 && progress <= 1) {
      setProgress(10 + progress * 85, 'エフェクトを適用中...');
    }
  });

  showFirstLoadHint();

  setProgress(2, 'FFmpeg を読み込み中...');

  try {
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    ]);

    setProgress(5, 'FFmpeg を初期化中...');

    await ffmpeg.load({ coreURL, wasmURL });
  } catch (err) {
    const detail = err?.message || String(err);
    throw new Error(
      `FFmpeg の読み込みに失敗しました。ネットワーク接続を確認して再試行してください。（${detail}）`
    );
  } finally {
    hideFirstLoadHint();
  }

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function processVideo(file, introSec, outroSec) {
  hideError();
  resultSection.hidden = true;
  processingSection.hidden = false;
  setProgress(0, '動画を解析中...');
  applyBtn.disabled = true;

  const ffmpegLogs = [];

  try {
    const duration = await getVideoDuration(file);
    const filterComplex = buildFilterComplex(introSec, outroSec, duration);

    const ffmpeg = await loadFFmpeg();
    ffmpeg.on('log', ({ message }) => ffmpegLogs.push(message));
    setProgress(8, '動画を読み込み中...');

    const ext = getInputExtension(file);
    const inputName = `input.${ext}`;
    const outputName = 'output.mp4';

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    setProgress(10, 'エフェクトを適用中...');

    const exitCode = await ffmpeg.exec([
      '-i', inputName,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    if (exitCode !== 0) {
      const lastLog = ffmpegLogs.filter((l) => /error|invalid|failed|aborted/i.test(l)).pop()
        || ffmpegLogs.slice(-3).join(' ');
      throw new Error(
        lastLog
          ? `動画の変換に失敗しました: ${lastLog}`
          : '動画の変換に失敗しました。別の動画でお試しください。'
      );
    }

    setProgress(98, '仕上げ中...');
    const data = await ffmpeg.readFile(outputName);
    outputBlob = new Blob([data.buffer], { type: 'video/mp4' });

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    setProgress(100, '完了！');
    processingSection.hidden = true;
    resultSection.hidden = false;
  } catch (err) {
    processingSection.hidden = true;
    hideFirstLoadHint();
    showError(err.message || '処理中にエラーが発生しました。');
    applyBtn.disabled = !selectedFile;
  }
}

videoInput.addEventListener('change', async (e) => {
  hideError();
  resultSection.hidden = true;
  processingSection.hidden = true;
  outputBlob = null;

  const file = e.target.files[0];
  if (!file) {
    selectedFile = null;
    fileInfo.hidden = true;
    applyBtn.disabled = true;
    return;
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    showError(`ファイルサイズは${MAX_FILE_SIZE_MB}MB以下にしてください。`);
    videoInput.value = '';
    selectedFile = null;
    applyBtn.disabled = true;
    return;
  }

  try {
    const duration = await getVideoDuration(file);
    if (duration > MAX_DURATION_SEC) {
      showError(`動画は${MAX_DURATION_SEC}秒以内にしてください（現在: ${formatDuration(duration)}）。`);
      videoInput.value = '';
      selectedFile = null;
      applyBtn.disabled = true;
      return;
    }

    selectedFile = file;
    fileInfo.textContent = `${file.name}（${formatFileSize(file.size)}・${formatDuration(duration)}）`;
    fileInfo.hidden = false;
    applyBtn.disabled = false;
  } catch (err) {
    showError(err.message);
    videoInput.value = '';
    selectedFile = null;
    applyBtn.disabled = true;
  }
});

introSlider.addEventListener('input', updateSliderLabels);
outroSlider.addEventListener('input', updateSliderLabels);

applyBtn.addEventListener('click', () => {
  if (!selectedFile) return;
  processVideo(
    selectedFile,
    Number(introSlider.value),
    Number(outroSlider.value)
  );
});

downloadBtn.addEventListener('click', () => {
  if (!outputBlob) return;
  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pastelclip_${Date.now()}.mp4`;
  a.click();
  URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', () => {
  selectedFile = null;
  outputBlob = null;
  videoInput.value = '';
  fileInfo.hidden = true;
  resultSection.hidden = true;
  processingSection.hidden = true;
  hideError();
  applyBtn.disabled = true;
  setProgress(0);
});

updateSliderLabels();
