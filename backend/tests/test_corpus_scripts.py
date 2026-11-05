import csv

from PIL import Image

from core.metadata_reader import MetadataReader
from scripts import build_corpus, run_validation
from scripts.build_corpus import GROUPS, add_iptc


def test_iptc_segment_is_read_back(tmp_path, plain_jpeg):
    data = add_iptc(open(plain_jpeg, "rb").read(), "Ana Pérez", "© 2026 Ana Pérez")
    path = tmp_path / "iptc.jpg"
    path.write_bytes(data)
    found = {(f.key, f.value, f.category) for f in MetadataReader(str(path)).analyze().findings if f.source == "IPTC"}
    assert ("Autor (By-line)", "Ana Pérez", "author") in found
    assert ("Aviso de copyright", "© 2026 Ana Pérez", "copyright") in found


def test_corpus_and_validation(tmp_path, monkeypatch):
    inputs = tmp_path / "in"
    inputs.mkdir()
    Image.new("RGB", (320, 200), (40, 90, 160)).save(inputs / "a.png")
    Image.new("RGB", (200, 320), (200, 60, 30)).save(inputs / "b.jpg")
    # Certificados en una carpeta temporal: la prueba no escribe en scripts/certs.
    monkeypatch.setattr(build_corpus, "CERT_DIR", str(tmp_path / "certs"))
    corpus, out = tmp_path / "corpus", tmp_path / "results"

    assert build_corpus.build(sorted(str(p) for p in inputs.iterdir()), str(corpus), "Ana") == 2
    for group in GROUPS:
        assert sorted(p.name for p in (corpus / group).iterdir()) == ["img001.jpg", "img002.jpg"]

    data = run_validation.validate(str(corpus), str(out), "© Ana")
    assert all(a["matches_expected"] for a in data["audits"]), data["audits"]
    with open(out / "stress_results.csv", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 2 * len(GROUPS) * 8
    c2pa_rows = [r for r in rows if r["group"] == "04_c2pa"]
    assert {r["c2pa_valid_before"] for r in c2pa_rows} == {"True"}
    assert (out / "audit_corpus.csv").exists()
