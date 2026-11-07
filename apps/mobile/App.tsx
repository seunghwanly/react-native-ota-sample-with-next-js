import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import RNFS from 'react-native-fs';

// Android 에뮬레이터는 호스트 PC의 localhost를 10.0.2.2로 봄
const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const OTA_DIR = `${RNFS.DocumentDirectoryPath}/ota`;

interface OTAScreen {
  version: string;
  html: string;
}

function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}

async function saveScreen(screen: string, data: OTAScreen): Promise<void> {
  const screenDir = `${OTA_DIR}/${screen}`;

  await RNFS.mkdir(screenDir); // 상위 디렉토리까지 생성됨

  // HTML을 먼저 쓰고 version.txt를 마지막에 갱신해야
  // 중간에 실패해도 version.txt가 없는 파일을 가리키지 않음
  await RNFS.writeFile(`${screenDir}/${data.version}.html`, data.html, 'utf8');
  await RNFS.writeFile(`${screenDir}/version.txt`, data.version, 'utf8');

  // 이전 버전 HTML 정리
  const files = await RNFS.readDir(screenDir);
  await Promise.all(
    files
      .filter(
        f => f.name.endsWith('.html') && f.name !== `${data.version}.html`,
      )
      .map(f => RNFS.unlink(f.path)),
  );
}

async function loadSavedScreen(screen: string): Promise<OTAScreen | null> {
  try {
    const screenDir = `${OTA_DIR}/${screen}`;
    const versionFilePath = `${screenDir}/version.txt`;

    if (!(await RNFS.exists(versionFilePath))) return null;

    const version = (await RNFS.readFile(versionFilePath, 'utf8')).trim();
    const htmlFilePath = `${screenDir}/${version}.html`;

    if (!(await RNFS.exists(htmlFilePath))) return null;

    const html = await RNFS.readFile(htmlFilePath, 'utf8');
    return { version, html };
  } catch (error) {
    console.error('Error loading saved screen:', error);
    return null;
  }
}

async function fetchRemoteScreen(screen: string): Promise<OTAScreen | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/screens/${screen}`);
    if (!response.ok) {
      console.warn(`Server responded with ${response.status}`);
      return null;
    }
    return (await response.json()) as OTAScreen;
  } catch (error) {
    console.warn('Error fetching remote screen:', error);
    return null;
  }
}

/**
 * 서버 버전을 우선 사용하고, 로컬보다 새로우면 저장한다.
 * 서버에 닿지 못하면 마지막으로 저장된 버전으로 폴백한다.
 */
async function fetchScreen(screen: string): Promise<OTAScreen | null> {
  const [remote, saved] = await Promise.all([
    fetchRemoteScreen(screen),
    loadSavedScreen(screen),
  ]);

  if (!remote) {
    if (saved) console.warn(`Offline: showing saved v${saved.version}`);
    return saved;
  }

  if (!saved || compareVersions(saved.version, remote.version) < 0) {
    try {
      await saveScreen(screen, remote);
    } catch (error) {
      // 저장 실패해도 받은 화면은 보여줌
      console.error('Error saving screen:', error);
    }
  }

  return remote;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [screen, setScreen] = useState<OTAScreen | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchScreen('home').then(result => {
      if (cancelled) return;
      if (result) setScreen(result);
      else setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!screen) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>{failed ? '화면을 불러오지 못했어요.' : '불러오는 중...'}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}
    >
      <WebView
        source={{ html: screen.html }}
        originWhitelist={['*']}
        style={styles.container}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
