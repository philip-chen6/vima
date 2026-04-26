import pathlib


ROOT = pathlib.Path(__file__).resolve().parents[2]


def test_backend_image_packages_temporal_demo_video():
    dockerfile = ROOT / "infra" / "Dockerfile.backend"
    contents = dockerfile.read_text()

    assert "frontend/public/demo/coldpath.mp4" in contents
    assert "./frontend/public/demo/coldpath.mp4" in contents
