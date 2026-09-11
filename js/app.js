(function(){
  "use strict";

  /* ===================== STATE ===================== */
  let EVENTS = [];          // Danh sách sự kiện của file đang chọn
  let refDate = new Date(); // Luôn mặc định là ngày hôm nay
  let currentMode = 'month';// 'month' | 'week' | 'agenda'
  let activeFileName = '';
  let FILES_MAP = {};       // { 'filename.ics': [events] }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const MONTH_NAMES_HEADING = (y, m) => 'Tháng ' + (m + 1) + ', ' + y;
  const WEEKDAYS_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  function pad2(n) { return n < 10 ? ('0' + n) : ('' + n); }
  function startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const offset = (x.getDay() + 6) % 7; // Monday=0
    x.setDate(x.getDate() - offset);
    return x;
  }
  function weekHeadingText(d) {
    const mon = startOfWeek(d);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return pad2(mon.getDate()) + '/' + pad2(mon.getMonth() + 1) + ' – ' + pad2(sun.getDate()) + '/' + pad2(sun.getMonth() + 1) + '/' + sun.getFullYear();
  }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtTime(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fmtDateVN(d) { return WEEKDAYS_FULL[d.getDay()] + ', ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function fmtDateShort(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }

  function eventsForDay(y, m, d) {
    return EVENTS.filter(e => {
      const s = e.start, en = e.end;
      const dayStart = new Date(y, m, d, 0, 0, 0);
      const dayEnd = new Date(y, m, d, 23, 59, 59);
      return s <= dayEnd && en > dayStart;
    }).sort((a, b) => a.start - b.start);
  }

  /* ===================== RENDER: MONTH GRID ===================== */
  function renderMonth() {
    const y = refDate.getFullYear(), m = refDate.getMonth();
    $('#month-heading').textContent = MONTH_NAMES_HEADING(y, m);

    const grid = $('#month-grid');
    grid.innerHTML = '';

    const firstOfMonth = new Date(y, m, 1);
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrevMonth = new Date(y, m, 0).getDate();

    const today = new Date();
    const cells = [];

    for (let i = 0; i < firstWeekday; i++) {
      const d = daysInPrevMonth - firstWeekday + 1 + i;
      cells.push({ y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1, d, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ y, m, d, outside: false });
    while (cells.length % 7 !== 0 || cells.length < 35) {
      const lastCell = cells[cells.length - 1];
      const nextDate = new Date(lastCell.y, lastCell.m, lastCell.d + 1);
      cells.push({ y: nextDate.getFullYear(), m: nextDate.getMonth(), d: nextDate.getDate(), outside: true });
    }

    for (const c of cells) {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'day-cell' + (c.outside ? ' outside' : '');
      const isToday = !c.outside && c.y === today.getFullYear() && c.m === today.getMonth() && c.d === today.getDate();

      const numSpan = document.createElement('span');
      numSpan.className = 'date-num' + (isToday ? ' today' : '');
      numSpan.textContent = c.d;
      cellDiv.appendChild(numSpan);

      const dayEvents = eventsForDay(c.y, c.m, c.d);
      const maxShow = 3;
      dayEvents.slice(0, maxShow).forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'event-chip' + (ev.allDay ? ' allday' : '') + ' cat-' + (ev.category || 'normal');
        chip.textContent = ev.allDay ? ev.title : (fmtTime(ev.start) + ' ' + ev.title);
        cellDiv.appendChild(chip);
      });
      if (dayEvents.length > maxShow) {
        const more = document.createElement('div');
        more.className = 'more-link';
        more.textContent = '+' + (dayEvents.length - maxShow) + ' khác';
        cellDiv.appendChild(more);
      }

      cellDiv.addEventListener('click', () => openDayModal(c.y, c.m, c.d));
      grid.appendChild(cellDiv);
    }
  }

  /* ===================== RENDER: WEEK VIEW ===================== */
  function renderWeek() {
    $('#month-heading').textContent = weekHeadingText(refDate);

    const grid = $('#week-grid');
    grid.innerHTML = '';

    const mon = startOfWeek(refDate);
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
      const isToday = y === today.getFullYear() && m === today.getMonth() && day === today.getDate();

      const col = document.createElement('div');
      col.className = 'week-day-col';

      const head = document.createElement('div');
      head.className = 'week-day-head' + (d.getDay() === 0 ? ' sun' : '');
      head.innerHTML =
        '<div class="wd-name">' + WEEKDAYS_SHORT[d.getDay()] + '</div>' +
        '<div class="wd-num' + (isToday ? ' today' : '') + '">' + day + '</div>';
      col.appendChild(head);

      const evWrap = document.createElement('div');
      evWrap.className = 'week-events';
      const dayEvents = eventsForDay(y, m, day);
      if (dayEvents.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'week-empty';
        empty.textContent = '—';
        evWrap.appendChild(empty);
      } else {
        for (const ev of dayEvents) {
          const item = document.createElement('div');
          item.className = 'week-event-item' + (ev.allDay ? ' allday' : '') + ' cat-' + (ev.category || 'normal');
          item.innerHTML =
            '<span class="week-event-time">' + (ev.allDay ? 'Cả ngày' : fmtTime(ev.start) + '–' + fmtTime(ev.end)) + '</span>' +
            '<span class="week-event-title"></span>';
          item.querySelector('.week-event-title').textContent = ev.title;
          item.addEventListener('click', () => openEventModal(ev));
          evWrap.appendChild(item);
        }
      }
      col.appendChild(evWrap);
      grid.appendChild(col);
    }
  }

  /* ===================== RENDER: AGENDA ===================== */
  function renderAgenda() {
    const list = $('#agenda-list');
    list.innerHTML = '';
    if (EVENTS.length === 0) {
      list.innerHTML = '<div class="empty-state">Không có sự kiện nào.</div>';
      return;
    }
    const groups = {};
    const order = [];
    for (const ev of EVENTS) {
      const key = dateKey(ev.start);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(ev);
    }
    for (const key of order) {
      const evs = groups[key];
      const groupDiv = document.createElement('div');
      groupDiv.className = 'agenda-group';
      const dateDiv = document.createElement('div');
      dateDiv.className = 'agenda-date';
      dateDiv.textContent = fmtDateVN(evs[0].start);
      groupDiv.appendChild(dateDiv);
      for (const ev of evs) {
        const item = document.createElement('div');
        item.className = 'agenda-item cat-' + (ev.category || 'normal');
        const time = document.createElement('div');
        time.className = 'agenda-time mono';
        time.textContent = ev.allDay ? 'Cả ngày' : (fmtTime(ev.start) + '–' + fmtTime(ev.end));
        const main = document.createElement('div');
        main.className = 'agenda-main';
        const title = document.createElement('div');
        title.className = 'agenda-title';
        title.textContent = ev.title;
        main.appendChild(title);
        if (ev.location) {
          const meta = document.createElement('div');
          meta.className = 'agenda-meta';
          meta.textContent = '📍 ' + ev.location;
          main.appendChild(meta);
        }
        item.appendChild(time);
        item.appendChild(main);
        item.addEventListener('click', () => openEventModal(ev));
        groupDiv.appendChild(item);
      }
      list.appendChild(groupDiv);
    }
  }

  /* ===================== MODAL ===================== */
  const CATEGORY_LABELS = {
    normal: 'Lịch học thường',
    midterm: 'Thi giữa học phần',
    practical: 'Lịch thực hành',
    final: 'Thi cuối học phần',
    holiday: 'Lịch nghỉ lễ'
  };

  function openDayModal(y, m, d) {
    const evs = eventsForDay(y, m, d);
    $('#modal-date').textContent = fmtDateVN(new Date(y, m, d));
    const body = $('#modal-body');
    body.innerHTML = '';
    if (evs.length === 0) {
      body.innerHTML = '<div class="empty-state" style="padding:24px 0;">Không có sự kiện nào trong ngày này.</div>';
    } else {
      for (const ev of evs) body.appendChild(renderEventDetail(ev));
    }
    $('#modal-overlay').style.display = 'flex';
  }

  function openEventModal(ev) {
    $('#modal-date').textContent = fmtDateVN(ev.start);
    const body = $('#modal-body');
    body.innerHTML = '';
    body.appendChild(renderEventDetail(ev));
    $('#modal-overlay').style.display = 'flex';
  }

  function renderEventDetail(ev) {
    const wrap = document.createElement('div');
    wrap.className = 'ev-detail';

    const cat = ev.category || 'normal';
    const badge = document.createElement('div');
    badge.className = 'cat-badge cat-' + cat;
    badge.textContent = CATEGORY_LABELS[cat] || CATEGORY_LABELS.normal;
    wrap.appendChild(badge);

    const title = document.createElement('div');
    title.className = 'ev-detail-title';
    title.textContent = ev.title;
    wrap.appendChild(title);

    const timeRow = document.createElement('div');
    timeRow.className = 'ev-detail-row';
    timeRow.innerHTML = '<span class="lbl">Thời gian</span><span>' +
      (ev.allDay ? 'Cả ngày, ' + fmtDateShort(ev.start) : fmtTime(ev.start) + ' – ' + fmtTime(ev.end) + ', ' + fmtDateShort(ev.start))
      + '</span>';
    wrap.appendChild(timeRow);

    if (ev.location) {
      const r = document.createElement('div');
      r.className = 'ev-detail-row';
      r.innerHTML = '<span class="lbl">Địa điểm</span><span></span>';
      r.lastElementChild.textContent = ev.location;
      wrap.appendChild(r);
    }
    if (ev.description) {
      const r = document.createElement('div');
      r.className = 'ev-detail-row';
      r.innerHTML = '<span class="lbl">Mô tả</span><span style="white-space:pre-wrap;"></span>';
      r.lastElementChild.textContent = ev.description;
      wrap.appendChild(r);
    }
    return wrap;
  }

  $('#modal-close').addEventListener('click', () => $('#modal-overlay').style.display = 'none');
  $('#modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') $('#modal-overlay').style.display = 'none'; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal-overlay').style.display = 'none'; });

  /* ===================== CONTROLS & NAVIGATION ===================== */
  function updateHeading() {
    $('#month-heading').textContent = currentMode === 'week'
      ? weekHeadingText(refDate)
      : (currentMode === 'agenda' ? 'Lịch trình' : MONTH_NAMES_HEADING(refDate.getFullYear(), refDate.getMonth()));
  }

  function renderAll() {
    if (currentMode === 'month') renderMonth();
    else if (currentMode === 'week') renderWeek();
    else if (currentMode === 'agenda') renderAgenda();
    updateHeading();
  }

  function setMode(mode) {
    currentMode = mode;
    $('#seg-month').classList.toggle('active', mode === 'month');
    $('#seg-week').classList.toggle('active', mode === 'week');
    $('#seg-agenda').classList.toggle('active', mode === 'agenda');
    $('#month-view').style.display = mode === 'month' ? 'block' : 'none';
    $('#week-view').style.display = mode === 'week' ? 'block' : 'none';
    $('#agenda-view').style.display = mode === 'agenda' ? 'block' : 'none';
    renderAll();
  }

  function shiftRef(direction) {
    if (currentMode === 'week') {
      refDate = new Date(refDate.getTime() + direction * 7 * 86400000);
    } else {
      refDate = new Date(refDate.getFullYear(), refDate.getMonth() + direction, 1);
    }
    renderAll();
  }

  $('#btn-prev').addEventListener('click', () => shiftRef(-1));
  $('#btn-next').addEventListener('click', () => shiftRef(1));
  $('#btn-today').addEventListener('click', () => {
    refDate = new Date();
    renderAll();
  });

  $('#seg-month').addEventListener('click', () => setMode('month'));
  $('#seg-week').addEventListener('click', () => setMode('week'));
  $('#seg-agenda').addEventListener('click', () => setMode('agenda'));

  /* ===================== ICS PICKER DROPDOWN ===================== */
  function initIcsPicker(fileNames) {
    const pickerMenu = $('#ics-picker-menu');
    const pickerBtn = $('#ics-picker-btn');
    const picker = $('#ics-picker');
    if (!pickerMenu || !fileNames || !fileNames.length) return;

    pickerMenu.innerHTML = '';
    fileNames.forEach(fname => {
      const evCount = (FILES_MAP[fname] || []).length;
      const item = document.createElement('div');
      item.className = 'ics-menu-item' + (fname === activeFileName ? ' active' : '');
      item.dataset.file = fname;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ics-item-name';
      nameSpan.textContent = fname;
      item.appendChild(nameSpan);

      const countSpan = document.createElement('span');
      countSpan.className = 'ics-item-count';
      countSpan.textContent = evCount + ' sự kiện';
      item.appendChild(countSpan);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        switchIcsFile(fname);
        pickerMenu.style.display = 'none';
        if (picker) picker.classList.remove('open');
      });

      pickerMenu.appendChild(item);
    });

    if (pickerBtn && !pickerBtn._hasClick) {
      pickerBtn._hasClick = true;
      pickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = pickerMenu.style.display === 'block';
        pickerMenu.style.display = isOpen ? 'none' : 'block';
        if (picker) picker.classList.toggle('open', !isOpen);
      });
    }

    if (!document._hasPickerOutsideClick) {
      document._hasPickerOutsideClick = true;
      document.addEventListener('click', (e) => {
        if (picker && !picker.contains(e.target)) {
          pickerMenu.style.display = 'none';
          picker.classList.remove('open');
        }
      });
    }
  }

  function switchIcsFile(fileName) {
    if (!FILES_MAP[fileName]) return;
    activeFileName = fileName;
    localStorage.setItem('tkb_classic_active_file', fileName);

    EVENTS = FILES_MAP[fileName];
    $('#current-ics-name').textContent = fileName;
    $('#status-tag').textContent = EVENTS.length + ' sự kiện';

    $$('.ics-menu-item').forEach(el => {
      el.classList.toggle('active', el.dataset.file === fileName);
    });

    // Mặc định là ngày hôm nay
    refDate = new Date();
    renderAll();
  }

  /* ===================== LOAD FILES FROM ICS/ FOLDER ===================== */
  async function loadFilesFromIcsFolder() {
    let fileList = ["Y2C.ics", "TKB-QLDT20261.ics"];

    // 1. Thử đọc danh sách file từ ics/files.json
    try {
      const res = await fetch("ics/files.json");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) fileList = json;
      }
    } catch (err) {
      console.log("Dùng danh sách ics mặc định");
    }

    // 2. Tải và phân tích tất cả các file .ics
    for (const fname of fileList) {
      try {
        const res = await fetch("ics/" + fname);
        if (res.ok) {
          const text = await res.text();
          FILES_MAP[fname] = IcsParser.parseIcs(text);
        }
      } catch (err) {
        console.warn("Lỗi tải file ics/" + fname, err);
      }
    }

    const availableNames = Object.keys(FILES_MAP);
    if (availableNames.length === 0) {
      $('#status-tag').textContent = 'Chưa có file .ics';
      return;
    }

    // Chọn file active (ưu tiên lưu trước đó hoặc file đầu tiên)
    const saved = localStorage.getItem('tkb_classic_active_file');
    activeFileName = (saved && FILES_MAP[saved]) ? saved : availableNames[0];

    initIcsPicker(availableNames);
    switchIcsFile(activeFileName);
  }

  /* ===================== TỰ ĐỘNG SANG NGÀY MỚI (MIDNIGHT WATCHER) ===================== */
  let lastCheckedDate = new Date().toDateString();
  setInterval(() => {
    const todayStr = new Date().toDateString();
    if (todayStr !== lastCheckedDate) {
      lastCheckedDate = todayStr;
      console.log("Đã sang ngày mới, cập nhật lại 'Hôm nay'...");
      renderAll();
    }
  }, 15000);

  /* ===================== SERVICE WORKER ===================== */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW fail:', err));
    });
  }

  // Khởi động khi tải xong trang
  document.addEventListener('DOMContentLoaded', () => {
    loadFilesFromIcsFolder();
  });

})();
