import asyncio
from io import BytesIO
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError

import bot
from telegram.error import TelegramError


class FakeMessage:
    def __init__(self) -> None:
        self.responses: list[str] = []

    async def reply_text(self, text: str, **kwargs: object) -> None:
        self.responses.append(text)


class FakeTelegramBot:
    should_fail = False

    def __init__(self, token: str) -> None:
        self.token = token

    async def __aenter__(self) -> "FakeTelegramBot":
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False

    async def send_message(self, **kwargs: object) -> None:
        if self.should_fail:
            raise TelegramError("synthetic transport failure")


class FakeTelegramConnection:
    async def get_me(self) -> object:
        return object()


class FakeHttpResponse:
    status = 200

    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = json.dumps(payload).encode()

    def __enter__(self) -> "FakeHttpResponse":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False

    def read(self, limit: int) -> bytes:
        return self.payload[:limit]


class BotCommandTests(unittest.TestCase):
    def test_monitoring_command_denied_without_admin_configuration(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )

        with patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset()):
            authorized = asyncio.run(bot._require_admin(update))

        self.assertFalse(authorized)
        self.assertIn("TELEGRAM_ADMIN_IDS", message.responses[0])

    def test_monitoring_command_denied_for_non_admin(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )

        with patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({456})):
            authorized = asyncio.run(bot._require_admin(update))

        self.assertFalse(authorized)
        self.assertIn("hanya tersedia untuk admin", message.responses[0])

    def test_monitoring_command_allows_configured_admin(self) -> None:
        update = SimpleNamespace(
            message=FakeMessage(),
            effective_user=SimpleNamespace(id=123),
        )

        with patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})):
            authorized = asyncio.run(bot._require_admin(update))

        self.assertTrue(authorized)

    def test_group_notification_skips_without_group_or_token(self) -> None:
        with patch.object(bot, "TELEGRAM_GROUP_ID", None):
            sent = asyncio.run(bot.send_group_notification("<b>alert</b>"))
        self.assertFalse(sent)

    def test_group_notification_handles_telegram_failure(self) -> None:
        FakeTelegramBot.should_fail = True
        try:
            with (
                patch.object(bot, "TELEGRAM_GROUP_ID", "-100123"),
                patch.object(bot, "Bot", FakeTelegramBot),
                patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "synthetic-token"}),
                patch.object(bot, "_group_connection_verified", True),
            ):
                sent = asyncio.run(
                    bot.send_group_notification("<b>alert</b>")
                )
                self.assertFalse(sent)
                self.assertFalse(bot._group_connection_verified)
        finally:
            FakeTelegramBot.should_fail = False

        with (
            patch.object(bot, "TELEGRAM_GROUP_ID", "-100123"),
            patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": ""}),
        ):
            sent = asyncio.run(bot.send_group_notification("<b>alert</b>"))
        self.assertFalse(sent)

    def test_backend_health_is_not_configured_without_url(self) -> None:
        with patch.dict(os.environ, {"BACKEND_API_URL": ""}):
            result = bot._backend_health_request()
        self.assertIsNone(result)

    def test_backend_health_rejects_non_http_url(self) -> None:
        with patch.dict(os.environ, {"BACKEND_API_URL": "file:///tmp"}):
            with self.assertRaises(ValueError):
                bot._backend_health_request()

    def test_backend_health_uses_existing_api_health_route(self) -> None:
        with (
            patch.dict(os.environ, {"BACKEND_API_URL": "https://backend.example"}),
            patch.object(
                bot,
                "urlopen",
                return_value=FakeHttpResponse({"status": "ok"}),
            ) as open_url,
        ):
            result = bot._backend_health_request()

        self.assertTrue(result)
        self.assertEqual(
            open_url.call_args.args[0].full_url,
            "https://backend.example/api/health",
        )

    def test_existing_qris_route_can_be_probed_without_payment_data(self) -> None:
        missing_reference = HTTPError(
            "https://backend.example/api/payment/qris/status",
            400,
            "Bad Request",
            hdrs=None,
            fp=BytesIO(
                b'{"success":false,"message":"Missing reference ID"}'
            ),
        )
        with (
            patch.dict(os.environ, {"BACKEND_API_URL": "https://backend.example"}),
            patch.object(bot, "urlopen", side_effect=missing_reference),
        ):
            available = bot._backend_qris_route_is_available()

        self.assertTrue(available)

    def test_backend_payment_details_uses_existing_reference_route(self) -> None:
        with (
            patch.dict(os.environ, {"BACKEND_API_URL": "https://backend.example"}),
            patch.object(
                bot,
                "urlopen",
                return_value=FakeHttpResponse(
                    {"success": True, "status": "PENDING"}
                ),
            ) as open_url,
        ):
            result = bot._backend_payment_details("ECK-Q-ABC 123")

        self.assertEqual(result, {"success": True, "status": "PENDING"})
        self.assertEqual(
            open_url.call_args.args[0].full_url,
            "https://backend.example/api/payment/qris/status/ECK-Q-ABC%20123",
        )

    def test_service_health_does_not_overclaim_unchecked_services(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        with (
            patch.object(bot, "TELEGRAM_GROUP_ID", "-100123"),
            patch.object(bot, "_group_connection_verified", False),
            patch.object(bot, "_backend_health_request", return_value=None),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn("Telegram Connection: CONNECTED", lines)
        self.assertIn("Telegram Group Connection: NOT VERIFIED", lines)
        self.assertIn("Backend ecukur: NOT CONFIGURED", lines)
        self.assertTrue(any(line.startswith("Supabase: UNKNOWN") for line in lines))
        self.assertIn("Payment Provider: NOT VERIFIED", lines)
        self.assertIn("PayHook Android: NOT VERIFIED", lines)

    def test_backend_unauthorized_is_not_reported_as_offline(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        unauthorized = HTTPError(
            "https://backend.example/api/health",
            401,
            "Unauthorized",
            hdrs=None,
            fp=None,
        )
        with (
            patch.object(bot, "_backend_health_request", side_effect=unauthorized),
            patch.object(bot, "TELEGRAM_GROUP_ID", None),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn(
            "Backend ecukur: UNKNOWN (HTTP 401; ACCESS DENIED)",
            lines,
        )
        self.assertNotIn("Backend ecukur: OFFLINE", lines)

    def test_health_404_falls_back_to_existing_qris_route(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        not_found = HTTPError(
            "https://backend.example/api/health",
            404,
            "Not Found",
            hdrs=None,
            fp=None,
        )
        with (
            patch.object(bot, "_backend_health_request", side_effect=not_found),
            patch.object(bot, "_backend_qris_route_is_available", return_value=True),
            patch.object(bot, "TELEGRAM_GROUP_ID", None),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn(
            "Backend ecukur: API REACHABLE (health endpoint not deployed)",
            lines,
        )
        self.assertNotIn("Backend ecukur: ONLINE", lines)

    def test_data_command_reports_missing_backend_data(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(message=message)

        asyncio.run(bot._data_source_unavailable(update))

        self.assertIn("belum tersedia", message.responses[0])
        self.assertNotIn("ECK-", message.responses[0])

    def test_monitoring_commands_do_not_invent_payment_data(self) -> None:
        handlers = (
            bot.today,
            bot.pending,
            bot.failed,
            bot.alerts,
            bot.transactions,
        )
        for handler in handlers:
            with self.subTest(command=handler.__name__):
                message = FakeMessage()
                update = SimpleNamespace(
                    message=message,
                    effective_user=SimpleNamespace(id=123),
                )
                context = SimpleNamespace(args=["ECK-REF"])
                with patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})):
                    asyncio.run(handler(update, context))
                self.assertIn("belum tersedia", message.responses[0])

    def test_details_command_uses_backend_response(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )
        context = SimpleNamespace(args=["ECK-Q-ABC123"])

        with (
            patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})),
            patch.object(
                    bot,
                    "_backend_payment_details",
                    return_value={
                        "success": True,
                        "status": "PENDING",
                        "totalAmount": 50500,
                        "type": "BOOKING",
                    },
            ),
        ):
            asyncio.run(bot.details(update, context))

        self.assertIn("Status dari backend: PENDING", message.responses[0])
        self.assertIn("Nominal: Rp50,500", message.responses[0])
        self.assertIn("belum merupakan verifikasi independen", message.responses[0])

    def test_details_command_rejects_invalid_reference(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )
        context = SimpleNamespace(args=["../../secret"])

        with patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})):
            asyncio.run(bot.details(update, context))

        self.assertIn("Reference tidak valid", message.responses[0])


if __name__ == "__main__":
    unittest.main()
