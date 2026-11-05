import os

import pytest

from core import resistance_suite
from core.resistance_suite import LOST, NOT_APPLICABLE, SURVIVES, WATERMARK_THRESHOLD, build_transforms, run_suite

EXPECTED_IDS = ["jpeg_q50", "jpeg_q75", "resample_1080", "crop_5", "format_png", "format_jpeg", "format_webp", "screenshot"]
INDICATORS = ("metadata", "c2pa", "noai", "watermark")


def test_every_transform_reports_four_indicators(signed_jpeg):
    result = run_suite(signed_jpeg, "firmado.jpg", watermark_text="© Ana")
    assert [r["id"] for r in result["rows"]] == EXPECTED_IDS
    for row in result["rows"]:
        for key in INDICATORS:
            assert row[key]["status"] in (SURVIVES, LOST, NOT_APPLICABLE), (row["id"], key)


def test_baseline_reads_original(signed_jpeg):
    base = run_suite(signed_jpeg, "firmado.jpg")["baseline"]
    assert base["exif"] and base["xmp"] and not base["iptc"]
    assert base["c2pa"] == {"present": True, "valid": True}
    assert "noai" in base["exclusion_tags"]


@pytest.mark.parametrize("row_id", ["jpeg_q50", "jpeg_q75", "resample_1080", "crop_5", "format_png", "format_jpeg", "format_webp"])
def test_reencoding_keeps_copyable_metadata_but_breaks_c2pa(signed_jpeg, row_id):
    rows = {r["id"]: r for r in run_suite(signed_jpeg, "firmado.jpg")["rows"]}
    row = rows[row_id]
    assert row["metadata"]["exif"] == SURVIVES
    assert row["metadata"]["xmp"] == SURVIVES
    assert row["metadata"]["iptc"] == NOT_APPLICABLE
    assert row["noai"]["status"] == SURVIVES
    # Recodificar cambia los bytes que el manifiesto firma.
    assert row["c2pa"]["status"] == LOST
    assert row["c2pa"]["valid_before"] is True and row["c2pa"]["valid_after"] is False


def test_screenshot_drops_everything(signed_jpeg):
    row = run_suite(signed_jpeg, "firmado.jpg")["rows"][-1]
    assert row["id"] == "screenshot" and row["output"]["format"] == "PNG"
    assert row["metadata"]["status"] == LOST
    assert row["noai"]["status"] == LOST
    assert row["c2pa"]["status"] == LOST


def test_geometry_of_each_transform(plain_jpeg):
    rows = {r["id"]: r["output"] for r in run_suite(plain_jpeg, transforms=build_transforms(resample_side=450, crop_pct=10, screen=(300, 300)))["rows"]}
    assert (rows["jpeg_q50"]["width"], rows["jpeg_q50"]["height"]) == (900, 600)
    assert (rows["resample_450"]["width"], rows["resample_450"]["height"]) == (450, 300)
    assert (rows["crop_10"]["width"], rows["crop_10"]["height"]) == (720, 480)
    assert (rows["screenshot"]["width"], rows["screenshot"]["height"]) == (300, 200)
    assert [rows[k]["format"] for k in ("format_png", "format_jpeg", "format_webp")] == ["PNG", "JPEG", "WEBP"]


def test_without_protections_indicators_do_not_apply(plain_jpeg):
    for row in run_suite(plain_jpeg)["rows"]:
        assert row["c2pa"]["status"] == NOT_APPLICABLE
        assert row["noai"]["status"] == NOT_APPLICABLE
        assert row["watermark"]["status"] == NOT_APPLICABLE


def test_watermark_detected_and_control_below_threshold(plain_jpeg):
    for row in run_suite(plain_jpeg, watermark_text="© Ana")["rows"]:
        assert row["watermark"]["status"] == SURVIVES, row["id"]
        assert row["watermark"]["correlation"] >= WATERMARK_THRESHOLD
        assert abs(row["watermark"]["control"]) < WATERMARK_THRESHOLD


def test_intermediate_files_removed_on_error(plain_jpeg, monkeypatch, no_leftover_temp):
    def boom(*args, **kwargs):
        raise RuntimeError("fallo forzado")

    monkeypatch.setattr(resistance_suite, "encode", boom)
    with pytest.raises(RuntimeError):
        run_suite(plain_jpeg)
    assert not os.listdir(no_leftover_temp)
