from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict


class DNSQueryLogBase(BaseModel):
    client_ip: str
    client_hostname: Optional[str] = None
    domain: str
    category: str
    service_name: str
    is_blocked: bool
    query_type: str = "A"


class DNSQueryLogCreate(DNSQueryLogBase):
    network_id: Optional[str] = None
    queried_at: Optional[datetime] = None


class DNSQueryLogResponse(DNSQueryLogBase):
    id: str
    network_id: str
    queried_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FilterPolicyBase(BaseModel):
    block_social_media: bool = True
    block_streaming: bool = False
    block_gaming: bool = False
    custom_blacklist: List[str] = []
    custom_whitelist: List[str] = []


class FilterPolicyUpdate(BaseModel):
    block_social_media: Optional[bool] = None
    block_streaming: Optional[bool] = None
    block_gaming: Optional[bool] = None
    custom_blacklist: Optional[List[str]] = None
    custom_whitelist: Optional[List[str]] = None


class FilterPolicyResponse(FilterPolicyBase):
    id: str
    network_id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DNSStatsResponse(BaseModel):
    total_queries: int
    blocked_queries: int
    social_queries: int
    allowed_queries: int
    top_social_apps: List[Dict[str, int | str]]
    top_devices: List[Dict[str, int | str]]

