"""Pure pricing rules: the model never calculates or authorizes a price."""

from autonex.domain.models import Configuration, Option, PriceLine, Quote, Vehicle


class NotFoundError(ValueError):
    pass


class InvalidConfigurationError(ValueError):
    pass


class ProviderError(RuntimeError):
    pass


def price_configuration(vehicle: Vehicle, config: Configuration) -> Quote:
    if vehicle.id != config.vehicle_id:
        raise InvalidConfigurationError("Configuration belongs to a different vehicle.")
    trim = next((item for item in vehicle.trims if item.id == config.trim_id), None)
    if trim is None:
        raise InvalidConfigurationError("Choose a valid trim for this vehicle.")
    if len(config.package_ids) != len(set(config.package_ids)):
        raise InvalidConfigurationError("A package can only be selected once.")
    lines = [PriceLine(label=trim.name, amount=trim.base_price)]

    def add(options: list[Option], selected: str) -> None:
        option = next((item for item in options if item.id == selected), None)
        if option is None:
            raise InvalidConfigurationError(f"Unknown option: {selected}")
        lines.append(PriceLine(label=option.name, amount=option.price_delta))

    add(list(vehicle.colors), config.color_id)
    add(vehicle.wheels, config.wheel_id)
    add(vehicle.interiors, config.interior_id)
    for package_id in config.package_ids:
        add(list(vehicle.packages), package_id)
    return Quote(configuration=config, lines=lines, total=sum(line.amount for line in lines))


def default_configuration(vehicle: Vehicle) -> Configuration:
    return Configuration(
        vehicle_id=vehicle.id,
        trim_id=vehicle.trims[0].id,
        color_id=vehicle.colors[0].id,
        wheel_id=vehicle.wheels[0].id,
        interior_id=vehicle.interiors[0].id,
        package_ids=[],
    )
