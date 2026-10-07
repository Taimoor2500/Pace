import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readChoices, readSnapshot, setChoice } from './storage';
import { pocketsWidget, pocketWidget } from './widgets';

/** Runs headlessly (even when the app is closed) whenever Android needs a widget drawn. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') {
    await setChoice(widgetInfo.widgetId, null);
    return;
  }
  if (widgetAction === 'WIDGET_CLICK') return; // taps use OPEN_URI and are handled by the system
  const snapshot = await readSnapshot();
  if (widgetInfo.widgetName === 'PocketWidget') {
    const choices = await readChoices();
    renderWidget(pocketWidget(snapshot, choices[widgetInfo.widgetId], widgetInfo));
  } else if (widgetInfo.widgetName === 'PocketsWidget') {
    renderWidget(pocketsWidget(snapshot, widgetInfo));
  }
}
