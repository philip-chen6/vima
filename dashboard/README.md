# VIMA Dashboard

Standalone dashboard for reviewing a VIMA run without touching the existing Next.js frontend.

Run it from the repo root:

```bash
python3 -m http.server 8787 --directory dashboard
```

Then open:

```text
http://localhost:8787
```

The bundled sample uses:

- `dashboard/assets/frame_000001.jpg`
- `dashboard/assets/mask_frame_000001.jpg`
- `dashboard/assets/depth_frame_000001.jpg`
- `dashboard/data/episodic_memory.json`
- `dashboard/data/memory_answer.json`

## Credits

Built by Philip Chen, Joshua Lin, Stephen Hung, and Lucas He for the Hacktech
2026 Spatial Intelligence Track.

