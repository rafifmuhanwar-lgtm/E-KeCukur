import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  Mic,
  Search,
  Send,
  Smile,
  Trash2,
  UserRound,
  X,
  Zap
} from 'lucide-react';
import { useStore } from '../store';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  BARBER_QUICK_REPLIES,
  EMOJI_OPTIONS,
  formatAudioDuration,
  getDateSeparatorLabel,
  parseMessagePayload,
  uploadChatMedia
} from '../lib/chatMedia';
import VoiceNotePlayer from '../components/chat/VoiceNotePlayer';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_MESSAGES = [];
const CUSTOMER_MESSAGE_TEMPLATES = [
  'Halo, saya ingin konsultasi model rambut yang cocok.',
  'Apakah ada jadwal kosong untuk hari ini?',
  'Terimakasih, saya sangat puas dengan hasil nya!'
];
const INVALID_CUSTOMER_NAME_WORDS = new Set([
  'abc', 'admin', 'anjing', 'anonymous', 'apple', 'asdf', 'ayam', 'bakso',
  'bantal', 'batu', 'benda', 'besi', 'bird', 'book', 'botol', 'bowl', 'chair',
  'charger', 'chicken', 'coba', 'computer', 'cow', 'cup', 'dog', 'fish', 'gelas',
  'goat', 'handphone', 'hello', 'ikan', 'kambing', 'kayu', 'keyboard', 'kelinci',
  'kertas', 'kursi', 'kucing', 'lampu', 'laptop', 'meja', 'mie', 'monitor',
  'monyet', 'mouse', 'mobil', 'motor', 'nasi', 'nama', 'orang', 'panda',
  'pelanggan', 'pintu', 'piring', 'plastik', 'phone', 'qwerty', 'rabbit', 'random',
  'roti', 'sapi', 'sendok', 'sepatu', 'table', 'tas', 'telur', 'test', 'testing',
  'tiger', 'tikus', 'wkwk'
]);
const INAPPROPRIATE_CUSTOMER_NAME_WORDS = new Set([
  'ass', 'arse', 'asshole', 'bastard', 'bitch', 'bitches', 'bullshit', 'cock',
  'cocksucker', 'crap', 'cunt', 'dick', 'dicks', 'dickhead', 'fuck', 'fucker',
  'fucking', 'motherfucker', 'piss', 'pussy', 'shit', 'shitty', 'slut', 'whore',
  'wtf', 'stfu', 'gtfo', 'lmfao', 'fml', 'ffs', 'bullsh', 'mofo', 'mf', 'smd',
  'kys', 'pos', 'sob', 'ajg', 'anjg', 'asu', 'bajingan', 'bangsat', 'bgsat',
  'bngst', 'brengsek', 'gblk', 'goblok', 'janc', 'jancuk', 'jancok', 'kampret',
  'keparat', 'kntl', 'kontl', 'kontol', 'memek', 'memk', 'mmk', 'ngewe', 'ngentot',
  'ngntd', 'ngntt', 'tai', 'tahi', 'tll', 'tolol'
]);
const INAPPROPRIATE_CUSTOMER_NAME_COMBINATIONS = new Set([
  ...INAPPROPRIATE_CUSTOMER_NAME_WORDS,
  'fuckyou', 'fuckoff', 'fucky', 'shithead', 'bullshit', 'wtf', 'stfu', 'gtfo'
]);

const validateCustomerName = (value) => {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60) return 'Nama harus terdiri dari 2–60 karakter.';
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name)) {
    return 'Gunakan huruf dan pemisah nama yang wajar; jangan gunakan angka atau simbol.';
  }

  const words = name.toLocaleLowerCase('id-ID')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .map((word) => word.replace(/[013457@$!]/g, (char) => ({
      0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's', '!': 'i'
    })[char] || char).replace(/[^a-z0-9]/g, ''));
  const compactName = words.join('');
  if (words.some((word) => INVALID_CUSTOMER_NAME_WORDS.has(word))) {
    return 'Masukkan nama orang yang akan digunakan untuk menyapamu.';
  }
  if (
    words.some((word) => INAPPROPRIATE_CUSTOMER_NAME_WORDS.has(word))
    || INAPPROPRIATE_CUSTOMER_NAME_COMBINATIONS.has(compactName)
  ) {
    return 'Nama tidak boleh mengandung kata kasar atau tidak pantas.';
  }
  if (/^(.)\1{2,}$/u.test(name.replace(/\s/g, ''))) {
    return 'Masukkan nama yang valid.';
  }
  if (words.some((word) => word.length >= 3 && !/[aeiouy]/.test(word))) {
    return 'Nama terlihat seperti teks acak. Masukkan nama yang biasa kamu gunakan.';
  }
  if (words.some((word) => /^(..+)\1+$/u.test(word) || /qwerty|asdf|zxcv|hjkl|poiuy|lkjhg/i.test(word))) {
    return 'Nama terlihat seperti teks acak. Masukkan nama yang biasa kamu gunakan.';
  }

  return '';
};

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
  const authUserId = authUser?.id;
  const isAppLoading = useStore((state) => state.isLoading);
  const ensureAnonymousCustomerSession = useStore((state) => state.ensureAnonymousCustomerSession);
  const requestedBarberId = searchParams.get('barberId') || '';
  const requestedConversationId = searchParams.get('conversationId') || '';
  const requestedProfileSlug = searchParams.get('profileSlug') || '';
  const returnTo = barberMode
    ? '/barber/messages'
    : `/messages${requestedBarberId && UUID_PATTERN.test(requestedBarberId) ? `?barberId=${encodeURIComponent(requestedBarberId)}` : ''}`;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadedConversationId, setLoadedConversationId] = useState('');
  const [account, setAccount] = useState(null);
  const [barberProfileSlug, setBarberProfileSlug] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [savingCustomerName, setSavingCustomerName] = useState(false);
  const [customerNameSaveFailed, setCustomerNameSaveFailed] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [typingStatus, setTypingStatus] = useState({ conversationId: '', userId: '' });
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.height : null
  ));

  // WhatsApp-style feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  // Image upload preview state
  const [imagePreviewFile, setImagePreviewFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Voice note recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const messageListRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingChannelReadyRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const remoteTypingTimeoutRef = useRef(null);
  const lastTypingBroadcastAtRef = useRef(0);

  // Voice note recorder refs
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Lock body scrolling when in chat to prevent mobile browser from pushing the page up
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyHeight = document.body.style.height;
    const prevBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.height = prevBodyHeight;
      document.body.style.width = prevBodyWidth;
    };
  }, []);

  const selectedConversationId = conversations.some(
    (conversation) => conversation.id === requestedConversationId
  ) ? requestedConversationId : '';
  const customerNameError = validateCustomerName(customerName);
  const savedCustomerName = authUser?.user_metadata?.name || '';
  const requiresCustomerName = !barberMode && Boolean(authUser?.is_anonymous)
    && (Boolean(validateCustomerName(savedCustomerName)) || customerNameSaveFailed);
  const routeError = requestedBarberId && !UUID_PATTERN.test(requestedBarberId)
    ? 'Identitas barber tidak valid.'
    : requestedConversationId && !UUID_PATTERN.test(requestedConversationId)
      ? 'Identitas percakapan tidak valid.'
      : '';

  const loadConversations = useCallback(async () => {
    try {
      await supabase.rpc('cleanup_expired_chat_messages', { retention_interval: '1 day' });
    } catch {
      // Abaikan error cleanup agar tidak menghalangi pemuatan obrolan
    }

    const { data, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (queryError) throw new Error(getChatErrorMessage(queryError));

    // Filter percakapan aktif dalam 24 jam terakhir (1 hari)
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const activeConversations = (data || []).filter((conv) => {
      const timestamp = conv.last_message_at || conv.created_at;
      return !timestamp || (now - new Date(timestamp).getTime()) < ONE_DAY_MS;
    });

    setConversations(activeConversations);
    return activeConversations;
  }, [setConversations]);

  const loadMessages = useCallback(async (conversationId) => {
    const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .gte('created_at', cutoffIso)
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
        if (!userProfile) throw new Error('Profil akun tidak ditemukan. Silakan hubungi pengelola E-Cukur.');
        const role = String(userProfile.role || '').toUpperCase();
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('id, user_id, name, profile_photo, account_status, slug')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (barberError) throw barberError;
        if (role !== 'BARBER' || !barber) {
          throw new Error('Inbox ini hanya tersedia untuk akun barber atau capster yang terhubung ke profil.');
        }
        if (active) setAccount({ ...barber, role, userId: authUser.id });
      } else {
        if (authUser.is_anonymous) {
          if (active) {
            setCustomerName((currentName) => currentName || authUser.user_metadata?.name || '');
            setAccount({ name: authUser.user_metadata?.name || 'Pelanggan', role: 'CUSTOMER', userId: authUser.id });
          }
        } else {
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', authUser.id)
            .maybeSingle();

          if (userError) throw userError;
          if (!userProfile) throw new Error('Profil akun tidak ditemukan. Silakan hubungi pengelola E-Cukur.');
          const role = String(userProfile.role || '').toUpperCase();
          if (role === 'BARBER') {
            throw new Error('Inbox barber hanya dapat dibuka dari dashboard akun barber. Untuk konsultasi sebagai pelanggan, keluar dari akun barber terlebih dahulu.');
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
    if (!pageReady || !barberMode) return;
    if (requestedConversationId) return;
    if (conversations.length === 0) return;

    navigate(`/barber/messages?conversationId=${encodeURIComponent(conversations[0].id)}`, { replace: true });
  }, [barberMode, conversations, navigate, pageReady, requestedConversationId]);

  useEffect(() => {
    if (!pageReady || barberMode) return undefined;
    if (requestedConversationId || !requestedBarberId || !authUser) return undefined;
    if (requiresCustomerName) return undefined;

    let active = true;

    const openOrCreate = async () => {
      setError('');
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, user_id, name, profile_photo, account_status, slug')
        .or(`user_id.eq.${requestedBarberId},id.eq.${requestedBarberId}`)
        .maybeSingle();

      if (barberError) throw barberError;
      if (!barber) throw new Error('Barber atau capster yang dipilih tidak ditemukan.');
      if (barber.account_status !== 'ACTIVE') {
        throw new Error('Barber sedang tidak aktif untuk konsultasi.');
      }

      const targetBarberId = barber.user_id || barber.id;
      if (targetBarberId === authUser.id) {
        throw new Error('Kamu tidak dapat memulai percakapan dengan akunmu sendiri.');
      }

      let { data: conversation, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', authUser.id)
        .eq('barber_id', targetBarberId)
        .maybeSingle();

      if (findError) throw findError;
      if (!conversation) {
        const clientCustomerName = authUser.user_metadata?.name || customerName || '';
        const insertPayload = {
          customer_id: authUser.id,
          barber_id: targetBarberId
        };
        if (clientCustomerName && clientCustomerName !== 'Pelanggan') {
          insertPayload.customer_name = clientCustomerName;
        }

        const { data: inserted, error: insertError } = await supabase
          .from('conversations')
          .insert(insertPayload)
          .select('*')
          .single();

        if (insertError?.code === '23505') {
          const existing = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', authUser.id)
            .eq('barber_id', targetBarberId)
            .single();
          if (existing.error) throw existing.error;
          conversation = existing.data;
        } else if (insertError) {
          throw insertError;
        } else {
          conversation = inserted;
        }
      }

      const activeName = authUser.user_metadata?.name || customerName;
      if (conversation && activeName && activeName !== 'Pelanggan' && (!conversation.customer_name || conversation.customer_name === 'Pelanggan')) {
        try {
          await supabase.rpc('update_my_chat_display_name', { display_name: activeName });
        } catch {}
        conversation.customer_name = activeName;
      }

      if (!active || !conversation) return;
      await loadConversations();
      setBarberProfileSlug(barber.slug || '');
      const profileParam = barber.slug ? `&profileSlug=${encodeURIComponent(barber.slug)}` : '';
      navigate(`/messages?conversationId=${encodeURIComponent(conversation.id)}${profileParam}`, { replace: true });
    };

    openOrCreate().catch((openError) => {
      if (active) setError(getChatErrorMessage(openError));
    });

    return () => {
      active = false;
    };
  }, [authUser, barberMode, customerName, loadConversations, navigate, pageReady, requestedBarberId, requestedConversationId, requiresCustomerName]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (barberMode || !selectedConversation) return undefined;
    let active = true;

    const loadBarberProfileSlug = async () => {
      if (requestedProfileSlug) {
        setBarberProfileSlug(requestedProfileSlug);
        return;
      }

      const { data: profileData } = await supabase
        .from('barbers')
        .select('slug')
        .or(`user_id.eq.${selectedConversation.barber_id},id.eq.${selectedConversation.barber_id}`)
        .maybeSingle();

      if (active && profileData?.slug) {
        setBarberProfileSlug(profileData.slug);
      }
    };

    loadBarberProfileSlug().catch(() => {});

    return () => {
      active = false;
    };
  }, [barberMode, requestedProfileSlug, selectedConversation]);

  const profilePath = barberProfileSlug
    ? `/${encodeURIComponent(barberProfileSlug)}`
    : '/customer/barbers';
  const messagesLoading = Boolean(selectedConversationId && selectedConversationId !== loadedConversationId);
  const visibleMessages = selectedConversationId === loadedConversationId ? messages : EMPTY_MESSAGES;

  // Filter messages when search is active
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return visibleMessages;
    const q = searchQuery.toLowerCase();
    return visibleMessages.filter((msg) => {
      const payload = parseMessagePayload(msg);
      return payload.text.toLowerCase().includes(q);
    });
  }, [searchQuery, visibleMessages]);

  const broadcastTypingStatus = useCallback((isTyping) => {
    const channel = typingChannelRef.current;
    if (!channel || !typingChannelReadyRef.current || !authUserId) return;

    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: authUserId, isTyping }
    }).catch(() => {});
  }, [authUserId]);

  const broadcastReaction = useCallback((messageId, reactions) => {
    const channel = typingChannelRef.current;
    if (!channel || !typingChannelReadyRef.current) return;

    channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { messageId, reactions }
    }).catch(() => {});
  }, []);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 120);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const handleMessageInput = (event) => {
    setMessageText(event.target.value);
    adjustTextareaHeight();
    const now = Date.now();
    if (now - lastTypingBroadcastAtRef.current >= 700) {
      broadcastTypingStatus(true);
      lastTypingBroadcastAtRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTypingStatus(false);
      lastTypingBroadcastAtRef.current = 0;
    }, 1400);
  };

  useEffect(() => {
    if (!selectedConversationId || !pageReady) return undefined;
    let active = true;

    const syncCurrentMessages = async () => {
      try {
        await loadMessages(selectedConversationId);
        if (active) await loadConversations();
      } catch (loadError) {
        if (active) setError(getChatErrorMessage(loadError));
      }
    };
    syncCurrentMessages();

    const channel = supabase
      .channel(`chat:${selectedConversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || typeof payload.userId !== 'string' || payload.userId === authUserId) return;
        if (payload.isTyping) {
          setTypingStatus({ conversationId: selectedConversationId, userId: payload.userId });
          if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
          remoteTypingTimeoutRef.current = setTimeout(() => {
            setTypingStatus((current) => (
              current.conversationId === selectedConversationId && current.userId === payload.userId
                ? { conversationId: '', userId: '' }
                : current
            ));
          }, 3000);
        } else {
          if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
          setTypingStatus((current) => (
            current.conversationId === selectedConversationId && current.userId === payload.userId
              ? { conversationId: '', userId: '' }
              : current
          ));
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload?.messageId && payload?.reactions) {
          setMessages((prev) => prev.map((msg) => (
            msg.id === payload.messageId
              ? { ...msg, reactions: payload.reactions }
              : msg
          )));
        }
      })
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
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          typingChannelRef.current = channel;
          typingChannelReadyRef.current = true;
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          typingChannelReadyRef.current = false;
          setRealtimeStatus('offline');
        }
      });

    return () => {
      active = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
      broadcastTypingStatus(false);
      typingChannelRef.current = null;
      typingChannelReadyRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [authUserId, broadcastTypingStatus, loadConversations, loadMessages, pageReady, selectedConversationId]);

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

  const scrollToBottom = useCallback((smooth = false) => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [visibleMessages, scrollToBottom]);

  // Handle keyboard appearance / viewport resizing on mobile devices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (vv) {
        setViewportHeight(vv.height);
      }
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      scrollToBottom(true);
    };

    const viewport = window.visualViewport;
    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);

    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollToBottom]);

  const selectConversation = (conversation) => {
    setError('');
    setReplyingTo(null);
    setSearchQuery('');
    setIsSearchOpen(false);
    const basePath = barberMode ? '/barber/messages' : '/messages';
    navigate(`${basePath}?conversationId=${encodeURIComponent(conversation.id)}`);
  };

  // ─── SEND TEXT MESSAGE (WITH OPTIONAL REPLY) ───
  const sendMessage = async (event) => {
    if (event) event.preventDefault();
    const bodyText = messageText.trim();
    if (!bodyText || !selectedConversation || !authUser || sending) return;
    if (bodyText.length > 4000) {
      setError('Pesan maksimal 4.000 karakter.');
      return;
    }

    setSending(true);
    setError('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastTypingStatus(false);
    lastTypingBroadcastAtRef.current = 0;

    const currentReply = replyingTo;
    setReplyingTo(null);

    const messagePayload = {
      text: bodyText,
      replyTo: currentReply
    };
    const bodyString = currentReply ? JSON.stringify(messagePayload) : bodyText;

    try {
      let sendError = null;
      try {
        const res = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: authUser.id,
            body: bodyString,
            reply_to: currentReply
          });
        sendError = res.error;
      } catch (insertErr) {
        sendError = insertErr;
      }

      if (sendError && sendError.code === 'PGRST204') {
        const { error: fallbackError } = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: authUser.id,
            body: bodyString
          });
        sendError = fallbackError;
      }

      if (sendError) throw sendError;

      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTimeout(() => scrollToBottom(true), 50);
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

  // ─── SEND MEDIA MESSAGE (IMAGE / VOICE NOTE) ───
  const sendMediaMessage = async ({ mediaUrl, mediaType, text = '', audioDuration = 0 }) => {
    if (!mediaUrl || !selectedConversation || !authUser) return;

    setSending(true);
    setError('');
    const currentReply = replyingTo;
    setReplyingTo(null);

    const payload = {
      text: text.trim(),
      mediaUrl,
      mediaType,
      audioDuration,
      replyTo: currentReply
    };
    const bodyString = JSON.stringify(payload);

    try {
      let sendError = null;
      try {
        const res = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: authUser.id,
            body: bodyString,
            media_url: mediaUrl,
            media_type: mediaType,
            audio_duration: audioDuration || null,
            reply_to: currentReply
          });
        sendError = res.error;
      } catch (err) {
        sendError = err;
      }

      if (sendError && sendError.code === 'PGRST204') {
        const { error: fallbackError } = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: authUser.id,
            body: bodyString
          });
        sendError = fallbackError;
      }

      if (sendError) throw sendError;

      setTimeout(() => scrollToBottom(true), 50);
      await Promise.all([
        loadMessages(selectedConversation.id),
        loadConversations()
      ]);
    } catch (err) {
      setError(getChatErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // ─── IMAGE SELECTION & UPLOAD HANDLERS ───
  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File yang dipilih harus berupa gambar.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewFile(file);
    setImagePreviewUrl(previewUrl);
    setImageCaption('');
    e.target.value = '';
  };

  const handleSendImagePreview = async () => {
    if (!imagePreviewFile || isUploadingImage) return;

    setIsUploadingImage(true);
    setError('');
    try {
      const res = await uploadChatMedia(imagePreviewFile, 'image', authUser.id);
      if (!res?.url) throw new Error('Gagal mengunggah gambar referensi.');

      await sendMediaMessage({
        mediaUrl: res.url,
        mediaType: 'image',
        text: imageCaption
      });

      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewFile(null);
      setImagePreviewUrl('');
      setImageCaption('');
    } catch (err) {
      setError(getChatErrorMessage(err));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCancelImagePreview = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewFile(null);
    setImagePreviewUrl('');
    setImageCaption('');
  };

  // ─── VOICE NOTE (VN) RECORDING HANDLERS ───
  const startRecording = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung perekaman suara.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (micErr) {
      console.warn('Microphone permission error:', micErr);
      setError('Izin mikrofon diperlukan untuk merekam pesan suara.');
    }
  };

  const stopAndSendRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !isRecording) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setIsProcessingAudio(true);

    const duration = recordingDuration;

    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        recorder.stream.getTracks().forEach((track) => track.stop());

        if (duration < 1) {
          setIsProcessingAudio(false);
          return;
        }

        const res = await uploadChatMedia(audioBlob, 'audio', authUser.id);
        if (!res?.url) throw new Error('Gagal mengunggah pesan suara.');

        await sendMediaMessage({
          mediaUrl: res.url,
          mediaType: 'audio',
          audioDuration: duration
        });
      } catch (err) {
        setError(getChatErrorMessage(err));
      } finally {
        setIsProcessingAudio(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
      }
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recorder) {
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  };

  // ─── EMOJI REACTION HANDLER ───
  const toggleReaction = async (messageId, emoji) => {
    setActiveReactionMessageId(null);
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !authUser?.id) return;

    const payload = parseMessagePayload(targetMsg);
    const currentReactions = { ...(targetMsg.reactions || payload.reactions || {}) };
    const currentList = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
    const userIndex = currentList.indexOf(authUser.id);

    if (userIndex > -1) {
      currentList.splice(userIndex, 1);
    } else {
      currentList.push(authUser.id);
    }

    if (currentList.length > 0) {
      currentReactions[emoji] = currentList;
    } else {
      delete currentReactions[emoji];
    }

    // Optimistic UI update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const parsed = parseMessagePayload(m);
      return {
        ...m,
        reactions: currentReactions,
        body: JSON.stringify({ ...parsed, reactions: currentReactions })
      };
    }));

    broadcastReaction(messageId, currentReactions);

    try {
      await supabase
        .from('messages')
        .update({ reactions: currentReactions })
        .eq('id', messageId);
    } catch (err) {
      console.warn('Update reaction error:', err);
    }
  };

  // ─── REPLY TO MESSAGE HANDLER ───
  const handleStartReply = (message, parsed) => {
    const isOwn = message.sender_id === authUser?.id;
    const senderName = isOwn ? 'Kamu' : (currentParticipant?.name || 'Lawan Bicara');
    setReplyingTo({
      id: message.id,
      text: parsed.text || (parsed.mediaType === 'image' ? '📷 Foto' : parsed.mediaType === 'audio' ? '🎤 Pesan Suara' : ''),
      senderId: message.sender_id,
      senderName,
      mediaType: parsed.mediaType,
      mediaUrl: parsed.mediaUrl
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const saveCustomerName = async (event) => {
    event.preventDefault();
    const name = customerName.trim().replace(/\s+/g, ' ');
    const validationError = validateCustomerName(name);
    if (validationError || !authUser?.is_anonymous || savingCustomerName) {
      if (validationError) setError(validationError);
      return;
    }

    setSavingCustomerName(true);
    setCustomerNameSaveFailed(false);
    setError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { ...authUser.user_metadata, name, role: 'customer' }
      });
      if (updateError) throw updateError;
      if (!data.user) throw new Error('Nama tidak berhasil disimpan pada sesi pelanggan.');
      useStore.setState({ authUser: data.user });

      try {
        await supabase.auth.refreshSession();
      } catch {}

      const { error: rpcError } = await supabase.rpc('update_my_chat_display_name', {
        display_name: name
      });
      if (rpcError) console.warn('update_my_chat_display_name error:', rpcError);

      setAccount((currentAccount) => currentAccount ? { ...currentAccount, name } : currentAccount);

      if (requestedBarberId && UUID_PATTERN.test(requestedBarberId)) {
        try {
          const { data: bData } = await supabase
            .from('barbers')
            .select('id, user_id')
            .or(`user_id.eq.${requestedBarberId},id.eq.${requestedBarberId}`)
            .maybeSingle();
          const targetId = bData?.user_id || bData?.id || requestedBarberId;

          await supabase
            .from('conversations')
            .upsert({
              customer_id: data.user.id,
              barber_id: targetId,
              customer_name: name
            }, { onConflict: 'customer_id,barber_id' });
        } catch (upsertError) {
          console.warn('Upsert conversation info:', upsertError);
        }
      }

      await loadConversations();
    } catch (saveError) {
      setCustomerNameSaveFailed(true);
      setError(getChatErrorMessage(saveError));
    } finally {
      setSavingCustomerName(false);
    }
  };

  const otherParticipant = (conversation) => barberMode
    ? {
      name: conversation.customer_name && conversation.customer_name.trim() !== '' && conversation.customer_name !== 'Pelanggan'
        ? conversation.customer_name
        : `Pelanggan #${conversation.customer_id.slice(0, 4).toUpperCase()}`,
      photo: conversation.customer_photo || ''
    }
    : { name: conversation.barber_name || 'Barber', photo: conversation.barber_photo || '' };

  const unreadCount = (conversation) => barberMode
    ? conversation.barber_unread_count
    : conversation.customer_unread_count;

  const currentParticipant = selectedConversation ? otherParticipant(selectedConversation) : null;
  const isOtherParticipantTyping = typingStatus.conversationId === selectedConversationId
    && typingStatus.userId
    && typingStatus.userId !== authUserId;

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

  if (requiresCustomerName) {
    return (
      <main
        style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
        className="fixed inset-0 w-full bg-[#F7F6F2] px-4 py-4 sm:py-8 flex items-center justify-center overflow-y-auto overscroll-contain"
      >
        <form
          onSubmit={saveCustomerName}
          className="w-full max-w-md my-auto rounded-3xl border border-[#DCE7DF] bg-white p-5 sm:p-8 shadow-[0_18px_45px_rgba(40,88,68,0.14),0_5px_12px_rgba(40,88,68,0.08)]"
        >
          <span className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7EFE9] text-[#285844] shadow-[0_3px_0_#D7E5DA]">
            <UserRound className="h-6 w-6" />
          </span>
          <h1 className="text-center text-lg sm:text-xl font-bold text-[#171717]">Sebelum mulai konsultasi</h1>
          <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm leading-relaxed text-neutral-500">
            Masukkan nama yang biasa kamu gunakan agar barber atau capster tahu siapa yang menghubunginya.
          </p>
          <label htmlFor="customer-chat-name" className="mt-5 sm:mt-6 mb-2 block text-xs sm:text-sm font-semibold text-[#285844]">
            Nama kamu
          </label>
          <input
            id="customer-chat-name"
            autoComplete="name"
            autoFocus
            maxLength={60}
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              if (error) setError('');
            }}
            placeholder="Contoh: Budi Santoso"
            className="w-full rounded-xl border border-[#D5E1D8] bg-[#F8FAF8] px-4 py-3 text-[16px] sm:text-base outline-none transition focus:border-[#72927F] focus:bg-white focus:ring-4 focus:ring-[#285844]/10"
            aria-describedby="customer-name-help"
          />
          <p id="customer-name-help" className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            Nama ini akan terlihat oleh barber/capster di percakapan. Tidak perlu login atau memberikan data lain.
          </p>
          {customerName.trim() && customerNameError && (
            <p role="alert" className="mt-2 text-xs text-red-700">{customerNameError}</p>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={Boolean(customerNameError) || savingCustomerName}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#397457] to-[#1E4334] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_0_#173829,0_7px_12px_rgba(40,88,68,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {savingCustomerName && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Lanjut ke konsultasi
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-400">
            Gunakan nama yang pantas. Tanpa verifikasi tambahan, kami tidak dapat memastikan nama ini adalah nama legalmu.
          </p>
        </form>
      </main>
    );
  }

  return (
    <main
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className="fixed inset-0 w-full overflow-hidden bg-[#F7F6F2] text-[#171717] flex flex-col"
    >
      <header className="relative z-10 h-14 sm:h-16 shrink-0 bg-gradient-to-b from-white via-white to-[#F4F8F5] border-b border-[#DCE7DF] px-3 sm:px-6 flex items-center justify-between shadow-[0_6px_18px_rgba(40,88,68,0.14),0_2px_4px_rgba(40,88,68,0.08)]">
        <Link to={barberMode ? '/barber/dashboard' : profilePath} className="flex items-center gap-2.5 text-sm font-bold">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3D765A] via-[#285844] to-[#1E4334] text-white flex items-center justify-center shadow-[0_4px_0_#173829,0_7px_14px_rgba(40,88,68,0.3)] ring-1 ring-white/70">
            <MessageCircle className="w-4 h-4" />
          </span>
          <span className="text-base font-bold tracking-tight text-[#171717] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">Pesan</span>
        </Link>
        {barberMode && account && (
          <span className="hidden sm:block text-xs text-neutral-500">Inbox {account.name}</span>
        )}
      </header>

      <section className="flex-1 min-h-0 min-w-0 p-0 md:p-4 lg:p-6 flex flex-col">
        <div className="h-full min-h-0 min-w-0 max-w-7xl mx-auto w-full bg-white md:border md:border-[#DCE7DF] md:rounded-2xl md:shadow-[0_18px_45px_rgba(40,88,68,0.12),0_5px_12px_rgba(40,88,68,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden flex flex-1">
          <aside className={`${!barberMode ? 'hidden' : selectedConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] lg:w-[360px] shrink-0 flex-col border-r border-neutral-200`}>
            <div className="relative z-[1] px-5 py-4 border-b border-[#DCE7DF] bg-gradient-to-b from-white to-[#F4F8F5] shadow-[0_4px_12px_rgba(40,88,68,0.07)]">
              <h1 className="text-lg font-bold">Percakapan</h1>
              <p className="text-xs text-neutral-500 mt-1">
                {barberMode ? 'Konsultasi 24 jam yang masuk ke profilmu' : 'Konsultasi 24 jam dengan barber pilihanmu'}
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
                    className={`relative mx-2 my-2 w-[calc(100%-1rem)] px-3.5 py-3.5 flex items-center gap-3 text-left rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
                      selectedConversationId === conversation.id
                        ? 'border-[#C9DBCE] bg-gradient-to-br from-[#F2F8F3] to-[#E7F1E9] shadow-[0_4px_0_#D7E5DA,0_8px_16px_rgba(40,88,68,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]'
                        : barberMode && unread > 0
                          ? 'border-[#C9DBCE] bg-gradient-to-br from-[#F5FAF5] to-[#EAF3EC] shadow-[0_3px_0_#D7E5DA,0_6px_14px_rgba(40,88,68,0.09)]'
                        : 'border-transparent bg-white shadow-[0_2px_0_#EEF2EE,0_4px_10px_rgba(40,88,68,0.05)] hover:border-[#DCE7DF] hover:bg-gradient-to-br hover:from-white hover:to-[#F5F9F5] hover:shadow-[0_4px_0_#E5EDE6,0_8px_14px_rgba(40,88,68,0.10)]'
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
                        <span className={`truncate text-sm ${unread > 0 && barberMode ? 'font-bold text-[#214A38]' : 'font-semibold'}`}>{participant.name}</span>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {formatConversationTime(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-500 truncate">
                          {conversation.last_message || 'Mulai konsultasi'}
                        </span>
                        {unread > 0 && (
                          <span
                            className="min-w-5 h-5 px-1.5 rounded-full bg-[#285844] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_0_#173829,0_3px_7px_rgba(40,88,68,0.2)]"
                            aria-label={`${unread} pesan baru dari ${participant.name}`}
                            title={`${unread} pesan baru`}
                          >
                            {barberMode ? unread > 99 ? '99+' : 'Baru' : unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`${selectedConversationId || !barberMode ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col relative`}>
            {selectedConversation && currentParticipant ? (
              <>
                {/* ─── CHAT HEADER WITH SEARCH & WHATSAPP STATUS ─── */}
                <header className="relative z-[2] h-[64px] sm:h-[72px] shrink-0 border-b border-[#DCE7DF] px-3 sm:px-6 flex items-center justify-between bg-gradient-to-b from-white to-[#F4F8F5] shadow-[0_5px_14px_rgba(40,88,68,0.09)]">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(barberMode ? '/barber/messages' : profilePath);
                      }}
                      className="md:hidden w-10 h-10 shrink-0 rounded-xl text-[#285844] hover:bg-[#E9F1EB] flex items-center justify-center transition-colors"
                      aria-label={barberMode ? 'Kembali ke inbox' : 'Kembali ke profil barber'}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {currentParticipant.photo ? (
                      <img src={currentParticipant.photo} alt="" className="w-10 h-10 shrink-0 rounded-full object-cover bg-neutral-100" />
                    ) : (
                      <span className="w-10 h-10 shrink-0 rounded-full bg-[#E7EFE9] text-[#285844] flex items-center justify-center font-bold">
                        {(currentParticipant.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-[#171717]">{currentParticipant.name}</h2>
                      <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-500 truncate">
                        {isOtherParticipantTyping ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span>Sedang mengetik</span>
                            <span className="inline-flex items-center gap-0.5" aria-label="Sedang mengetik">
                              {[0, 1, 2].map((dot) => (
                                <span
                                  key={dot}
                                  className="h-1 w-1 rounded-full bg-emerald-600 animate-bounce"
                                  style={{ animationDelay: `${dot * 140}ms` }}
                                />
                              ))}
                            </span>
                          </span>
                        ) : realtimeStatus === 'connected' ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <span>Online</span>
                          </span>
                        ) : (
                          <span>Pembaruan langsung offline</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen((prev) => !prev);
                        if (isSearchOpen) setSearchQuery('');
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isSearchOpen ? 'bg-[#285844] text-white' : 'text-[#285844] hover:bg-[#E9F1EB]'
                      }`}
                      title="Cari pesan"
                      aria-label="Cari pesan"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* ─── SEARCH BAR IN CHAT (FITUR 10) ─── */}
                {isSearchOpen && (
                  <div className="shrink-0 bg-[#F4F8F5] border-b border-[#DCE7DF] px-3 py-2 flex items-center gap-2 shadow-inner">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari obrolan / teks..."
                      className="flex-1 bg-white border border-[#D5E1D8] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#72927F]"
                    />
                    {searchQuery && (
                      <span className="text-[11px] text-neutral-500 shrink-0">
                        {filteredMessages.length} ditemukan
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                      aria-label="Tutup pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 24-Hour Message Retention Banner */}
                <div className="shrink-0 bg-[#EEF5F0] border-b border-[#D7E5DC] px-3.5 py-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-[#285844] shadow-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-[#397457]" />
                  <span className="truncate sm:whitespace-normal">Pesan akan terhapus setelah 24 jam untuk menjaga privasi.</span>
                </div>

                {(routeError || error) && (
                  <p role="alert" className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-100 shrink-0">
                    {routeError || error}
                  </p>
                )}

                {/* ─── MESSAGE LIST TIMELINE (WITH DATE SEPARATORS) ─── */}
                <div ref={messageListRef} className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#EAF3EC] via-[#F8FBF8] to-[#F3F5F1]">
                  {messagesLoading && visibleMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                      <LoaderCircle className="w-4 h-4 animate-spin mr-2" /> Memuat pesan...
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="h-full min-h-40 flex flex-col items-center justify-center text-center">
                      <MessageCircle className="w-8 h-8 text-[#8BA797] mb-3" />
                      <p className="text-sm font-semibold">Percakapan dimulai di sini</p>
                      <p className="text-xs text-neutral-500 mt-1">Kirim pertanyaan pertama untuk konsultasi. Pesan otomatis terhapus dalam 24 jam.</p>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-12">
                      <Search className="w-7 h-7 mb-2 opacity-50" />
                      <p className="text-xs font-semibold">Tidak ada pesan yang cocok dengan &quot;{searchQuery}&quot;</p>
                    </div>
                  ) : filteredMessages.map((message, index) => {
                    const isOwnMessage = message.sender_id === authUser?.id;
                    const parsed = parseMessagePayload(message);

                    // Fitur 11: Date Separator comparison
                    const currentDateLabel = getDateSeparatorLabel(message.created_at);
                    const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                    const prevDateLabel = prevMessage ? getDateSeparatorLabel(prevMessage.created_at) : '';
                    const showDateSeparator = currentDateLabel && currentDateLabel !== prevDateLabel;

                    const reactionsList = Object.entries(parsed.reactions || {});

                    return (
                      <React.Fragment key={message.id}>
                        {/* Date Separator Pill */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-3 select-none">
                            <span className="px-3 py-1 rounded-full bg-[#E5EDE7] text-[#285844] text-[10px] font-bold tracking-wide uppercase shadow-2xs border border-[#D5E1D8]">
                              {currentDateLabel}
                            </span>
                          </div>
                        )}

                        <div id={`msg-${message.id}`} className={`group relative flex min-w-0 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          {/* Hover / Tap Actions (Balas & Reaksi Emoji) */}
                          <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 z-10 ${
                            isOwnMessage ? '-left-20' : '-right-20'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleStartReply(message, parsed)}
                              className="w-7 h-7 rounded-full bg-white border border-[#DCE7DF] text-neutral-600 hover:text-[#285844] flex items-center justify-center shadow-xs transition"
                              title="Balas pesan ini"
                              aria-label="Balas pesan"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveReactionMessageId((prev) => prev === message.id ? null : message.id)}
                              className="w-7 h-7 rounded-full bg-white border border-[#DCE7DF] text-neutral-600 hover:text-[#285844] flex items-center justify-center shadow-xs transition"
                              title="Beri reaksi"
                              aria-label="Beri reaksi"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Emoji Reaction Selector Popup (Fitur 4) */}
                          {activeReactionMessageId === message.id && (
                            <div className={`absolute -top-11 z-20 flex items-center gap-1 bg-white border border-[#C9DBCE] rounded-full px-2 py-1 shadow-md animate-in fade-in zoom-in-95 ${
                              isOwnMessage ? 'right-0' : 'left-0'
                            }`}>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleReaction(message.id, emoji)}
                                  className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-sm transition transform hover:scale-125"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className={`max-w-[88%] sm:max-w-[70%] min-w-0 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 transition-transform duration-200 ${
                            isOwnMessage
                              ? 'bg-gradient-to-br from-[#397457] via-[#285844] to-[#214A38] text-white rounded-br-md shadow-[0_5px_0_#193B2C,0_9px_18px_rgba(40,88,68,0.23),inset_0_1px_0_rgba(255,255,255,0.18)]'
                              : 'bg-gradient-to-br from-white to-[#F7FAF7] border border-[#DCE7DF] text-[#171717] rounded-bl-md shadow-[0_4px_0_#E4EBE5,0_8px_16px_rgba(35,67,48,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]'
                          }`}>
                            {/* Quote Reply Card inside bubble (Fitur 3) */}
                            {parsed.replyTo && (
                              <div
                                onClick={() => {
                                  const targetElem = document.getElementById(`msg-${parsed.replyTo.id}`);
                                  if (targetElem) {
                                    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }}
                                className={`mb-2 rounded-xl p-2 text-xs border-l-4 cursor-pointer select-none transition ${
                                  isOwnMessage
                                    ? 'bg-black/20 border-white text-emerald-100 hover:bg-black/30'
                                    : 'bg-[#EEF5F0] border-[#285844] text-neutral-700 hover:bg-[#E5EFE8]'
                                }`}
                              >
                                <p className="font-bold text-[11px] truncate">
                                  {parsed.replyTo.senderName || 'Balasan'}
                                </p>
                                <p className="truncate text-[10.5px] opacity-90 mt-0.5">
                                  {parsed.replyTo.text || (parsed.replyTo.mediaType === 'image' ? '📷 Foto' : '🎤 Pesan Suara')}
                                </p>
                              </div>
                            )}

                            {/* Image Attachment (Fitur 1) */}
                            {parsed.mediaType === 'image' && parsed.mediaUrl && (
                              <div className="mb-2 overflow-hidden rounded-xl bg-black/5">
                                <img
                                  src={parsed.mediaUrl}
                                  alt="Foto referensi potongan rambut"
                                  onClick={() => setActiveLightboxImage(parsed.mediaUrl)}
                                  className="w-full max-h-60 sm:max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {/* Voice Note Player (Fitur 2) */}
                            {parsed.mediaType === 'audio' && parsed.mediaUrl && (
                              <VoiceNotePlayer
                                src={parsed.mediaUrl}
                                duration={parsed.audioDuration}
                                isOwnMessage={isOwnMessage}
                              />
                            )}

                            {/* Text message content with optional search highlight (Fitur 10) */}
                            {parsed.text && (
                              <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                {searchQuery && parsed.text.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                  (() => {
                                    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                    const parts = parsed.text.split(regex);
                                    return parts.map((part, i) => (
                                      regex.test(part) ? (
                                        <mark key={i} className="bg-amber-300 text-neutral-900 rounded-xs px-0.5 font-bold">
                                          {part}
                                        </mark>
                                      ) : part
                                    ));
                                  })()
                                ) : (
                                  parsed.text
                                )}
                              </p>
                            )}

                            {/* Footer: Time and Checkmarks */}
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isOwnMessage ? 'text-emerald-100' : 'text-neutral-400'
                            }`}>
                              <span>{formatMessageTime(message.created_at)}</span>
                              {isOwnMessage && (message.read_at
                                ? <CheckCheck className="w-3.5 h-3.5 text-[#43C5FF]" aria-label="Pesan sudah dibaca" />
                                : <Check className="w-3 h-3" aria-label="Pesan terkirim" />)}
                            </div>

                            {/* Emoji Reactions Pills at bottom of bubble (Fitur 4) */}
                            {reactionsList.length > 0 && (
                              <div className="mt-1 -mb-1 flex flex-wrap gap-1 pt-1 border-t border-white/10">
                                {reactionsList.map(([emoji, userIds]) => {
                                  const count = Array.isArray(userIds) ? userIds.length : 0;
                                  if (count === 0) return null;
                                  const isUserReacted = Array.isArray(userIds) && userIds.includes(authUser?.id);
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => toggleReaction(message.id, emoji)}
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                        isUserReacted
                                          ? isOwnMessage
                                            ? 'bg-white text-[#285844] shadow-xs'
                                            : 'bg-[#285844] text-white shadow-xs'
                                          : isOwnMessage
                                            ? 'bg-white/20 text-white'
                                            : 'bg-neutral-100 text-neutral-700'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span>{count}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Typing Indicator Bubble at bottom of messages (Fitur 7) */}
                  {isOtherParticipantTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-xs bg-white border border-[#DCE7DF] px-3.5 py-2 shadow-xs flex items-center gap-1.5 text-xs text-neutral-500">
                        <span className="text-[11px] font-semibold text-emerald-800">Mengetik</span>
                        <span className="inline-flex items-center gap-1">
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce"
                              style={{ animationDelay: `${dot * 140}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── QUICK REPLIES DRAWER FOR BARBERS (FITUR 9) ─── */}
                {barberMode && isQuickReplyOpen && (
                  <div className="shrink-0 bg-white border-t border-[#DCE7DF] p-3 max-h-48 overflow-y-auto shadow-md">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                      <span className="text-xs font-bold text-[#285844] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Balasan Cepat Barber
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQuickReplyOpen(false)}
                        className="text-neutral-400 hover:text-neutral-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {BARBER_QUICK_REPLIES.map((reply) => (
                        <button
                          key={reply.id}
                          type="button"
                          onClick={() => {
                            setMessageText(reply.text);
                            setIsQuickReplyOpen(false);
                            setTimeout(adjustTextareaHeight, 0);
                            textareaRef.current?.focus();
                          }}
                          className="text-left p-2 rounded-xl border border-[#DCE7DF] hover:bg-[#F2F8F3] hover:border-[#285844] transition-all text-xs"
                        >
                          <p className="font-bold text-[#171717]">{reply.title}</p>
                          <p className="text-neutral-500 text-[11px] line-clamp-1 mt-0.5">{reply.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── IMAGE PREVIEW DIALOG BEFORE SENDING (FITUR 1) ─── */}
                {imagePreviewFile && (
                  <div className="shrink-0 bg-white border-t border-[#DCE7DF] p-3 sm:p-4 shadow-lg flex items-center gap-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Pratinjau Foto"
                      className="w-16 h-16 rounded-xl object-cover border border-[#C9DBCE] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#171717] truncate">{imagePreviewFile.name}</p>
                      <input
                        type="text"
                        value={imageCaption}
                        onChange={(e) => setImageCaption(e.target.value)}
                        placeholder="Tambah keterangan foto (opsional)..."
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[#D5E1D8] text-xs outline-none focus:border-[#72927F]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelImagePreview}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-neutral-100 transition"
                        title="Batal"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={handleSendImagePreview}
                        className="px-3.5 py-2 rounded-xl bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {isUploadingImage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Kirim</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── REPLY QUOTE BANNER ABOVE INPUT (FITUR 3) ─── */}
                {replyingTo && (
                  <div className="shrink-0 bg-[#F2F8F3] border-t border-l-4 border-l-[#285844] border-t-[#DCE7DF] px-3.5 py-2 flex items-center justify-between shadow-2xs">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#285844] truncate">
                        Membalas {replyingTo.senderName}
                      </p>
                      <p className="text-xs text-neutral-600 truncate mt-0.5">
                        {replyingTo.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
                      title="Batalkan balasan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ─── CHAT INPUT & VOICE NOTE BAR ─── */}
                <form onSubmit={sendMessage} className="shrink-0 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-3 border-t border-[#DCE7DF] bg-gradient-to-b from-[#F4F8F5] to-white shadow-[0_-6px_16px_rgba(40,88,68,0.08)]">
                  {/* Hidden file input for photos */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelected}
                    className="hidden"
                  />

                  {/* Customer Quick Starter Templates */}
                  {!barberMode && visibleMessages.length === 0 && (
                    <div className="max-w-5xl min-w-0 mx-auto mb-2">
                      <p className="mb-1.5 text-[11px] font-semibold text-[#547260]">Mulai dengan pertanyaan</p>
                      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x">
                        {CUSTOMER_MESSAGE_TEMPLATES.map((template) => (
                          <button
                            key={template}
                            type="button"
                            onClick={() => {
                              setMessageText(template);
                              setTimeout(adjustTextareaHeight, 0);
                              if (textareaRef.current) textareaRef.current.focus();
                            }}
                            className="shrink-0 rounded-full border border-[#C9DBCE] bg-white px-3 py-1.5 text-left text-[11px] font-medium text-[#285844] shadow-[0_2px_0_#E0EAE2,0_4px_8px_rgba(40,88,68,0.06)] transition hover:-translate-y-0.5 hover:bg-[#F2F8F3]"
                          >
                            {template}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Row or Recording Active Row (Fitur 2) */}
                  {isRecording ? (
                    <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto py-1">
                      <div className="flex items-center gap-2 text-red-600 font-semibold text-xs animate-pulse">
                        <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                        <span>Merekam suara... {formatAudioDuration(recordingDuration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                          title="Batalkan rekaman"
                          aria-label="Batalkan rekaman"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={stopAndSendRecording}
                          className="w-10 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center shadow-md transition"
                          title="Kirim pesan suara"
                          aria-label="Kirim pesan suara"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1.5 sm:gap-2 max-w-5xl min-w-0 mx-auto">
                      {/* Barber Quick Replies Button (Fitur 9) */}
                      {barberMode && (
                        <button
                          type="button"
                          onClick={() => setIsQuickReplyOpen((prev) => !prev)}
                          className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl border flex items-center justify-center transition ${
                            isQuickReplyOpen
                              ? 'bg-[#285844] text-white border-[#285844]'
                              : 'border-[#D5E1D8] bg-white text-[#285844] hover:bg-[#F2F8F3]'
                          }`}
                          title="Balasan Cepat Barber"
                          aria-label="Balasan Cepat"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                        </button>
                      )}

                      {/* Photo Attachment Button (Fitur 1) */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl border border-[#D5E1D8] bg-white hover:bg-[#F2F8F3] text-[#285844] flex items-center justify-center transition shadow-2xs"
                        title="Kirim Foto Referensi"
                        aria-label="Kirim Foto"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      {/* Message Textarea */}
                      <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={handleMessageInput}
                        onFocus={() => {
                          setTimeout(() => scrollToBottom(true), 150);
                          setTimeout(() => scrollToBottom(true), 350);
                        }}
                        onBlur={() => {
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          broadcastTypingStatus(false);
                          lastTypingBroadcastAtRef.current = 0;
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        maxLength={4000}
                        rows={1}
                        placeholder={replyingTo ? `Balas ${replyingTo.senderName}...` : 'Tulis pesan...'}
                        aria-label="Tulis pesan"
                        className="min-h-10 sm:min-h-11 max-h-28 sm:max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-[#D5E1D8] bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-[16px] sm:text-sm leading-relaxed text-[#171717] outline-none shadow-[inset_0_2px_5px_rgba(40,88,68,0.07),0_2px_0_rgba(255,255,255,0.9)] transition focus:border-[#72927F] focus:ring-4 focus:ring-[#285844]/10"
                      />

                      {/* Voice Note Button (Fitur 2) or Send Button */}
                      {!messageText.trim() ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isProcessingAudio}
                          className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-[#285844] hover:bg-[#1E4334] text-white flex items-center justify-center shadow-[0_3px_0_#173829,0_5px_10px_rgba(40,88,68,0.22)] transition active:translate-y-0.5"
                          title="Rekam Pesan Suara"
                          aria-label="Rekam Suara"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={sending}
                          className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#397457] to-[#1E4334] hover:brightness-105 text-white flex items-center justify-center shadow-[0_3px_0_#173829,0_5px_10px_rgba(40,88,68,0.22)] transition active:translate-y-0.5 disabled:opacity-50"
                          aria-label="Kirim pesan"
                        >
                          {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}

                  <p className="max-w-5xl mx-auto text-[10px] text-neutral-400 mt-1 hidden sm:block">
                    Enter untuk mengirim · Shift+Enter untuk baris baru · Klik foto untuk memperbesar
                  </p>
                </form>

                {/* ─── FULLSCREEN LIGHTBOX MODAL (FITUR 1) ─── */}
                {activeLightboxImage && (
                  <div
                    className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setActiveLightboxImage(null)}
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={activeLightboxImage}
                        target="_blank"
                        rel="noreferrer"
                        download="foto-referensi-cukur.jpg"
                        className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center backdrop-blur-xs transition"
                        title="Buka / Unduh Gambar"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveLightboxImage(null)}
                        className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center backdrop-blur-xs transition"
                        title="Tutup"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <img
                      src={activeLightboxImage}
                      alt="Foto Referensi Fullscreen"
                      onClick={(e) => e.stopPropagation()}
                      className="max-h-[85vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
                    />
                  </div>
                )}
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
                    <h2 className="font-bold">
                      {barberMode ? 'Pilih percakapan' : 'Mulai konsultasi dari profil'}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      {barberMode
                        ? 'Pesan dan balasan akan tampil di ruang ini.'
                        : 'Buka profil barber atau capster yang ingin kamu hubungi, lalu tekan Konsultasi.'}
                    </p>
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
