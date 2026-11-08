import asyncio
import json
import logging
import os
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from telegram import Bot, Update
from telegram.constants import ChatType, ParseMode
from telegram.error import TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes


LOGGER = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().with_name(".env"))
TELEGRAM_GROUP_ID = os.getenv("TELEGRAM_GROUP_ID", "").strip() or None
TELEGRAM_ADMIN_IDS = frozenset(
    int(user_id)
    for user_id in os.getenv("TELEGRAM_ADMIN_IDS", "").split(",")
    if user_id.strip().isdecimal()
)
_group_connection_verified = False


def _pending_alert_minutes() -> int:
    value = os.getenv("PAYMENT_PENDING_ALERT_MINUTES", "10").strip()
    try:
        minutes = int(value)
    except ValueError:
        LOGGER.warning(
            "PAYMENT_PENDING_ALERT_MINUTES is invalid; using the default of 10."
        )
        return 10

    if minutes < 1:
        LOGGER.warning(
            "PAYMENT_PENDING_ALERT_MINUTES must be positive; using the default of 10."
        )
        return 10
    return minutes


PAYMENT_PENDING_ALERT_MINUTES = _pending_alert_minutes()


class MonitoringAPIError(Exception):
    def __init__(self, status: int, code: str | None = None) -> None:
        super().__init__(code or "Monitoring API request failed")
        self.status = status
        self.code = code


async def _require_admin(update: Update) -> bool:
    if update.message is None:
        return False

    user = update.effective_user
    if not TELEGRAM_ADMIN_IDS:
        await update.message.reply_text(
            "Akses monitoring belum diaktifkan. Admin harus mengatur "
            "TELEGRAM_ADMIN_IDS di payment-monitor/.env.\n"
            "Monitoring access is disabled until TELEGRAM_ADMIN_IDS is set."
        )
        return False

    if user is None or user.id not in TELEGRAM_ADMIN_IDS:
        await update.message.reply_text(
            "Perintah ini hanya tersedia untuk admin.\n"
            "This command is available to admins only."
        )
        return False
    return True


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None:
        return

    await update.message.reply_text(
        "Halo! Selamat datang di ecukur Payment Monitor.\n\n"
        "Bot monitoring pembayaran ecukur siap digunakan.\n\n"
        "Gunakan /help untuk melihat daftar perintah."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None:
        return

    await update.message.reply_text(
        "Daftar perintah / Available commands:\n\n"
        "/start - Memulai bot / Start the bot\n"
        "/help - Menampilkan daftar perintah / Show the command list\n"
        "/status - Melihat status layanan / Check service status (admin)\n"
        "/transactions - Melihat riwayat transaksi / View transaction history (admin)\n"
        "/balance - Melihat informasi saldo / View balance information (admin)\n"
        "/groupid - Melihat ID grup Telegram / Show the Telegram group ID\n"
        "/testgroup - Mengirim pesan pengujian ke grup / Send a test message (admin)\n"
        "/today - Ringkasan pembayaran hari ini / Today's payment summary (admin)\n"
        "/pending - Daftar pembayaran pending / Pending payments (admin)\n"
        "/failed - Daftar gagal/kedaluwarsa / Failed or expired payments (admin)\n"
        "/alerts - Riwayat masalah pembayaran / Payment issue history (admin)\n"
        "/details REF - Detail transaksi / Payment details (admin)\n"
        "/health - Kondisi layanan monitoring / Monitoring service health (admin)"
    )


def _backend_url(path: str) -> str | None:
    base_url = os.getenv("BACKEND_API_URL", "").strip()
    if not base_url:
        return None

    parsed_url = urlsplit(base_url)
    if (
        parsed_url.scheme not in {"http", "https"}
        or not parsed_url.hostname
        or parsed_url.username
        or parsed_url.password
        or parsed_url.query
        or parsed_url.fragment
    ):
        raise ValueError("BACKEND_API_URL must be a base HTTP(S) URL.")

    return f"{base_url.rstrip('/')}{path}"


def _backend_qris_route_is_available() -> bool:
    url = _backend_url("/api/payment/qris/status")
    if url is None:
        return False

    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=5):
            return False
    except HTTPError as error:
        if error.code != 400:
            return False
        try:
            payload = json.loads(error.read(4096))
        except (json.JSONDecodeError, OSError):
            return False
        return (
            isinstance(payload, dict)
            and payload.get("success") is False
            and payload.get("message") == "Missing reference ID"
        )


def _monitoring_api_get(
    action: str, params: dict[str, str] | None = None
) -> dict[str, object]:
    url = _backend_url(f"/api/monitoring/{quote(action, safe='')}")
    api_key = os.getenv("BACKEND_API_KEY", "").strip()
    if not url or not api_key:
        raise MonitoringAPIError(0, "MONITORING_API_NOT_CONFIGURED")

    if params:
        url = f"{url}?{urlencode(params)}"
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "x-api-key": api_key,
        },
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read(16384))
    except HTTPError as error:
        try:
            error_payload = json.loads(error.read(4096))
        except (json.JSONDecodeError, OSError):
            error_payload = {}
        code = (
            error_payload.get("code")
            if isinstance(error_payload, dict)
            and isinstance(error_payload.get("code"), str)
            else None
        )
        raise MonitoringAPIError(error.code, code) from None

    if not isinstance(payload, dict):
        raise ValueError("Monitoring API returned an invalid response.")
    return payload


async def _service_status_lines(
    context: ContextTypes.DEFAULT_TYPE,
) -> list[str]:
    try:
        await context.bot.get_me()
        telegram_connection = "CONNECTED"
    except TelegramError as error:
        telegram_connection = "OFFLINE"
        LOGGER.warning(
            "Telegram connection health check failed (%s).",
            type(error).__name__,
        )

    if not TELEGRAM_GROUP_ID:
        group_status = "NOT CONFIGURED"
        group_connection = "NOT CONFIGURED"
    else:
        group_status = "CONFIGURED"
        group_connection = (
            "CONNECTED" if _group_connection_verified else "NOT VERIFIED"
        )

    backend_status = "NOT CONFIGURED"
    supabase_status = "UNKNOWN"
    payment_monitoring_status = "NOT CONNECTED"
    alerts_status = "NOT CONFIGURED"
    provider_status = "NOT VERIFIED"
    payhook_status = "NOT VERIFIED"

    if os.getenv("BACKEND_API_URL", "").strip() and os.getenv(
        "BACKEND_API_KEY", ""
    ).strip():
        try:
            health = await asyncio.to_thread(_monitoring_api_get, "health")
            backend_status = str(health.get("backendStatus", "ONLINE"))
            supabase_status = str(health.get("supabaseStatus", "UNKNOWN"))
            payment_monitoring_status = str(
                health.get("paymentMonitoringStatus", "NOT CONNECTED")
            )
            alerts_status = str(health.get("alertsStatus", "NOT CONFIGURED"))
            provider_status = str(
                health.get("paymentProviderStatus", "NOT VERIFIED")
            )
            payhook_status = str(health.get("payhookStatus", "NOT VERIFIED"))
        except MonitoringAPIError as error:
            if error.status in {401, 403}:
                backend_status = (
                    f"UNKNOWN (HTTP {error.status}; ACCESS DENIED)"
                )
            elif error.status == 404:
                try:
                    qris_available = await asyncio.to_thread(
                        _backend_qris_route_is_available
                    )
                except (OSError, TimeoutError, ValueError, URLError):
                    qris_available = False
                backend_status = (
                    "API REACHABLE (monitoring API not deployed)"
                    if qris_available
                    else "OFFLINE"
                )
            elif error.code == "SUPABASE_NOT_CONFIGURED":
                backend_status = "API REACHABLE"
                supabase_status = "NOT CONFIGURED"
            else:
                backend_status = "API REACHABLE (monitoring unavailable)"
            LOGGER.warning(
                "Monitoring API health check returned HTTP %s (%s).",
                error.status,
                error.code or "no error code",
            )
        except (OSError, TimeoutError, ValueError, URLError) as error:
            backend_status = "OFFLINE"
            LOGGER.warning(
                "Monitoring API health check failed (%s).",
                type(error).__name__,
            )

    return [
        "Telegram Bot: ONLINE",
        f"Telegram Connection: {telegram_connection}",
        f"Telegram Group: {group_status}",
        f"Telegram Group Connection: {group_connection}",
        f"Backend ecukur: {backend_status}",
        f"Supabase: {supabase_status}",
        f"Payment Monitoring: {payment_monitoring_status}",
        f"Payment Provider: {provider_status}",
        f"PayHook Android: {payhook_status}",
    ]


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or not await _require_admin(update):
        return

    lines = await _service_status_lines(context)
    await update.message.reply_text("\n".join(lines))


def _monitoring_api_error_text(error: MonitoringAPIError) -> str:
    if error.status == 0:
        return (
            "API monitoring belum dikonfigurasi. Isi BACKEND_API_URL dan "
            "BACKEND_API_KEY di payment-monitor/.env."
        )
    if error.status in {401, 403}:
        return (
            "Akses API monitoring ditolak. Pastikan BACKEND_API_KEY di bot "
            "sama dengan konfigurasi server."
        )
    if error.code == "ALERT_HISTORY_NOT_CONFIGURED":
        return (
            "Riwayat alert belum tersedia karena penyimpanan alert belum "
            "disiapkan. Database tidak diubah."
        )
    if error.code == "PAYMENT_NOT_FOUND":
        return "Transaksi dengan reference tersebut tidak ditemukan."
    if error.status == 404:
        return "Endpoint monitoring belum ter-deploy. Deploy perubahan API terlebih dahulu."
    if error.status == 503:
        return (
            "Backend menerima permintaan, tetapi Supabase atau konfigurasi "
            "monitoring belum siap."
        )
    return "Backend monitoring gagal memproses permintaan. Coba lagi nanti."


async def _run_monitoring_command(
    update: Update,
    action: str,
    params: dict[str, str] | None = None,
) -> dict[str, object] | None:
    if update.message is None or not await _require_admin(update):
        return None

    try:
        return await asyncio.to_thread(_monitoring_api_get, action, params)
    except MonitoringAPIError as error:
        await update.message.reply_text(_monitoring_api_error_text(error))
    except (OSError, TimeoutError, ValueError, URLError) as error:
        LOGGER.warning(
            "Monitoring request failed (%s).", type(error).__name__
        )
        await update.message.reply_text(
            "Backend monitoring tidak dapat dihubungi atau merespons data "
            "yang tidak valid. Coba lagi nanti."
        )
    return None


def _payment_item_lines(
    item: dict[str, object], index: int
) -> list[str]:
    reference = item.get("reference_id")
    status_value = item.get("status")
    amount = item.get("total_amount")
    created_at = item.get("created_at")
    if not isinstance(reference, str) or not isinstance(status_value, str):
        return []

    lines = [f"{index}. {reference} — {status_value}"]
    if isinstance(amount, (int, float)) and not isinstance(amount, bool):
        lines.append(f"   Nominal: Rp{amount:,.0f}")
    if isinstance(created_at, str) and len(created_at) <= 64:
        lines.append(f"   Dibuat: {created_at}")
    return lines


async def _send_payment_list(
    update: Update,
    action: str,
    heading: str,
) -> None:
    payload = await _run_monitoring_command(update, action)
    if payload is None or update.message is None:
        return

    items = payload.get("items")
    if not isinstance(items, list):
        await update.message.reply_text(
            "Backend mengembalikan format daftar yang tidak dikenal."
        )
        return
    valid_items = [item for item in items if isinstance(item, dict)]
    count = payload.get("count")
    total = count if isinstance(count, int) else len(valid_items)
    if not valid_items:
        await update.message.reply_text(f"{heading}\nBelum ada data.")
        return

    lines = [f"{heading} (menampilkan {len(valid_items)} dari {total}):"]
    for index, item in enumerate(valid_items, start=1):
        lines.extend(_payment_item_lines(item, index))
    await update.message.reply_text("\n".join(lines))


async def transactions(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    await _send_payment_list(update, "transactions", "Transaksi terbaru")


async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or not await _require_admin(update):
        return

    await update.message.reply_text(
        "Informasi saldo belum tersedia karena sumber data resmi belum terhubung.\n"
        "Balance information is not available because an official data source "
        "is not connected."
    )


async def groupid(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or update.effective_chat is None:
        return

    await update.message.reply_text(
        f"ID grup Telegram: <code>{update.effective_chat.id}</code>",
        parse_mode=ParseMode.HTML,
    )


async def send_group_notification(message: str) -> bool:
    global _group_connection_verified

    if not TELEGRAM_GROUP_ID:
        LOGGER.warning(
            "Telegram group notification skipped: group ID is not configured."
        )
        return False

    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        LOGGER.error(
            "Telegram group notification skipped: bot token is not configured."
        )
        return False

    try:
        async with Bot(token=token) as bot:
            await bot.send_message(
                chat_id=TELEGRAM_GROUP_ID,
                text=message,
                parse_mode=ParseMode.HTML,
            )
    except TelegramError as error:
        _group_connection_verified = False
        LOGGER.warning(
            "Telegram group notification failed (%s).", type(error).__name__
        )
        return False

    _group_connection_verified = True
    LOGGER.info("Telegram group notification sent successfully.")
    return True


async def testgroup(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    if update.message is None or not await _require_admin(update):
        return

    if update.effective_chat is None or update.effective_chat.type != ChatType.PRIVATE:
        await update.message.reply_text(
            "Gunakan /testgroup melalui private chat dengan bot.\n"
            "Use /testgroup in a private chat with the bot."
        )
        return

    if not TELEGRAM_GROUP_ID:
        await update.message.reply_text(
            "TELEGRAM_GROUP_ID belum dikonfigurasi. Tambahkan ID grup ke file "
            "payment-monitor/.env lalu mulai ulang bot.\n"
            "TELEGRAM_GROUP_ID is not configured. Add the group ID to "
            "payment-monitor/.env and restart the bot."
        )
        return

    sent = await send_group_notification(
        "<b>Pesan pengujian ecukur Payment Monitor</b>\n"
        "Telegram Group notification is working."
    )
    if sent:
        await update.message.reply_text(
            "Pesan pengujian berhasil dikirim ke grup.\n"
            "The test message was sent to the group."
        )
    else:
        await update.message.reply_text(
            "Pesan gagal dikirim. Pastikan bot sudah bergabung ke grup, "
            "memiliki izin mengirim pesan, dan TELEGRAM_GROUP_ID sudah benar.\n"
            "The message could not be sent. Check that the bot joined the group, "
            "has permission to send messages, and TELEGRAM_GROUP_ID is correct."
        )


async def today(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    payload = await _run_monitoring_command(update, "today")
    if payload is None or update.message is None:
        return

    counts = payload.get("counts")
    if not isinstance(counts, dict):
        await update.message.reply_text(
            "Backend mengembalikan format ringkasan yang tidak dikenal."
        )
        return
    date = payload.get("date", "hari ini")
    status_order = (
        "PENDING",
        "PAYMENT_DETECTED",
        "PAID",
        "EXPIRED",
        "FAILED",
        "REVIEW_REQUIRED",
        "CANCELLED",
    )
    lines = [f"Ringkasan pembayaran {date} (Asia/Jakarta):"]
    lines.extend(
        f"{status}: {counts.get(status, 0)}"
        for status in status_order
    )
    await update.message.reply_text("\n".join(lines))


async def pending(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_payment_list(update, "pending", "Pembayaran pending")


async def failed(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_payment_list(
        update,
        "failed",
        "Pembayaran gagal/kedaluwarsa/dibatalkan",
    )


async def alerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    payload = await _run_monitoring_command(update, "alerts")
    if payload is not None and update.message is not None:
        await update.message.reply_text(
            "Backend belum menyediakan riwayat alert."
        )


async def details(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or not await _require_admin(update):
        return
    if len(context.args) != 1:
        await update.message.reply_text("Gunakan: /details REF")
        return

    reference = context.args[0].strip()
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,128}", reference):
        await update.message.reply_text("Reference tidak valid.")
        return

    payload = await _run_monitoring_command(
        update,
        "details",
        {"referenceId": reference},
    )
    if payload is None or update.message is None:
        return

    payment = payload.get("payment")
    if not isinstance(payment, dict):
        await update.message.reply_text(
            "Backend mengembalikan detail transaksi yang tidak dikenal."
        )
        return

    status_value = payment.get("status")
    allowed_statuses = {
        "PENDING",
        "PAYMENT_DETECTED",
        "PAID",
        "EXPIRED",
        "FAILED",
        "REVIEW_REQUIRED",
        "CANCELLED",
    }
    if not isinstance(status_value, str) or status_value not in allowed_statuses:
        await update.message.reply_text(
            "Backend tidak mengembalikan status pembayaran yang valid."
        )
        return

    result_lines = [
        f"Reference: {reference}",
        f"Status: {status_value}",
    ]
    amount = payment.get("total_amount")
    if isinstance(amount, (int, float)) and not isinstance(amount, bool):
        result_lines.append(f"Nominal: Rp{amount:,.0f}")
    payment_type = payment.get("type")
    if payment_type in {"BOOKING", "TIP"}:
        result_lines.append(f"Tipe: {payment_type}")
    created_at = payment.get("created_at")
    if isinstance(created_at, str) and len(created_at) <= 64:
        result_lines.append(f"Dibuat: {created_at}")
    expires_at = payment.get("expires_at")
    if isinstance(expires_at, str) and len(expires_at) <= 64:
        result_lines.append(f"Kedaluwarsa: {expires_at}")
    paid_at = payment.get("paid_at")
    if (
        isinstance(paid_at, str)
        and len(paid_at) <= 64
        and all(character.isprintable() for character in paid_at)
    ):
        result_lines.append(f"Paid at: {paid_at}")
    result_lines.append(
        "Catatan: status ini berasal dari data QRIS backend; monitoring provider "
        "independen belum tersedia."
    )
    await update.message.reply_text("\n".join(result_lines))


async def health(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or not await _require_admin(update):
        return

    lines = await _service_status_lines(context)
    lines.append(
        f"Pending alert threshold: {PAYMENT_PENDING_ALERT_MINUTES} minutes "
        "(not active until a trusted payment event source is connected)"
    )
    await update.message.reply_text("\n".join(lines))


async def handle_error(
    update: object, context: ContextTypes.DEFAULT_TYPE
) -> None:
    error_name = type(context.error).__name__ if context.error else "UnknownError"
    LOGGER.error(
        "An error occurred while processing a Telegram update (%s).", error_name
    )


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    admin_ids = os.getenv("TELEGRAM_ADMIN_IDS", "").strip()
    if not token:
        LOGGER.error(
            "TELEGRAM_BOT_TOKEN is not configured. Add it to payment-monitor/.env."
        )
        raise SystemExit(1)
    if not admin_ids:
        LOGGER.error(
            "TELEGRAM_ADMIN_IDS is not configured. Add it to payment-monitor/.env."
        )
        raise SystemExit(1)

    application = (
        Application.builder()
        .token(token)
        .connect_timeout(30)
        .read_timeout(30)
        .write_timeout(30)
        .pool_timeout(30)
        .build()
    )
    handlers = {
        "start": start,
        "help": help_command,
        "status": status,
        "transactions": transactions,
        "balance": balance,
        "groupid": groupid,
        "testgroup": testgroup,
        "today": today,
        "pending": pending,
        "failed": failed,
        "alerts": alerts,
        "details": details,
        "health": health,
    }
    for command, handler in handlers.items():
        application.add_handler(CommandHandler(command, handler))
    application.add_error_handler(handle_error)

    LOGGER.info("Starting ecukur Payment Monitor polling.")
    application.run_polling(
        bootstrap_retries=-1,
        allowed_updates=Update.ALL_TYPES,
    )


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    main()
