import {
  buildFilterString,
  computePreInvertBackground,
  generateForceStylesheetCss,
} from './engine';
import { resolveEffectiveForUrl } from './insert-css-fallback';

export async function executeMainWorldSoftFilter(
  tabId: number,
  url: string,
  filterTarget: 'html' | 'body' = 'html',
): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const filter = buildFilterString(
    effective.brightness,
    effective.contrast,
    effective.sepia,
  );
  const preInvertBg = computePreInvertBackground(effective.backgroundColor);

  try {
    await browser.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'MAIN',
      func: (filterStr: string, bg: string, mode: string, target: string) => {
        const html = document.documentElement;
        html.removeAttribute('data-truely-dark-force');
        html.setAttribute('data-truely-dark-active', mode);
        html.setAttribute('data-truely-dark-filter-target', target);
        html.style.setProperty('background-color', bg, 'important');

        html.style.removeProperty('filter');
        html.style.removeProperty('-webkit-filter');

        if (target === 'html') {
          html.style.setProperty('filter', filterStr, 'important');
          html.style.setProperty('-webkit-filter', filterStr, 'important');
        }

        if (document.body) {
          document.body.style.setProperty('background-color', bg, 'important');
          document.body.style.removeProperty('filter');
          document.body.style.removeProperty('-webkit-filter');
          if (target === 'body') {
            document.body.style.setProperty('filter', filterStr, 'important');
            document.body.style.setProperty('-webkit-filter', filterStr, 'important');
          }
        }
      },
      args: [filter, preInvertBg, effective.mode, filterTarget],
    });
    return true;
  } catch {
    return false;
  }
}

export async function executeMainWorldForceStylesheet(tabId: number, url: string): Promise<boolean> {
  const effective = await resolveEffectiveForUrl(url);
  if (!effective?.active) return false;

  const forceCss = generateForceStylesheetCss(effective);

  try {
    await browser.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'MAIN',
      func: (cssText: string, mode: string, bg: string, text: string) => {
        const html = document.documentElement;
        html.setAttribute('data-truely-dark-active', mode);
        html.setAttribute('data-truely-dark-force', 'true');
        html.setAttribute('data-truely-dark-filter-target', 'force');
        html.style.removeProperty('filter');
        html.style.removeProperty('-webkit-filter');
        html.style.setProperty('background-color', bg, 'important');
        html.style.setProperty('color', text, 'important');

        if (document.body) {
          document.body.style.removeProperty('filter');
          document.body.style.removeProperty('-webkit-filter');
          document.body.style.setProperty('background-color', bg, 'important');
          document.body.style.setProperty('color', text, 'important');
        }

        let styleEl = document.getElementById('truely-dark-force-styles');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'truely-dark-force-styles';
          const parent = document.head ?? document.documentElement;
          parent.appendChild(styleEl);
        }
        styleEl.textContent = cssText;
      },
      args: [forceCss, effective.mode, effective.backgroundColor, '#e8e8e8'],
    });
    return true;
  } catch {
    return false;
  }
}
