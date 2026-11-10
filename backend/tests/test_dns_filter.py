import pytest
from app.models.entities import Tenant, Network, DNSQueryLog, FilterPolicy
from app.api.v1.filtering import (
    get_filter_policy,
    update_filter_policy,
    get_query_logs,
    ingest_query_log,
    get_filtering_stats,
)
from app.schemas.dns import FilterPolicyUpdate, DNSQueryLogCreate


@pytest.fixture
def test_network(db_session):
    tenant = Tenant(name="Test Org", slug="test-org")
    db_session.add(tenant)
    db_session.commit()

    network = Network(tenant_id=tenant.id, name="HQ Corporate Wi-Fi", cidr_v4="192.168.1.0/24")
    db_session.add(network)
    db_session.commit()
    return network


def test_filter_policy_get_and_update(db_session, test_network):
    # Initial get creates default policy
    policy = get_filter_policy(db=db_session)
    assert policy.block_social_media is True
    assert policy.network_id == test_network.id

    # Update policy: disable social media blocking, add custom blacklist
    update_payload = FilterPolicyUpdate(
        block_social_media=False,
        custom_blacklist=["unauthorized-games.com"],
    )
    updated = update_filter_policy(update=update_payload, db=db_session)
    assert updated.block_social_media is False
    assert "unauthorized-games.com" in updated.custom_blacklist


def test_query_logs_and_stats(db_session, test_network):
    # Ingest a social media query from an employee phone
    log_in = DNSQueryLogCreate(
        client_ip="192.168.1.105",
        client_hostname="iPhone-Employee",
        domain="api.tiktokv.com",
        category="Social Media",
        service_name="TikTok",
        is_blocked=True,
    )
    log = ingest_query_log(payload=log_in, db=db_session)
    assert log.domain == "api.tiktokv.com"
    assert log.is_blocked is True

    # Retrieve logs
    logs = get_query_logs(client_ip="192.168.1.105", db=db_session)
    assert len(logs) >= 1
    assert logs[0].service_name == "TikTok"

    # Verify aggregated stats
    stats = get_filtering_stats(db=db_session)
    assert stats.total_queries >= 1
    assert stats.blocked_queries >= 1
    assert any(app["name"] == "TikTok" for app in stats.top_social_apps)
