import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useStore } from '../store';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_MESSAGES = [];

const formatMessageTime = (value) => new Date(value).toLocaleTimeString('id-ID', {
  hour: '2-digit',
  minute: '2-digit'
});

const formatConversationTime = (value) => value
  ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  : '';

const getChatErrorMessage = (error) => {
  if (
    error?.code === 'PGRST205'
    || error?.message?.includes("Could not find the table 'public.conversations'")
    || error?.message?.includes("Could not find the table 'public.messages'")
  ) {
    return 'Tabel chat belum tersedia. Jalankan backend/chat_migration.sql di Supabase SQL Editor setelah setup skema, lalu muat ulang halaman.';
  }

  return error?.message || 'Terjadi kesalahan saat memuat chat.';
};

export default function Messages({ barberMode = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authUser = useStore((state) => state.authUser);
  const isAppLoading = useStore((state) => state.isLoading);
  const ensureAnonymousCustomerSession = useStore((state) => state.ensureAnonymousCustomerSession);
  const requestedBarberId = searchParams.get('barberId') || '';
  const requestedConversationId = searchParams.get('conversationId') || '';
  const returnTo = barberMode
    ? '/barber/messages'
    : `/messages${requestedBarberId && UUID_PATTERN.test(requestedBarberId) ? `?barberId=${encodeURIComponent(requestedBarberId)}` : ''}`;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadedConversationId, setLoadedConversationId] = useState('');
  const [account, setAccount] = useState(null);
  const [pageReady, setPageReady] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const messageListRef = useRef(null);
  const selectedConversationId = conversations.some(
    (conversation) => conversation.id === requestedConversationId
  ) ? requestedConversationId : '';
  const routeError = requestedBarberId && !UUID_PATTERN.test(requestedBarberId)
    ? 'Identitas barber tidak valid.'
    : requestedConversationId && !UUID_PATTERN.test(requestedConversationId)
      ? 'Identitas percakapan tidak valid.'
      : '';

  const loadConversations = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (queryError) throw new Error(getChatErrorMessage(queryError));
    setConversations(data || []);
    return data || [];
  }, [setConversations]);

  const loadMessages = useCallback(async (conversationId) => {
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (queryError) {
      setMessages([]);
      setLoadedConversationId(conversationId);
      throw new Error(getChatErrorMessage(queryError));
    }

    setMessages(data || []);
    setLoadedConversationId(conversationId);

    const { error: readError } = await supabase.rpc('mark_conversation_read', {
      conversation_uuid: conversationId
    });
    if (readError) throw new Error(getChatErrorMessage(readError));
  }, [setLoadedConversationId, setMessages]);

  useEffect(() => {
    if (isAppLoading) return undefined;
    if (!authUser) {
      if (barberMode) {
        navigate(`/login?audience=barber&returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        return undefined;
      }

      let active = true;
      ensureAnonymousCustomerSession().then((result) => {
        if (!active) return;
        if (!result.success) {
          setError(result.error);
          setPageReady(true);
        }
      });

      return () => {
        active = false;
      };
    }
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let active = true;
    const loadAccount = async () => {
      setError('');
      setPageReady(false);
      if (barberMode) {
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (userError) throw userError;
        if (!userProfile) throw new Error('Profil akun tidak ditemukan. Silakan hubungi pengelola E-KeCukur.');
        const role = String(userProfile.role || '').toUpperCase();
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('id, user_id, name, profile_photo, account_status')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (barberError) throw barberError;
        if (role !== 'BARBER' || !barber) {
          throw new Error('Inbox ini hanya tersedia untuk akun barber atau capster yang terhubung ke profil.');
        }
        if (active) setAccount({ ...barber, role, userId: authUser.id });
      } else {
        if (authUser.is_anonymous) {
          if (active) setAccount({ name: 'Pelanggan', role: 'CUSTOMER', userId: authUser.id });
        } else {
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', authUser.id)
            .maybeSingle();

          if (userError) throw userError;
          if (!userProfile) throw new Error('Profil akun tidak ditemukan. Silakan hubungi pengelola E-KeCukur.');
          const role = String(userProfile.role || '').toUpperCase();
          if (role === 'BARBER') {
            throw new Error('Inbox barber hanya dapat dibuka dari dashboard akun barber. Untuk konsultasi sebagai pelanggan, keluar dari akun barber terlebih dahulu.');
          }
          if (role !== 'CUSTOMER') {
            throw new Error('Akun ini bukan akun pelanggan dan tidak dapat membuka konsultasi.');
          }
          if (active) setAccount({ name: userProfile.name, role, userId: authUser.id });
        }
      }

      await loadConversations();
      if (active) setPageReady(true);
    };

    loadAccount().catch((loadError) => {
      if (!active) return;
      setError(getChatErrorMessage(loadError));
      setPageReady(true);
    });

    return () => {
      active = false;
    };
  }, [authUser, barberMode, ensureAnonymousCustomerSession, isAppLoading, loadConversations, navigate, returnTo]);

  useEffect(() => {
    if (!pageReady || barberMode || !authUser || !requestedBarberId) return undefined;
    if (!UUID_PATTERN.test(requestedBarberId)) {
      return undefined;
    }

    let active = true;
    const openOrCreate = async () => {
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, user_id, name, profile_photo, account_status')
        .eq('user_id', requestedBarberId)
        .eq('account_status', 'ACTIVE')
        .maybeSingle();

      if (barberError) throw barberError;
      if (!barber) throw new Error('Profil barber tidak terhubung ke akun aktif untuk menerima konsultasi.');
      if (barber.user_id === authUser.id) {
        navigate('/barber/messages', { replace: true });
        return;
      }

      let { data: conversation, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', authUser.id)
        .eq('barber_id', barber.user_id)
        .maybeSingle();

      if (findError) throw findError;
      if (!conversation) {
        const { data: inserted, error: insertError } = await supabase
          .from('conversations')
          .insert({ customer_id: authUser.id, barber_id: barber.user_id })
          .select('*')
          .single();

        if (insertError?.code === '23505') {
          const existing = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', authUser.id)
            .eq('barber_id', barber.user_id)
            .single();
          if (existing.error) throw existing.error;
          conversation = existing.data;
        } else if (insertError) {
          throw insertError;
        } else {
          conversation = inserted;
        }
      }

      if (!active || !conversation) return;
      await loadConversations();
      navigate(`/messages?conversationId=${encodeURIComponent(conversation.id)}`, { replace: true });
    };

    openOrCreate().catch((openError) => {
      if (active) setError(getChatErrorMessage(openError));
    });

    return () => {
      active = false;
    };
  }, [authUser, barberMode, loadConversations, navigate, pageReady, requestedBarberId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );
  const messagesLoading = Boolean(selectedConversationId && selectedConversationId !== loadedConversationId);
  const visibleMessages = selectedConversationId === loadedConversationId ? messages : EMPTY_MESSAGES;

  useEffect(() => {
    if (!selectedConversationId || !pageReady) return undefined;
    let active = true;

    loadMessages(selectedConversationId).then(loadConversations).catch((loadError) => {
      if (active) setError(getChatErrorMessage(loadError));
    });

    const channel = supabase
      .channel(`chat:${selectedConversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversationId}`
      }, () => {
        loadMessages(selectedConversationId).then(loadConversations).catch((loadError) => {
          if (active) setError(getChatErrorMessage(loadError));
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('offline');
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadConversations, loadMessages, pageReady, selectedConversationId]);

  useEffect(() => {
    if (!pageReady) return undefined;

    const channel = supabase
      .channel(`chat-inbox:${authUser?.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, () => {
        loadConversations().catch((loadError) => {
          setError(getChatErrorMessage(loadError));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id, loadConversations, pageReady]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const selectConversation = (conversation) => {
    setError('');
    const basePath = barberMode ? '/barber/messages' : '/messages';
    navigate(`${basePath}?conversationId=${encodeURIComponent(conversation.id)}`);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = messageText.trim();
    if (!body || !selectedConversation || !authUser || sending) return;
    if (body.length > 4000) {
      setError('Pesan maksimal 4.000 karakter.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: authUser.id,
          body
        });
      if (sendError) throw sendError;
      setMessageText('');
      await Promise.all([
        loadMessages(selectedConversation.id),
        loadConversations()
      ]);
    } catch (loadError) {
      setError(getChatErrorMessage(loadError));
    } finally {
      setSending(false);
    }
  };

  const otherParticipant = (conversation) => barberMode
    ? { name: conversation.customer_name || 'Pelanggan', photo: conversation.customer_photo || '' }
    : { name: conversation.barber_name || 'Barber', photo: conversation.barber_photo || '' };

  const unreadCount = (conversation) => barberMode
    ? conversation.barber_unread_count
    : conversation.customer_unread_count;

  const currentParticipant = selectedConversation ? otherParticipant(selectedConversation) : null;

  if (isAppLoading || !pageReady) {
    if (!isSupabaseConfigured && authUser && !isAppLoading) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-[#F7F6F2] p-6">
          <p role="alert" className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Supabase belum dikonfigurasi. Percakapan belum dapat dimuat.
          </p>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F7F6F2] text-neutral-500">
        <LoaderCircle className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Memuat percakapan...</span>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] min-h-[480px] bg-[#F7F6F2] text-[#171717] flex flex-col">
      <header className="h-16 shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between">
        <Link to={barberMode ? '/barber/dashboard' : '/'} className="flex items-center gap-2 text-sm font-bold">
          <span className="w-8 h-8 rounded-xl bg-[#285844] text-white flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </span>
          <span>E-KeCukur <span className="text-neutral-400 font-medium">/ Pesan</span></span>
        </Link>
        {barberMode && account && (
          <span className="hidden sm:block text-xs text-neutral-500">Inbox {account.name}</span>
        )}
      </header>

      <section className="flex-1 min-h-0 p-0 md:p-5 lg:p-7">
        <div className="h-full max-w-7xl mx-auto bg-white md:border md:border-neutral-200 md:rounded-2xl md:shadow-sm overflow-hidden flex">
          <aside className={`${selectedConversationId && !barberMode ? 'hidden' : selectedConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] lg:w-[360px] shrink-0 flex-col border-r border-neutral-200`}>
            <div className="px-5 py-4 border-b border-neutral-100">
              <h1 className="text-lg font-bold">Percakapan</h1>
              <p className="text-xs text-neutral-500 mt-1">
                {barberMode ? 'Konsultasi yang masuk ke profilmu' : 'Konsultasi dengan barber pilihanmu'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <MessageCircle className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-neutral-700">Belum ada percakapan</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {barberMode ? 'Pesan dari pelanggan akan tampil di sini.' : 'Buka profil barber untuk memulai konsultasi.'}
                  </p>
                </div>
              ) : conversations.map((conversation) => {
                const participant = otherParticipant(conversation);
                const unread = Number(unreadCount(conversation)) || 0;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation)}
                    className={`w-full px-4 py-3.5 flex items-center gap-3 text-left border-b border-neutral-100 hover:bg-[#F7FAF8] transition-colors ${
                      selectedConversationId === conversation.id ? 'bg-[#F0F6F2]' : 'bg-white'
                    }`}
                  >
                    {participant.photo ? (
                      <img src={participant.photo} alt="" className="w-11 h-11 rounded-full object-cover bg-neutral-100" />
                    ) : (
                      <span className="w-11 h-11 rounded-full bg-[#E7EFE9] text-[#285844] flex items-center justify-center font-bold">
                        {(participant.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{participant.name}</span>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {formatConversationTime(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-500 truncate">
                          {conversation.last_message || 'Mulai konsultasi'}
                        </span>
                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-[#285844] text-white text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`${selectedConversationId || !barberMode ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
            {selectedConversation && currentParticipant ? (
              <>
                <header className="h-[68px] shrink-0 border-b border-neutral-200 px-4 sm:px-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(barberMode ? '/barber/messages' : '/messages');
                    }}
                    className="md:hidden w-9 h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
                    aria-label="Kembali ke daftar percakapan"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {currentParticipant.photo ? (
                    <img src={currentParticipant.photo} alt="" className="w-10 h-10 rounded-full object-cover bg-neutral-100" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-[#E7EFE9] text-[#285844] flex items-center justify-center font-bold">
                      {(currentParticipant.name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">{currentParticipant.name}</h2>
                    <p className="text-[11px] text-neutral-500">
                      {realtimeStatus === 'connected' ? 'Pembaruan langsung aktif' : 'Pembaruan langsung tidak tersedia'}
                    </p>
                  </div>
                </header>

                {(routeError || error) && (
                  <p role="alert" className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-100">
                    {routeError || error}
                  </p>
                )}

                <div ref={messageListRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 space-y-3 bg-[#FCFDFC]">
                  {messagesLoading && visibleMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                      <LoaderCircle className="w-4 h-4 animate-spin mr-2" /> Memuat pesan...
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="h-full min-h-40 flex flex-col items-center justify-center text-center">
                      <MessageCircle className="w-8 h-8 text-[#8BA797] mb-3" />
                      <p className="text-sm font-semibold">Percakapan dimulai di sini</p>
                      <p className="text-xs text-neutral-500 mt-1">Kirim pertanyaan pertama untuk memulai konsultasi.</p>
                    </div>
                  ) : visibleMessages.map((message) => {
                    const isOwnMessage = message.sender_id === authUser?.id;
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                          isOwnMessage
                            ? 'bg-[#285844] text-white rounded-br-md'
                            : 'bg-white border border-neutral-200 text-[#171717] rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isOwnMessage ? 'text-emerald-100' : 'text-neutral-400'
                          }`}>
                            <span>{formatMessageTime(message.created_at)}</span>
                            {isOwnMessage && (message.read_at
                              ? <CheckCheck className="w-3 h-3" />
                              : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={sendMessage} className="shrink-0 p-3 sm:p-4 border-t border-neutral-200 bg-white">
                  {(routeError || error) && <p role="alert" className="text-xs text-red-700 mb-2">{routeError || error}</p>}
                  <div className="flex items-end gap-2 max-w-5xl mx-auto">
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      maxLength={4000}
                      rows={1}
                      placeholder="Tulis pesan..."
                      aria-label="Tulis pesan"
                      className="min-h-11 max-h-32 flex-1 resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none focus:border-[#285844] focus:ring-2 focus:ring-[#285844]/10"
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="w-11 h-11 shrink-0 rounded-xl bg-[#285844] hover:bg-[#1E4334] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Kirim pesan"
                    >
                      {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="max-w-5xl mx-auto text-[10px] text-neutral-400 mt-1.5">Enter untuk mengirim · Shift+Enter untuk baris baru</p>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                {routeError || error ? (
                  <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
                    {routeError || error}
                  </div>
                ) : (
                  <>
                    <span className="w-14 h-14 rounded-2xl bg-[#E7EFE9] text-[#285844] flex items-center justify-center mb-4">
                      <MessageCircle className="w-7 h-7" />
                    </span>
                    <h2 className="font-bold">Pilih percakapan</h2>
                    <p className="text-sm text-neutral-500 mt-1">Pesan dan balasan akan tampil di ruang ini.</p>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
