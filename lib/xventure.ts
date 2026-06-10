const BASE_URL = 'https://live.xvmindgames.com';

function formatXVentureDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  let h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d}/${m}/${y} ${String(h).padStart(2, '0')}:${min}:${sec} ${ampm}`;
}

export function buildSessionTimes(sessionDateStr: string, startTimeStr: string) {
  const [year, month, day] = sessionDateStr.split('-').map(Number);
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  const hostStart = new Date(year, month - 1, day, hours, minutes, 0);
  const hostEnd = new Date(hostStart.getTime() + 10 * 60 * 1000);
  const scoringStart = new Date(hostStart.getTime() + 15 * 60 * 1000);
  const scoringEnd = new Date(hostStart.getTime() + 20 * 60 * 1000);
  const vwStart = new Date(hostStart.getTime());
  const vwEnd = new Date(hostStart.getTime() + 60 * 60 * 1000);
  return {
    hostStart: formatXVentureDate(hostStart),
    hostEnd: formatXVentureDate(hostEnd),
    scoringStart: formatXVentureDate(scoringStart),
    scoringEnd: formatXVentureDate(scoringEnd),
    vwStart: formatXVentureDate(vwStart),
    vwEnd: formatXVentureDate(vwEnd),
  };
}

function getCsrfToken(html: string): string {
  const match = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
  if (!match) throw new Error('CSRF token not found in XVenture page');
  return match[1];
}

function mergeCookies(existing: string, newCookies: string): string {
  if (!newCookies) return existing;
  const cookieMap = new Map<string, string>();
  const parseHeader = (header: string) => {
    for (const part of header.split(/,(?=[^;]+=[^;]+;|[^;]+=)/)) {
      const [nameVal] = part.trim().split(';');
      if (nameVal && nameVal.includes('=')) {
        const eqIdx = nameVal.indexOf('=');
        const name = nameVal.substring(0, eqIdx).trim();
        cookieMap.set(name, nameVal.trim());
      }
    }
  };
  if (existing) parseHeader(existing);
  if (newCookies) parseHeader(newCookies);
  return Array.from(cookieMap.values()).join('; ');
}

export async function xventureCreateSession(params: {
  sessionTitle: string;
  companyName: string;
  dynamicUrl: string;
  sessionDate: string;
  startTime: string;
  hostIframeUrl: string;
  scoringIframeUrl: string;
  virtualWorldIframeUrl: string;
}): Promise<{ success: boolean }> {
  const username = process.env.XVENTURE_API_USER!;
  const password = process.env.XVENTURE_API_PASS!;

  // Step 1: GET login page to extract CSRF token and cookies
  const loginPageRes = await fetch(`${BASE_URL}/login`, {
    redirect: 'manual',
    headers: { 'Accept': 'text/html' },
  });
  const loginPageHtml = await loginPageRes.text();
  const loginCsrf = getCsrfToken(loginPageHtml);
  const loginSetCookie = loginPageRes.headers.get('set-cookie') || '';

  // Step 2: POST login as URL-encoded form
  const loginForm = new URLSearchParams();
  loginForm.set('__RequestVerificationToken', loginCsrf);
  loginForm.set('username', username);
  loginForm.set('password', password);
  loginForm.set('returnurl', '');

  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': loginSetCookie,
      'Accept': 'text/html',
    },
    body: loginForm.toString(),
    redirect: 'manual',
  });

  if (loginRes.status !== 302 && loginRes.status !== 200) {
    throw new Error(`XVenture login failed with status ${loginRes.status}`);
  }

  const loginRespCookie = loginRes.headers.get('set-cookie') || '';
  const sessionCookies = mergeCookies(loginSetCookie, loginRespCookie);

  // Step 3: GET create session page for fresh CSRF token
  const createPageRes = await fetch(`${BASE_URL}/session/create`, {
    headers: {
      'Cookie': sessionCookies,
      'Accept': 'text/html',
    },
    redirect: 'manual',
  });

  if (createPageRes.status === 302) {
    // Redirected away - session not established
    throw new Error('XVenture login did not establish a valid session (redirected from create page)');
  }

  const createPageHtml = await createPageRes.text();
  const createCsrf = getCsrfToken(createPageHtml);
  const createSetCookie = createPageRes.headers.get('set-cookie') || '';
  const finalCookies = mergeCookies(sessionCookies, createSetCookie);

  // Step 4: Build formatted times
  const times = buildSessionTimes(params.sessionDate, params.startTime);

  // Step 5: POST create session as URL-encoded form
  const sessionForm = new URLSearchParams();
  sessionForm.set('__RequestVerificationToken', createCsrf);
  sessionForm.set('SessionTitle', params.sessionTitle);
  sessionForm.set('CompanyName', params.companyName);
  sessionForm.set('DynamicUrl', params.dynamicUrl);
  sessionForm.set('Valid', '1');
  sessionForm.set('HostStartTime', times.hostStart);
  sessionForm.set('HostEndTime', times.hostEnd);
  sessionForm.set('HostIframeURL', params.hostIframeUrl);
  sessionForm.set('ScoringStartTime', times.scoringStart);
  sessionForm.set('ScoringEndTime', times.scoringEnd);
  sessionForm.set('ScoringIframeURL', params.scoringIframeUrl);
  sessionForm.set('VirtualWorldStartTime', times.vwStart);
  sessionForm.set('VirtualWorldEndTime', times.vwEnd);
  sessionForm.set('VirtualWorldIframeURL', params.virtualWorldIframeUrl);

  const createRes = await fetch(`${BASE_URL}/session/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': finalCookies,
      'Accept': 'text/html',
    },
    body: sessionForm.toString(),
    redirect: 'manual',
  });

  // Success = redirect to session list (302) or 200 with session list
  if (createRes.status !== 302 && createRes.status !== 200) {
    const body = await createRes.text();
    throw new Error(`XVenture session creation failed: ${createRes.status} — ${body.substring(0, 300)}`);
  }

  return { success: true };
}
