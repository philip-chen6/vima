# VIMA Report

Build the report from the repo root:

```bash
cd paper
tectonic main.tex
```

Classic TeX Live works too:

```bash
cd paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Outputs:

- `paper/main.tex`
- `paper/references.bib`
- `paper/main.pdf`
- `paper/main-interwoven.pdf` - copy of the updated PDF with figures interwoven.
- `paper/main-original.pdf` - copy of the PDF from current `main` for comparison.

The report intentionally labels all measurements as hackathon pilot results.

## Authors

Philip Chen, Joshua Lin, Stephen Hung, Lucas He — Hacktech 2026 Spatial
Intelligence Track.
