import pytest

from autonex.domain.services import (
    InvalidConfigurationError,
    default_configuration,
    price_configuration,
)
from autonex.infrastructure.sqlite import SQLiteRepository


def test_price_is_calculated_from_catalog_with_itemized_options(
    repository: SQLiteRepository,
) -> None:
    vehicle = repository.get_vehicle("bmw-i4-demo")
    config = default_configuration(vehicle).model_copy(
        update={
            "trim_id": "trim-performance",
            "color_id": "color-jet-black",
            "wheel_id": "wheel-19",
            "package_ids": ["package-comfort"],
        }
    )
    quote = price_configuration(vehicle, config)
    assert quote.total == 73100
    assert quote.total == sum(line.amount for line in quote.lines)
    assert quote.configuration == config


@pytest.mark.parametrize(
    "patch",
    [
        {"trim_id": "invented-trim"},
        {"color_id": "invented-color"},
        {"wheel_id": "wheel-21"},
        {"interior_id": "invented-interior"},
        {"package_ids": ["package-family"]},
        {"package_ids": ["package-comfort", "package-comfort"]},
        {"vehicle_id": "bmw-ix-demo"},
    ],
)
def test_rejects_foreign_unknown_and_duplicate_options(
    repository: SQLiteRepository, patch: dict[str, object]
) -> None:
    vehicle = repository.get_vehicle("bmw-i4-demo")
    config = default_configuration(vehicle).model_copy(update=patch)
    with pytest.raises(InvalidConfigurationError):
        price_configuration(vehicle, config)
