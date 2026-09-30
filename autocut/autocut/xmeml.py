"""Premiere Pro / DaVinci Resolve が読める FCP7 XML (xmeml v4) を生成する。
単一ソース動画を spans の通りに並べたシーケンスを出力する(映像1トラック + 音声1トラック)。"""
from pathlib import Path
from xml.sax.saxutils import escape


def _rate(tb):
    return f"<rate><timebase>{tb}</timebase><ntsc>FALSE</ntsc></rate>"


def build_xmeml(video_path, info, spans, name="autocut"):
    tb = round(info.fps)
    f = lambda sec: round(sec * tb)
    src_frames = f(info.duration)
    uri = Path(video_path).resolve().as_uri()
    fname = escape(Path(video_path).name)

    file_full = (
        f'<file id="file-1"><name>{fname}</name><pathurl>{escape(uri)}</pathurl>{_rate(tb)}'
        f"<duration>{src_frames}</duration><media>"
        f"<video><samplecharacteristics><width>{info.width}</width><height>{info.height}</height></samplecharacteristics></video>"
        "<audio><channelcount>2</channelcount></audio></media></file>"
    )

    v_items, a_items, pos = [], [], 0
    for i, sp in enumerate(spans, 1):
        a, b = f(sp.start), f(sp.end)
        length = b - a
        start, end = pos, pos + length
        pos = end
        file_xml = file_full if i == 1 else '<file id="file-1"/>'
        links = (
            f"<link><linkclipref>v{i}</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>{i}</clipindex></link>"
            f"<link><linkclipref>a{i}</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>{i}</clipindex></link>"
        )
        common = (
            f"<name>{fname}</name><duration>{src_frames}</duration>{_rate(tb)}"
            f"<start>{start}</start><end>{end}</end><in>{a}</in><out>{b}</out>"
        )
        v_items.append(f'<clipitem id="v{i}">{common}{file_xml}{links}</clipitem>')
        a_items.append(
            f'<clipitem id="a{i}">{common}<file id="file-1"/>'
            f"<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>{links}</clipitem>"
        )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence>'
        f"<name>{escape(name)}</name><duration>{pos}</duration>{_rate(tb)}<media>"
        "<video><format><samplecharacteristics>"
        f"<width>{info.width}</width><height>{info.height}</height>{_rate(tb)}"
        f"</samplecharacteristics></format><track>{''.join(v_items)}</track></video>"
        f"<audio><track>{''.join(a_items)}</track></audio>"
        "</media></sequence></xmeml>\n"
    )
