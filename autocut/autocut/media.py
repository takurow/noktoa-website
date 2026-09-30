"""ffmpeg / ffprobe ラッパー。"""
import json
import re
import subprocess
from dataclasses import dataclass
from fractions import Fraction


@dataclass
class Info:
    duration: float
    width: int
    height: int
    fps: float


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    return Info(
        duration=float(d["format"]["duration"]),
        width=int(v["width"]),
        height=int(v["height"]),
        fps=float(Fraction(v["r_frame_rate"])),
    )


_START = re.compile(r"silence_start: (-?[\d.]+)")
_END = re.compile(r"silence_end: (-?[\d.]+)")


def parse_silences(stderr, total):
    """ffmpeg silencedetect の出力から [(start, end)] を作る。末尾が無音のまま終わる場合は total で閉じる。"""
    silences, start = [], None
    for line in stderr.splitlines():
        m = _START.search(line)
        if m:
            start = max(0.0, float(m.group(1)))
            continue
        m = _END.search(line)
        if m and start is not None:
            silences.append((start, float(m.group(1))))
            start = None
    if start is not None:
        silences.append((start, total))
    return silences


def detect_silence(path, total, noise_db=-35, min_silence=0.5):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn",
         "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    return parse_silences(r.stderr, total)


def extract_audio(path, wav):
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-vn", "-ac", "1", "-ar", "16000", str(wav)],
        check=True,
    )
