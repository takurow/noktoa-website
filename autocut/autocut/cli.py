import argparse
import tempfile
from pathlib import Path

from . import captions, media, segments, srt, xmeml


def main(argv=None):
    ap = argparse.ArgumentParser(description="無音カット + テロップ付きの Premiere / DaVinci 用タイムラインを作る")
    ap.add_argument("video", type=Path)
    ap.add_argument("-o", "--out", type=Path, default=Path("out"))
    ap.add_argument("--noise-db", type=float, default=-35, help="無音とみなす音量(dB)")
    ap.add_argument("--min-silence", type=float, default=0.5, help="無音とみなす最短秒数")
    ap.add_argument("--pad", type=float, default=0.12, help="カット前後に残す余白(秒)")
    ap.add_argument("--whisper-model", default="small")
    ap.add_argument("--language", default="ja")
    ap.add_argument("--no-llm", action="store_true", help="Claude での字幕校正を使わない")
    ap.add_argument("--no-captions", action="store_true", help="無音カットだけ行う")
    a = ap.parse_args(argv)

    a.out.mkdir(parents=True, exist_ok=True)
    stem = a.video.stem

    info = media.probe(a.video)
    silences = media.detect_silence(a.video, info.duration, a.noise_db, a.min_silence)
    spans = segments.keep_spans(silences, info.duration, pad=a.pad)
    cut = info.duration - sum(s.dur for s in spans)
    print(f"{info.duration:.1f}s → {info.duration - cut:.1f}s ({cut:.1f}s カット, {len(spans)} クリップ)")

    (a.out / f"{stem}.xml").write_text(xmeml.build_xmeml(a.video, info, spans, name=stem), encoding="utf-8")

    if not a.no_captions:
        from .transcribe import transcribe

        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "a.wav"
            media.extract_audio(a.video, wav)
            cues = transcribe(wav, a.whisper_model, a.language)
        cues = segments.remap_cues(cues, spans)
        if a.no_llm:
            cues = [(s, e, captions.split_plain(t)) for s, e, t in cues]
        else:
            cues = captions.polish_with_claude(cues)
        (a.out / f"{stem}.srt").write_text(srt.to_srt(cues), encoding="utf-8")
        (a.out / f"{stem}.txt").write_text("\n\n".join(t for _, _, t in cues) + "\n", encoding="utf-8")

    print(f"出力: {a.out}/")


if __name__ == "__main__":
    main()
