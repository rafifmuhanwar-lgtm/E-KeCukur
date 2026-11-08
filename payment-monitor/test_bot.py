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

    def test_monitoring_request_authenticates_and_encodes_reference(self) -> None:
        with (
            patch.dict(os.environ, {"BACKEND_API_URL": "https://backend.example"}),
            patch.dict(os.environ, {"BACKEND_API_KEY": "synthetic-api-key"}),
            patch.object(
                bot,
                "urlopen",
                return_value=FakeHttpResponse(
                    {"ok": True, "payment": {"status": "PENDING"}}
                ),
            ) as open_url,
        ):
            result = bot._monitoring_api_get(
                "details",
                {"referenceId": "ECK-Q-ABC 123"},
            )

        self.assertEqual(result["payment"]["status"], "PENDING")
        self.assertEqual(
            open_url.call_args.args[0].full_url,
            "https://backend.example/api/monitoring/details?referenceId=ECK-Q-ABC+123",
        )
        self.assertEqual(
            open_url.call_args.args[0].headers["X-api-key"],
            "synthetic-api-key",
        )

    def test_monitoring_request_fails_closed_without_api_key(self) -> None:
        with (
            patch.dict(os.environ, {"BACKEND_API_URL": "https://backend.example"}),
            patch.dict(os.environ, {"BACKEND_API_KEY": ""}),
        ):
            with self.assertRaises(bot.MonitoringAPIError) as error:
                bot._monitoring_api_get("today")

        self.assertEqual(error.exception.status, 0)
        self.assertEqual(
            error.exception.code,
            "MONITORING_API_NOT_CONFIGURED",
        )

    def test_monitoring_api_error_does_not_expose_server_message(self) -> None:
        error = bot.MonitoringAPIError(401, "UNAUTHORIZED")
        message = bot._monitoring_api_error_text(error)
        self.assertIn("Akses API monitoring ditolak", message)
        self.assertNotIn("synthetic-api-key", message)

    def test_service_health_uses_authenticated_monitoring_response(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        with (
            patch.object(bot, "TELEGRAM_GROUP_ID", "-100123"),
            patch.object(bot, "_group_connection_verified", False),
            patch.dict(
                os.environ,
                {
                    "BACKEND_API_URL": "https://backend.example",
                    "BACKEND_API_KEY": "test-key",
                },
            ),
            patch.object(
                bot,
                "_monitoring_api_get",
                return_value={
                    "backendStatus": "ONLINE",
                    "supabaseStatus": "CONNECTED",
                    "paymentMonitoringStatus": "CONNECTED",
                    "alertsStatus": "NOT CONFIGURED",
                },
            ),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn("Telegram Connection: CONNECTED", lines)
        self.assertIn("Telegram Group Connection: NOT VERIFIED", lines)
        self.assertIn("Backend ecukur: ONLINE", lines)
        self.assertIn("Supabase: CONNECTED", lines)
        self.assertIn("Payment Monitoring: CONNECTED", lines)
        self.assertIn("Payment Provider: NOT VERIFIED", lines)
        self.assertIn("PayHook Android: NOT VERIFIED", lines)

    def test_backend_unauthorized_is_not_reported_as_offline(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        with (
            patch.dict(
                os.environ,
                {
                    "BACKEND_API_URL": "https://backend.example",
                    "BACKEND_API_KEY": "test-key",
                },
            ),
            patch.object(
                bot,
                "_monitoring_api_get",
                side_effect=bot.MonitoringAPIError(401, "UNAUTHORIZED"),
            ),
            patch.object(bot, "TELEGRAM_GROUP_ID", None),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn(
            "Backend ecukur: UNKNOWN (HTTP 401; ACCESS DENIED)",
            lines,
        )
        self.assertNotIn("Backend ecukur: OFFLINE", lines)

    def test_monitoring_404_falls_back_to_existing_qris_route(self) -> None:
        context = SimpleNamespace(bot=FakeTelegramConnection())
        with (
            patch.dict(
                os.environ,
                {
                    "BACKEND_API_URL": "https://backend.example",
                    "BACKEND_API_KEY": "test-key",
                },
            ),
            patch.object(
                bot,
                "_monitoring_api_get",
                side_effect=bot.MonitoringAPIError(404, "UNKNOWN_ACTION"),
            ),
            patch.object(bot, "_backend_qris_route_is_available", return_value=True),
            patch.object(bot, "TELEGRAM_GROUP_ID", None),
        ):
            lines = asyncio.run(bot._service_status_lines(context))

        self.assertIn(
            "Backend ecukur: API REACHABLE (monitoring API not deployed)",
            lines,
        )
        self.assertNotIn("Backend ecukur: ONLINE", lines)

    def test_monitoring_commands_use_api_and_display_backend_unavailable(self) -> None:
        cases = (
            (bot.today, "today"),
            (bot.pending, "pending"),
            (bot.failed, "failed"),
            (bot.alerts, "alerts"),
            (bot.transactions, "transactions"),
        )
        for handler, action in cases:
            with self.subTest(command=handler.__name__):
                message = FakeMessage()
                update = SimpleNamespace(
                    message=message,
                    effective_user=SimpleNamespace(id=123),
                )
                context = SimpleNamespace(args=["ECK-REF"])
                with (
                    patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})),
                    patch.object(
                        bot,
                        "_monitoring_api_get",
                        side_effect=bot.MonitoringAPIError(
                            503, "DATABASE_QUERY_FAILED"
                        ),
                    ) as api_get,
                ):
                    asyncio.run(handler(update, context))
                self.assertEqual(api_get.call_args.args[0], action)
                self.assertIn("Supabase", message.responses[0])

    def test_today_command_formats_api_summary(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )
        context = SimpleNamespace(args=[])
        with (
            patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})),
            patch.object(
                bot,
                "_monitoring_api_get",
                return_value={
                    "ok": True,
                    "date": "2026-11-08",
                    "counts": {"PENDING": 2, "PAID": 3},
                },
            ),
        ):
            asyncio.run(bot.today(update, context))

        self.assertIn("Ringkasan pembayaran 2026-11-08", message.responses[0])
        self.assertIn("PENDING: 2", message.responses[0])
        self.assertIn("PAID: 3", message.responses[0])

    def test_transactions_command_formats_safe_payment_fields(self) -> None:
        message = FakeMessage()
        update = SimpleNamespace(
            message=message,
            effective_user=SimpleNamespace(id=123),
        )
        context = SimpleNamespace(args=[])
        with (
            patch.object(bot, "TELEGRAM_ADMIN_IDS", frozenset({123})),
            patch.object(
                bot,
                "_monitoring_api_get",
                return_value={
                    "ok": True,
                    "count": 1,
                    "items": [
                        {
                            "reference_id": "ECK-Q-ABC123",
                            "status": "PAID",
                            "total_amount": 50500,
                            "created_at": "2026-11-08T00:00:00Z",
                            "customer_name": "must not be shown",
                        }
                    ],
                },
            ),
        ):
            asyncio.run(bot.transactions(update, context))

        self.assertIn("ECK-Q-ABC123", message.responses[0])
        self.assertIn("Rp50,500", message.responses[0])
        self.assertNotIn("must not be shown", message.responses[0])

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
                        "_monitoring_api_get",
                    return_value={
                            "ok": True,
                            "payment": {
                                "status": "PENDING",
                                "total_amount": 50500,
                                "type": "BOOKING",
                            },
                        },
            ),
        ):
            asyncio.run(bot.details(update, context))

        self.assertIn("Status: PENDING", message.responses[0])
        self.assertIn("Nominal: Rp50,500", message.responses[0])
        self.assertIn("monitoring provider independen belum tersedia", message.responses[0])

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
