import pytest

from core.metadata_reader import AuditResult, Finding, MetadataReader


def scored(findings=(), exclusion=(), author=False, copyright=False):
    r = AuditResult(filename="x", format="JPEG", width=1, height=1, findings=list(findings),
                    exclusion_tags=list(exclusion), has_author=author, has_copyright=copyright)
    MetadataReader._score(r)
    return r


def test_no_protection_is_fully_exposed():
    r = scored()
    assert (r.vulnerability_score, r.risk_level) == (100, "alto")
    assert r.score_breakdown[0]["points"] == 0


@pytest.mark.parametrize("kwargs,score,level", [
    ({"author": True}, 75, "alto"),
    ({"author": True, "copyright": True}, 50, "medio"),
    ({"exclusion": ["noai"]}, 60, "medio"),
    ({"author": True, "copyright": True, "exclusion": ["noai"]}, 10, "bajo"),
])
def test_penalties(kwargs, score, level):
    r = scored(**kwargs)
    assert (r.vulnerability_score, r.risk_level) == (score, level)


def test_extra_rights_in_xmp_and_floor_at_zero():
    findings = [Finding("XMP", "dc:creator", "Ana", "author"), Finding("XMP", "dc:rights", "© Ana", "copyright")]
    r = scored(findings, ["noai"], author=True, copyright=True)
    assert r.vulnerability_score == 0 and r.risk_level == "bajo"
    assert len(r.score_breakdown) == 4


def test_extra_rights_needs_xmp_or_iptc():
    findings = [Finding("EXIF", "Artist", "Ana", "author"), Finding("EXIF", "Copyright", "© Ana", "copyright")]
    assert scored(findings, author=True, copyright=True).vulnerability_score == 50


@pytest.mark.parametrize("score,level", [(70, "alto"), (69, "medio"), (35, "medio"), (34, "bajo")])
def test_risk_thresholds(score, level, monkeypatch):
    import core.metadata_reader as mr

    monkeypatch.setattr(mr, "PENALTY_AUTHOR", 100 - score)
    assert scored(author=True).risk_level == level


def test_signed_file_end_to_end(signed_jpeg):
    r = MetadataReader(signed_jpeg).analyze().to_dict()
    assert r["has_author"] and r["has_copyright"] and r["exclusion_tags"]
    assert r["vulnerability_score"] == 0 and r["risk_level"] == "bajo"
    assert r["c2pa"]["present"] and r["c2pa"]["valid"]
