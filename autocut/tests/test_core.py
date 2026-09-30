from xml.dom import minidom

from autocut import captions, media, segments, srt, xmeml
from autocut.segments import Span

STDERR = """
[silencedetect @ 0x1] silence_start: 2.0
[silencedetect @ 0x1] silence_end: 4.0 | silence_duration: 2.0
[silencedetect @ 0x1] silence_start: 9.0
"""


def test_parse_silences_closes_open_tail():
    assert media.parse_silences(STDERR, 10.0) == [(2.0, 4.0), (9.0, 10.0)]


def test_keep_spans_pads_and_drops_short():
    spans = segments.keep_spans([(2.0, 4.0), (9.0, 10.0)], 10.0, pad=0.1, min_keep=0.3)
    assert spans == [Span(0.0, 2.1), Span(3.9, 9.1)]


def test_keep_spans_leading_silence():
    spans = segments.keep_spans([(0.0, 1.0)], 5.0, pad=0.0)
    assert spans == [Span(1.0, 5.0)]


def test_remap_cues_shifts_and_drops_cut():
    spans = [Span(0.0, 2.0), Span(4.0, 6.0)]
    cues = [(0.5, 1.5, "a"), (2.5, 3.5, "cut"), (4.5, 5.5, "b")]
    assert segments.remap_cues(cues, spans) == [(0.5, 1.5, "a"), (2.5, 3.5, "b")]


def test_remap_cues_joins_cue_across_cut():
    spans = [Span(0.0, 2.0), Span(4.0, 6.0)]
    out = segments.remap_cues([(1.0, 5.0, "x")], spans)
    assert out == [(1.0, 3.0, "x")]


def test_srt_format():
    assert srt.to_srt([(0.0, 1.5, "hi")]) == "1\n00:00:00,000 --> 00:00:01,500\nhi\n"


def test_split_plain_no_punctuation():
    out = captions.split_plain("今日はいい天気ですね。散歩に行きます", max_chars=8)
    assert out == "今日はいい天気ですね"[:8] + "\n" + "今日はいい天気ですね"[8:] + "\n散歩に行きます"


def test_xmeml_is_valid_and_durations_add_up():
    info = media.Info(duration=10.0, width=1920, height=1080, fps=30.0)
    xml = xmeml.build_xmeml("/tmp/a.mp4", info, [Span(0, 2), Span(4, 6)])
    doc = minidom.parseString(xml.split("\n", 2)[2])  # DOCTYPE 行を除く
    assert doc.getElementsByTagName("sequence")[0].getElementsByTagName("duration")[0].firstChild.data == "120"
    assert len(doc.getElementsByTagName("clipitem")) == 4
