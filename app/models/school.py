import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Integer, String
from app.database import Base


class SubscriptionTier(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"
    PREMIUM = "PREMIUM"
    ENTERPRISE = "ENTERPRISE"


class SchoolConfig(Base):
    __tablename__ = "school_configs"

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String, nullable=False)
    subscription_tier = Column(Enum(SubscriptionTier), nullable=False, default=SubscriptionTier.FREE)
    subscription_expires_at = Column(DateTime, nullable=True)
