# VIMA — HackTech 2025
# Makefile for compiling the LaTeX paper

PAPER     = main
LATEX     = pdflatex
BIBTEX    = bibtex
LATEXOPTS = -interaction=nonstopmode -halt-on-error

.PHONY: all clean distclean view watch

all: $(PAPER).pdf

# Full build: run pdflatex twice so cross-references and TOC resolve.
# If you add a .bib file, uncomment the bibtex line.
$(PAPER).pdf: $(PAPER).tex
	$(LATEX) $(LATEXOPTS) $(PAPER)
	# $(BIBTEX) $(PAPER)
	$(LATEX) $(LATEXOPTS) $(PAPER)
	$(LATEX) $(LATEXOPTS) $(PAPER)

# Open the PDF (macOS)
view: $(PAPER).pdf
	open $(PAPER).pdf

# Watch mode — recompile on every save (requires entr or fswatch)
# Usage: make watch
watch:
	@if command -v fswatch >/dev/null 2>&1; then \
	  echo "Watching $(PAPER).tex with fswatch ..."; \
	  fswatch -o $(PAPER).tex | xargs -n1 -I{} make all; \
	elif command -v entr >/dev/null 2>&1; then \
	  echo "Watching $(PAPER).tex with entr ..."; \
	  echo $(PAPER).tex | entr make all; \
	else \
	  echo "Install fswatch or entr for watch mode."; \
	  exit 1; \
	fi

# Remove intermediate build artifacts
clean:
	rm -f $(PAPER).aux \
	       $(PAPER).log \
	       $(PAPER).out \
	       $(PAPER).bbl \
	       $(PAPER).blg \
	       $(PAPER).toc \
	       $(PAPER).lof \
	       $(PAPER).lot \
	       $(PAPER).fls \
	       $(PAPER).fdb_latexmk \
	       texput.log

# Remove everything including the compiled PDF
distclean: clean
	rm -f $(PAPER).pdf
