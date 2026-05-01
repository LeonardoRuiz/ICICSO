from __future__ import annotations

import argparse

from downloader import ensure_directories, print_status_line, run_manifest, summarize_state


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ejecuta la sincronizacion persistente de terminologias con estado, reintentos y trazabilidad."
    )
    parser.add_argument(
        "--dataset",
        action="append",
        dest="datasets",
        help="Dataset especifico a ejecutar. Se puede repetir.",
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=1,
        help="Numero de ciclos de reintento completos sobre el manifiesto.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=int,
        default=15,
        help="Pausa entre ciclos cuando hubo fallos.",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="No pedir credenciales en consola. Marca datasets bloqueados como awaiting_credentials.",
    )
    return parser.parse_args()


def main() -> int:
    ensure_directories()
    args = parse_args()

    results = run_manifest(
        datasets=args.datasets,
        cycles=args.cycles,
        sleep_seconds=args.sleep_seconds,
        non_interactive=args.non_interactive,
    )
    for result in results:
        print_status_line(result)

    summary = summarize_state(args.datasets)
    print("\nSUMMARY")
    print(
        "success={success} failed={failed} manual_required={manual_required} "
        "awaiting_credentials={awaiting_credentials} skipped={skipped}".format(**summary)
    )
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
