from app.services.catalog_repository import CatalogRepository


def main() -> None:
    result = CatalogRepository().import_manifest()
    print(
        f"Imported {result.imported_documents} documents into catalog persistence "
        f"at {result.sqlite_path}"
    )


if __name__ == "__main__":
    main()
