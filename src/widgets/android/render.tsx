/**
 * JSX widget layouts for react-native-android-widget. This file has a
 * top-level `import ... from 'react-native-android-widget'`, which is only
 * safe because it is *never* reached from the app's normal startup import
 * graph — the package's native module throws the instant it's imported if
 * unlinked (as in Expo Go), so every path into this file (the custom
 * index.js entry, and bridge.ts's push) uses a guarded, deferred
 * `require()` rather than a static import. See bridge.ts for the full
 * explanation.
 */
import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@/src/widgets/snapshot';
import { CAPY_FACE_SVG } from './capy-face';

const BROWN = '#823D00';
const CREAM = '#FFF8EF';
const GREY = '#6B6B6B';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function renderBatteryWidget(batteryPercent: number | null) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: CREAM,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <SvgWidget svg={CAPY_FACE_SVG} style={{ height: 56, width: 54 }} />
      <TextWidget
        text={batteryPercent != null ? `${batteryPercent}%` : '—'}
        style={{ fontSize: 18, fontWeight: '700', color: BROWN, marginTop: 4 }}
      />
    </FlexWidget>
  );
}

export function renderClockWidget(snapshot: WidgetSnapshot) {
  const remainingText =
    snapshot.status === 'running' && snapshot.phaseEndAt != null
      ? formatRemaining(snapshot.phaseEndAt - Date.now())
      : null;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: CREAM,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <SvgWidget svg={CAPY_FACE_SVG} style={{ height: 44, width: 42 }} />
      <TextWidget
        text={snapshot.phaseLabel}
        style={{ fontSize: 11, color: GREY, marginTop: 4 }}
      />
      {remainingText && (
        <TextWidget
          text={remainingText}
          style={{ fontSize: 20, fontWeight: '700', color: BROWN }}
        />
      )}
    </FlexWidget>
  );
}
