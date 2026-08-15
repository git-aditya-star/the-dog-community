from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=72)
    display_name: str | None = Field(default=None, max_length=80)


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    avatar_url: str | None
    is_bot: bool


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class ChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    name: str | None
    topic: str | None
    # the person on the other side, for dms only
    other: UserOut | None = None


class DmIn(BaseModel):
    user_id: int


class UploadOut(BaseModel):
    url: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    body: str | None
    image_url: str | None
    created_at: datetime
    user: UserOut
