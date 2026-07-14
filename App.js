import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  Platform,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId ?? '';
const TIKTOK_CLIENT_KEY = Constants.expoConfig?.extra?.tiktokClientKey ?? '';
const INSTAGRAM_CLIENT_ID = Constants.expoConfig?.extra?.instagramClientId ?? '';
const TELEGRAM_BOT_USERNAME = Constants.expoConfig?.extra?.telegramBotUsername ?? '';

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const performanceCards = [
  { label: 'Запланированные посты', value: '24', change: '+8 за неделю' },
  { label: 'Опубликовано', value: '182', change: '+12.4%' },
  { label: 'Вовлечённость', value: '18.9K', change: '+4.2%' },
];

const initialQueue = [
  {
    id: '1',
    title: 'Тизер запуска AI-студии контента',
    platform: 'X + LinkedIn',
    time: 'Сегодня · 18:30',
    status: 'В очереди',
  },
  {
    id: '2',
    title: 'Еженедельная карусель: советы по росту',
    platform: 'Instagram',
    time: 'Завтра · 10:00',
    status: 'Черновик',
  },
  {
    id: '3',
    title: 'Тред с журналом изменений продукта',
    platform: 'X',
    time: 'Завтра · 14:45',
    status: 'Одобрено',
  },
];

const defaultChannels = [
  { id: '1', name: 'X', handle: '@postbridge', color: '#111827', status: 'Подключено' },
  { id: '2', name: 'Instagram', handle: '@postbridge.ai', color: '#E1306C', status: 'Подключено' },
  { id: '3', name: 'LinkedIn', handle: 'PostBridge Inc.', color: '#0A66C2', status: 'Подключено' },
  { id: '4', name: 'Threads', handle: '@postbridge', color: '#FFFFFF', status: 'Подключено' },
];

const availablePlatforms = [
  { name: 'TikTok', color: '#000000' },
  { name: 'Google', color: '#4285F4' },
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'Telegram', color: '#26A5E4' },
  { name: 'VK', color: '#4680C2' },
  { name: 'Pinterest', color: '#E60023' },
  { name: 'Reddit', color: '#FF4500' },
  { name: 'Twitch', color: '#9146FF' },
];

const tabs = ['Главная', 'Создать', 'Календарь', 'Аккаунты', 'Аналитика'];

function isConfiguredValue(value, placeholder) {
  return Boolean(value && value !== placeholder);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Главная');
  const [queue, setQueue] = useState(initialQueue);
  const [topic, setTopic] = useState('Запуск AI-продукта для авторов');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [statusMessage, setStatusMessage] = useState('Главная панель готова.');
  const [channels, setChannels] = useState(defaultChannels);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [newHandle, setNewHandle] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('Короткий промо-ролик для нового поста');
  const [videoSource, setVideoSource] = useState('');
  const [videoStatus, setVideoStatus] = useState('Видео ещё не запускалось.');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'postbridge',
    path: 'callback',
  });
  const hasGoogleClientId = isConfiguredValue(
    GOOGLE_CLIENT_ID,
    'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
  );
  const hasTikTokClientKey = isConfiguredValue(
    TIKTOK_CLIENT_KEY,
    'YOUR_TIKTOK_CLIENT_KEY'
  );
  const hasInstagramClientId = isConfiguredValue(
    INSTAGRAM_CLIENT_ID,
    'YOUR_INSTAGRAM_CLIENT_ID'
  );
  const hasTelegramBotUsername = isConfiguredValue(
    TELEGRAM_BOT_USERNAME,
    'YOUR_TELEGRAM_BOT_USERNAME'
  );

  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/youtube'],
      usePKCE: true,
    },
    googleDiscovery
  );

  const [tiktokRequest, tiktokResponse, promptTiktokAsync] = AuthSession.useAuthRequest(
    {
      clientId: TIKTOK_CLIENT_KEY,
      redirectUri,
      scopes: ['user.info.basic', 'video.publish'],
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    {
      authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
    }
  );

  const instagramDiscovery = {
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
  };

  const [instagramRequest, instagramResponse, promptInstagramAsync] = AuthSession.useAuthRequest(
    {
      clientId: INSTAGRAM_CLIENT_ID,
      redirectUri,
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
      usePKCE: true,
    },
    instagramDiscovery
  );

  const analytics = useMemo(() => {
    const scheduled = queue.filter((item) => item.status === 'В очереди').length;
    const drafts = queue.filter((item) => item.status === 'Черновик').length;
    const approved = queue.filter((item) => item.status === 'Одобрено').length;

    return { scheduled, drafts, approved };
  }, [queue]);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      const alreadyConnected = channels.some((ch) => ch.name === 'Google');
      if (!alreadyConnected) {
        setChannels((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            name: 'Google',
            handle: 'Аккаунт Google',
            color: '#4285F4',
            status: 'Подключено',
            tokens: { accessToken: authentication?.accessToken },
          },
        ]);
      }
      setConnectingPlatform(null);
      setStatusMessage('Google-аккаунт успешно подключён!');
    } else if (googleResponse?.type === 'error') {
      setConnectingPlatform(null);
      setStatusMessage('Ошибка подключения Google: ' + (googleResponse.error?.message || 'Неизвестная ошибка'));
    }
  }, [googleResponse]);

  useEffect(() => {
    if (tiktokResponse?.type === 'success') {
      const { authentication } = tiktokResponse;
      const alreadyConnected = channels.some((ch) => ch.name === 'TikTok');
      if (!alreadyConnected) {
        setChannels((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            name: 'TikTok',
            handle: 'Аккаунт TikTok',
            color: '#000000',
            status: 'Подключено',
            tokens: { accessToken: authentication?.accessToken },
          },
        ]);
      }
      setConnectingPlatform(null);
      setStatusMessage('TikTok-аккаунт успешно подключён!');
    } else if (tiktokResponse?.type === 'error') {
      setConnectingPlatform(null);
      const errorText = tiktokResponse.error?.message || 'Неизвестная ошибка';
      const needsConfigHelp = /client_key|redirect/i.test(errorText);
      setStatusMessage(
        needsConfigHelp
          ? `Ошибка подключения TikTok: ${errorText}. Проверьте expo.extra.tiktokClientKey и redirect URI ${redirectUri} в настройках TikTok.`
          : 'Ошибка подключения TikTok: ' + errorText
      );
    }
  }, [channels, redirectUri, tiktokResponse]);

  useEffect(() => {
    if (instagramResponse?.type === 'success') {
      const { authentication } = instagramResponse;
      const alreadyConnected = channels.some((ch) => ch.name === 'Instagram');
      if (!alreadyConnected) {
        setChannels((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            name: 'Instagram',
            handle: 'Аккаунт Instagram',
            color: '#E1306C',
            status: 'Подключено',
            tokens: { accessToken: authentication?.accessToken },
          },
        ]);
      }
      setConnectingPlatform(null);
      setStatusMessage('Instagram-аккаунт успешно подключён!');
    } else if (instagramResponse?.type === 'error') {
      setConnectingPlatform(null);
      const errorText = instagramResponse.error?.message || 'Неизвестная ошибка';
      const needsConfigHelp = /client_id|redirect/i.test(errorText);
      setStatusMessage(
        needsConfigHelp
          ? `Ошибка подключения Instagram: ${errorText}. Проверьте expo.extra.instagramClientId и redirect URI ${redirectUri} в настройках Meta Developer.`
          : 'Ошибка подключения Instagram: ' + errorText
      );
    }
  }, [channels, redirectUri, instagramResponse]);

  async function connectGoogle() {
    setConnectingPlatform('Google');
    try {
      const result = await promptGoogleAsync();
      if (result?.type !== 'success') {
        setConnectingPlatform(null);
        setStatusMessage('Подключение Google отменено.');
      }
    } catch (e) {
      setConnectingPlatform(null);
      setStatusMessage('Ошибка: ' + e.message);
    }
  }

  async function connectTikTok() {
    if (!hasTikTokClientKey) {
      const errorMessage = 'TikTok client_key не настроен. Укажите expo.extra.tiktokClientKey в app.json.';
      setConnectingPlatform(null);
      setStatusMessage(errorMessage);
      Alert.alert('TikTok не настроен', `${errorMessage}\n\nRedirect URI для TikTok: ${redirectUri}`);
      return;
    }

    if (!tiktokRequest) {
      const errorMessage = 'TikTok OAuth-запрос ещё не готов. Повторите попытку через пару секунд.';
      setConnectingPlatform(null);
      setStatusMessage(errorMessage);
      return;
    }

    setConnectingPlatform('TikTok');
    try {
      const result = await promptTiktokAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') {
        setConnectingPlatform(null);
        setStatusMessage('Подключение TikTok отменено.');
        return;
      }

      if (result?.type !== 'success') {
        setConnectingPlatform(null);
        setStatusMessage('Не удалось войти в TikTok. Проверьте client_key и redirect URI в настройках приложения TikTok.');
      }
    } catch (e) {
      setConnectingPlatform(null);
      setStatusMessage('Ошибка подключения TikTok: ' + e.message);
    }
  }

  async function connectInstagram() {
    if (!hasInstagramClientId) {
      const errorMessage = 'Instagram client_id не настроен. Укажите expo.extra.instagramClientId в app.json.';
      setConnectingPlatform(null);
      setStatusMessage(errorMessage);
      Alert.alert('Instagram не настроен', `${errorMessage}\n\nRedirect URI для Instagram: ${redirectUri}\n\nНастройте приложение в Meta Developer Portal и добавьте redirect URI.`);
      return;
    }

    if (!instagramRequest) {
      const errorMessage = 'Instagram OAuth-запрос ещё не готов. Повторите попытку через пару секунд.';
      setConnectingPlatform(null);
      setStatusMessage(errorMessage);
      return;
    }

    setConnectingPlatform('Instagram');
    try {
      const result = await promptInstagramAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') {
        setConnectingPlatform(null);
        setStatusMessage('Подключение Instagram отменено.');
        return;
      }

      if (result?.type !== 'success') {
        setConnectingPlatform(null);
        setStatusMessage('Не удалось войти в Instagram. Проверьте client_id и redirect URI в настройках Meta Developer.');
      }
    } catch (e) {
      setConnectingPlatform(null);
      setStatusMessage('Ошибка подключения Instagram: ' + e.message);
    }
  }

  async function connectTelegram() {
    if (!hasTelegramBotUsername) {
      const errorMessage = 'Telegram бот не настроен. Укажите expo.extra.telegramBotUsername в app.json.';
      setConnectingPlatform(null);
      setStatusMessage(errorMessage);
      Alert.alert('Telegram не настроен', `${errorMessage}\n\nСоздайте бота через @BotFather в Telegram и укажите его username.`);
      return;
    }

    setConnectingPlatform('Telegram');
    try {
      const botUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=postbridge`;
      const supported = await Linking.canOpenURL(botUrl);
      if (supported) {
        await Linking.openURL(botUrl);
        const alreadyConnected = channels.some((ch) => ch.name === 'Telegram');
        if (!alreadyConnected) {
          setChannels((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              name: 'Telegram',
              handle: `@${TELEGRAM_BOT_USERNAME}`,
              color: '#26A5E4',
              status: 'Подключено',
            },
          ]);
        }
        setConnectingPlatform(null);
        setStatusMessage('Telegram-бот открыт. Подтвердите подключение в Telegram.');
      } else {
        setConnectingPlatform(null);
        setStatusMessage('Не удалось открыть Telegram. Установите приложение Telegram на устройство.');
      }
    } catch (e) {
      setConnectingPlatform(null);
      setStatusMessage('Ошибка подключения Telegram: ' + e.message);
    }
  }

  function createNewPost() {
    setActiveTab('Создать');
    setStatusMessage('Переход на экран создания. Начните черновик следующего поста.');
  }

  function generateCaption() {
    const nextCaption = `Хук: ${topic}\n\nPostBridge помогает командам создать текст один раз, адаптировать его для всех площадок и автоматически публиковать в лучшее время.\n\n#socialmedia #contentops #ai`;
    setGeneratedCaption(nextCaption);
    setActiveTab('Создать');
    setStatusMessage('AI-подпись сгенерирована. Проверьте её на экране создания.');
  }

  function optimizeSchedule() {
    setQueue((current) =>
      current.map((item, index) =>
        index === 0 ? { ...item, time: 'Завтра · 19:00', status: 'Одобрено' } : item
      )
    );
    setStatusMessage('Верхний пост из очереди перенесён на вечерний слот с высокой вовлечённостью.');
  }

  function openQueueItem(item) {
    setTopic(item.title);
    setGeneratedCaption(`${item.title}\n\nНабор платформ: ${item.platform}. Готово к финальной проверке и публикации.`);
    if (item.video) {
      setSelectedVideo({ uri: item.video.uri });
      setVideoSource(item.video.name);
    } else {
      setSelectedVideo(null);
      setVideoSource('');
    }
    setActiveTab('Создать');
    setStatusMessage(`Открыт материал "${item.title}" на экране создания.`);
  }

  function addAccount() {
    if (!selectedPlatform || !newHandle.trim()) return;
    const platform = availablePlatforms.find((p) => p.name === selectedPlatform);
    setChannels((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: platform.name,
        handle: newHandle.trim(),
        color: platform.color,
        status: 'Подключено',
      },
    ]);
    setSelectedPlatform(null);
    setNewHandle('');
    setShowAddAccount(false);
    setStatusMessage(`${platform.name} успешно добавлен.`);
  }

  function quickConnectAccount(platformName, defaultHandle) {
    const alreadyAdded = channels.some((ch) => ch.name === platformName);
    if (alreadyAdded) {
      setStatusMessage(`${platformName} уже подключён.`);
      return;
    }

    const platform = availablePlatforms.find((p) => p.name === platformName);
    if (!platform) return;

    setChannels((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: platform.name,
        handle: defaultHandle,
        color: platform.color,
        status: 'Подключено',
      },
    ]);
    setStatusMessage(`${platform.name} успешно привязан.`);
  }

  function generateVideo() {
    const trimmedSource = videoSource.trim();
    const source = selectedVideo ? selectedVideo.uri : trimmedSource;

    if (!videoPrompt.trim() && !source) {
      const errorMessage = 'Добавьте сценарий или загрузите видео перед запуском.';
      setVideoStatus(errorMessage);
      setStatusMessage(errorMessage);
      return;
    }

    const successMessage = source
      ? `Генерация видео запущена: ${videoPrompt}. Источник: ${source}.`
      : `Генерация видео запущена: ${videoPrompt}.`;

    setVideoStatus(successMessage);
    setStatusMessage(successMessage);
  }

  async function pickVideo() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setStatusMessage('Нужно разрешение на доступ к медиатеке для выбора видео.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const video = result.assets[0];
      setSelectedVideo(video);
      setVideoSource(video.uri.split('/').pop());
      setStatusMessage('Видео выбрано: ' + (video.uri.split('/').pop()));
    }
  }

  function removeSelectedVideo() {
    setSelectedVideo(null);
    setVideoSource('');
    setStatusMessage('Выбранное видео удалено.');
  }

  function removeAccount(id) {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
    setStatusMessage('Аккаунт отключён.');
  }

  function renderDashboard() {
    return (
      <>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Добрый вечер</Text>
            <Text style={styles.pageTitle}>Главная</Text>
          </View>
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>PB</Text>
          </View>
        </View>

        <View style={styles.noticeBar}>
          <Text style={styles.noticeText}>{statusMessage}</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>РАБОЧЕЕ ПРОСТРАНСТВО</Text>
            </View>
            <Text style={styles.heroKpi}>96%</Text>
          </View>
          <Text style={styles.heroTitle}>Все контент-операции в одном месте</Text>
          <Text style={styles.heroSubtitle}>
            Следите за черновиками, запланированными постами и подключёнными каналами на всех этапах публикации.
          </Text>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={createNewPost}>
              <Text style={styles.primaryButtonText}>Новый пост</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButtonDark} onPress={generateCaption}>
              <Text style={styles.secondaryButtonDarkText}>AI-генерация</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Обзор</Text>
        <View style={styles.performanceGrid}>
          {performanceCards.map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{card.label}</Text>
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricChange}>{card.change}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Очередь публикаций</Text>
          <TouchableOpacity onPress={() => setStatusMessage('Очередь только что обновлена.')}>
            <Text style={styles.linkText}>Обновить</Text>
          </TouchableOpacity>
        </View>

        {queue.map((item) => (
          <TouchableOpacity key={item.id} style={styles.queueCard} onPress={() => openQueueItem(item)}>
            <View style={styles.rowBetween}>
              <View style={styles.statusChipWrap}>
                <View
                  style={[
                    styles.statusChip,
                    item.status === 'В очереди'
                      ? styles.queuedBg
                      : item.status === 'Одобрено'
                        ? styles.approvedBg
                        : styles.draftBg,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      item.status === 'В очереди'
                        ? styles.queuedText
                        : item.status === 'Одобрено'
                          ? styles.approvedText
                          : styles.draftText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.queueTime}>{item.time}</Text>
            </View>
            <Text style={styles.queueTitle}>{item.title}</Text>
            <View style={styles.queueMetaRow}>
              <Text style={styles.queueMeta}>{item.platform}</Text>
              {item.video && (
                <View style={styles.videoIndicator}>
                  <Text style={styles.videoIndicatorText}>🎥 Видео</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Подключённые каналы</Text>
          <TouchableOpacity onPress={() => setActiveTab('Аккаунты')}>
            <Text style={styles.linkText}>Управлять</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.channelsCard}>
          {channels.map((channel) => (
            <View key={channel.name} style={styles.channelRow}>
              <View style={styles.channelLeft}>
                <View style={[styles.channelIcon, { backgroundColor: channel.color }]}>
                  <Text style={[styles.channelIconText, channel.name === 'Threads' && styles.threadsIconText]}>
                    {channel.name.slice(0, 1)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  <Text style={styles.channelHandle}>{channel.handle}</Text>
                </View>
              </View>
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>{channel.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightEyebrow}>AI-ИНСАЙТ</Text>
          <Text style={styles.insightTitle}>Лучшее окно для публикации — 18:00–20:00</Text>
          <Text style={styles.insightText}>
            Вовлечённость в X и LinkedIn растёт вечером. Перенесите завтрашние посты из очереди в этот слот.
          </Text>
          <TouchableOpacity style={styles.insightButton} onPress={optimizeSchedule}>
            <Text style={styles.insightButtonText}>Оптимизировать расписание</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderCreate() {
    return (
      <>
        <Text style={styles.pageTitle}>Создать пост</Text>
        <Text style={styles.screenSubtitle}>Подготовьте контент и сгенерируйте AI-подписи.</Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>О чём этот пост?</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Напишите тему"
            placeholderTextColor="#66779D"
            style={styles.textInput}
            multiline
          />

          <View style={styles.heroActionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={generateCaption}>
              <Text style={styles.primaryButtonText}>Сгенерировать</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButtonDark}
              onPress={() => {
                setQueue((current) => [
                  {
                    id: String(Date.now()),
                    title: topic,
                    platform: 'Рабочая область черновиков',
                    time: 'Сохранено только что',
                    status: 'Черновик',
                    video: selectedVideo ? { uri: selectedVideo.uri, name: videoSource } : null,
                  },
                  ...current,
                ]);
                setSelectedVideo(null);
                setActiveTab('Главная');
                setStatusMessage('Черновик сохранён в очередь публикаций.');
              }}
            >
              <Text style={styles.secondaryButtonDarkText}>Сохранить черновик</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Сгенерированная подпись</Text>
          <Text style={styles.generatedText}>
            {generatedCaption || 'Нажмите «Сгенерировать», чтобы создать AI-подпись.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Загрузить видео</Text>
          <Text style={styles.screenHint}>
            Выберите видео из галереи устройства для прикрепления к посту.
          </Text>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={pickVideo}>
              <Text style={styles.primaryButtonText}>Выбрать видео</Text>
            </TouchableOpacity>
            {selectedVideo && (
              <TouchableOpacity style={styles.secondaryButtonDark} onPress={removeSelectedVideo}>
                <Text style={styles.secondaryButtonDarkText}>Удалить</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedVideo && (
            <View style={styles.videoPreviewContainer}>
              <Video
                source={{ uri: selectedVideo.uri }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode={Video.RESIZE_MODE_CONTAIN}
                shouldPlay={false}
              />
              <Text style={styles.videoFileName}>{videoSource}</Text>
            </View>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Сгенерировать видео</Text>
          <Text style={styles.screenHint}>
            Добавьте сценарий ролика и при необходимости загрузите видео из галереи как источник.
          </Text>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Сценарий / идея ролика</Text>
          <TextInput
            value={videoPrompt}
            onChangeText={setVideoPrompt}
            placeholder="Опишите видео"
            placeholderTextColor="#66779D"
            style={styles.textInput}
            multiline
          />

          <View style={styles.heroActionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={generateVideo}>
              <Text style={styles.primaryButtonText}>Запустить видео</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.videoStatusBox}>
            <Text style={styles.videoStatusLabel}>Статус видео</Text>
            <Text style={styles.generatedText}>{videoStatus}</Text>
          </View>
        </View>
      </>
    );
  }

  function renderCalendar() {
    return (
      <>
        <Text style={styles.pageTitle}>Календарь</Text>
        <Text style={styles.screenSubtitle}>Ближайшие окна публикации и блоки расписания.</Text>
        <View style={styles.formCard}>
          {queue.map((item) => (
            <View key={item.id} style={styles.calendarRow}>
              <Text style={styles.calendarTime}>{item.time}</Text>
              <View style={styles.calendarDivider} />
              <View style={styles.calendarContent}>
                <Text style={styles.calendarTitle}>{item.title}</Text>
                <Text style={styles.calendarMeta}>{item.platform}</Text>
              </View>
            </View>
          ))}
        </View>
      </>
    );
  }

  function renderAccounts() {
    const isGoogleConnected = channels.some((ch) => ch.name === 'Google');
    const isTikTokConnected = channels.some((ch) => ch.name === 'TikTok');
    const isInstagramConnected = channels.some((ch) => ch.name === 'Instagram');
    const isTelegramConnected = channels.some((ch) => ch.name === 'Telegram');

    return (
      <>
        <Text style={styles.pageTitle}>Аккаунты</Text>
        <Text style={styles.screenSubtitle}>Подключённые социальные профили и доступ к публикации.</Text>

        <View style={styles.oauthSection}>
          <Text style={styles.sectionTitle}>Быстрая привязка</Text>

          <TouchableOpacity
            style={[styles.oauthCard, isGoogleConnected && styles.oauthCardConnected]}
            onPress={isGoogleConnected ? null : connectGoogle}
            disabled={isGoogleConnected || connectingPlatform !== null}
          >
            <View style={styles.oauthCardLeft}>
              <View style={[styles.oauthIcon, { backgroundColor: '#4285F4' }]}>
                <Text style={styles.oauthIconText}>G</Text>
              </View>
              <View>
                <Text style={styles.oauthName}>Google</Text>
                <Text style={styles.oauthDesc}>
                  {isGoogleConnected ? 'Подключено' : 'YouTube, Gmail, Календарь'}
                </Text>
              </View>
            </View>
            {isGoogleConnected ? (
              <View style={styles.oauthConnectedBadge}>
                <Text style={styles.oauthConnectedText}>✓</Text>
              </View>
            ) : (
              <View style={styles.oauthConnectBadge}>
                <Text style={styles.oauthConnectText}>
                  {connectingPlatform === 'Google' ? '...' : 'Подключить'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthCard, isTikTokConnected && styles.oauthCardConnected]}
            onPress={isTikTokConnected ? null : connectTikTok}
            disabled={isTikTokConnected || connectingPlatform !== null}
          >
            <View style={styles.oauthCardLeft}>
              <View style={[styles.oauthIcon, { backgroundColor: '#000000' }]}>
                <Text style={styles.oauthIconText}>T</Text>
              </View>
              <View>
                <Text style={styles.oauthName}>TikTok</Text>
                <Text style={styles.oauthDesc}>
                  {isTikTokConnected ? 'Подключено' : 'Публикация видео и аналитика'}
                </Text>
              </View>
            </View>
            {isTikTokConnected ? (
              <View style={styles.oauthConnectedBadge}>
                <Text style={styles.oauthConnectedText}>✓</Text>
              </View>
            ) : (
              <View style={styles.oauthConnectBadge}>
                <Text style={styles.oauthConnectText}>
                  {connectingPlatform === 'TikTok' ? '...' : 'Подключить'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthCard, isInstagramConnected && styles.oauthCardConnected]}
            onPress={isInstagramConnected ? null : connectInstagram}
            disabled={isInstagramConnected || connectingPlatform !== null}
          >
            <View style={styles.oauthCardLeft}>
              <View style={[styles.oauthIcon, { backgroundColor: '#E1306C' }]}>
                <Text style={styles.oauthIconText}>I</Text>
              </View>
              <View>
                <Text style={styles.oauthName}>Instagram</Text>
                <Text style={styles.oauthDesc}>
                  {isInstagramConnected ? 'Подключено' : 'Публикация постов и сторис'}
                </Text>
              </View>
            </View>
            {isInstagramConnected ? (
              <View style={styles.oauthConnectedBadge}>
                <Text style={styles.oauthConnectedText}>✓</Text>
              </View>
            ) : (
              <View style={styles.oauthConnectBadge}>
                <Text style={styles.oauthConnectText}>
                  {connectingPlatform === 'Instagram' ? '...' : 'Подключить'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthCard, isTelegramConnected && styles.oauthCardConnected]}
            onPress={isTelegramConnected ? null : connectTelegram}
            disabled={isTelegramConnected || connectingPlatform !== null}
          >
            <View style={styles.oauthCardLeft}>
              <View style={[styles.oauthIcon, { backgroundColor: '#26A5E4' }]}>
                <Text style={styles.oauthIconText}>Tg</Text>
              </View>
              <View>
                <Text style={styles.oauthName}>Telegram</Text>
                <Text style={styles.oauthDesc}>
                  {isTelegramConnected ? 'Подключено' : 'Публикация в каналы и группы'}
                </Text>
              </View>
            </View>
            {isTelegramConnected ? (
              <View style={styles.oauthConnectedBadge}>
                <Text style={styles.oauthConnectedText}>✓</Text>
              </View>
            ) : (
              <View style={styles.oauthConnectBadge}>
                <Text style={styles.oauthConnectText}>
                  {connectingPlatform === 'Telegram' ? '...' : 'Подключить'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addAccountButton} onPress={() => setShowAddAccount(true)}>
          <Text style={styles.addAccountButtonText}>+ Добавить аккаунт вручную</Text>
        </TouchableOpacity>

        {showAddAccount && (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Выберите платформу</Text>
            <View style={styles.platformGrid}>
              {availablePlatforms.map((platform) => {
                const alreadyAdded = channels.some((ch) => ch.name === platform.name);
                return (
                  <TouchableOpacity
                    key={platform.name}
                    style={[
                      styles.platformOption,
                      selectedPlatform === platform.name && styles.platformOptionActive,
                      alreadyAdded && styles.platformOptionDisabled,
                    ]}
                    onPress={() => {
                      if (!alreadyAdded) setSelectedPlatform(platform.name);
                    }}
                    disabled={alreadyAdded}
                  >
                    <View style={[styles.channelIcon, { backgroundColor: platform.color, width: 32, height: 32, borderRadius: 10 }]}>
                      <Text style={[styles.channelIconText, { fontSize: 12 }]}>{platform.name.slice(0, 1)}</Text>
                    </View>
                    <Text style={[styles.platformOptionText, alreadyAdded && styles.platformOptionTextDisabled]}>
                      {platform.name}
                    </Text>
                    {alreadyAdded && <Text style={styles.alreadyAddedText}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedPlatform && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Введите аккаунт / хэндл</Text>
                <TextInput
                  value={newHandle}
                  onChangeText={setNewHandle}
                  placeholder={`@ваш_ник или название`}
                  placeholderTextColor="#66779D"
                  style={styles.textInput}
                />
                <View style={styles.heroActionsRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={addAccount}>
                    <Text style={styles.primaryButtonText}>Подключить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButtonDark}
                    onPress={() => {
                      setSelectedPlatform(null);
                      setNewHandle('');
                      setShowAddAccount(false);
                    }}
                  >
                    <Text style={styles.secondaryButtonDarkText}>Отмена</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.channelsCard}>
          {channels.map((channel) => (
            <View key={channel.id} style={styles.channelRow}>
              <View style={styles.channelLeft}>
                <View style={[styles.channelIcon, { backgroundColor: channel.color }]}>
                  <Text style={[styles.channelIconText, channel.name === 'Threads' && styles.threadsIconText]}>
                    {channel.name.slice(0, 1)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  <Text style={styles.channelHandle}>{channel.handle}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => removeAccount(channel.id)}
              >
                <Text style={styles.disconnectButtonText}>Отключить</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </>
    );
  }

  function renderAnalytics() {
    return (
      <>
        <Text style={styles.pageTitle}>Аналитика</Text>
        <Text style={styles.screenSubtitle}>Актуальная сводка по текущему состоянию очереди.</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>В очереди</Text>
            <Text style={styles.metricValue}>{analytics.scheduled}</Text>
            <Text style={styles.metricChange}>Готово к публикации</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Черновики</Text>
            <Text style={styles.metricValue}>{analytics.drafts}</Text>
            <Text style={styles.metricChange}>Требуют проверки</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Одобрено</Text>
            <Text style={styles.metricValue}>{analytics.approved}</Text>
            <Text style={styles.metricChange}>Оптимизированные посты</Text>
          </View>
        </View>
      </>
    );
  }

  function renderActiveScreen() {
    switch (activeTab) {
      case 'Создать':
        return renderCreate();
      case 'Календарь':
        return renderCalendar();
      case 'Аккаунты':
        return renderAccounts();
      case 'Аналитика':
        return renderAnalytics();
      default:
        return renderDashboard();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appShell}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {renderActiveScreen()}
        </ScrollView>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, tab === activeTab && styles.activeTabItem]}
            >
              <Text style={[styles.tabText, tab === activeTab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09101F',
  },
  appShell: {
    flex: 1,
    backgroundColor: '#09101F',
  },
  container: {
    flex: 1,
    backgroundColor: '#09101F',
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    color: '#8FA1C7',
    fontSize: 14,
    marginBottom: 6,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  screenSubtitle: {
    color: '#9FB0D2',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 18,
  },
  profilePill: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  noticeBar: {
    backgroundColor: '#111A30',
    borderColor: '#1F2842',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  noticeText: {
    color: '#D7DEFF',
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: '#121A2E',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2842',
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveBadge: {
    backgroundColor: '#1A2644',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveBadgeText: {
    color: '#B7C5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroKpi: {
    color: '#61E294',
    fontSize: 24,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
  },
  heroSubtitle: {
    color: '#9FB0D2',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonDark: {
    flex: 1,
    backgroundColor: '#0D1426',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#212B48',
  },
  secondaryButtonDarkText: {
    color: '#D7DEFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  performanceGrid: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#121A2E',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2842',
  },
  metricLabel: {
    color: '#92A3C8',
    fontSize: 13,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  metricChange: {
    color: '#61E294',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#8D9BFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  queueCard: {
    backgroundColor: '#121A2E',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2842',
    marginBottom: 12,
  },
  statusChipWrap: {
    flexDirection: 'row',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  queuedBg: {
    backgroundColor: '#162B5C',
  },
  approvedBg: {
    backgroundColor: '#14321F',
  },
  draftBg: {
    backgroundColor: '#392B11',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  queuedText: {
    color: '#7FB3FF',
  },
  approvedText: {
    color: '#63D78E',
  },
  draftText: {
    color: '#F2C56F',
  },
  queueTime: {
    color: '#8FA1C7',
    fontSize: 13,
  },
  queueTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  queueMeta: {
    color: '#9FB0D2',
    fontSize: 14,
    marginTop: 8,
  },
  queueMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoIndicator: {
    backgroundColor: '#1A1640',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  videoIndicatorText: {
    color: '#B7C5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  channelsCard: {
    backgroundColor: '#121A2E',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2842',
    marginBottom: 24,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  threadsIconText: {
    color: '#0B1020',
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  channelHandle: {
    color: '#8FA1C7',
    fontSize: 13,
    marginTop: 4,
  },
  connectedBadge: {
    backgroundColor: '#12311E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  connectedBadgeText: {
    color: '#5ED289',
    fontSize: 12,
    fontWeight: '700',
  },
  insightCard: {
    backgroundColor: '#6C63FF',
    borderRadius: 28,
    padding: 20,
  },
  insightEyebrow: {
    color: '#D9D5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  insightText: {
    color: '#ECE9FF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 16,
  },
  insightButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  insightButtonText: {
    color: '#4B42E2',
    fontSize: 15,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#121A2E',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2842',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  textInput: {
    minHeight: 110,
    borderRadius: 18,
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
    color: '#FFFFFF',
    padding: 14,
    textAlignVertical: 'top',
  },
  singleLineInput: {
    borderRadius: 18,
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
    color: '#FFFFFF',
    padding: 14,
  },
  screenHint: {
    color: '#9FB0D2',
    fontSize: 13,
    lineHeight: 20,
  },
  generatedText: {
    color: '#D7DEFF',
    fontSize: 14,
    lineHeight: 22,
  },
  videoStatusBox: {
    marginTop: 16,
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
    borderRadius: 18,
    padding: 14,
  },
  videoStatusLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  videoPreviewContainer: {
    marginTop: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
  },
  videoPreview: {
    width: '100%',
    height: 200,
  },
  videoFileName: {
    color: '#9FB0D2',
    fontSize: 12,
    padding: 10,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  calendarTime: {
    width: 110,
    color: '#8FA1C7',
    fontSize: 13,
  },
  calendarDivider: {
    width: 2,
    height: 48,
    backgroundColor: '#6C63FF',
    borderRadius: 999,
    marginHorizontal: 12,
  },
  calendarContent: {
    flex: 1,
  },
  calendarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  calendarMeta: {
    color: '#9FB0D2',
    fontSize: 13,
    marginTop: 6,
  },
  disconnectButton: {
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disconnectButtonText: {
    color: '#D7DEFF',
    fontWeight: '700',
    fontSize: 13,
  },
  addAccountButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  addAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  oauthSection: {
    marginBottom: 18,
  },
  oauthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121A2E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2842',
    marginBottom: 10,
  },
  oauthCardConnected: {
    borderColor: '#14321F',
  },
  oauthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  oauthIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  oauthName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  oauthDesc: {
    color: '#9FB0D2',
    fontSize: 13,
    marginTop: 2,
  },
  oauthConnectBadge: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  oauthConnectText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  oauthConnectedBadge: {
    backgroundColor: '#14321F',
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthConnectedText: {
    color: '#63D78E',
    fontSize: 14,
    fontWeight: '700',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1426',
    borderWidth: 1,
    borderColor: '#212B48',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  platformOptionActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#1A1640',
  },
  platformOptionDisabled: {
    opacity: 0.4,
  },
  platformOptionText: {
    color: '#D7DEFF',
    fontSize: 13,
    fontWeight: '600',
  },
  platformOptionTextDisabled: {
    color: '#66779D',
  },
  alreadyAddedText: {
    color: '#61E294',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    backgroundColor: '#101728',
    borderRadius: 22,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1F2842',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  activeTabItem: {
    backgroundColor: '#6C63FF',
  },
  tabText: {
    color: '#8FA1C7',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});
