"""無音区間 → 残す区間(発話区間)への変換と、タイムライン時間への写像。"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Span:
    start: float
    end: float

    @property
    def dur(self) -> float:
        return self.end - self.start


def keep_spans(silences, total, pad=0.12, min_keep=0.3):
    """silences: [(start, end)] を反転して発話区間を返す。前後に pad 秒の余白を付け、
    min_keep 秒未満の区間は捨てる。隣接して重なった区間は結合する。"""
    spans, cursor = [], 0.0
    for s, e in sorted(silences):
        if s > cursor:
            spans.append(Span(cursor, s))
        cursor = max(cursor, e)
    if cursor < total:
        spans.append(Span(cursor, total))

    padded = [Span(max(0.0, sp.start - pad), min(total, sp.end + pad)) for sp in spans]
    merged = []
    for sp in padded:
        if merged and sp.start <= merged[-1].end:
            merged[-1] = Span(merged[-1].start, max(merged[-1].end, sp.end))
        else:
            merged.append(sp)
    return [sp for sp in merged if sp.dur >= min_keep]


def to_timeline(t, spans):
    """元動画の時刻 t を、カット後タイムラインの時刻に変換。カットされた部分なら None。"""
    offset = 0.0
    for sp in spans:
        if sp.start <= t <= sp.end:
            return offset + (t - sp.start)
        offset += sp.dur
    return None


def remap_cues(cues, spans):
    """cues: [(start, end, text)] を新タイムラインに写像。カット部分にはみ出す分は切り詰め、
    完全にカットされた字幕は落とす。"""
    out = []
    offset = 0.0
    for sp in spans:
        for s, e, text in cues:
            a, b = max(s, sp.start), min(e, sp.end)
            if b - a > 0.05:
                out.append((offset + a - sp.start, offset + b - sp.start, text))
        offset += sp.dur
    # 複数スパンに跨る字幕は同一テキストが分割されるので結合
    out.sort()
    merged = []
    for s, e, text in out:
        if merged and merged[-1][2] == text and s - merged[-1][1] < 0.05:
            merged[-1] = (merged[-1][0], e, text)
        else:
            merged.append((s, e, text))
    return merged
