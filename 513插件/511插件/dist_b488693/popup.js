// MatchPulse - 赛事数据引擎 弹出窗口脚本

// 监听设备移除消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DEVICE_REMOVED') {
    alert('设备数量超限：' + message.message + '\n\n请重新登录。');
    location.reload();
  }
});

function safeSendMessage(msg, callback) {
  try {
    if (callback) {
      chrome.runtime.sendMessage(msg, callback);
    } else {
      chrome.runtime.sendMessage(msg);
    }
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      console.warn('[MatchPulse] 扩展上下文已失效，跳过消息:', msg.type);
    } else {
      console.warn('[MatchPulse] 发送消息失败:', msg.type, e);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 检查登录状态
  const isLoggedIn = await authService.isLoggedIn();
  const loginPage = document.getElementById('loginPage');
  const mainPage = document.getElementById('mainPage');

  if (!isLoggedIn) {
    loginPage.style.display = 'block';
    mainPage.style.display = 'none';
    setupLoginPage();
    return;
  }

  loginPage.style.display = 'none';
  mainPage.style.display = 'block';
  loadUserInfo();
  setupMainPage();
});

// 登录页面设置
function setupLoginPage() {
  const btnLogin = document.getElementById('btnLogin');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');

  btnLogin.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
      loginError.textContent = '请输入用户名和密码';
      loginError.style.display = 'block';
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = '登录中...';
    loginError.style.display = 'none';

    try {
      const result = await authService.login(username, password);
      if (result.success) {
        location.reload();
      } else {
        loginError.textContent = result.message || '登录失败';
        loginError.style.display = 'block';
      }
    } catch (error) {
      loginError.textContent = '网络错误，请稍后重试';
      loginError.style.display = 'block';
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = '登录';
    }
  });

  loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });
}

// 加载用户信息
async function loadUserInfo() {
  try {
    const user = await authService.getUser();
    if (user) {
      document.getElementById('accountUsername').textContent = user.username || '-';
      document.getElementById('accountExpiry').textContent = user.expires_at ? new Date(user.expires_at).toLocaleDateString('zh-CN') : '永久';
      document.getElementById('accountStatus').textContent = (user.status === undefined || user.status === 1) ? '正常' : '已禁用';

      // 显示设备数量
      const deviceCount = user.devices_count || 0;
      const accountDevices = document.getElementById('accountDevices');
      if (accountDevices) {
        accountDevices.textContent = `${deviceCount}/4 台设备`;

        if (deviceCount >= 4) {
          accountDevices.className = 'value danger';
        } else if (deviceCount >= 3) {
          accountDevices.className = 'value warning';
        } else {
          accountDevices.className = 'value success';
        }
      }

      // 显示设备列表
      if (user.devices && user.devices.length > 0) {
        const deviceList = user.devices.map(d => d.device_name || d.device_id || '未知设备').join(', ');
        const accountDeviceList = document.getElementById('accountDeviceList');
        if (accountDeviceList) {
          accountDeviceList.textContent = deviceList;
        }
      }
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
  }
}

// 主页面设置
function setupMainPage() {
  const signalBars = document.getElementById('signalBars');
  const statusText = document.getElementById('statusText');
  const logContainer = document.getElementById('logContainer');
  const emptyState = document.getElementById('emptyState');
  const btnClear = document.getElementById('btnClear');
  const btnTestHome = document.getElementById('btnTestHome');
  const btnTestAway = document.getElementById('btnTestAway');
  const btnLogout = document.getElementById('btnLogout');

  // 队伍名称显示
  const matchTeams = document.getElementById('matchTeams');
  const homeTeamName = document.getElementById('homeTeamName');
  const awayTeamName = document.getElementById('awayTeamName');

  // 下注记录相关元素
  const betLogContainer = document.getElementById('betLogContainer');
  const betEmptyState = document.getElementById('betEmptyState');
  const btnClearBets = document.getElementById('btnClearBets');

  // 退出登录
  btnLogout.addEventListener('click', async () => {
    if (confirm('确定要退出登录吗？')) {
      await authService.logout();
      location.reload();
    }
  });

  // 声音设置相关元素
  const soundTypes = ['homeCorner', 'neutralCorner', 'homeFreekick', 'awayCorner', 'awayFreekick'];
  const soundElements = {};
  soundTypes.forEach(type => {
    soundElements[type] = {
      input: document.getElementById(type + 'Input'),
      btnUpload: document.getElementById('btnUpload' + type.charAt(0).toUpperCase() + type.slice(1)),
      btnReset: document.getElementById('btnReset' + type.charAt(0).toUpperCase() + type.slice(1)),
      status: document.getElementById(type + 'Status')
    };
  });
  const btnZoom = document.getElementById('btnZoom');

  // 时间设置元素
  const firstHalfStart = document.getElementById('firstHalfStart');
  const firstHalfEnd = document.getElementById('firstHalfEnd');
  const secondHalfStart = document.getElementById('secondHalfStart');
  const secondHalfEnd = document.getElementById('secondHalfEnd');
  const dedupWindowSec = document.getElementById('dedupWindowSec');

  // 开始警示声音元素
  const startAlertInput = document.getElementById('startAlertInput');
  const startAlertStatus = document.getElementById('startAlertStatus');
  const btnUploadStartAlert = document.getElementById('btnUploadStartAlert');
  const btnResetStartAlert = document.getElementById('btnResetStartAlert');

  // 补单提醒声音元素
  const supplementInput = document.getElementById('supplementInput');
  const supplementStatus = document.getElementById('supplementStatus');
  const btnUploadSupplement = document.getElementById('btnUploadSupplement');
  const btnResetSupplement = document.getElementById('btnResetSupplement');

  // 补单触发条件元素
  const supplementAttack = document.getElementById('supplementAttack');
  const supplementDangerousAttack = document.getElementById('supplementDangerousAttack');

  // 缩放级别
  const zoomLevels = [80, 90, 100, 110, 120];
  let currentZoomIndex = 2; // 默认100%

  // 标签页切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      document.getElementById(tabName + 'Tab').classList.add('active');
    });
  });

  // 缩放功能
  function applyZoom(zoom) {
    document.body.style.zoom = zoom + '%';
    btnZoom.textContent = zoom + '%';
  }

  function loadZoom() {
    chrome.storage.local.get(['zoomLevel'], (result) => {
      if (result.zoomLevel) {
        const index = zoomLevels.indexOf(result.zoomLevel);
        if (index !== -1) {
          currentZoomIndex = index;
          applyZoom(result.zoomLevel);
        }
      }
    });
  }

  btnZoom.addEventListener('click', () => {
    currentZoomIndex = (currentZoomIndex + 1) % zoomLevels.length;
    const zoom = zoomLevels[currentZoomIndex];
    applyZoom(zoom);
    chrome.storage.local.set({ zoomLevel: zoom });
  });

  // 检查当前标签页
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && (
        tab.url.includes('m.leisu.com/live/detail-') ||
        tab.url.includes('live.leisu.com/detail-')
      )) {
        signalBars.classList.add('active');
        statusText.textContent = '数据流已连接';
        statusText.classList.add('online');
      } else {
        signalBars.classList.remove('active');
        statusText.textContent = '数据源离线';
        statusText.classList.remove('online');
      }
    } catch (error) {}
  }

  function sendDebugLog(message) {
    console.log('[MatchPulse-Popup]', message);
  }

  // 加载提醒日志
  function loadLogs() {
    safeSendMessage({ type: 'GET_LOGS' }, (response) => {
      if (response && response.logs) {
        renderLogs(response.logs);
      }
    });
  }

  // 加载队伍名称
  function loadTeamNames() {
    safeSendMessage({ type: 'GET_TEAM_NAMES' }, (response) => {
      if (response && response.teamNames) {
        const names = response.teamNames;
        if (names.home !== '主队' || names.away !== '客队') {
          homeTeamName.textContent = names.home;
          awayTeamName.textContent = names.away;
          matchTeams.style.display = 'block';
        }
      }
    });
  }

  // 已渲染的日志ID集合（用于增量更新）
  let renderedLogIds = new Set();

  // 渲染提醒日志（增量更新）
  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      if (renderedLogIds.size === 0) {
        emptyState.style.display = 'block';
      }
      return;
    }

    emptyState.style.display = 'none';
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let newCount = 0;
    sortedLogs.forEach(log => {
      const logId = log.id || log.timestamp;
      if (renderedLogIds.has(logId)) return;

      renderedLogIds.add(logId);
      newCount++;

      const time = new Date(log.timestamp).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const eventTypeClass = log.eventType === 'corner' ? 'corner' : log.eventType === 'neutralCorner' ? 'corner' : log.eventType === 'attack' || log.eventType === 'dangerous_attack' ? 'attack' : log.eventType === 'supplement' ? 'supplement' : 'freekick';
      let eventTypeText = '';
      if (log.eventType === 'corner') eventTypeText = '角球';
      else if (log.eventType === 'neutralCorner') eventTypeText = '中立角球';
      else if (log.eventType === 'dangerous_freekick') eventTypeText = '危险任意球';
      else if (log.eventType === 'attack') eventTypeText = '进攻';
      else if (log.eventType === 'dangerous_attack') eventTypeText = '危险进攻';
      else if (log.eventType === 'goal') eventTypeText = '进球';
      else if (log.eventType === 'supplement') eventTypeText = '补单';
      else eventTypeText = log.eventType;
      const sourceText = log.source === 'text' ? '文字信号源' : '动画信号源';

      const isAlert = log.isAlert !== false;
      const alertBadge = isAlert
        ? '<span style="background:rgba(0,230,118,0.15);color:#00e676;padding:1px 5px;border-radius:3px;font-size:9px;margin-left:4px;border:1px solid rgba(0,230,118,0.25);">已触发</span>'
        : `<span style="background:rgba(255,255,255,0.03);color:#4a5a7a;padding:1px 5px;border-radius:3px;font-size:9px;margin-left:4px;border:1px solid #151d3d;" title="${log.skipReason || ''}">未触发</span>`;

      const item = document.createElement('div');
      item.className = 'log-item';
      item.style.animation = 'fadeIn 0.3s ease';
      item.innerHTML = `
        <div class="time">${time} <span style="color:#aaa;font-size:10px;">[${sourceText}]</span></div>
        <div class="event">
          <span class="event-type ${eventTypeClass}">${eventTypeText}</span>
          <span class="team-name">${log.teamName || '未知'}</span>
          <span class="minute">${log.minute}'</span>
          ${alertBadge}
        </div>
      `;
      logContainer.insertBefore(item, logContainer.firstChild);
    });

    if (newCount > 0) {
      sendDebugLog(`[UI] 新增 ${newCount} 条事件日志`);
    }
  }

  // 自动轮询日志
  let logPollTimer = null;

  function startLogPolling() {
    if (logPollTimer) return;
    logPollTimer = setInterval(() => {
       safeSendMessage({ type: 'GET_LOGS' }, (response) => {
         if (response && response.logs) {
           renderLogs(response.logs);
         }
       });
     }, 1000);
  }

  function stopLogPolling() {
    if (logPollTimer) {
      clearInterval(logPollTimer);
      logPollTimer = null;
    }
  }

  // 加载自定义声音状态
  function loadSoundSettings() {
    const storageKeys = soundTypes.map(type => 'custom_' + type);
    storageKeys.push('custom_startAlert');
    storageKeys.push('custom_supplement');
    chrome.storage.local.get(storageKeys, (result) => {
      soundTypes.forEach(type => {
        const key = 'custom_' + type;
        const el = soundElements[type];
        if (result[key]) {
          el.status.textContent = result[key].name;
          el.status.className = 'sound-tag custom';
        } else {
          el.status.textContent = '默认';
          el.status.className = 'sound-tag default';
        }
      });
      if (result.custom_startAlert) {
        startAlertStatus.textContent = result.custom_startAlert.name;
        startAlertStatus.className = 'sound-tag custom';
      } else {
        startAlertStatus.textContent = '默认';
        startAlertStatus.className = 'sound-tag default';
      }
      if (result.custom_supplement) {
        supplementStatus.textContent = result.custom_supplement.name;
        supplementStatus.className = 'sound-tag custom';
      } else {
        supplementStatus.textContent = '默认';
        supplementStatus.className = 'sound-tag default';
      }
    });
  }

  // 处理音频文件上传
  function handleAudioUpload(file, soundType) {
    if (!file) return;

    // 检查文件大小（500KB限制）
    if (file.size > 500 * 1024) {
      alert('文件过大，请选择小于500KB的音频文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const audioData = {
        name: file.name,
        data: e.target.result,
        type: file.type
      };

      const key = 'custom_' + soundType;
      chrome.storage.local.set({ [key]: audioData }, () => {
        loadSoundSettings();
      });
    };
    reader.readAsDataURL(file);
  }

  // 绑定上传和重置事件
  soundTypes.forEach(type => {
    const el = soundElements[type];
    el.btnUpload.addEventListener('click', () => el.input.click());
    el.input.addEventListener('change', (e) => {
      handleAudioUpload(e.target.files[0], type);
      el.input.value = '';
    });
    el.btnReset.addEventListener('click', () => {
      chrome.storage.local.remove('custom_' + type, () => {
        loadSoundSettings();
      });
    });
  });

  // 加载时间设置
  function loadTimeSettings() {
    chrome.storage.local.get(['firstHalfStart', 'firstHalfEnd', 'secondHalfStart', 'secondHalfEnd', 'dedupWindowSec'], (result) => {
      firstHalfStart.value = result.firstHalfStart ?? 32;
      firstHalfEnd.value = result.firstHalfEnd ?? 44;
      secondHalfStart.value = result.secondHalfStart ?? 78;
      secondHalfEnd.value = result.secondHalfEnd ?? 88;
      dedupWindowSec.value = result.dedupWindowSec ?? 15;
    });
  }

  // 保存时间设置
  function saveTimeSettings() {
    chrome.storage.local.set({
      firstHalfStart: parseInt(firstHalfStart.value) || 32,
      firstHalfEnd: parseInt(firstHalfEnd.value) || 44,
      secondHalfStart: parseInt(secondHalfStart.value) || 78,
      secondHalfEnd: parseInt(secondHalfEnd.value) || 88
    });
  }

  // 保存去重窗口
  function saveDedupWindow() {
    chrome.storage.local.set({ dedupWindowSec: parseInt(dedupWindowSec.value) || 15 });
  }

  // 绑定时间设置变更事件
  firstHalfStart.addEventListener('change', saveTimeSettings);
  firstHalfEnd.addEventListener('change', saveTimeSettings);
  secondHalfStart.addEventListener('change', saveTimeSettings);
  secondHalfEnd.addEventListener('change', saveTimeSettings);
  dedupWindowSec.addEventListener('change', saveDedupWindow);

  // 开始警示声音上传和重置
  btnUploadStartAlert.addEventListener('click', () => startAlertInput.click());
  startAlertInput.addEventListener('change', (e) => {
    handleAudioUpload(e.target.files[0], 'startAlert');
    startAlertInput.value = '';
  });
  btnResetStartAlert.addEventListener('click', () => {
    chrome.storage.local.remove('custom_startAlert', () => {
      loadSoundSettings();
    });
  });

  // 补单提醒声音上传和重置
  btnUploadSupplement.addEventListener('click', () => supplementInput.click());
  supplementInput.addEventListener('change', (e) => {
    handleAudioUpload(e.target.files[0], 'supplement');
    supplementInput.value = '';
  });
  btnResetSupplement.addEventListener('click', () => {
    chrome.storage.local.remove('custom_supplement', () => {
      loadSoundSettings();
    });
  });

  // ===== 试听功能 =====
  function playTestSound(team, eventType) {
    safeSendMessage({
      type: 'PLAY_SOUND',
      data: { team: team, eventType: eventType }
    });
  }

  document.getElementById('btnTestHomeCorner').addEventListener('click', () => playTestSound('home', 'corner'));
  document.getElementById('btnTestNeutralCorner').addEventListener('click', () => playTestSound('neutral', 'neutralCorner'));
  document.getElementById('btnTestHomeFreekick').addEventListener('click', () => playTestSound('home', 'dangerous_freekick'));
  document.getElementById('btnTestAwayCorner').addEventListener('click', () => playTestSound('away', 'corner'));
  document.getElementById('btnTestAwayFreekick').addEventListener('click', () => playTestSound('away', 'dangerous_freekick'));
  document.getElementById('btnTestStartAlert').addEventListener('click', () => playTestSound('home', 'startAlert'));
  document.getElementById('btnTestSupplement').addEventListener('click', () => playTestSound('supplement', 'supplement'));

  // 加载补单触发条件
  function loadSupplementTriggers() {
    chrome.storage.local.get(['supplementAttack', 'supplementDangerousAttack'], (result) => {
      supplementAttack.checked = result.supplementAttack !== false;
      supplementDangerousAttack.checked = result.supplementDangerousAttack !== false;
    });
  }

  // 保存补单触发条件
  function saveSupplementTriggers() {
    chrome.storage.local.set({
      supplementAttack: supplementAttack.checked,
      supplementDangerousAttack: supplementDangerousAttack.checked
    });
  }

  supplementAttack.addEventListener('change', saveSupplementTriggers);
  supplementDangerousAttack.addEventListener('change', saveSupplementTriggers);

  // 清除提醒日志
  btnClear.addEventListener('click', () => {
    renderedLogIds.clear();
    const existingItems = logContainer.querySelectorAll('.log-item');
    existingItems.forEach(item => item.remove());
    safeSendMessage({ type: 'CLEAR_LOGS' }, () => {
      loadLogs();
    });
  });

  // ===== 下注记录 =====

  // 加载下注记录
  function loadBetRecords() {
    safeSendMessage({ type: 'GET_BET_RECORDS' }, (response) => {
      if (response && response.records) {
        renderBetRecords(response.records);
      }
    });
  }

  // 渲染下注记录
  function renderBetRecords(records) {
    const existingItems = betLogContainer.querySelectorAll('.log-item');
    existingItems.forEach(item => item.remove());

    if (!records || records.length === 0) {
      betEmptyState.style.display = 'block';
      return;
    }

    betEmptyState.style.display = 'none';
    const sortedRecords = [...records].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedRecords.forEach(record => {
      const time = new Date(record.timestamp).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      const isBet = record.type === 'bet';
      const isSupplement = record.type === 'supplement';
      const isHit = record.type === 'hit';
      let typeText, typeColor, typeBg;
      if (isBet) {
        typeText = '已标记';
        typeColor = '#00e676';
        typeBg = 'rgba(0,230,118,0.1)';
      } else if (isSupplement) {
        typeText = '已对冲';
        typeColor = '#ffab00';
        typeBg = 'rgba(255,171,0,0.1)';
      } else if (isHit) {
        typeText = '🎯 命中';
        typeColor = '#b8860b';
        typeBg = '#fff8dc';
      }

      let eventText = '';
      if (record.eventType === 'corner') eventText = '角球';
      else if (record.eventType === 'dangerous_freekick') eventText = '危险任意球';
      else if (record.eventType === 'attack') eventText = '进攻';
      else if (record.eventType === 'dangerous_attack') eventText = '危险进攻';
      else if (record.eventType === 'goal') eventText = '进球';
      else eventText = record.eventType;

      const teamLabel = record.team === 'home' ? '(主)' : record.team === 'away' ? '(客)' : '';

      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <div class="time">${time}</div>
        <div class="event">
          <span style="padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;background:${typeBg};color:${typeColor};">${typeText}</span>
          <span class="team-name">${record.teamName || '未知'}${teamLabel}</span>
          <span style="font-size:10px;color:#999;">${eventText}</span>
          <span class="minute">${record.minute || ''}'</span>
        </div>
      `;
      betLogContainer.appendChild(item);
    });
  }

  // 清除下注记录
  btnClearBets.addEventListener('click', () => {
    safeSendMessage({ type: 'CLEAR_BET_RECORDS' }, () => {
      loadBetRecords();
    });
  });

  // 测试主队提醒
  btnTestHome.addEventListener('click', () => {
    safeSendMessage({
      type: 'PLAY_SOUND',
      data: { team: 'home', eventType: 'corner' }
    });

    safeSendMessage({
      type: 'LOG',
      data: {
        matchId: 'test',
        eventType: 'corner',
        team: 'home',
        teamName: '测试主队',
        minute: '45',
        timestamp: new Date().toISOString(),
        url: 'test'
      }
    }, () => {
      loadLogs();
    });
  });

  // 测试客队提醒
  btnTestAway.addEventListener('click', () => {
    safeSendMessage({
      type: 'PLAY_SOUND',
      data: { team: 'away', eventType: 'corner' }
    });

    safeSendMessage({
      type: 'LOG',
      data: {
        matchId: 'test',
        eventType: 'corner',
        team: 'away',
        teamName: '测试客队',
        minute: '45',
        timestamp: new Date().toISOString(),
        url: 'test'
      }
    }, () => {
      loadLogs();
    });
  });

  // 初始化
  loadZoom();
  checkCurrentTab();
  loadLogs();
  loadTeamNames();
  loadBetRecords();
  loadSoundSettings();
  loadTimeSettings();
  loadSupplementTriggers();

  // 启动自动轮询（2秒间隔，增量更新）
  startLogPolling();

  // 定期刷新队伍名称和下注记录
  setInterval(() => {
    loadTeamNames();
    loadBetRecords();
  }, 3000);

  // 设备管理功能
  const deviceManagerPanel = document.getElementById('deviceManagerPanel');
  const btnManageDevices = document.getElementById('btnManageDevices');
  const btnCloseDeviceManager = document.getElementById('btnCloseDeviceManager');
  const deviceListContainer = document.getElementById('deviceListContainer');

  let currentDeviceId = null;

  authService.getDeviceId().then(id => {
    currentDeviceId = id;
  });

  btnManageDevices.addEventListener('click', async () => {
    const user = await authService.getUser();
    if (!user || !user.devices) {
      deviceListContainer.innerHTML = '<div style="color:#999;font-size:11px;padding:10px;text-align:center;">暂无设备信息</div>';
    } else {
      renderDeviceList(user.devices);
    }
    deviceManagerPanel.style.display = 'block';
    btnManageDevices.style.display = 'none';
  });

  btnCloseDeviceManager.addEventListener('click', () => {
    deviceManagerPanel.style.display = 'none';
    btnManageDevices.style.display = 'block';
  });

  async function renderDeviceList(devices) {
    if (!devices || devices.length === 0) {
      deviceListContainer.innerHTML = '<div style="color:#999;font-size:11px;padding:10px;text-align:center;">暂无设备</div>';
      return;
    }

    let html = '';
    devices.forEach(device => {
      const isCurrentDevice = device.device_id === currentDeviceId;
      const lastLogin = device.last_login_at ? new Date(device.last_login_at).toLocaleString('zh-CN') : '未知';

      html += `
        <div class="device-item ${isCurrentDevice ? 'current' : ''}">
          <div style="flex:1;">
            <div class="device-name ${isCurrentDevice ? 'current-device' : ''}">
              ${device.device_name || '未知设备'}
              ${isCurrentDevice ? ' <span class="device-badge">(当前)</span>' : ''}
            </div>
            <div class="device-meta">最后登录: ${lastLogin}</div>
          </div>
          ${!isCurrentDevice ? `
            <button class="btn-kick" onclick="removeDevice('${device.device_id}', '${device.device_name || device.device_id}')">踢出</button>
          ` : ''}
        </div>
      `;
    });
    deviceListContainer.innerHTML = html;
  }

  window.removeDevice = async function(deviceId, deviceName) {
    if (!confirm(`确定要踢出设备"${deviceName}"吗？\n\n被踢出的设备需要重新登录。`)) {
      return;
    }

    try {
      const result = await authService.removeDevice(deviceId);
      if (result.success) {
        alert(`设备"${deviceName}"已被踢出`);
        // 更新显示
        const user = await authService.getUser();
        if (user) {
          user.devices = result.devices;
          user.devices_count = result.devices_count;
          await chrome.storage.local.set({ auth_user: user });
          // 刷新页面以更新设备列表
          location.reload();
        }
      } else {
        alert(result.message || '踢出设备失败');
      }
    } catch (error) {
      console.error('踢出设备失败:', error);
      alert('踢出设备失败，请稍后重试');
    }
  };
}

