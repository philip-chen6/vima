from __future__ import annotations

SAMPLES = {
    "masonry-p": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_000.jpg",
        "filename": "masonry-p.jpg",
        "description": "productive masonry work sample frame",
    },
    "masonry-c": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_005.jpg",
        "filename": "masonry-c.jpg",
        "description": "contributory construction context sample frame",
    },
    "masonry-nc": {
        "url": "https://vimaspatial.tech/masonry-frames/frame_010.jpg",
        "filename": "masonry-nc.jpg",
        "description": "non-contributory/uncertain construction sample frame",
    },
}


def sample_names() -> str:
    return ", ".join(sorted(SAMPLES))
