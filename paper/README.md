# VIMA Report

Build the report from the repo root:

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

The report intentionally labels all measurements as hackathon pilot results.

