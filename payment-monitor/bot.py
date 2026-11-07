import asyncio
import json
import logging
import os
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
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
        "/failed - Daftar pembayaran gagal / Failed payments (admin)\n"
        "/alerts - Riwayat masalah pembayaran / Payment issue history (admin)\n"
        "/details REF - Detail transaksi / Payment details (admin)\n"
        "/health - Kondisi layanan monitoring / Monitoring service health (admin)"
    )


def _backend_health_request() -> bool | None:
    payload = _backend_get_json("/api/health")
    if payload is None:
        return None
    return payload.get("status") == "ok"


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


def _backend_get_json(path: str) -> dict[str, object] | None:
    url = _backend_url(path)
    if url is None:
        return None

    request = Request(url, headers={"Accept": "application/json"})
    with urlopen(request, timeout=5) as response:
        payload = json.loads(response.read(4096))
        if response.status != 200 or not isinstance(payload, dict):
            raise ValueError("Backend returned an unexpected response.")
        return payload


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


def _backend_payment_details(reference: str) -> dict[str, object] | None:
    safe_reference = quote(reference, safe="")
    return _backend_get_json(
        f"/api/payment/qris/status/{safe_reference}"
    )


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

    backend_status: str
    try:
        backend_health = await asyncio.to_thread(_backend_health_request)
        if backend_health is None:
            backend_status = "NOT CONFIGURED"
        else:
            backend_status = "ONLINE" if backend_health else "OFFLINE"
    except HTTPError as error:
        if error.code in {401, 403}:
            backend_status = (
                f"UNKNOWN (HTTP {error.code}; ACCESS DENIED)"
            )
            LOGGER.warning(
                "Backend health endpoint rejected access (HTTP %s).",
                error.code,
            )
        elif error.code == 404:
            try:
                qris_available = await asyncio.to_thread(
                    _backend_qris_route_is_available
                )
            except (OSError, TimeoutError, ValueError, URLError) as probe_error:
                qris_available = False
                LOGGER.warning(
                    "Backend API route check failed (%s).",
                    type(probe_error).__name__,
                )
            if qris_available:
                backend_status = (
                    "API REACHABLE (health endpoint not deployed)"
                )
            else:
                backend_status = "OFFLINE"
                LOGGER.warning(
                    "Backend health and QRIS API routes were not found."
                )
        else:
            backend_status = "OFFLINE"
            LOGGER.warning(
                "Backend health check failed (HTTP %s).", error.code
            )
    except (OSError, TimeoutError, ValueError, URLError) as error:
        backend_status = "OFFLINE"
        LOGGER.warning(
            "Backend health check failed (%s).", type(error).__name__
        )

    return [
        "Telegram Bot: ONLINE",
        f"Telegram Connection: {telegram_connection}",
        f"Telegram Group: {group_status}",
        f"Telegram Group Connection: {group_connection}",
        f"Backend ecukur: {backend_status}",
        "Supabase: UNKNOWN (not checked by the backend health endpoint)",
        "Payment Monitoring: NOT CONNECTED",
        "Payment Provider: NOT VERIFIED",
        "PayHook Android: NOT VERIFIED",
    ]


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message is None or not await _require_admin(update):
        return

    lines = await _service_status_lines(context)
    await update.message.reply_text("\n".join(lines))


async def _data_source_unavailable(update: Update) -> None:
    if update.message is not None:
        await update.message.reply_text(
            "Riwayat lengkap belum tersedia: backend belum menyediakan endpoint "
            "daftar transaksi/alert. Tidak ada data contoh yang ditampilkan.\n"
            "Full history is unavailable because the backend has no transaction "
            "or alert list endpoint."
        )


async def transactions(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    if update.message is None or not await _require_admin(update):
        return
    await _data_source_unavailable(update)


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


async def _admin_data_command(update: Update) -> None:
    if update.message is None or not await _require_admin(update):
        return
    await _data_source_unavailable(update)


async def today(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _admin_data_command(update)


async def pending(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _admin_data_command(update)


async def failed(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _admin_data_command(update)


async def alerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _admin_data_command(update)


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

    try:
        payment = await asyncio.to_thread(
            _backend_payment_details, reference
        )
    except (OSError, TimeoutError, ValueError, URLError) as error:
        LOGGER.warning(
            "Backend payment lookup failed (%s).", type(error).__name__
        )
        await update.message.reply_text(
            "Backend tidak dapat dihubungi atau mengembalikan respons yang "
            "tidak valid. Coba lagi nanti.\n"
            "The backend is unavailable or returned an invalid response."
        )
        return

    if payment is None:
        await update.message.reply_text(
            "BACKEND_API_URL belum dikonfigurasi di payment-monitor/.env."
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
        f"Status dari backend: {status_value}",
    ]
    amount = payment.get("totalAmount")
    if isinstance(amount, (int, float)) and not isinstance(amount, bool):
        result_lines.append(f"Nominal: Rp{amount:,.0f}")
    payment_type = payment.get("type")
    if payment_type in {"BOOKING", "TIP"}:
        result_lines.append(f"Tipe: {payment_type}")
    paid_at = payment.get("paidAt")
    if (
        isinstance(paid_at, str)
        and len(paid_at) <= 64
        and all(character.isprintable() for character in paid_at)
    ):
        result_lines.append(f"Paid at: {paid_at}")
    result_lines.append(
        "Catatan: status dari endpoint backend ini belum merupakan verifikasi "
        "independen; endpoint saat ini juga dapat mengembalikan PENDING untuk "
        "reference yang tidak ditemukan."
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
