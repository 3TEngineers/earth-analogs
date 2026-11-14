"""Pydantic models for the files the pipeline writes into app/public/data.

Keep in sync with docs/DATA_CONTRACT.md and app/src/types/data.ts.
"""

from typing import Literal

from pydantic import BaseModel, Field

Body = Literal["moon", "mars"]
Confidence = Literal["high", "medium", "low"]


class Site(BaseModel):
    id: str
    body: Body
    name: str
    mission: str
    agency: str
    year: int | None
    status: Literal["past", "candidate"]
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    summary: str
    processes: list[str]
    limits: list[str]
    image: str | None


class SitesFile(BaseModel):
    version: int
    mock: bool
    sites: list[Site]


class Dimension(BaseModel):
    id: str
    label: str
    bodies: list[Body]
    description: str


class DimensionScore(BaseModel):
    score: float | None = Field(default=None, ge=0, le=100)
    confidence: Confidence
    note: str


class Test(BaseModel):
    title: str
    detail: str


class Analog(BaseModel):
    id: str
    siteId: str
    rank: int = Field(ge=1, le=3)
    name: str
    country: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    radiusKm: float
    known: bool
    knownRef: str | None
    totalScore: float = Field(ge=0, le=100)
    scores: dict[str, DimensionScore]
    similarities: list[str]
    differences: list[str]
    tests: list[Test]
    processes: list[str]
    image: str | None
    sources: list[str]


class AnalogsFile(BaseModel):
    version: int
    mock: bool
    dimensions: list[Dimension]
    analogs: list[Analog]
