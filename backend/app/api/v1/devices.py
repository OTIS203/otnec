import socket
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.entities import Device, Network, User
from app.schemas.schemas import DeviceOut, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])


def send_wol_packet(mac_address: str, broadcast_ip: str = "255.255.255.255", port: int = 9):
    clean_mac = mac_address.replace(":", "").replace("-", "").lower()
    if len(clean_mac) != 12:
        raise ValueError("Invalid MAC address format for Wake-on-LAN")
    mac_bytes = bytes.fromhex(clean_mac)
    magic_packet = b"\xff" * 6 + mac_bytes * 16

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.sendto(magic_packet, (broadcast_ip, port))
    sock.close()


@router.get("", response_model=List[DeviceOut])
def list_devices(
    network_id: Optional[str] = None,
    device_type: Optional[str] = None,
    trust_level: Optional[str] = None,
    is_online: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Device)
        .join(Network)
        .where(Network.tenant_id == current_user.tenant_id)
        .options(selectinload(Device.ports))
    )

    if network_id:
        stmt = stmt.where(Device.network_id == network_id)
    if device_type:
        stmt = stmt.where(Device.device_type == device_type)
    if trust_level:
        stmt = stmt.where(Device.trust_level == trust_level)
    if is_online is not None:
        stmt = stmt.where(Device.is_online == is_online)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            (Device.ip_address.ilike(search_filter))
            | (Device.hostname.ilike(search_filter))
            | (Device.custom_name.ilike(search_filter))
            | (Device.vendor.ilike(search_filter))
            | (Device.mac_address.ilike(search_filter))
        )

    return list(db.execute(stmt).scalars().all())


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Device)
        .join(Network)
        .where(Device.id == device_id, Network.tenant_id == current_user.tenant_id)
        .options(selectinload(Device.ports))
    )
    device = db.execute(stmt).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.patch("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: str,
    dev_update: DeviceUpdate,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Device)
        .join(Network)
        .where(Device.id == device_id, Network.tenant_id == current_user.tenant_id)
        .options(selectinload(Device.ports))
    )
    device = db.execute(stmt).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if dev_update.custom_name is not None:
        device.custom_name = dev_update.custom_name
    if dev_update.trust_level is not None:
        device.trust_level = dev_update.trust_level

    db.commit()
    db.refresh(device)
    return device


@router.post("/{device_id}/wol")
def wake_on_lan(
    device_id: str,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Device)
        .join(Network)
        .where(Device.id == device_id, Network.tenant_id == current_user.tenant_id)
    )
    device = db.execute(stmt).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if not device.mac_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device has no known MAC address for WOL")

    try:
        send_wol_packet(device.mac_address)
        return {"message": f"Wake-on-LAN magic packet broadcasted for MAC {device.mac_address}"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to transmit WOL packet: {e}")
