"""On-demand report agent over validated, persisted execution state."""

from collections.abc import Callable

from autonex.application.ports import RunRepository
from autonex.domain.models import AgentRun


class ReportAgent:
    def __init__(self, runs: RunRepository, render_pdf: Callable[[AgentRun], bytes]) -> None:
        self.runs = runs
        self.render_pdf = render_pdf

    def generate(self, run_id: str) -> bytes:
        # Rendering is an injected adapter; the application never imports ReportLab.
        return self.render_pdf(self.runs.get_run(run_id))
