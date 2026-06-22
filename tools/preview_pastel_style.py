#!/usr/bin/env python3
"""
元の実写画像を、構図・顔・ポーズを変えずにパステル画風へ変換するプレビュー。

使い方:
  python tools/preview_pastel_style.py
  python tools/preview_pastel_style.py path/to/photo.jpg
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_DIR = ROOT / "docs" / "reference"
OUTPUT_DIR = REFERENCE_DIR / "output"

PRESETS = {
    "exaggerated": {
        "sigma_s": 80,
        "sigma_r": 0.35,
        "colors": 14,
        "edge_strength": 0.55,
        "stroke_blend": 0.4,
        "brightness": 1.14,
        "saturation": 0.75,
        "shadow_lift": 0.15,
        "grain": 0.09,
    },
    "medium": {
        "sigma_s": 60,
        "sigma_r": 0.28,
        "colors": 20,
        "edge_strength": 0.38,
        "stroke_blend": 0.28,
        "brightness": 1.12,
        "saturation": 0.82,
        "shadow_lift": 0.12,
        "grain": 0.06,
    },
    "refined": {
        "sigma_s": 45,
        "sigma_r": 0.22,
        "colors": 28,
        "edge_strength": 0.22,
        "stroke_blend": 0.18,
        "brightness": 1.14,
        "saturation": 0.62,
        "shadow_lift": 0.22,
        "grain": 0.04,
    },
}


def find_input_image() -> Path:
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
        if not path.exists():
            raise FileNotFoundError(f"画像が見つかりません: {path}")
        return path

    candidates = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        candidates.extend(REFERENCE_DIR.glob(ext))

    candidates = [p for p in candidates if p.parent.name != "output"]
    if not candidates:
        raise FileNotFoundError(
            f"元画像を {REFERENCE_DIR} に置いてください（例: beach-original.jpg）"
        )
    return sorted(candidates)[0]


def quantize_colors(image: np.ndarray, k: int) -> np.ndarray:
    h, w = image.shape[:2]
    samples = image.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        samples, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    centers = np.uint8(centers)
    return centers[labels.flatten()].reshape(h, w, 3)


def add_paper_grain(image: np.ndarray, amount: float) -> np.ndarray:
    noise = np.random.default_rng(42).normal(0, 255 * amount, image.shape)
    blended = image.astype(np.float32) + noise
    return np.clip(blended, 0, 255).astype(np.uint8)


def soft_colored_edges(image: np.ndarray, strength: float) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (0, 0), 1.2)
    edges = cv2.Canny(gray, 60, 140)
    edges = cv2.GaussianBlur(edges, (3, 3), 0)
    edge_mask = (edges.astype(np.float32) / 255.0)[..., None]

    # 黒線ではなく、わずかに色を濃くする
    shaded = image.astype(np.float32) * (1.0 - edge_mask * strength * 0.35)
    tinted = shaded + edge_mask * np.array([18, 10, 28], dtype=np.float32)
    return np.clip(tinted, 0, 255).astype(np.uint8)


def stroke_texture(image: np.ndarray, blend: float) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(sobel_x, sobel_y)
    magnitude = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    magnitude = cv2.GaussianBlur(magnitude, (5, 5), 0)

    stroke = cv2.cvtColor(magnitude, cv2.COLOR_GRAY2BGR).astype(np.float32)
    base = image.astype(np.float32)
    merged = cv2.addWeighted(base, 1.0 - blend, stroke, blend, 0)
    return np.clip(merged, 0, 255).astype(np.uint8)


def adjust_tone(image: np.ndarray, brightness: float, saturation: float) -> np.ndarray:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] *= saturation
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * brightness, 0, 255)
    hsv = hsv.astype(np.uint8)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)


def lift_shadows(image: np.ndarray, amount: float) -> np.ndarray:
    """影を黒く潰さず、淡いパステル調の影にする。"""
    if amount <= 0:
        return image
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l = lab[:, :, 0].astype(np.float32) / 255.0
    # 暗いほど持ち上げる（ハイライトはほぼそのまま）
    lift = (1.0 - l) * amount
    l = np.clip(l + lift * (1.0 - l), 0, 1)
    lab[:, :, 0] = (l * 255).astype(np.uint8)
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def to_pastel(image: np.ndarray, preset: dict) -> np.ndarray:
    smooth = cv2.edgePreservingFilter(
        image, flags=2, sigma_s=preset["sigma_s"], sigma_r=preset["sigma_r"]
    )
    smooth = cv2.bilateralFilter(smooth, d=9, sigmaColor=75, sigmaSpace=75)
    painted = quantize_colors(smooth, preset["colors"])
    painted = soft_colored_edges(painted, preset["edge_strength"])
    painted = stroke_texture(painted, preset["stroke_blend"])
    painted = adjust_tone(painted, preset["brightness"], preset["saturation"])
    painted = lift_shadows(painted, preset.get("shadow_lift", 0))
    painted = add_paper_grain(painted, preset["grain"])
    return painted


def main() -> None:
    input_path = find_input_image()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    image = cv2.imread(str(input_path))
    if image is None:
        raise RuntimeError(f"画像を読み込めませんでした: {input_path}")

    stem = input_path.stem
    print(f"入力: {input_path}")
    print(f"出力: {OUTPUT_DIR}/")

    for name, preset in PRESETS.items():
        result = to_pastel(image, preset)
        out_path = OUTPUT_DIR / f"{stem}-{name}.jpg"
        cv2.imwrite(str(out_path), result, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        print(f"  ✓ {out_path.name}")

    print("\n構図・人物は元画像のまま、見た目だけパステル画風に変換しました。")


if __name__ == "__main__":
    main()
