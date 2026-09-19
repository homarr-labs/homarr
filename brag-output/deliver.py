"""Run after preview approval: encode, select poster, bake frame zero, inspect media."""

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def inspect(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    info = json.loads(result.stdout)
    video = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    assert (video["width"], video["height"]) == (1920, 1080), "Unexpected resolution"
    assert video["avg_frame_rate"] == "30/1", "Unexpected frame rate"
    assert int(video["nb_frames"]) == 2400, "Expected 80 seconds at 30fps"
    assert abs(float(info["format"]["duration"]) - 80) < 0.1, "Unexpected duration"
    assert any(stream["codec_type"] == "audio" for stream in info["streams"]), "Missing audio"
    return info


def main():
    subprocess.run(
        ["npm", "run", "render", "--", "--quality", "delivery", "--fps", "30", "--output", "../brag.mp4"],
        cwd=ROOT / "composition",
        check=True,
    )
    original = inspect(ROOT / "brag.mp4")
    # The populated dashboard and opening headline have settled by 1.6 seconds.
    run("ffmpeg", "-y", "-ss", "1.6", "-i", "brag.mp4", "-frames:v", "1", "-q:v", "2", "brag.jpg")
    run(
        "ffmpeg", "-y", "-i", "brag.mp4", "-i", "brag.jpg",
        "-filter_complex", "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",
        "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "18",
        "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy",
        "-movflags", "+faststart", "brag.poster.mp4",
    )
    final = inspect(ROOT / "brag.poster.mp4")
    (ROOT / "brag.poster.mp4").replace(ROOT / "brag.mp4")
    run("ffmpeg", "-y", "-i", "brag.mp4", "-frames:v", "1", "frame-zero.png")
    (ROOT / "delivery-metadata.json").write_text(
        json.dumps({"before_poster": original, "after_poster": final}, indent=2) + "\n"
    )
    print("Encoded and inspected brag.mp4. Review brag.jpg and frame-zero.png before delivery.")


if __name__ == "__main__":
    main()
