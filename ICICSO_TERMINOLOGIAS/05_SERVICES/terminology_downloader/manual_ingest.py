from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from downloader import (
    DATASET_DIRS,
    EXPECTED_FILES,
    ensure_directories,
    log_download,
    log_error,
    record_state,
)


def ingest_file(dataset: str, source: Path) -> dict[str, str]:
    dataset = dataset.upper().strip()
    if dataset not in EXPECTED_FILES:
        raise ValueError(f"Dataset invalido: {dataset}")

    if not source.exists() or not source.is_file():
        raise FileNotFoundError(f"No existe archivo fuente: {source}")

    destination = DATASET_DIRS[dataset] / EXPECTED_FILES[dataset]
    destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.copy2(source, destination)
        size_bytes = destination.stat().st_size
        if size_bytes <= 0:
            raise ValueError("Archivo copiado con tamano 0 bytes")

        log_download(
            dataset=dataset,
            url=f"manual://{source.resolve()}",
            destination=destination,
            size_bytes=size_bytes,
            status="success",
            message="manual_ingest",
        )
        result = {
            "dataset": dataset,
            "status": "success",
            "source": str(source.resolve()),
            "destination": str(destination.resolve()),
        }
        record_state(dataset, {"dataset": dataset, "status": "success", "path": str(destination.resolve()), "bytes": size_bytes, "url": f"manual://{source.resolve()}"}, mode="manual_ingest", note="manual file copied into canonical destination")
        return result
    except Exception as exc:
        log_error(
            dataset=dataset,
            url=f"manual://{source.resolve()}",
            destination=destination,
            error=str(exc),
        )
        log_download(
            dataset=dataset,
            url=f"manual://{source.resolve()}",
            destination=destination,
            size_bytes=0,
            status="failed",
            message=str(exc),
        )
        result = {
            "dataset": dataset,
            "status": "failed",
            "source": str(source.resolve()),
            "destination": str(destination.resolve()),
            "error": str(exc),
        }
        record_state(dataset, {"dataset": dataset, "status": "failed", "path": str(destination.resolve()), "error": str(exc), "url": f"manual://{source.resolve()}"}, mode="manual_ingest", note="manual ingest failed")
        return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copia archivos descargados manualmente y registra trazabilidad en logs TSV."
    )
    parser.add_argument(
        "--dataset",
        required=True,
        choices=sorted(EXPECTED_FILES.keys()),
        help="Dataset destino (ej. ICD10, ICD11, LOINC).",
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Ruta al archivo descargado manualmente.",
    )
    return parser.parse_args()


def main() -> int:
    ensure_directories()
    args = parse_args()
    result = ingest_file(args.dataset, Path(args.source))

    if result["status"] == "success":
        print(f"[SUCCESS] {result['dataset']}")
        print(f"source={result['source']}")
        print(f"destination={result['destination']}")
        return 0

    print(f"[FAILED] {result['dataset']}")
    print(f"source={result['source']}")
    print(f"destination={result['destination']}")
    print(f"error={result.get('error', 'unknown')}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
