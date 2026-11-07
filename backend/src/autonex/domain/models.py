"""Validated business values; independent of HTTP, SQL and LLM libraries."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Value(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)


class Option(Value):
    id: str
    name: str
    price_delta: int = Field(ge=0)


class Color(Option):
    hex: str


class Trim(Value):
    id: str
    name: str
    base_price: int = Field(ge=0)
    horsepower: int
    zero_to_sixty: float
    drivetrain: str
    description: str


class Package(Option):
    description: str


class ReferenceSpecification(Value):
    label: str
    value: str
    variant: str
    source_url: str
    published_at: str
    note: str


class Vehicle(Value):
    id: str
    name: str
    model: str
    summary: str
    body_type: str
    is_default: bool = False
    range_miles: int
    charge_time_10to80_min: int
    trims: list[Trim]
    colors: list[Color]
    wheels: list[Option]
    interiors: list[Option]
    packages: list[Package]
    reference_specifications: list[ReferenceSpecification] = []


class Configuration(Value):
    vehicle_id: str
    trim_id: str
    color_id: str
    wheel_id: str
    interior_id: str
    package_ids: list[str] = Field(max_length=10)


class PriceLine(Value):
    label: str
    amount: int


class Quote(Value):
    configuration: Configuration
    lines: list[PriceLine]
    total: int
    currency: Literal["USD"] = "USD"


class Intent(Value):
    task: Literal["configuration", "comparison", "knowledge", "service", "clarification"] = (
        "configuration"
    )
    vehicle_entity: str | None = None
    priority: Literal["performance", "comfort", "value"]
    body: Literal["any", "suv", "xuv", "gran-coupe"]
    color: Literal["any", "blue", "white", "black", "grey"]
    budget: int | None = Field(ge=1)
    retrieval_query: str = Field(min_length=1, max_length=4000)


class Source(Value):
    id: str
    document_id: str
    title: str
    excerpt: str
    version: str = "1"
    url: str | None = None


class KnowledgeDocument(Value):
    id: str
    title: str
    content: str
    vehicle_id: str | None
    version: str = "1"
    url: str | None = None


class Explanation(Value):
    summary: str = Field(min_length=1, max_length=1500)
    rationale: str = Field(min_length=1, max_length=3000)
    source_ids: list[str] = Field(max_length=6)


class ChatMessage(Value):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class RunRequest(Value):
    prompt: str = Field(min_length=3, max_length=4000)
    vehicle_id: str | None = None
    history: list[ChatMessage] = Field(default_factory=list, max_length=8)

    @field_validator("prompt")
    @classmethod
    def meaningful_prompt(cls, value: str) -> str:
        if len(value.strip()) < 3:
            raise ValueError("Describe your driving needs in at least three characters.")
        return value


class TraceStep(Value):
    node: str
    label: str
    detail: str
    duration_ms: int
    retries: int = 0


class AgentRun(Value):
    id: str
    created_at: datetime
    mode: Literal["demo", "live"]
    prompt: str
    summary: str
    rationale: str
    quote: Quote
    sources: list[Source]
    trace: list[TraceStep]
    warnings: list[str]
    needs_clarification: bool = False


class TestDriveRequest(Value):
    vehicle_id: str
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    preferred_date: date
    consent: Literal[True]


class TestDriveReceipt(Value):
    id: str
    status: Literal["requested"] = "requested"
